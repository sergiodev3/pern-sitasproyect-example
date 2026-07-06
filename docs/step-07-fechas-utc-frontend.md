# Step 07 — Fechas: del input local a UTC y de vuelta

> **Objetivo:** entender el viaje completo de una fecha por el sistema, y por qué esta app muestra la hora correcta aunque el servidor esté en otro continente.

## 1. El viaje de una fecha

```
┌─────────────────────────── NAVEGADOR (zona del usuario, ej. UTC-6) ──┐
│                                                                      │
│  <input type="datetime-local">  ──►  "2026-12-01T15:00"              │
│         (hora local, SIN zona)              │                        │
│                          new Date(...).toISOString()                 │
│                                             ▼                        │
│                              "2026-12-01T21:00:00.000Z"  (UTC)       │
└─────────────────────────────────────────────┼────────────────────────┘
                                              ▼  POST /api/appointments
┌────────────────────────────── BACKEND (da igual su zona) ────────────┐
│  Zod valida: ISO 8601 CON zona, y que el instante sea futuro         │
│  pg lo inserta en una columna TIMESTAMPTZ                            │
└─────────────────────────────────────────────┼────────────────────────┘
                                              ▼
┌────────────────────────────── POSTGRESQL ────────────────────────────┐
│  scheduled_at = 2026-12-01 21:00:00+00   (SIEMPRE UTC)               │
└─────────────────────────────────────────────┼────────────────────────┘
                                              ▼  GET /api/appointments
┌─────────────────────────────── NAVEGADOR ────────────────────────────┐
│  Recibe "2026-12-01T21:00:00.000Z"                                   │
│  Intl.DateTimeFormat(undefined, ...) lo formatea en la zona local:   │
│  → "lunes, 1 de diciembre de 2026, 3:00 p.m."  ✓                     │
└──────────────────────────────────────────────────────────────────────┘
```

**La regla:** la zona horaria del usuario solo existe en los extremos (el input y la pantalla). Todo lo que hay en medio — API, validaciones, base de datos — habla exclusivamente UTC.

## 2. Las tres funciones de [`utils/dates.ts`](../frontend/src/utils/dates.ts)

### Enviar: hora local → UTC

```ts
export function localInputToUtc(datetimeLocalValue: string): string {
  return new Date(datetimeLocalValue).toISOString();
}
```

El input `datetime-local` produce `"2026-12-01T15:00"` — un string **sin zona**. `new Date()` lo interpreta en la zona del navegador, y `toISOString()` devuelve ese mismo instante en UTC. Dos líneas, cero librerías.

### Mostrar: UTC → hora local

```ts
export function formatLocal(isoUtc: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(isoUtc));
}
```

`Intl.DateTimeFormat` es la API **nativa** de internacionalización:

- `undefined` como locale = usa el idioma configurado en el navegador (un usuario francés ve "lundi 1 décembre").
- La zona horaria por defecto = la del sistema del usuario.
- No necesitamos dayjs ni date-fns para esto. Menos dependencias, mismo resultado.

### UX: bloquear fechas pasadas en el input

```ts
export function nowForInputMin(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16); // "2026-07-06T10:30" en hora local
}
```

Se usa como `min={nowForInputMin()}` en el input. Ojo: esto es **cortesía con el usuario**, no seguridad — la validación real es el `.refine` de Zod en el backend ([Step 05](step-05-validaciones-zod-y-reglas-negocio.md)). Cualquier regla que importe debe vivir en el servidor.

## 3. Demuéstralo (el experimento estrella para la clase)

1. Crea una cita a las 15:00 desde el navegador.
2. En [`NewAppointment.tsx`](../frontend/src/pages/NewAppointment.tsx) hay un "hint" educativo que muestra lo que se enviará: verás algo como `2026-12-01T21:00:00.000Z` (si estás en UTC-6).
3. Mira la base de datos:

```bash
docker exec -it reservas_db psql -U reservas_user -d reservas_db \
  -c "SELECT title, scheduled_at FROM appointments;"
--    2026-12-01 21:00:00+00   ← UTC, no tus 15:00
```

4. Y en la lista de citas de la app… aparece a las **3:00 p.m.** ✓
5. **El truco final:** cambia la zona horaria de tu sistema operativo (ej. a Tokio) y recarga la app. La misma cita ahora se muestra a las **6:00 a.m. del día siguiente** — porque ES ese instante en Japón. La base de datos no cambió ni un byte.

Esto es exactamente lo que pasa cuando despliegas en Render/Railway (servidores en UTC) y tus usuarios están en México, Colombia o España: **nadie ve horas desfasadas**, porque nadie depende de la zona del servidor.

## 4. Errores clásicos que este diseño evita

| Error | Consecuencia |
|---|---|
| Columna `TIMESTAMP` sin zona | La hora "significa" cosas distintas según quién la lea |
| Enviar `"2026-12-01 15:00"` a la API | El servidor adivina la zona → desfase al desplegar |
| Formatear fechas concatenando `getHours() + ':' + getMinutes()` | Ignora locale y zona; se rompe con usuarios de otros países |
| Validar "no pasado" comparando strings | `"2026-12-01T15:00-06:00" > "2026-12-01T21:00Z"` como texto da cualquier cosa |
| Guardar la hora local del usuario "tal cual" | Dos usuarios en zonas distintas = datos incomparables |

## ✅ Checkpoint

- [ ] Hiciste el experimento de cambiar la zona del sistema.
- [ ] Puedes dibujar el diagrama del viaje de la fecha de memoria.
- [ ] Sabes en qué DOS puntos exactos del código aparece la zona horaria del usuario.

**Siguiente:** [Step 08 — Deploy a producción](step-08-deploy-produccion.md)
