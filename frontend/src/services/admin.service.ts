import { api } from './api';
import type { AdminAppointment, AppointmentStatus } from '../types';

export async function listAllAppointments(): Promise<AdminAppointment[]> {
  const { data } = await api.get<{ appointments: AdminAppointment[] }>('/admin/appointments');
  return data.appointments;
}

export async function updateAppointmentStatus(
  id: string,
  status: Extract<AppointmentStatus, 'completed' | 'no_show'>
): Promise<AdminAppointment> {
  const { data } = await api.patch<{ appointment: AdminAppointment }>(
    `/admin/appointments/${id}/status`,
    { status }
  );
  return data.appointment;
}
