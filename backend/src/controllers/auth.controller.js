// Capa de CONTROLADOR: extrae datos de la petición HTTP, llama al service
// y arma la respuesta. Cualquier error se delega a next(err) para que lo
// maneje el error.middleware global.
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as authService from '../services/auth.service.js';

// Opciones de la cookie de sesión. Este es EL punto de seguridad clave:
// - httpOnly: el JavaScript del navegador NO puede leer la cookie.
//   Si un atacante inyecta un script (XSS), no podrá robar el token.
//   (Con localStorage sí podría: por eso NO guardamos tokens ahí.)
// - secure: solo viaja por HTTPS (obligatorio en producción).
// - sameSite: 'lax' en desarrollo (frontend y backend en localhost);
//   'none' en producción si frontend y backend viven en dominios distintos
//   (ej. Vercel + Render), y 'none' EXIGE secure: true.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 día, igual que la expiración del JWT
};

function signToken(userId) {
  // 'sub' (subject) es el claim estándar de JWT para "de quién es el token"
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '1d' });
}

export async function register(req, res, next) {
  try {
    const user = await authService.registerUser(req.body);
    res.cookie('token', signToken(user.id), COOKIE_OPTIONS);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const user = await authService.validateCredentials(req.body);
    res.cookie('token', signToken(user.id), COOKIE_OPTIONS);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export function logout(req, res) {
  // Para que el navegador borre la cookie hay que limpiarla con las
  // mismas opciones (salvo maxAge) con las que fue creada.
  const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
  res.clearCookie('token', clearOptions);
  res.json({ message: 'Sesión cerrada' });
}

// El frontend llama a /me al cargar la página para saber si hay sesión
// activa: como la cookie es HttpOnly, JavaScript no puede comprobarlo solo.
export async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
