import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateStatusSchema } from '../schemas/admin.schemas.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// Primero autenticado, LUEGO admin: si no hay sesión, 401 antes que 403.
router.use(authMiddleware, requireAdmin);

router.get('/appointments', adminController.listAll);
router.patch('/appointments/:id/status', validate(updateStatusSchema), adminController.updateStatus);

export default router;
