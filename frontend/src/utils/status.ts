import type { AppointmentStatus } from '../types';

// Mapa compartido entre la vista del cliente (AppointmentCard) y la del
// admin (AdminAppointments), para no duplicar las etiquetas en dos lugares.
export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendada',
  completed: 'Completada',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
};
