// Schemas de Zod para las rutas de autenticación.
// Definen la "forma" exacta que debe tener el body de cada petición.
import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string('El nombre es obligatorio')
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z
    .email('El email no tiene un formato válido')
    .toLowerCase(), // normalizamos: Ana@Mail.com y ana@mail.com son la misma cuenta
  password: z
    .string('La contraseña es obligatoria')
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const loginSchema = z.object({
  email: z.email('El email no tiene un formato válido').toLowerCase(),
  password: z.string('La contraseña es obligatoria').min(1, 'La contraseña es obligatoria'),
});
