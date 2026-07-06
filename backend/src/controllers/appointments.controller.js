import { ApiError } from '../utils/api-error.js';
import { appointmentIdSchema } from '../schemas/appointments.schemas.js';
import * as appointmentsService from '../services/appointments.service.js';

// En todas estas funciones req.userId existe porque el authMiddleware
// se ejecutó antes (ver appointments.routes.js).

export async function list(req, res, next) {
  try {
    const appointments = await appointmentsService.listByUser(req.userId);
    res.json({ appointments });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    // req.body ya fue validado por validate(createAppointmentSchema)
    const appointment = await appointmentsService.create(req.userId, req.body);
    res.status(201).json({ appointment });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const parsedId = appointmentIdSchema.safeParse(req.params.id);
    if (!parsedId.success) {
      throw new ApiError(400, 'El id de la cita no es válido');
    }
    await appointmentsService.remove(req.userId, parsedId.data);
    res.status(204).send(); // 204 = OK sin contenido
  } catch (error) {
    next(error);
  }
}
