-- ============================================================
-- Schema de la Mini Plataforma de Reservas y Citas
-- Ejecutar con:  npm run db:init   (o con psql -f db/schema.sql)
-- ============================================================

-- NOTA SOBRE UUIDs:
-- Usamos gen_random_uuid(), disponible de forma NATIVA desde PostgreSQL 13.
-- En versiones antiguas habría que habilitar una extensión:
--   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  y usar uuid_generate_v4()
-- Preferimos UUID sobre SERIAL porque:
--   1. No expone cuántos registros existen (un id "42" revela información).
--   2. Evita colisiones al migrar o fusionar bases de datos.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,            -- NUNCA guardamos la contraseña en texto plano
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTA SOBRE FECHAS:
-- TIMESTAMPTZ (timestamp with time zone) guarda SIEMPRE el instante en UTC.
-- TIMESTAMP (sin zona) guarda "la hora que le llegue" sin contexto: si tu
-- servidor gratuito corre en UTC y tu usuario está en GMT-6, las citas se
-- desfasarían 6 horas. Con TIMESTAMPTZ el instante es inequívoco y cada
-- cliente lo formatea a su hora local.

CREATE TABLE IF NOT EXISTS appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,      -- instante de la cita, siempre en UTC
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Regla de negocio a nivel de base de datos: un usuario no puede tener
  -- dos citas a la misma hora exacta. Aunque el backend también lo valida,
  -- la base de datos es la ÚLTIMA línea de defensa (condiciones de carrera).
  -- (Este UNIQUE se reemplaza más abajo por un índice parcial, una vez que
  -- el cancelado deja de ser un DELETE físico.)
  CONSTRAINT appointments_user_schedule_unique UNIQUE (user_id, scheduled_at)
);

-- ============================================================
-- ROLES DE USUARIO Y ESTADO DE CITAS
-- ADD COLUMN IF NOT EXISTS hace que volver a correr `npm run db:init`
-- sea seguro en instalaciones que ya tenían las tablas creadas
-- (mismo patrón idempotente que el resto de este archivo).
-- ============================================================

-- TEXT + CHECK en vez de un ENUM nativo de Postgres: mismo espíritu de
-- simplicidad que la elección de UUID sin extensiones. Un ENUM de Postgres
-- es más "elegante" pero agregar/quitar valores después (ALTER TYPE) tiene
-- reglas especiales; con CHECK basta con editar la lista de valores aquí.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client'
    CHECK (role IN ('client', 'admin'));

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled'));

-- Con el cancelado ahora como cambio de estado (no DELETE físico), la
-- restricción UNIQUE original seguiría contando la fila 'cancelled' e
-- impediría volver a agendar la misma hora tras cancelar. La sustituimos
-- por un índice único PARCIAL que ignora las citas canceladas.
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_user_schedule_unique;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_user_schedule_unique
  ON appointments (user_id, scheduled_at)
  WHERE status <> 'cancelled';
