// Configuración de la aplicación Express: middlewares globales y rutas.
// (El arranque del servidor vive en index.js; separar app de servidor
// facilita los tests y mantiene cada archivo con una sola responsabilidad.)
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

const app = express();

// CORS: como el frontend (5173) y el backend (3000) son orígenes distintos,
// el navegador bloquea las peticiones salvo que lo permitamos explícitamente.
// credentials: true es OBLIGATORIO para que las cookies viajen entre orígenes;
// y con credentials el origin NO puede ser '*', debe ser la URL exacta.
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

app.use(express.json());   // parsea bodies JSON -> req.body
app.use(cookieParser());   // parsea cookies -> req.cookies

// Endpoint de salud: útil para probar que la API vive y para los
// health checks de plataformas como Render o Railway.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTimeUtc: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentsRoutes);

// 404 para cualquier ruta no definida arriba
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// El middleware de errores SIEMPRE va al final
app.use(errorMiddleware);

export default app;
