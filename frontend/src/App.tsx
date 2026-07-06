import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Appointments } from './pages/Appointments';
import { NewAppointment } from './pages/NewAppointment';
import { AdminAppointments } from './pages/AdminAppointments';

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

        {/* Ruta de administración: además de requerir sesión, exige role==='admin' */}
        <Route
          path="/admin/appointments"
          element={
            <AdminRoute>
              <AdminAppointments />
            </AdminRoute>
          }
        />

        {/* Cualquier otra ruta -> al panel (y de ahí a login si no hay sesión) */}
        <Route path="*" element={<Navigate to="/appointments" replace />} />
      </Routes>
    </>
  );
}
