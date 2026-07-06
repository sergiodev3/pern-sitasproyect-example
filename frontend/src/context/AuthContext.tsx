// Estado GLOBAL de autenticación. Cualquier componente puede saber quién
// está logueado (o si aún lo estamos comprobando) a través del hook useAuth.
import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types';
import * as authService from '../services/auth.service';

interface AuthContextValue {
  user: User | null;
  // true mientras preguntamos al backend si hay sesión. Importante:
  // sin este estado, al recargar la página las rutas protegidas te
  // expulsarían al login ANTES de que /auth/me respondiera.
  isLoading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar la app, restauramos la sesión: como la cookie es HttpOnly,
  // la única forma de saber si seguimos logueados es preguntarle a la API.
  useEffect(() => {
    authService
      .me()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  async function register(name: string, email: string, password: string) {
    const newUser = await authService.register(name, email, password);
    setUser(newUser); // el backend ya dejó puesta la cookie de sesión
  }

  async function login(email: string, password: string) {
    const loggedUser = await authService.login(email, password);
    setUser(loggedUser);
  }

  async function logout() {
    await authService.logout(); // el backend borra la cookie
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
