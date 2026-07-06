// Punto de entrada: arranca el servidor HTTP.
import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const server = app.listen(env.PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${env.PORT}`);
  console.log(`   Zona horaria del servidor: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log('   (Las fechas se guardan SIEMPRE en UTC, la zona del servidor no importa)');
});

// Cierre ordenado: al detener el proceso (Ctrl+C o deploy nuevo),
// dejamos de aceptar peticiones y cerramos las conexiones del pool.
process.on('SIGINT', async () => {
  console.log('\nCerrando servidor...');
  server.close();
  await pool.end();
  process.exit(0);
});
