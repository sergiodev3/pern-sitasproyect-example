// Tipos compartidos de la aplicación.
// Reflejan la forma exacta de los JSON que devuelve la API.

export interface User {
  id: string;          // UUID
  name: string;
  email: string;
  created_at: string;  // ISO 8601 en UTC, ej. "2026-07-06T18:00:00.000Z"
}

export interface Appointment {
  id: string;               // UUID
  title: string;
  description: string | null;
  scheduled_at: string;     // ISO 8601 en UTC — SIEMPRE. La conversión a
  created_at: string;       // hora local se hace solo al mostrar (utils/dates.ts)
}

// Forma del error 400 que devuelve el validate.middleware del backend
export interface ApiValidationDetail {
  field: string;
  message: string;
}
