# Step 10 — Frontend: panel de administración

> **Objetivo:** construir la vista donde el encargado de la barbería ve todas las citas y las marca como completada o no asistió, protegida por rol.

## 1. Extender los tipos

En [`types/index.ts`](../frontend/src/types/index.ts):

```ts
export type UserRole = 'client' | 'admin';
export type AppointmentStatus = 'scheduled' | 'completed' | 'no_show' | 'cancelled';

export interface User {
  // ...
  role: UserRole;
}

export interface Appointment {
  // ...
  status: AppointmentStatus;
}

// La respuesta de GET /api/admin/appointments trae además el dueño de cada cita
export interface AdminAppointment extends Appointment {
  user_name: string;
  user_email: string;
}
```

`AdminAppointment extends Appointment` en vez de duplicar todos los campos: reutiliza lo que ya existe y solo agrega lo que el admin necesita de más (el `JOIN` con `users` que hace el backend en el [Step 09](step-09-roles-de-usuario-y-estados-de-citas.md)).

## 2. `AdminRoute`: lo mismo que `ProtectedRoute`, más una condición

Nuevo [`components/AdminRoute.tsx`](../frontend/src/components/AdminRoute.tsx) — casi idéntico a `ProtectedRoute.tsx`, con una línea extra:

```tsx
if (user.role !== 'admin') {
  return <Navigate to="/appointments" replace />;
}
```

> ⚠️ Recuerda la regla del [Step 06](step-06-frontend-react-vite-ts.md): esto es **solo UX**. La seguridad real vive en `requireAdmin` en el backend — cualquiera puede editar el JavaScript en su navegador y saltarse este `if`, pero la API seguirá respondiendo 403 sin un JWT con `role: 'admin'` válido.

## 3. El servicio y el helper de etiquetas

[`services/admin.service.ts`](../frontend/src/services/admin.service.ts) sigue el mismo patrón delgado que los demás services (axios + tipos, nada de lógica):

```ts
export async function listAllAppointments(): Promise<AdminAppointment[]> {
  const { data } = await api.get<{ appointments: AdminAppointment[] }>('/admin/appointments');
  return data.appointments;
}

export async function updateAppointmentStatus(id: string, status: 'completed' | 'no_show') {
  const { data } = await api.patch<{ appointment: AdminAppointment }>(`/admin/appointments/${id}/status`, { status });
  return data.appointment;
}
```

[`utils/status.ts`](../frontend/src/utils/status.ts) centraliza las etiquetas en español para no repetirlas en dos componentes:

```ts
export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendada',
  completed: 'Completada',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
};
```

## 4. La página `AdminAppointments`

[`pages/AdminAppointments.tsx`](../frontend/src/pages/AdminAppointments.tsx) sigue la misma forma que `Appointments.tsx` (fetch en `useEffect`, estado de carga/error), con dos diferencias:

1. Cada tarjeta muestra el dueño de la cita: `👤 {appointment.user_name} ({appointment.user_email})`.
2. Los botones de acción solo aparecen si la cita sigue pendiente:

```tsx
{appointment.status === 'scheduled' && (
  <div className="card-actions">
    <button onClick={() => handleUpdateStatus(appointment.id, 'completed')}>Marcar completada</button>
    <button onClick={() => handleUpdateStatus(appointment.id, 'no_show')}>Marcar no asistió</button>
  </div>
)}
```

`handleUpdateStatus` actualiza el estado local con la respuesta del backend (`setAppointments(current => current.map(...))`) en vez de volver a pedir toda la lista — una actualización optimista simple que evita un round-trip extra.

## 5. Navegación condicional y badges

[`components/Navbar.tsx`](../frontend/src/components/Navbar.tsx): el link "Panel Admin" solo se renderiza si `user.role === 'admin'`:

```tsx
{user.role === 'admin' && <Link to="/admin/appointments">Panel Admin</Link>}
```

[`components/AppointmentCard.tsx`](../frontend/src/components/AppointmentCard.tsx) (la vista del propio cliente) ahora también:
- Muestra un badge con `STATUS_LABELS[appointment.status]`.
- Oculta el botón "Cancelar" si el estado ya no es `'scheduled'` — coherente con que el cliente ve su historial completo (decisión del Step 09) pero no puede "cancelar" algo que ya pasó.

[`App.tsx`](../frontend/src/App.tsx): nueva ruta protegida por rol:

```tsx
<Route path="/admin/appointments" element={<AdminRoute><AdminAppointments /></AdminRoute>} />
```

## 6. Pruébalo

Con el admin ya creado ([Step 09](step-09-roles-de-usuario-y-estados-de-citas.md)):

1. Entra como un **cliente normal** → no debe verse el link "Panel Admin" en la barra de navegación.
2. Con ese mismo cliente, navega manualmente a `http://localhost:5173/admin/appointments` → debe redirigirte a `/appointments`.
3. Cierra sesión, entra con las credenciales del **admin** → aparece "Panel Admin" en la barra.
4. Entra al panel → deberías ver las citas de TODOS los clientes, con su nombre y email.
5. Marca una como completada o no asistió → el badge cambia y los botones desaparecen para esa tarjeta.
6. Inicia sesión de nuevo como el cliente dueño de esa cita → confirma que su badge también cambió en `/appointments`.

## ✅ Checkpoint

- [ ] Un cliente normal no ve el link ni puede entrar a `/admin/appointments`.
- [ ] El admin ve todas las citas con el nombre/email correcto de cada dueño.
- [ ] Marcar una cita actualiza el badge sin recargar la página.
- [ ] El cliente ve su propio historial completo (agendada/completada/no asistió/cancelada).

**Siguiente:** [Step 11 — Probar la API con Thunder Client](step-11-probar-api-thunder-client.md)
