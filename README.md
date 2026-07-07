# 📅 Mini Plataforma de Reservas y Citas — Stack PERN

Proyecto educativo full-stack con **PostgreSQL + Express + React + Node.js**. Una app real de agendamiento de citas con autenticación, validaciones estrictas y manejo profesional de zonas horarias.

> La idea no es solo clonar y correr, sino que escribas el código mientras aprendes la lógica de cada parte. Las guías paso a paso están en [`/docs`](docs/).

## ¿Qué vas a aprender?

- **SQL de verdad** con el driver `pg` (sin ORM): queries parametrizadas, llaves foráneas, constraints.
- **Arquitectura de capas**: Routes → Middlewares → Controllers → Services.
- **Autenticación segura**: bcrypt + JWT en cookies **HttpOnly** (nada de tokens en localStorage).
- **Validación rigurosa** con Zod: errores 400 estructurados y reglas de negocio.
- **Zonas horarias bien hechas**: `TIMESTAMPTZ` + ISO/UTC en la API + `Intl.DateTimeFormat` en el cliente. Despliega en un servidor UTC y las horas jamás se desfasan.
- **UUIDs** como llaves primarias con `gen_random_uuid()`.
- **Roles y control de acceso**: JWT con claim de rol, middleware `requireAdmin`, y un panel de administración separado del panel de cliente.
- **Modelado de estados**: ciclo de vida de una cita (`scheduled` → `completed`/`no_show`/`cancelled`) con transiciones protegidas a nivel de base de datos.

## Stack

| Capa | Tecnología |
|---|---|
| Base de datos | PostgreSQL 16 (Docker) — UUID + TIMESTAMPTZ |
| Backend | Node.js 20+, Express 5, pg, Zod 4, bcrypt, jsonwebtoken |
| Frontend | React 19, Vite, TypeScript, React Router 7, axios |

## Guía paso a paso (📂 docs/)

| Step | Tema |
|---|---|
| [01](docs/step-01-setup-y-postgres.md) | Setup del monorepo y PostgreSQL con Docker |
| [02](docs/step-02-schema-sql-uuid-timestamptz.md) | Schema SQL: por qué UUID y por qué TIMESTAMPTZ |
| [03](docs/step-03-backend-arquitectura-capas.md) | Backend: arquitectura de capas y pool de pg |
| [04](docs/step-04-auth-jwt-httponly-cookies.md) | Autenticación: JWT en cookies HttpOnly |
| [05](docs/step-05-validaciones-zod-y-reglas-negocio.md) | Validaciones con Zod y reglas de negocio |
| [06](docs/step-06-frontend-react-vite-ts.md) | Frontend: React + rutas protegidas + AuthContext |
| [07](docs/step-07-fechas-utc-frontend.md) | Fechas: del input local a UTC y de vuelta |
| [08](docs/step-08-deploy-produccion.md) | Deploy: Neon + Render + Vercel |
| [09](docs/step-09-roles-de-usuario-y-estados-de-citas.md) | Backend: roles de usuario y estados de citas |
| [10](docs/step-10-panel-de-administracion.md) | Frontend: panel de administración |
| [11](docs/step-11-probar-api-thunder-client.md) | Probar la API con Thunder Client |

### 📊 Diagramas

Material de referencia visual (no un step secuencial): flujo general de la app, flujo de autenticación, entidad-relación, casos de uso y estados de una cita — ver [`docs/diagramas.md`](docs/diagramas.md).

### 🛠️ Solución de problemas

¿Error de CORS, "Error de conexión con el servidor", o el backend "no ve" tus cambios en `.env`? Casi siempre es por tener varias terminales abiertas a la vez — ver [`docs/solucion-de-problemas.md`](docs/solucion-de-problemas.md) para diagnosticar puertos/procesos y arreglarlo paso a paso.

## Quick start

Requisitos: Node.js 20+, Docker Desktop, Git.

```bash
# 1. Base de datos (puerto 5433 para no chocar con un Postgres nativo)
docker compose up -d

# 2. Backend → http://localhost:3000
cd backend
cp .env.example .env
npm install
npm run db:init        # crea las tablas
npm run dev

# 3. Frontend → http://localhost:5173  (en otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Endpoints de la API

| Método | Ruta | Protegida | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Estado de la API (hora del servidor en UTC) |
| POST | `/api/auth/register` | No | Crear cuenta (setea cookie de sesión) |
| POST | `/api/auth/login` | No | Iniciar sesión (setea cookie de sesión) |
| POST | `/api/auth/logout` | No | Cerrar sesión (borra la cookie) |
| GET | `/api/auth/me` | 🔒 | Usuario de la sesión actual |
| GET | `/api/appointments` | 🔒 | Mi historial de citas (todos los estados) |
| POST | `/api/appointments` | 🔒 | Crear cita (`scheduled_at` en ISO/UTC) |
| DELETE | `/api/appointments/:id` | 🔒 | Cancelar una cita mía (cambia su estado a `cancelled`, no la borra) |
| GET | `/api/admin/appointments` | 🔒 admin | Ver TODAS las citas, con dueño (nombre/email) |
| PATCH | `/api/admin/appointments/:id/status` | 🔒 admin | Marcar una cita como `completed` o `no_show` |

**Reglas de negocio:** no se pueden agendar citas en el pasado (400) ni dos citas activas del mismo usuario a la misma hora exacta (409 — un índice único parcial permite reutilizar la hora si la cita anterior fue cancelada). Un usuario nunca puede ver ni cancelar citas ajenas (404). Solo un admin puede ver todas las citas o marcarlas como completadas/no-show (403 si no lo es); intentar re-marcar una cita que ya cambió de estado da 409.

## Estructura

```
├── docker-compose.yml     # PostgreSQL 16 local
├── docs/                  # Guías paso a paso (steps 01–11) + diagramas.md
├── backend/
│   ├── db/                # schema.sql + scripts de inicialización y seed del admin
│   └── src/
│       ├── config/        # env validado (Zod) + pool de pg
│       ├── middlewares/   # auth (JWT), admin (rol), validate (Zod), error handler
│       ├── routes/        # definición de endpoints (auth, appointments, admin)
│       ├── controllers/   # HTTP: extraer datos, armar respuestas
│       ├── services/      # lógica de negocio + SQL
│       └── schemas/       # schemas de validación Zod
└── frontend/
    └── src/
        ├── services/      # axios (withCredentials) + API calls
        ├── context/       # AuthContext (sesión global)
        ├── hooks/         # useAuth
        ├── components/    # ProtectedRoute, AdminRoute, Navbar, AppointmentCard
        ├── pages/         # Login, Register, Appointments, NewAppointment, AdminAppointments
        └── utils/         # dates.ts (local ⇄ UTC), status.ts (etiquetas de estado)
```

## Licencia

MIT — úsalo, modifícalo y compártelo con tus alumnos.
