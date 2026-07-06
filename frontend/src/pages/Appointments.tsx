import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Appointment } from '../types';
import * as appointmentsService from '../services/appointments.service';
import { getApiErrorMessage } from '../services/api';
import { AppointmentCard } from '../components/AppointmentCard';

export function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    appointmentsService
      .listAppointments()
      .then(setAppointments)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('¿Seguro que quieres cancelar esta cita?')) return;
    try {
      await appointmentsService.deleteAppointment(id);
      setAppointments((current) => current.filter((a) => a.id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Mis citas</h1>
        <Link to="/appointments/new" className="btn btn-primary">
          + Nueva cita
        </Link>
      </header>

      {error && <p className="form-error">{error}</p>}
      {isLoading && <p className="loading">Cargando citas…</p>}

      {!isLoading && appointments.length === 0 && (
        <p className="empty-state">
          Aún no tienes citas. ¡Agenda la primera!
        </p>
      )}

      <section className="card-list">
        {appointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            onDelete={handleDelete}
          />
        ))}
      </section>
    </main>
  );
}
