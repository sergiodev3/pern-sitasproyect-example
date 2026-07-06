// Capa de SERVICIO: aquí vive el acceso a datos (SQL) y la lógica de negocio.
// Los controladores no saben SQL; los services no saben de req/res.
//
// IMPORTANTE: todas las queries usan parámetros posicionales ($1, $2...).
// NUNCA concatenes valores del usuario dentro del SQL: eso abre la puerta
// a inyección SQL. El driver pg escapa los parámetros por nosotros.
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { ApiError } from '../utils/api-error.js';

const SALT_ROUNDS = 10;

export async function registerUser({ name, email, password }) {
  // bcrypt genera un hash con salt incluido: aunque dos usuarios tengan
  // la misma contraseña, sus hashes serán distintos.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash]
    );
    return rows[0]; // nunca devolvemos password_hash
  } catch (error) {
    // 23505 = unique_violation en PostgreSQL (email ya registrado)
    if (error.code === '23505') {
      throw new ApiError(409, 'Ya existe una cuenta con ese email');
    }
    throw error;
  }
}

export async function validateCredentials({ email, password }) {
  const { rows } = await pool.query(
    `SELECT id, name, email, password_hash, role, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  const user = rows[0];

  // Mismo mensaje si el email no existe o si la contraseña falla:
  // no le confirmamos a un atacante qué emails están registrados.
  if (!user) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  const { password_hash, ...safeUser } = user;
  return safeUser;
}

export async function getUserById(id) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
