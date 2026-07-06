import { z } from 'zod';

// El admin SOLO puede marcar una cita como completada o no-show por esta
// vía. 'scheduled' y 'cancelled' quedan fuera a propósito: el estado inicial
// lo pone la creación de la cita, y cancelar es una acción exclusiva del
// dueño de la cita (ver appointments.service.js -> remove).
export const updateStatusSchema = z.object({
  status: z.enum(['completed', 'no_show'], 'Estado no válido'),
});
