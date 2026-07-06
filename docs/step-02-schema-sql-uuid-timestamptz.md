# Step 02 — Schema SQL: UUIDs y TIMESTAMPTZ

> **Objetivo:** diseñar las tablas `users` y `appointments` entendiendo dos decisiones que separan un proyecto de juguete de uno profesional: **UUID vs SERIAL** y **TIMESTAMPTZ vs TIMESTAMP**.

## 1. ¿Por qué UUID y no SERIAL?

En MongoDB los ids (`ObjectId`) ya venían "aleatorios". En SQL lo clásico es `SERIAL` (1, 2, 3...), pero tiene problemas reales:

| | `SERIAL` (1, 2, 3...) | `UUID` |
|---|---|---|
| ¿Expone información? | Sí: si tu cita es la `/api/appointments/42`, un atacante sabe que existen al menos 42 citas y puede probar la 41 y la 43 | No: `550e8400-e29b-...` es imposible de adivinar |
| Colisiones al migrar/fusionar bases | Frecuentes (dos tablas con id=1) | Prácticamente imposibles |
| ¿Se puede generar en el cliente? | No, hay que esperar a la DB | Sí, si hiciera falta |

Desde PostgreSQL 13, `gen_random_uuid()` viene **integrado** — no necesitas extensiones:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

> **Nota histórica:** en tutoriales antiguos verás `CREATE EXTENSION "uuid-ossp";` y `uuid_generate_v4()`. Funciona igual, pero ya no es necesario en Postgres moderno.

## 2. ¿Por qué TIMESTAMPTZ y no TIMESTAMP?

Este es **el bug clásico** de las apps de citas/reservas. Imagina:

1. Tu usuario está en Ciudad de México (UTC-6) y agenda una cita para las **15:00**.
2. Tu backend está desplegado en Render/Railway, cuyos servidores corren en **UTC**.
3. Si la columna es `TIMESTAMP` (sin zona), Postgres guarda "15:00" **sin saber 15:00 de dónde**.
4. Al leerla, cada capa interpreta ese "15:00" como le da la gana → la cita aparece a las 09:00 o a las 21:00 según quién la lea. 💥

Con `TIMESTAMPTZ` (timestamp **with time zone**):

- Postgres convierte todo a **UTC al guardar**. El instante queda inequívoco.
- Al leer, el driver devuelve ese instante exacto, y cada cliente lo formatea a SU zona.
- No importa dónde esté el servidor: Virginia, Frankfurt o tu laptop.

**Regla del proyecto:** toda columna de fecha/hora es `TIMESTAMPTZ`, y la API solo habla ISO 8601 en UTC (ej. `2026-08-15T21:00:00.000Z`). La "traducción" a hora local es trabajo exclusivo del frontend ([Step 07](step-07-fechas-utc-frontend.md)).

## 3. El schema completo

Crea `backend/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointments_user_schedule_unique UNIQUE (user_id, scheduled_at)
);
```

**Detalles que importan:**

- `password_hash` — jamás guardamos contraseñas en texto plano; guardamos su hash bcrypt ([Step 04](step-04-auth-jwt-httponly-cookies.md)).
- `REFERENCES users(id) ON DELETE CASCADE` — **llave foránea**: cada cita pertenece a un usuario, y si el usuario se borra, sus citas se van con él. En MongoDB esto lo hacías "a mano"; en SQL la base lo garantiza.
- `UNIQUE (user_id, scheduled_at)` — regla de negocio a nivel de base de datos: un usuario no puede tener dos citas a la misma hora exacta. El backend también lo validará, pero la DB es la última línea de defensa (piensa en dos peticiones simultáneas: solo la base puede arbitrar esa carrera).
- `IF NOT EXISTS` — permite re-ejecutar el script sin errores.

## 4. Ejecutar el schema

Dos opciones:

**Opción A — con psql:**

```bash
docker exec -i reservas_db psql -U reservas_user -d reservas_db < backend/db/schema.sql
```

**Opción B — script Node (la que automatizaremos como `npm run db:init` en el Step 03):** un pequeño script que lee `schema.sql` y lo ejecuta con el driver `pg`. Lo veremos al montar el backend.

## 5. Verificar

```bash
docker exec -it reservas_db psql -U reservas_user -d reservas_db
```

```sql
\dt                      -- lista de tablas: deben salir users y appointments
\d appointments          -- describe la tabla: fíjate en "timestamp with time zone"

-- Experimento de zonas horarias:
INSERT INTO users (name, email, password_hash) VALUES ('Test', 'test@test.com', 'x');
INSERT INTO appointments (user_id, title, scheduled_at)
SELECT id, 'Prueba', '2026-12-01T15:00:00-06:00' FROM users WHERE email = 'test@test.com';

SELECT scheduled_at FROM appointments;
-- Resultado: 2026-12-01 21:00:00+00  ← ¡Postgres lo convirtió a UTC!
-- Le dimos "15:00 en UTC-6" y guardó "21:00 UTC": el MISMO instante.

-- Limpieza:
DELETE FROM users WHERE email = 'test@test.com';  -- el CASCADE borra la cita
\q
```

## ✅ Checkpoint

- [ ] `\dt` muestra `users` y `appointments`.
- [ ] Entiendes por qué `'2026-12-01T15:00:00-06:00'` se guardó como `21:00:00+00`.
- [ ] Sabes explicar con tus palabras qué pasaría con `TIMESTAMP` sin zona en un servidor UTC.

**Siguiente:** [Step 03 — Backend: arquitectura de capas](step-03-backend-arquitectura-capas.md)
