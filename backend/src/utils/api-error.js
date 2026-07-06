// Error "controlado" de la aplicación: lleva un código HTTP asociado.
// Los services lanzan ApiError cuando algo previsible sale mal
// (email duplicado, cita no encontrada...) y el error.middleware
// lo convierte en la respuesta HTTP correspondiente.
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
