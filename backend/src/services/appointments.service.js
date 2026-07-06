// Service de citas: SQL con parámetros posicionales, siempre filtrando
// por user_id para que un usuario JAMÁS pueda ver o borrar citas ajenas.
import { pool } from '../config/db.js';
import { ApiError } from '../utils/api-error.js';

export async function listByUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, title, description, scheduled_at, created_at
     FROM appointments
     WHERE user_id = $1
     ORDER BY scheduled_at ASC`,
    [userId]
  );
  // pg convierte TIMESTAMPTZ a objetos Date de JS; al serializarlos con
  // res.json() salen como strings ISO en UTC (ej. "2026-08-15T21:30:00.000Z").
  return rows;
}

export async function create(userId, { title, description, scheduled_at }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO appointments (user_id, title, description, scheduled_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, scheduled_at, created_at`,
      [userId, title, description ?? null, scheduled_at]
    );
    return rows[0];
  } catch (error) {
    // 23505 = violación del UNIQUE (user_id, scheduled_at) del schema.sql.
    // Segunda línea de defensa: aunque dos peticiones lleguen a la vez
    // (condición de carrera), la base de datos garantiza la regla.
    if (error.code === '23505') {
      throw new ApiError(409, 'Ya tienes una cita agendada a esa misma hora');
    }
    throw error;
  }
}

export async function remove(userId, appointmentId) {
  // El WHERE incluye user_id: si la cita existe pero es de OTRO usuario,
  // rowCount será 0 y respondemos 404 (sin revelar que existe).
  const { rowCount } = await pool.query(
    `DELETE FROM appointments
     WHERE id = $1 AND user_id = $2`,
    [appointmentId, userId]
  );

  if (rowCount === 0) {
    throw new ApiError(404, 'Cita no encontrada');
  }
}
