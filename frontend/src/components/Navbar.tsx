import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/appointments" className="navbar-brand">
        📅 Reservas
      </Link>
      {user && (
        <div className="navbar-actions">
          {user.role === 'admin' && (
            <Link to="/admin/appointments" className="navbar-link">
              Panel Admin
            </Link>
          )}
          <span className="navbar-user">Hola, {user.name}</span>
          <button onClick={handleLogout} className="btn btn-secondary">
            Cerrar sesión
          </button>
        </div>
      )}
    </nav>
  );
}
