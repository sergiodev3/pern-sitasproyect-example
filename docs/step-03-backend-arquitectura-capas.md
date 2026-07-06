# Step 03 — Backend: arquitectura de capas

> **Objetivo:** montar el esqueleto del backend con Express y el patrón de capas, conectar PostgreSQL con el driver `pg` y levantar el primer endpoint.

## 1. El patrón de capas

Cada petición atraviesa la misma tubería, y cada capa tiene UNA responsabilidad:

```
Petición HTTP
   │
   ▼
RUTA (routes/)            "¿Qué endpoint es y qué middlewares aplican?"
   │
   ▼
MIDDLEWARES (middlewares/) "¿Es válido el body? ¿Está autenticado?"
   │
   ▼
CONTROLADOR (controllers/) "Extraigo datos de req, llamo al service, armo res"
   │
   ▼
SERVICE (services/)        "Lógica de negocio + SQL contra PostgreSQL"
   │
   ▼
POOL de pg (config/db.js)  "Conexiones reutilizables a la base"
```

¿Por qué molestarse? Porque cuando algo falla sabes exactamente dónde mirar: ¿error 400? → schema de validación. ¿SQL mal? → service. ¿Respuesta mal formada? → controlador. Además cada capa se puede probar por separado.

## 2. Inicializar el proyecto

```bash
cd backend
npm init -y
npm install express pg dotenv zod cors cookie-parser
```

En `package.json` agrega `"type": "module"` (para usar `import`/`export`, como en el frontend) y los scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "db:init": "node db/init.js"
  }
}
```

> `node --watch` reinicia el servidor al guardar cambios: ya no necesitas nodemon en Node 20+.

## 3. Variables de entorno validadas (`src/config/env.js`)

En vez del típico `process.env.LO_QUE_SEA` regado por todo el código, centralizamos y **validamos** las variables al arrancar. Si falta algo, la app muere inmediatamente con un mensaje claro (fail-fast):

```js
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
```

Crea `.env` (cópialo de `.env.example`, y **nunca lo subas a git**):

```bash
PORT=3000
DATABASE_URL=postgresql://reservas_user:reservas_pass@localhost:5433/reservas_db
JWT_SECRET=cambia-esto-por-una-cadena-larga-y-aleatoria
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

## 4. El pool de conexiones (`src/config/db.js`)

Con MongoDB usabas Mongoose; aquí hablamos SQL directo con el driver oficial `pg`. La pieza central es el **Pool**: un conjunto de conexiones abiertas que se reutilizan entre peticiones (abrir una conexión nueva por query sería carísimo).

```js
import pg from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (error) => {
  console.error('Error inesperado en el pool de PostgreSQL:', error.message);
});
```

Uso desde cualquier service:

```js
const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
```

> ⚠️ **Los `$1, $2` son sagrados.** Jamás construyas SQL concatenando strings del usuario (`"... WHERE email = '" + email + "'"`): eso es inyección SQL, la vulnerabilidad #1 de la historia. Los parámetros posicionales hacen que `pg` escape los valores por ti.

## 5. `app.js` y `index.js`

Separamos la **configuración** de Express (app.js) del **arranque** del servidor (index.js) — facilita testear la app sin levantar un puerto. Revisa los archivos del repo:

- [`src/app.js`](../backend/src/app.js) — middlewares globales (CORS, JSON, cookies), montaje de rutas, 404 y el error handler **siempre al final**.
- [`src/index.js`](../backend/src/index.js) — `app.listen()` y cierre ordenado del pool.
- [`src/middlewares/error.middleware.js`](../backend/src/middlewares/error.middleware.js) — el manejador global: convierte `ApiError` (errores previsibles con status) en respuestas HTTP y esconde los errores inesperados tras un 500 genérico. Al cliente **nunca** se le filtran stacks ni SQL.

## 6. Script de inicialización de la base

`db/init.js` lee `schema.sql` y lo ejecuta ([ver archivo](../backend/db/init.js)). Con esto el setup completo de un compañero nuevo es:

```bash
docker compose up -d
cd backend
cp .env.example .env
npm install
npm run db:init
npm run dev
```

## 7. Pruébalo

Con el servidor corriendo (`npm run dev`):

```bash
curl http://localhost:3000/api/health
# {"status":"ok","serverTimeUtc":"2026-07-06T19:32:00.000Z"}
```

Fíjate: `serverTimeUtc` termina en `Z` (UTC). Ese formato ISO 8601 es el ÚNICO en el que la API hablará de fechas.

## ✅ Checkpoint

- [ ] `npm run dev` arranca sin errores y muestra el puerto.
- [ ] `npm run db:init` crea las tablas.
- [ ] `/api/health` responde.
- [ ] Puedes explicar qué capa tocarías para: cambiar una query (service), agregar un campo obligatorio (schema), cambiar un código de respuesta (controlador).

**Siguiente:** [Step 04 — Autenticación: JWT en cookies HttpOnly](step-04-auth-jwt-httponly-cookies.md)
