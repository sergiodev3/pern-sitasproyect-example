import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Appointments } from './pages/Appointments';
import { NewAppointment } from './pages/NewAppointment';

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        {/* Rutas públicas: si ya hay sesión, te mandan directo al panel */}
        <Route path="/login" element={user ? <Navigate to="/appointments" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/appointments" replace /> : <Register />} />

        {/* Rutas protegidas: sin sesión, ProtectedRoute redirige a /login */}
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <Appointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments/new"
          element={
            <ProtectedRoute>
              <NewAppointment />
            </ProtectedRoute>
          }
        />

        {/* Cualquier otra ruta -> al panel (y de ahí a login si no hay sesión) */}
        <Route path="*" element={<Navigate to="/appointments" replace />} />
      </Routes>
    </>
  );
}
