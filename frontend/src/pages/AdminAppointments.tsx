import { useEffect, useState } from 'react';
import type { AdminAppointment } from '../types';
import * as adminService from '../services/admin.service';
import { getApiErrorMessage } from '../services/api';
import { formatLocal } from '../utils/dates';
import { STATUS_LABELS } from '../utils/status';

export function AdminAppointments() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminService
      .listAllAppointments()
      .then(setAppointments)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleUpdateStatus(id: string, status: 'completed' | 'no_show') {
    try {
      const updated = await adminService.updateAppointmentStatus(id, status);
      setAppointments((current) => current.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Panel de administración</h1>
      </header>

      {error && <p className="form-error">{error}</p>}
      {isLoading && <p className="loading">Cargando citas…</p>}

      {!isLoading && appointments.length === 0 && (
        <p className="empty-state">Todavía no hay citas agendadas.</p>
      )}

      <section className="card-list">
        {appointments.map((appointment) => (
          <article key={appointment.id} className="card">
            <div className="card-body">
              <h3>{appointment.title}</h3>
              <p className="card-owner">
                👤 {appointment.user_name} ({appointment.user_email})
              </p>
              <p className="card-date">🕐 {formatLocal(appointment.scheduled_at)}</p>
              {appointment.description && (
                <p className="card-description">{appointment.description}</p>
              )}
              <span className={`badge badge-${appointment.status}`}>
                {STATUS_LABELS[appointment.status]}
              </span>
            </div>

            {appointment.status === 'scheduled' && (
              <div className="card-actions">
                <button
                  onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                  className="btn btn-primary"
                >
                  Marcar completada
                </button>
                <button
                  onClick={() => handleUpdateStatus(appointment.id, 'no_show')}
                  className="btn btn-danger"
                >
                  Marcar no asistió
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
