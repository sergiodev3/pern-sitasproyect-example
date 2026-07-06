// Capa de RUTAS: define los endpoints y encadena los middlewares.
// El flujo de una petición es:
//   Ruta -> validate(schema) -> [authMiddleware] -> Controlador -> Service
import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { registerSchema, loginSchema } from '../schemas/auth.schemas.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);

export default router;
