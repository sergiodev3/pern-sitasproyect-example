import { ApiError } from '../utils/api-error.js';
import { appointmentIdSchema } from '../schemas/appointments.schemas.js';
import * as appointmentsService from '../services/appointments.service.js';

// req.userRole ya fue verificado por requireAdmin antes de llegar aquí
// (ver routes/admin.routes.js).

export async function listAll(req, res, next) {
  try {
    const appointments = await appointmentsService.listAll();
    res.json({ appointments });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const parsedId = appointmentIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      throw new ApiError(400, 'El id de la cita no es válido');
    }
    // req.body.status ya fue validado por validate(updateStatusSchema)
    const appointment = await appointmentsService.updateStatus(parsedId.data, req.body.status);
    res.json({ appointment });
  } catch (error) {
    next(error);
  }
}
