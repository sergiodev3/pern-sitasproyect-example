// Restringe rutas a usuarios con role='admin'. SIEMPRE se encadena
// después de authMiddleware (necesita que req.userRole ya exista).
import { ApiError } from '../utils/api-error.js';

export function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return next(new ApiError(403, 'Acceso solo para administradores'));
  }
  next();
}
