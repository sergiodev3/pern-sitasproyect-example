// ============================================================
// EL VIAJE DE UNA FECHA en esta app:
//
//   input datetime-local  ──►  ISO/UTC  ──►  API  ──►  TIMESTAMPTZ (Postgres)
//   (hora local usuario)                                      │
//   pantalla en hora local ◄── Intl.DateTimeFormat ◄── ISO/UTC (respuesta API)
//
// El servidor y la base de datos SOLO conocen UTC. La zona horaria
// del usuario solo existe en estas dos funciones.
// ============================================================

// Convierte el valor de un <input type="datetime-local"> (ej. "2026-08-15T15:00",
// que está en la hora LOCAL del navegador, sin zona) a ISO 8601 en UTC.
// new Date() interpreta ese string como hora local, y toISOString()
// devuelve el mismo instante expresado en UTC (con la Z final).
export function localInputToUtc(datetimeLocalValue: string): string {
  return new Date(datetimeLocalValue).toISOString();
}

// Formatea un instante UTC de la API (ej. "2026-08-15T21:00:00.000Z")
// en la zona horaria y el idioma del navegador del usuario.
// `undefined` como locale = usar la configuración del navegador.
export function formatLocal(isoUtc: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(isoUtc));
}

// Valor mínimo para el input datetime-local (= ahora, en hora local),
// para que el navegador no deje elegir fechas pasadas. Es solo UX:
// la validación REAL vive en el backend (Zod + regla de negocio).
export function nowForInputMin(): string {
  const now = new Date();
  // toISOString() da UTC; restamos el offset para obtener la hora local
  // en el formato "YYYY-MM-DDTHH:mm" que espera el input.
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}
