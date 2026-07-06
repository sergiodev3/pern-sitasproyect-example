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
  CONSTRAINT appointments_user_schedule_unique UNIQUE (user_id, scheduled_at)
);
