# Step 01 — Setup del proyecto y PostgreSQL

> **Objetivo:** dejar listo el entorno de trabajo: estructura del monorepo, PostgreSQL corriendo en local y la conexión verificada.
>
> La idea no es solo clonar y correr, sino que escribas el código mientras aprendes la lógica de cada parte.

## Requisitos previos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 20+ | `node -v` |
| npm | 10+ | `npm -v` |
| Docker Desktop | cualquiera reciente | `docker -v` |
| Git | 2.x | `git --version` |

> ¿No puedes instalar Docker? Más abajo hay dos alternativas (instalación nativa y Neon).

## 1. Estructura del monorepo

Un **monorepo** es un solo repositorio que contiene varios proyectos relacionados. El nuestro tiene dos: la API (backend) y la aplicación web (frontend).

```
pern-proyect-example/
├── backend/     # API REST: Node.js + Express + PostgreSQL
├── frontend/    # SPA: React + Vite + TypeScript
├── docs/        # Estas guías
└── docker-compose.yml
```

Crea las carpetas:

```bash
mkdir pern-proyect-example
cd pern-proyect-example
mkdir backend frontend docs
```

## 2. PostgreSQL con Docker Compose (recomendado)

En la raíz del proyecto crea `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: reservas_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: reservas_user
      POSTGRES_PASSWORD: reservas_pass
      POSTGRES_DB: reservas_db
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**¿Qué hace cada parte?**

- `image: postgres:16-alpine` — la imagen oficial de PostgreSQL 16 en su variante ligera.
- `environment` — crea automáticamente el usuario, contraseña y base de datos al primer arranque.
- `ports: "5433:5432"` — expone el puerto de Postgres del contenedor (5432) en el puerto **5433** de tu máquina. ¿Por qué no 5432? Porque muchos desarrolladores ya tienen un PostgreSQL nativo instalado ocupando ese puerto: si el contenedor intentara usarlo, tus conexiones acabarían en el servidor equivocado y verías errores de autenticación desconcertantes. El backend se conectará entonces a `localhost:5433`.
- `volumes: pgdata` — los datos sobreviven aunque destruyas el contenedor. Sin esto, cada reinicio borraría tus tablas.

Levántalo:

```bash
docker compose up -d      # -d = en segundo plano
docker compose ps          # debe aparecer reservas_db con estado "running"
```

Comandos útiles:

```bash
docker compose down        # detiene el contenedor (los datos se conservan)
docker compose down -v     # detiene Y BORRA los datos (útil para empezar de cero)
docker compose logs db     # ver los logs de Postgres
```

## 3. Verificar la conexión

Entra a la consola de PostgreSQL (`psql`) dentro del contenedor:

```bash
docker exec -it reservas_db psql -U reservas_user -d reservas_db
```

Si ves el prompt `reservas_db=#`, la base está viva. Prueba:

```sql
SELECT now();    -- fecha/hora actual del servidor de base de datos
\q               -- salir
```

> Fíjate en el resultado de `SELECT now()`: la hora viene con desplazamiento `+00` (UTC). Esto será importantísimo en el [Step 02](step-02-schema-sql-uuid-timestamptz.md).

## Alternativa A: PostgreSQL nativo (sin Docker)

1. Descarga el instalador desde [postgresql.org/download](https://www.postgresql.org/download/) (Windows/macOS/Linux).
2. Durante la instalación define una contraseña para el superusuario `postgres`.
3. Abre `psql` (o pgAdmin) y crea el usuario y la base:

```sql
CREATE USER reservas_user WITH PASSWORD 'reservas_pass';
CREATE DATABASE reservas_db OWNER reservas_user;
```

La cadena de conexión usa el puerto estándar: `postgresql://reservas_user:reservas_pass@localhost:5432/reservas_db` (ajústala en `backend/.env`).

## Alternativa B: Postgres gratis en la nube (Neon)

1. Crea una cuenta en [neon.tech](https://neon.tech) (plan gratuito).
2. Crea un proyecto y copia la cadena de conexión que te da (algo como `postgresql://usuario:password@ep-xxx.neon.tech/neondb?sslmode=require`).
3. Úsala como `DATABASE_URL` en el Step 03. No necesitas nada más en local.

> Neon es también lo que usaremos para el deploy en el [Step 08](step-08-deploy-produccion.md), así que familiarizarte con él no está de más.

## ✅ Checkpoint

Antes de continuar debes poder:

- [ ] Ejecutar `docker compose ps` y ver `reservas_db` corriendo (o tener tu Postgres nativo/Neon accesible).
- [ ] Entrar con `psql` y ejecutar `SELECT now();`.

**Siguiente:** [Step 02 — Schema SQL: UUIDs y TIMESTAMPTZ](step-02-schema-sql-uuid-timestamptz.md)
