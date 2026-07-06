// Script de inicialización: ejecuta db/schema.sql contra la base de datos
// indicada en DATABASE_URL. Se corre una sola vez con:  npm run db:init
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(schema);
  console.log('✅ Tablas creadas correctamente (users, appointments)');
} catch (error) {
  console.error('❌ Error al inicializar la base de datos:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
