// Protege rutas: solo deja pasar peticiones con un JWT válido.
// El token viaja en una cookie HttpOnly llamada "token" (la puso el
// backend en el login); el navegador la adjunta automáticamente en
// cada petición gracias a withCredentials en el frontend.
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function authMiddleware(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    // Guardamos el id y el rol del usuario en la request para que los
    // controladores (y el middleware requireAdmin) sepan QUIÉN hace la
    // petición y con qué privilegios.
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
