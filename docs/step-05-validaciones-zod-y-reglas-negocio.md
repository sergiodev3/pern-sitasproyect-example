# Step 05 — Validaciones con Zod y reglas de negocio

> **Objetivo:** que NINGÚN dato entre a los controladores sin pasar por un schema de Zod, con errores 400 estructurados; e implementar las dos reglas de negocio de las citas.

## 1. El middleware genérico ([`middlewares/validate.middleware.js`](../backend/src/middlewares/validate.middleware.js))

En vez de validar a mano en cada controlador (`if (!req.body.email) ...` ×20), escribimos UNA función que recibe un schema y devuelve un middleware:

```js
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validación fallida',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    });
  }

  req.body = result.data; // body ya limpio: trims, lowercase, defaults aplicados
  next();
};
```

**Puntos didácticos:**

- `safeParse` no lanza excepciones: devuelve `{ success, data | error }`. Ideal para middlewares.
- La respuesta 400 es **estructurada y predecible**: el frontend puede pintar cada `message` junto a su `field` sin parsear strings.
- Reemplazamos `req.body` con `result.data`: los controladores reciben datos **ya normalizados** (Zod aplicó `.trim()`, `.toLowerCase()`, etc.).

Ejemplo de respuesta ante un body malo:

```json
{
  "error": "Validación fallida",
  "details": [
    { "field": "title", "message": "El título debe tener al menos 3 caracteres" },
    { "field": "scheduled_at", "message": "La cita no puede agendarse en el pasado" }
  ]
}
```

## 2. Los schemas ([`schemas/`](../backend/src/schemas))

```js
// auth.schemas.js
export const registerSchema = z.object({
  name: z.string('El nombre es obligatorio').trim().min(2, '...'),
  email: z.email('El email no tiene un formato válido').toLowerCase(),
  password: z.string('La contraseña es obligatoria').min(8, '...'),
});
```

> `.toLowerCase()` en el email evita el clásico bug de "Ana@Mail.com no puede hacer login porque se registró como ana@mail.com".

## 3. Regla de negocio 1: no citas en el pasado

En [`schemas/appointments.schemas.js`](../backend/src/schemas/appointments.schemas.js):

```js
scheduled_at: z
  .iso.datetime({ offset: true, message: 'La fecha debe estar en formato ISO 8601 con zona horaria' })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'La cita no puede agendarse en el pasado',
  }),
```

Dos cosas importantes:

- `z.iso.datetime({ offset: true })` — solo acepta strings ISO 8601 **con zona horaria explícita** (`...Z` o `...-06:00`). Una fecha "pelona" como `2026-08-15 15:00` se rechaza: ¿15:00 de dónde? El backend no adivina zonas.
- El `.refine` compara **instantes** (`getTime()` = milisegundos desde 1970), no strings ni horas locales. Así la regla es correcta aunque el usuario esté en Tokio y el servidor en Virginia.

## 4. Regla de negocio 2: no duplicar cita a la misma hora

Esta regla vive en **dos capas**, y es deliberado:

**Capa 1 — la base de datos** (del [Step 02](step-02-schema-sql-uuid-timestamptz.md)):

```sql
CONSTRAINT appointments_user_schedule_unique UNIQUE (user_id, scheduled_at)
```

**Capa 2 — el service** ([`services/appointments.service.js`](../backend/src/services/appointments.service.js)) traduce la violación a un error amigable:

```js
} catch (error) {
  if (error.code === '23505') {  // unique_violation de PostgreSQL
    throw new ApiError(409, 'Ya tienes una cita agendada a esa misma hora');
  }
  throw error;
}
```

**¿Por qué no simplemente hacer un `SELECT` antes del `INSERT`?** Por las **condiciones de carrera**: si dos peticiones llegan al mismo tiempo, ambas pasan el SELECT (no ven nada) y ambas insertan. Solo la base de datos, con su constraint, puede arbitrar. El patrón profesional es: *intenta la operación y maneja el conflicto*, no *pregunta y luego actúa*.

## 5. Autorización a nivel de query

Fíjate que TODAS las queries de citas filtran por `user_id`:

```sql
DELETE FROM appointments WHERE id = $1 AND user_id = $2
```

Si la cita existe pero es de otro usuario, `rowCount` es 0 → respondemos **404** (ni siquiera revelamos que existe). Esto previene el fallo de seguridad más común en APIs: IDOR (Insecure Direct Object Reference) — "cambio el id de la URL y veo las citas de otro".

## 6. Pruébalo

```bash
# (usa la cookie del step anterior: -b cookies.txt)

# Fecha en el pasado → 400 estructurado
curl -b cookies.txt -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"title":"Dentista","scheduled_at":"2020-01-01T10:00:00.000Z"}'

# Fecha sin zona horaria → 400 (formato inválido)
curl -b cookies.txt -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"title":"Dentista","scheduled_at":"2030-01-01 10:00"}'

# Cita válida → 201
curl -b cookies.txt -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{"title":"Dentista","scheduled_at":"2030-01-01T16:00:00.000Z"}'

# La misma otra vez → 409
# (repite el comando anterior)
```

## ✅ Checkpoint

- [ ] Un body inválido devuelve 400 con `details` por campo.
- [ ] Fecha pasada → 400; cita duplicada → 409; cita ajena → 404.
- [ ] Sabes explicar por qué el UNIQUE en la DB es necesario aunque "ya validamos en el código".

**Ejercicio:** implementa `PUT /api/appointments/:id` para reprogramar una cita (la pista está comentada en [`routes/appointments.routes.js`](../backend/src/routes/appointments.routes.js)).

**Siguiente:** [Step 06 — Frontend: React + Vite + TypeScript](step-06-frontend-react-vite-ts.md)
