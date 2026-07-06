// Service de citas: SQL con parámetros posicionales, siempre filtrando
// por user_id para que un usuario JAMÁS pueda ver o borrar citas ajenas
// (salvo listAll/updateStatus, de uso exclusivo del admin).
import { pool } from '../config/db.js';
import { ApiError } from '../utils/api-error.js';

export async function listByUser(userId) {
  // Se devuelve el historial COMPLETO (incluye canceladas/completadas/no-show):
  // el cliente puede ver qué pasó con cada cita, no solo las pendientes.
  const { rows } = await pool.query(
    `SELECT id, title, description, scheduled_at, status, created_at
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
       RETURNING id, title, description, scheduled_at, status, created_at`,
      [userId, title, description ?? null, scheduled_at]
    );
    return rows[0];
  } catch (error) {
    // 23505 = violación del índice único (user_id, scheduled_at) del schema.sql.
    // Segunda línea de defensa: aunque dos peticiones lleguen a la vez
    // (condición de carrera), la base de datos garantiza la regla.
    if (error.code === '23505') {
      throw new ApiError(409, 'Ya tienes una cita agendada a esa misma hora');
    }
    throw error;
  }
}

// Cancelar YA NO borra la fila: cambia su estado a 'cancelled' para que el
// admin conserve el historial completo. El UPDATE solo afecta citas que
// sigan 'scheduled' (no tiene sentido "cancelar" algo ya completado).
export async function remove(userId, appointmentId) {
  const { rows } = await pool.query(
    `UPDATE appointments
     SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2 AND status = 'scheduled'
     RETURNING id`,
    [appointmentId, userId]
  );

  if (rows.length > 0) return;

  // El UPDATE no afectó filas: puede ser porque la cita no existe/no es
  // tuya (404), o porque existe pero ya no está 'scheduled' (409). Esta
  // segunda consulta solo se ejecuta para dar el mensaje correcto en cada
  // caso — no es necesaria para la seguridad (el UPDATE de arriba ya es
  // atómico y seguro ante condiciones de carrera).
  const { rows: existing } = await pool.query(
    `SELECT id FROM appointments WHERE id = $1 AND user_id = $2`,
    [appointmentId, userId]
  );
  if (existing.length === 0) {
    throw new ApiError(404, 'Cita no encontrada');
  }
  throw new ApiError(409, 'Esta cita ya no se puede cancelar (no está pendiente)');
}

// Uso exclusivo del admin: TODAS las citas de TODOS los usuarios, con el
// nombre/email de cada dueño gracias al JOIN.
export async function listAll() {
  const { rows } = await pool.query(
    `SELECT a.id, a.title, a.description, a.scheduled_at, a.status, a.created_at,
            u.name AS user_name, u.email AS user_email
     FROM appointments a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.scheduled_at ASC`
  );
  return rows;
}

// Uso exclusivo del admin: marcar una cita como 'completed' o 'no_show'.
// No se filtra por user_id (el admin puede actuar sobre citas de cualquiera),
// pero solo se permite la transición desde 'scheduled'.
export async function updateStatus(appointmentId, status) {
  const { rows } = await pool.query(
    `UPDATE appointments
     SET status = $2
     WHERE id = $1 AND status = 'scheduled'
     RETURNING id, title, description, scheduled_at, status, created_at`,
    [appointmentId, status]
  );

  if (rows.length > 0) return rows[0];

  const { rows: existing } = await pool.query(
    `SELECT id FROM appointments WHERE id = $1`,
    [appointmentId]
  );
  if (existing.length === 0) {
    throw new ApiError(404, 'Cita no encontrada');
  }
  throw new ApiError(409, 'La cita ya no está pendiente');
}
