// Envuelve las rutas privadas: si no hay sesión, redirige a /login.
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  // Mientras /auth/me responde, no sabemos si hay sesión:
  // mostramos un estado de carga en vez de expulsar al usuario.
  if (isLoading) {
    return <p className="loading">Cargando…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
