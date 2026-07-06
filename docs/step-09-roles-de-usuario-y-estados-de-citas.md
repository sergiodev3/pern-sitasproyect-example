# Step 09 — Roles de usuario y estados de citas

> **Objetivo:** agregar un rol de **administrador** (el encargado de la barbería) que vea TODAS las citas y las marque como completada o no asistió, y migrar el "cancelar" de un borrado físico a un cambio de estado que preserva el historial.

## 1. El nuevo modelo de datos

Dos columnas nuevas, ninguna tabla nueva:

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client'
    CHECK (role IN ('client', 'admin'));

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled'));
```

**¿Por qué `TEXT + CHECK` y no un `ENUM` nativo de PostgreSQL?** Mismo espíritu que la elección de UUID sin extensiones en el [Step 02](step-02-schema-sql-uuid-timestamptz.md): un ENUM de Postgres es "más elegante" a primera vista, pero agregar o quitar valores después (`ALTER TYPE ... ADD VALUE`) tiene reglas especiales (no se puede hacer dentro de una transacción, por ejemplo). Con `CHECK` basta con editar la lista de valores permitidos en el schema.

`ADD COLUMN IF NOT EXISTS` hace que **volver a correr `npm run db:init`** en una instalación que ya tenía las tablas creadas sea seguro — no hace falta un sistema de migraciones aparte para un cambio tan simple.

## 2. El problema que evita el índice único parcial

Al agregar `status`, cancelar una cita deja de ser un `DELETE` — se explica en la sección 4. Pero el `UNIQUE (user_id, scheduled_at)` original se escribió pensando en que una cita cancelada *desaparecía*. Si ahora la fila se queda (con `status='cancelled'`), ese `UNIQUE` seguiría "ocupando" la hora, y el cliente **nunca podría volver a agendar a esa misma hora** tras cancelar. Sería un bug silencioso y confuso.

La solución es un **índice único parcial**, que solo aplica la restricción a las filas que cumplen una condición:

```sql
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_user_schedule_unique;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_user_schedule_unique
  ON appointments (user_id, scheduled_at)
  WHERE status <> 'cancelled';
```

Ahora Postgres solo impide duplicados entre citas que **no** están canceladas. Si cancelas una y vuelves a agendar la misma hora, la nueva fila (`status='scheduled'`) no choca con la vieja (`status='cancelled'`).

> 💡 Esta es una buena lección sobre por qué hay que revisar las consecuencias de un cambio de diseño en cascada: cambiar "cómo se cancela" rompió silenciosamente una regla que parecía no tener relación.

## 3. JWT con rol, y su trade-off

Hasta ahora el JWT solo llevaba `{ sub: userId }`. Para no consultar la base de datos en cada petición protegida, el rol viaja también en el token ([`controllers/auth.controller.js`](../backend/src/controllers/auth.controller.js)):

```js
function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '1d' });
}
```

**El trade-off (documéntalo, es intencional):** si promueves a alguien a admin mientras esa persona tiene una sesión activa, su cookie sigue firmada con `role: 'client'` hasta que vuelva a loguearse. El JWT es una "foto" del usuario al momento de firmarlo, no una consulta en vivo. Es el mismo problema que "el token no se entera si cambias tu contraseña" — muy común en sistemas basados en JWT, y vale la pena que lo veas de primera mano.

En [`middlewares/auth.middleware.js`](../backend/src/middlewares/auth.middleware.js) simplemente guardamos ese claim:

```js
req.userId = payload.sub;
req.userRole = payload.role;
```

## 4. El middleware `requireAdmin`

Nuevo [`middlewares/admin.middleware.js`](../backend/src/middlewares/admin.middleware.js):

```js
export function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return next(new ApiError(403, 'Acceso solo para administradores'));
  }
  next();
}
```

Se encadena **siempre después** de `authMiddleware` (necesita que `req.userRole` ya exista):

```js
router.use(authMiddleware, requireAdmin);
```

Si no hay sesión → 401 (lo da `authMiddleware`). Si hay sesión pero no es admin → 403 (lo da `requireAdmin`). El orden importa: siempre autenticar antes de autorizar.

## 5. Cancelar como cambio de estado (no más DELETE)

En [`services/appointments.service.js`](../backend/src/services/appointments.service.js), `remove` pasó de un `DELETE` físico a un `UPDATE`:

```js
export async function remove(userId, appointmentId) {
  const { rows } = await pool.query(
    `UPDATE appointments
     SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2 AND status = 'scheduled'
     RETURNING id`,
    [appointmentId, userId]
  );
  if (rows.length > 0) return;
  // ... distingue 404 (no es tuya) de 409 (ya no está pendiente)
}
```

El endpoint sigue siendo `DELETE /api/appointments/:id` — el **verbo HTTP y la URL no cambiaron**, aunque por dentro ya no borra nada. Es una buena lección: el contrato de la API (lo que el frontend ya conoce) puede mantenerse estable mientras la implementación evoluciona.

El `WHERE ... AND status = 'scheduled'` evita cancelar algo que ya está completado o marcado como no-show — no tendría sentido.

## 6. El patrón 404 vs 409 en las transiciones de estado

Tanto `remove` (cancelar) como la nueva `updateStatus` (admin) siguen el mismo patrón: **intenta el `UPDATE` de forma atómica**, y solo si no afectó ninguna fila, hace una segunda consulta *exclusivamente para dar el mensaje correcto*:

```js
export async function updateStatus(appointmentId, status) {
  const { rows } = await pool.query(
    `UPDATE appointments SET status = $2
     WHERE id = $1 AND status = 'scheduled'
     RETURNING id, title, description, scheduled_at, status, created_at`,
    [appointmentId, status]
  );
  if (rows.length > 0) return rows[0];

  const { rows: existing } = await pool.query('SELECT id FROM appointments WHERE id = $1', [appointmentId]);
  if (existing.length === 0) throw new ApiError(404, 'Cita no encontrada');
  throw new ApiError(409, 'La cita ya no está pendiente');
}
```

**¿Por qué separar 404 de 409?** Son errores semánticamente distintos: 404 dice "esto no existe", 409 dice "existe, pero tu operación choca con su estado actual". Confundirlos (devolver siempre 404, por ejemplo) le da menos información al frontend para explicarle al usuario qué pasó. El primer `UPDATE` sigue siendo la operación segura ante condiciones de carrera (es atómico); la segunda consulta solo mejora el mensaje de error.

## 7. Rutas y controlador de administración

Nuevo [`schemas/admin.schemas.js`](../backend/src/schemas/admin.schemas.js):

```js
export const updateStatusSchema = z.object({
  status: z.enum(['completed', 'no_show'], 'Estado no válido'),
});
```

El admin **nunca** puede poner `'scheduled'` (eso lo define la creación de la cita) ni `'cancelled'` (eso es una acción exclusiva del dueño) por esta vía — el enum de Zod restringe el universo de valores posibles antes de que la petición llegue al controlador.

Nuevo [`routes/admin.routes.js`](../backend/src/routes/admin.routes.js):

```js
router.use(authMiddleware, requireAdmin);
router.get('/appointments', adminController.listAll);
router.patch('/appointments/:id/status', validate(updateStatusSchema), adminController.updateStatus);
```

Montado en [`app.js`](../backend/src/app.js) como `app.use('/api/admin', adminRoutes)`. `listAll()` en el service hace un `JOIN` con `users` para devolver también el nombre y email del dueño de cada cita — el admin necesita saber de quién es cada una.

## 8. El script de seed del primer admin

No hay una pantalla para "convertirte en admin" (sería un agujero de seguridad obvio). En su lugar, un script de una sola vez: [`db/seed-admin.js`](../backend/db/seed-admin.js).

```bash
# En backend/.env agrega:
ADMIN_NAME=Ana Encargada
ADMIN_EMAIL=admin@barberia.com
ADMIN_PASSWORD=una-contraseña-segura

npm run db:seed-admin
```

Si el email ya existe, lo **promueve** (`UPDATE role='admin'`); si no existe, lo **crea** con la contraseña ya hasheada. Estas variables se leen directo de `process.env` dentro del script — no se agregan al schema estricto de [`config/env.js`](../backend/src/config/env.js) porque son opcionales y solo las usa este script puntual, no el arranque normal de la app.

## 9. Pruébalo

```bash
# 1. Migración (segura de re-correr aunque ya tuvieras las tablas)
npm run db:init

# 2. Crear el admin
npm run db:seed-admin

# 3. Login como admin (guarda su cookie aparte)
curl -i -c admin_cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@barberia.com","password":"una-contraseña-segura"}'

# 4. Ver TODAS las citas (con nombre/email de cada dueño)
curl -b admin_cookies.txt http://localhost:3000/api/appointments  # <- ojo, esta es la del cliente
curl -b admin_cookies.txt http://localhost:3000/api/admin/appointments

# 5. Marcar una cita como completada (usa un :id real de la respuesta anterior)
curl -b admin_cookies.txt -X PATCH http://localhost:3000/api/admin/appointments/<ID>/status \
  -H "Content-Type: application/json" -d '{"status":"completed"}'

# 6. Repetir la misma marca -> 409 (ya no está pendiente)
curl -b admin_cookies.txt -X PATCH http://localhost:3000/api/admin/appointments/<ID>/status \
  -H "Content-Type: application/json" -d '{"status":"completed"}'

# 7. Un cliente normal intentando entrar al panel de admin -> 403
curl -b cookies.txt http://localhost:3000/api/admin/appointments
```

## ✅ Checkpoint

- [ ] `npm run db:seed-admin` crea o promueve correctamente al admin.
- [ ] `GET /api/admin/appointments` devuelve TODAS las citas con `user_name`/`user_email`.
- [ ] Cancelar una cita y volver a agendar la misma hora funciona (gracias al índice parcial).
- [ ] Marcar dos veces la misma cita da 409; un cliente normal contra `/api/admin/*` da 403.
- [ ] Sabes explicar la diferencia entre 404 y 409 en `updateStatus`.

**Siguiente:** [Step 10 — Frontend: panel de administración](step-10-panel-de-administracion.md)
