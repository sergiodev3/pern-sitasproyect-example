import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAppointmentSchema } from '../schemas/appointments.schemas.js';
import * as appointmentsController from '../controllers/appointments.controller.js';

const router = Router();

// router.use aplica el middleware a TODAS las rutas de este router:
// nadie ve ni crea citas sin estar autenticado.
router.use(authMiddleware);

router.get('/', appointmentsController.list);
router.post('/', validate(createAppointmentSchema), appointmentsController.create);
router.delete('/:id', appointmentsController.remove);

// Ejercicio para el alumno: implementa PUT /:id para reprogramar una cita.
// Pistas: valida el body con un schema de Zod, actualiza con
// "UPDATE ... WHERE id = $X AND user_id = $Y" y maneja el error 23505.

export default router;
