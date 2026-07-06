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
| GET | `/api/appointments` | 🔒 | Mis citas (ordenadas por fecha) |
| POST | `/api/appointments` | 🔒 | Crear cita (`scheduled_at` en ISO/UTC) |
| DELETE | `/api/appointments/:id` | 🔒 | Cancelar una cita mía |

**Reglas de negocio:** no se pueden agendar citas en el pasado (400) ni dos citas del mismo usuario a la misma hora exacta (409). Un usuario nunca puede ver ni borrar citas ajenas (404).

## Estructura

```
├── docker-compose.yml     # PostgreSQL 16 local
├── docs/                  # Guías paso a paso (steps 01–08)
├── backend/
│   ├── db/                # schema.sql + script de inicialización
│   └── src/
│       ├── config/        # env validado (Zod) + pool de pg
│       ├── middlewares/   # auth (JWT), validate (Zod), error handler
│       ├── routes/        # definición de endpoints
│       ├── controllers/   # HTTP: extraer datos, armar respuestas
│       ├── services/      # lógica de negocio + SQL
│       └── schemas/       # schemas de validación Zod
└── frontend/
    └── src/
        ├── services/      # axios (withCredentials) + API calls
        ├── context/       # AuthContext (sesión global)
        ├── hooks/         # useAuth
        ├── components/    # ProtectedRoute, Navbar, AppointmentCard
        ├── pages/         # Login, Register, Appointments, NewAppointment
        └── utils/         # dates.ts: conversión local ⇄ UTC
```

## Licencia

MIT — úsalo, modifícalo y compártelo con tus alumnos.
