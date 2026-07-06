// Pool de conexiones a PostgreSQL.
// Un Pool mantiene varias conexiones abiertas y las reutiliza entre
// peticiones: abrir una conexión nueva por cada query sería lentísimo.
import pg from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

// Si una conexión inactiva del pool falla (ej. la DB se reinició),
// lo registramos en vez de dejar que tumbe el proceso.
pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});
