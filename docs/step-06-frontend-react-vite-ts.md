# Step 06 — Frontend: React + Vite + TypeScript

> **Objetivo:** montar la SPA con rutas protegidas, estado global de sesión y la capa de services con axios — todo tipado con TypeScript.

## 1. Scaffolding e instalación

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios react-router-dom
```

Crea `.env` (a partir de `.env.example`):

```bash
VITE_API_URL=http://localhost:3000/api
```

> En Vite, solo las variables con prefijo `VITE_` llegan al navegador. Se leen con `import.meta.env.VITE_API_URL`.

## 2. Estructura de carpetas

```
frontend/src/
├── types/        # Interfaces TS: User, Appointment (la forma de los JSON de la API)
├── services/     # api.ts (axios) + un service por recurso
├── context/      # AuthContext: estado global de sesión
├── hooks/        # useAuth: acceso cómodo al contexto
├── components/   # ProtectedRoute, Navbar, AppointmentCard
├── pages/        # Login, Register, Appointments, NewAppointment
└── utils/        # dates.ts (Step 07)
```

La regla de oro: **los componentes nunca llaman a axios directamente** — siempre pasan por `services/`. Igual que en el backend, cada capa tiene una responsabilidad.

## 3. La instancia de axios ([`services/api.ts`](../frontend/src/services/api.ts))

```ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // ¡LA línea más importante del frontend!
});
```

`withCredentials: true` hace que el navegador **envíe y acepte cookies** en peticiones a otro origen. Sin ella, la cookie HttpOnly del login jamás llega al backend y todas las rutas protegidas devuelven 401. (Su pareja en el backend es `cors({ credentials: true })` — ambas son necesarias.)

Fíjate en lo que NO hay: ni `localStorage.getItem('token')`, ni header `Authorization`. El token viaja solo, invisible para JavaScript.

## 4. Estado global de sesión ([`context/AuthContext.tsx`](../frontend/src/context/AuthContext.tsx))

El contexto expone `{ user, isLoading, register, login, logout }`. El detalle clave está en el montaje:

```tsx
useEffect(() => {
  authService.me()                    // ¿hay sesión? (la cookie es invisible para JS)
    .then(setUser)
    .finally(() => setIsLoading(false));
}, []);
```

**¿Por qué `isLoading`?** Al recargar la página, React monta antes de que `/auth/me` responda. Sin ese estado, `user` sería `null` un instante y las rutas protegidas te expulsarían al login **aunque tuvieras sesión válida**. Es el bug más frustrante de este patrón — y el más común.

El hook [`useAuth`](../frontend/src/hooks/useAuth.ts) solo simplifica el consumo: `const { user, logout } = useAuth();`

## 5. Rutas protegidas ([`components/ProtectedRoute.tsx`](../frontend/src/components/ProtectedRoute.tsx))

```tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <p className="loading">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
```

Y en [`App.tsx`](../frontend/src/App.tsx) se aplica el patrón en ambos sentidos:

- `/appointments` y `/appointments/new` → envueltas en `<ProtectedRoute>`.
- `/login` y `/register` → si YA hay sesión, redirigen al panel (no tiene sentido mostrar el login a alguien logueado).

> ⚠️ **Las rutas protegidas del frontend son UX, no seguridad.** Cualquiera puede abrir las DevTools y saltárselas. La seguridad real es el `authMiddleware` del backend: sin cookie válida, la API no suelta ni un dato. El frontend solo evita mostrar pantallas vacías.

## 6. Formularios y errores de la API

Las páginas de Login/Registro siguen el mismo patrón: estado local + `getApiErrorMessage(err)` para traducir cualquier error de la API (incluidos los `details` del 400 de Zod) a un mensaje legible:

```ts
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data;
    if (data.details?.length) return data.details.map((d) => d.message).join('. ');
    if (data.error) return data.error;
  }
  return 'Error de conexión con el servidor';
}
```

Este es el "contrato" del que hablamos en el [Step 05](step-05-validaciones-zod-y-reglas-negocio.md): como el backend siempre responde con la misma estructura, el frontend la maneja con una sola función.

## 7. Pruébalo

Con backend y base de datos corriendo:

```bash
cd frontend
npm run dev
```

Abre http://localhost:5173 y verifica:

1. Entrar a `/appointments` sin sesión → te redirige a `/login`.
2. Regístrate → entras directo al panel (la cookie quedó puesta).
3. **Recarga la página (F5)** → sigues dentro (gracias a `/auth/me` + `isLoading`).
4. Abre DevTools → Application → Cookies: verás `token` con la columna HttpOnly marcada ✓. Ahora ve a la consola y escribe `document.cookie` → **el token no aparece**. Eso es HttpOnly en acción.
5. Cierra sesión → la cookie desaparece y `/appointments` vuelve a redirigirte.

## ✅ Checkpoint

- [ ] El flujo registro → recarga → logout funciona.
- [ ] `document.cookie` no muestra el token.
- [ ] Sabes explicar por qué existe `isLoading` y qué pasaría sin él.

**Siguiente:** [Step 07 — Fechas: del input local a UTC y de vuelta](step-07-fechas-utc-frontend.md)
