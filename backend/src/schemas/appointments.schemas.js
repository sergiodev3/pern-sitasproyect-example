// Schemas de Zod para el módulo de citas.
import { z } from 'zod';

export const createAppointmentSchema = z.object({
  title: z
    .string('El título es obligatorio')
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(100, 'El título no puede superar los 100 caracteres'),
  description: z
    .string()
    .trim()
    .max(500, 'La descripción no puede superar los 500 caracteres')
    .optional(),
  // REGLA DE FECHAS: el backend SOLO acepta fechas en formato ISO 8601
  // con zona horaria explícita (ej. "2026-08-15T21:30:00.000Z").
  // El frontend es responsable de convertir la hora local del usuario
  // a UTC antes de enviarla. Así el servidor nunca "adivina" zonas.
  scheduled_at: z
    .iso.datetime({
      offset: true,
      message: 'La fecha debe estar en formato ISO 8601 con zona horaria (ej. 2026-08-15T21:30:00.000Z)',
    })
    // Regla de negocio: no se puede agendar una cita en el pasado.
    // Comparamos INSTANTES (milisegundos desde 1970), no strings:
    // así la comparación es correcta sin importar zonas horarias.
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: 'La cita no puede agendarse en el pasado',
    }),
});

// Para validar el parámetro :id de la URL (debe ser un UUID válido,
// si no PostgreSQL lanzaría un error críptico de sintaxis).
export const appointmentIdSchema = z.uuid('El id de la cita no es un UUID válido');
