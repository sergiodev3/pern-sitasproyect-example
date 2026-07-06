# Step 08 — Deploy a producción

> **Objetivo:** publicar la app con la base en Neon, el backend en Render (o Railway) y el frontend en Vercel — y entender los TRES ajustes que separan "funciona en mi máquina" de "funciona en producción".

## 1. El mapa

```
Usuario ──► Frontend (Vercel)  ──►  Backend (Render/Railway)  ──►  PostgreSQL (Neon)
            tuapp.vercel.app        tuapi.onrender.com             ep-xxx.neon.tech
```

Tres servicios, tres proveedores, todos con plan gratuito. Frontend y backend quedan en **dominios distintos** — eso dispara los ajustes de cookies y CORS de la sección 4.

## 2. Base de datos: Neon

1. Crea el proyecto en [neon.tech](https://neon.tech) y copia la connection string (incluye `?sslmode=require`).
2. Inicializa las tablas apuntando tu `db:init` a Neon:

```bash
# En backend/.env, TEMPORALMENTE apunta DATABASE_URL a Neon y ejecuta:
npm run db:init
# (o pega el contenido de db/schema.sql en el SQL Editor de la consola de Neon)
```

## 3. Backend: Render (o Railway)

En [render.com](https://render.com): **New → Web Service**, conecta tu repo de GitHub.

| Configuración | Valor |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |

Variables de entorno en el dashboard (NUNCA subas el `.env` a git):

```bash
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
JWT_SECRET=<64 caracteres aleatorios — genera unos nuevos, no los de desarrollo>
FRONTEND_URL=https://tuapp.vercel.app      # sin barra final
NODE_ENV=production
# PORT lo inyecta Render automáticamente (nuestro env.js ya lo lee)
```

> Genera el secreto con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 4. Los tres ajustes de producción (ya están en el código)

Cuando frontend y backend viven en dominios distintos, las cookies se vuelven "third-party" y el navegador se pone estricto. Nuestro [`auth.controller.js`](../backend/src/controllers/auth.controller.js) ya se adapta según `NODE_ENV`:

```js
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',                    // (1)
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', // (2)
  maxAge: 24 * 60 * 60 * 1000,
};
```

1. **`secure: true`** — la cookie solo viaja por HTTPS. Render/Vercel ya te dan HTTPS.
2. **`sameSite: 'none'`** — permite que la cookie viaje entre `tuapp.vercel.app` y `tuapi.onrender.com`. El navegador EXIGE que `none` venga acompañado de `secure: true` (por eso van en pareja).
3. **CORS con el dominio real** — en [`app.js`](../backend/src/app.js), `origin: env.FRONTEND_URL` con `credentials: true`. Con credenciales el origen no puede ser `'*'`: si `FRONTEND_URL` no coincide EXACTAMENTE (https, sin barra final), verás el clásico error de CORS en la consola.

**Síntoma → causa** (para cuando "en producción no funciona el login"):

| Síntoma | Causa probable |
|---|---|
| Login OK pero `/me` da 401 | Falta `sameSite: 'none'` + `secure`, o el navegador descartó la cookie |
| Error CORS en consola | `FRONTEND_URL` no coincide con el dominio real del frontend |
| Cookie no aparece en DevTools | `withCredentials` ausente en axios, o `credentials` ausente en cors() |
| Todo funciona en local y nada en prod | `NODE_ENV` no está en `production` en Render |

## 5. Frontend: Vercel

En [vercel.com](https://vercel.com): **Add New → Project**, conecta el repo.

| Configuración | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite (lo detecta solo) |

Variable de entorno:

```bash
VITE_API_URL=https://tuapi.onrender.com/api
```

> ⚠️ En Vite las variables se "hornean" en el build: si cambias `VITE_API_URL`, hay que **redesplegar**.

**Rutas de SPA:** al recargar `tuapp.vercel.app/appointments`, Vercel debe servir `index.html` (la ruta existe solo en React Router). Crea `frontend/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## 6. La prueba final de zonas horarias

1. Abre la app desplegada y crea una cita para mañana a las 10:00.
2. Verifica en Neon (SQL Editor): `SELECT scheduled_at FROM appointments;` → hora en UTC (`+00`), distinta de tus 10:00 si no estás en UTC.
3. Recarga la app → la cita se muestra a las **10:00**, tu hora. 🎉
4. Pídele a un compañero de otra zona horaria que abra su cuenta y agende: sus horas también se conservan.

El servidor de Render está en UTC, la base en Neon está en UTC, y ningún usuario lo nota. Eso era el objetivo del proyecto.

## ✅ Checkpoint

- [ ] Registro y login funcionan en el dominio de producción.
- [ ] La cookie aparece en DevTools con `Secure` y `SameSite=None`.
- [ ] Las horas de las citas coinciden con tu hora local.
- [ ] Sabes diagnosticar los 4 síntomas de la tabla de la sección 4.

---

**¡Proyecto completo!** Ideas para seguir: `PUT /appointments/:id` (el ejercicio del Step 05), paginación en el listado, refresh tokens, o rate limiting en el login con `express-rate-limit`.
