// Tipos compartidos de la aplicación.
// Reflejan la forma exacta de los JSON que devuelve la API.

export type UserRole = 'client' | 'admin';

export type AppointmentStatus = 'scheduled' | 'completed' | 'no_show' | 'cancelled';

export interface User {
  id: string;          // UUID
  name: string;
  email: string;
  role: UserRole;
  created_at: string;  // ISO 8601 en UTC, ej. "2026-07-06T18:00:00.000Z"
}

export interface Appointment {
  id: string;               // UUID
  title: string;
  description: string | null;
  scheduled_at: string;     // ISO 8601 en UTC — SIEMPRE. La conversión a
  status: AppointmentStatus;
  created_at: string;       // hora local se hace solo al mostrar (utils/dates.ts)
}

// Forma que devuelve GET /api/admin/appointments: la misma cita más los
// datos de su dueño (vienen del JOIN con users en el backend).
export interface AdminAppointment extends Appointment {
  user_name: string;
  user_email: string;
}

// Forma del error 400 que devuelve el validate.middleware del backend
export interface ApiValidationDetail {
  field: string;
  message: string;
}
