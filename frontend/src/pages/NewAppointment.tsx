import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as appointmentsService from '../services/appointments.service';
import { getApiErrorMessage } from '../services/api';
import { localInputToUtc, nowForInputMin } from '../utils/dates';

export function NewAppointment() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // El input datetime-local trabaja en la hora LOCAL del navegador,
  // sin zona horaria (ej. "2026-08-15T15:00").
  const [localDateTime, setLocalDateTime] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await appointmentsService.createAppointment({
        title,
        description: description || undefined,
        // AQUÍ ocurre la conversión clave: hora local -> ISO/UTC.
        // El backend solo acepta fechas con zona horaria explícita.
        scheduled_at: localInputToUtc(localDateTime),
      });
      navigate('/appointments');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <form onSubmit={handleSubmit} className="form">
        <h1>Nueva cita</h1>

        {error && <p className="form-error">{error}</p>}

        <label>
          Título
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={100}
            placeholder="Ej. Corte de cabello"
          />
        </label>

        <label>
          Descripción (opcional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </label>

        <label>
          Fecha y hora (tu hora local)
          <input
            type="datetime-local"
            value={localDateTime}
            onChange={(e) => setLocalDateTime(e.target.value)}
            required
            min={nowForInputMin()} // UX: el navegador bloquea fechas pasadas
          />
        </label>

        {/* Detalle educativo: mostramos qué se enviará realmente a la API */}
        {localDateTime && (
          <p className="hint">
            Se enviará al servidor como: <code>{localInputToUtc(localDateTime)}</code> (UTC)
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Agendando…' : 'Agendar cita'}
          </button>
          <Link to="/appointments" className="btn btn-secondary">
            Volver
          </Link>
        </div>
      </form>
    </main>
  );
}
