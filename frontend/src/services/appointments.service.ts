import { api } from './api';
import type { Appointment } from '../types';

export async function listAppointments(): Promise<Appointment[]> {
  const { data } = await api.get<{ appointments: Appointment[] }>('/appointments');
  return data.appointments;
}

// scheduledAtUtc DEBE llegar ya convertida a ISO/UTC (ver utils/dates.ts)
export async function createAppointment(input: {
  title: string;
  description?: string;
  scheduled_at: string;
}): Promise<Appointment> {
  const { data } = await api.post<{ appointment: Appointment }>('/appointments', input);
  return data.appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  await api.delete(`/appointments/${id}`);
}
