// Igual que ProtectedRoute, pero además exige role==='admin'. Un cliente
// normal que intente entrar a /admin/appointments es redirigido a su
// propia lista de citas (esto es solo UX: la seguridad real la hace
// requireAdmin en el backend, que rechaza la petición con 403).
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="loading">Cargando…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/appointments" replace />;
  }

  return children;
}
