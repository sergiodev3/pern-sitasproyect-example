// Crea o promueve un usuario a role='admin'. Se corre una sola vez con:
//   npm run db:seed-admin
// Requiere ADMIN_EMAIL y ADMIN_PASSWORD (ADMIN_NAME es opcional) en el .env.
// Se leen directamente de process.env porque son opcionales y solo se usan
// aquí: no forman parte del schema estricto de src/config/env.js, que valida
// las variables que la APP necesita para arrancar (esto es un script aparte).
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';

const SALT_ROUNDS = 10; // igual que en src/services/auth.service.js

const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Define ADMIN_EMAIL y ADMIN_PASSWORD en tu .env antes de correr este script.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

try {
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [ADMIN_EMAIL]);

  if (rows.length > 0) {
    // Ya existe: solo lo promovemos. Si tenía sesión iniciada, deberá volver
    // a loguearse para recibir un JWT nuevo con role:'admin' (ver el
    // comentario sobre "staleness" en auth.controller.js).
    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [ADMIN_EMAIL]);
    console.log(`✅ Usuario existente '${ADMIN_EMAIL}' promovido a admin`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')`,
      [ADMIN_NAME ?? 'Admin', ADMIN_EMAIL, passwordHash]
    );
    console.log(`✅ Usuario admin '${ADMIN_EMAIL}' creado`);
  }
} catch (error) {
  console.error('❌ Error al crear/promover el admin:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
