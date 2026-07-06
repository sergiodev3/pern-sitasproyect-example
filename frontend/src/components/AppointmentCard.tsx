import type { Appointment } from '../types';
import { formatLocal } from '../utils/dates';
import { STATUS_LABELS } from '../utils/status';

interface Props {
  appointment: Appointment;
  onDelete: (id: string) => void;
}

export function AppointmentCard({ appointment, onDelete }: Props) {
  return (
    <article className="card">
      <div className="card-body">
        <h3>{appointment.title}</h3>
        {/* La API manda scheduled_at en UTC; formatLocal lo muestra
            en la zona horaria del navegador del usuario */}
        <p className="card-date">🕐 {formatLocal(appointment.scheduled_at)}</p>
        {appointment.description && <p className="card-description">{appointment.description}</p>}
        <span className={`badge badge-${appointment.status}`}>
          {STATUS_LABELS[appointment.status]}
        </span>
      </div>
      {appointment.status === 'scheduled' && (
        <button
          onClick={() => onDelete(appointment.id)}
          className="btn btn-danger"
          aria-label={`Cancelar cita ${appointment.title}`}
        >
          Cancelar
        </button>
      )}
    </article>
  );
}
