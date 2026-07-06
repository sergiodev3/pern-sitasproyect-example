// Instancia de axios compartida por todos los services.
import axios from 'axios';
import type { ApiValidationDetail } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  // CLAVE: withCredentials hace que el navegador envíe y acepte cookies
  // en peticiones a otro origen. Sin esto, la cookie HttpOnly del login
  // jamás llegaría al backend y todas las rutas protegidas darían 401.
  //
  // Nota de seguridad: el token NUNCA pasa por JavaScript. No hay
  // localStorage, no hay "Authorization: Bearer ...". La cookie viaja
  // sola y un script malicioso (XSS) no puede leerla.
  withCredentials: true,
});

// Extrae un mensaje legible de cualquier error de la API.
// El backend responde { error: "..." } y, en validaciones,
// además { details: [{ field, message }] }.
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data as {
      error?: string;
      details?: ApiValidationDetail[];
    };
    if (data.details?.length) {
      return data.details.map((d) => d.message).join('. ');
    }
    if (data.error) {
      return data.error;
    }
  }
  return 'Error de conexión con el servidor';
}
