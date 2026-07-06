// Middleware GLOBAL de errores. Express lo identifica por sus 4 parámetros.
// Debe registrarse al FINAL de app.js, después de todas las rutas.
import { ApiError } from '../utils/api-error.js';

export function errorMiddleware(err, req, res, next) {
  // Errores previsibles lanzados por nuestros services (409, 404, 401...)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Errores inesperados: se loguean completos en el servidor,
  // pero al cliente NUNCA le filtramos detalles internos (stack, SQL...).
  console.error('💥 Error no controlado:', err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
