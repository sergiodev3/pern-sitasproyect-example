// Peticiones de autenticación. Los componentes nunca llaman a axios
// directamente: siempre pasan por esta capa de services.
import { api } from './api';
import type { User } from '../types';

export async function register(name: string, email: string, password: string): Promise<User> {
  const { data } = await api.post<{ user: User }>('/auth/register', { name, email, password });
  return data.user;
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post<{ user: User }>('/auth/login', { email, password });
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

// Pregunta al backend si hay una sesión activa (la cookie es HttpOnly,
// así que JavaScript no puede saberlo por sí mismo). Devuelve null si no la hay.
export async function me(): Promise<User | null> {
  try {
    const { data } = await api.get<{ user: User }>('/auth/me');
    return data.user;
  } catch {
    return null; // 401 = no hay sesión: no es un error, es un estado
  }
}
