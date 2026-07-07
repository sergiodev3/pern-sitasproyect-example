# 🛠️ Solución de problemas comunes

Esta guía es de referencia (no un step secuencial): recopila los errores más comunes que vas a encontrar trabajando con este proyecto en clase, casi todos relacionados con **tener varias terminales abiertas a la vez**. Guárdala a mano — la mayoría de "no me funciona nada" en un proyecto full-stack viene de aquí.

## Error: "Error de conexión con el servidor" + CORS bloqueado en la consola del navegador

Síntoma exacto en la consola de DevTools:

```
Access to XMLHttpRequest at 'http://localhost:3000/api/auth/me' from origin 'http://localhost:5174'
has been blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value
'http://localhost:5173' that is not equal to the supplied origin.
```

### Qué está pasando

El backend solo acepta peticiones desde **un único origen**, el que tiene guardado en `FRONTEND_URL` dentro de `backend/.env` ([`app.js`](../backend/src/app.js)):

```js
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
```

Si tu navegador está en `http://localhost:5174` pero el backend solo permite `http://localhost:5173` (o viceversa), el navegador bloquea la petición **antes de que llegue al backend** — por eso ves un error de red genérico en el frontend ("Error de conexión con el servidor") en vez de un error 401/403 normal.

### Por qué el puerto del frontend "cambia solo"

Vite siempre intenta usar el puerto **5173**. Si ya hay otra instancia de `npm run dev` corriendo (por ejemplo, una terminal vieja que olvidaste cerrar), Vite detecta el puerto ocupado y sube al **5174**, después al **5175**, etc. — sin avisarte con un error, solo lo imprime en la terminal:

```
  VITE v8.1.3  ready in 320 ms

  ➜  Local:   http://localhost:5174/   <-- fíjate en el número real
```

Si copiaste `http://localhost:5173` en el navegador de memoria (o tenías esa pestaña abierta de antes) en vez de leer el puerto real que imprimió Vite, terminas probando un origen distinto al que el backend espera.

### Por qué reiniciar el backend "no sirve"

Este es el segundo motivo, más traicionero: el script `dev` del backend usa `node --watch` ([`package.json`](../backend/package.json)):

```json
"dev": "node --watch src/index.js"
```

`--watch` reinicia el proceso cuando cambia un archivo **`.js` que el código importa** — pero **NO detecta cambios en `.env`**, porque ese archivo no se "importa" como módulo, solo se lee una vez al arrancar (`dotenv/config`). Si editas `FRONTEND_URL` en `.env` y la terminal de `npm run dev` sigue abierta desde antes, **sigue corriendo con el valor viejo**, aunque el archivo en disco ya diga otra cosa.

Y hay una trampa extra: si intentas abrir una *segunda* terminal con `npm run dev` mientras la primera sigue viva, Node falla al intentar usar el puerto 3000 (ya ocupado) — pero si no miras el mensaje de error con atención, parece que "no pasó nada" y sigues probando contra el proceso viejo sin darte cuenta.

### Cómo diagnosticar: ver qué está corriendo y en qué puerto

**Windows (PowerShell):**

```powershell
# ¿Quién escucha en el puerto 3000 (backend) y 5173/5174 (frontend)?
Get-NetTCPConnection -LocalPort 3000,5173,5174 -State Listen |
  Select-Object LocalPort, OwningProcess |
  ForEach-Object { "$($_.LocalPort) -> PID $($_.OwningProcess) ($((Get-Process -Id $_.OwningProcess).ProcessName))" }
```

**macOS / Linux:**

```bash
lsof -i :3000 -i :5173 -i :5174
```

Si ves **más de un proceso Node** relacionado con este proyecto, o un puerto que no esperabas, ahí está el problema.

### Cómo arreglarlo

1. **Cierra TODAS las terminales** que tengan `npm run dev` corriendo (backend y frontend) — no solo la ventana, asegúrate de que el proceso realmente termine (`Ctrl+C`, o si no responde, mata el proceso por PID con el comando de abajo).
2. Confirma que los puertos quedaron libres (repite el comando de diagnóstico de arriba — no debe aparecer nada).
3. Revisa `backend/.env` y anota el valor de `FRONTEND_URL`.
4. Arranca el frontend primero (`cd frontend && npm run dev`) y **lee el puerto real** que imprime Vite en la terminal.
5. Si ese puerto NO coincide con `FRONTEND_URL`, edítalo en `backend/.env` para que coincida.
6. Arranca el backend (`cd backend && npm run dev`) — como recién arrancó, carga el `.env` actualizado automáticamente.
7. Recarga la pestaña del navegador.

**Para matar un proceso atascado por su PID:**

```powershell
# Windows
taskkill /F /PID <numero-de-pid>
```

```bash
# macOS / Linux
kill -9 <numero-de-pid>
```

### Regla general para no volver a caer en esto

> **Cada vez que edites `backend/.env`, la terminal del backend debe reiniciarse manualmente** (`Ctrl+C` y `npm run dev` de nuevo). `node --watch` no lo hace por ti.

Y antes de reportar "no funciona", primero verifica con el comando de diagnóstico que **solo hay un backend y un frontend corriendo**, y que el puerto real del frontend coincide con `FRONTEND_URL`.

## Otros errores relacionados

### "la autentificación password falló para el usuario..." al correr `npm run db:init`

`DATABASE_URL` en `.env` no coincide con el usuario/contraseña/puerto de tu PostgreSQL real. Es común si tienes un PostgreSQL nativo instalado (usualmente puerto `5432`) además del de Docker Compose (puerto `5433` en este proyecto, ver [Step 01](step-01-setup-y-postgres.md)) — confirma con el comando de diagnóstico de arriba (o `docker compose ps`) a cuál te estás conectando en realidad, y ajusta `DATABASE_URL` para que apunte ahí.

### La cookie de sesión no llega / `/auth/me` siempre da 401

Además del desajuste de `FRONTEND_URL` ya explicado, revisa que el frontend use `withCredentials: true` en axios ([`services/api.ts`](../frontend/src/services/api.ts)) — sin eso, el navegador ni siquiera intenta enviar la cookie, con o sin CORS bien configurado.

### Cambié el `schema.sql` (o hice `git pull` de una versión más nueva) y la app no ve las columnas nuevas

Vuelve a correr `npm run db:init` — es seguro repetirlo (usa `IF NOT EXISTS`), y aplicará cualquier columna o índice nuevo sin borrar tus datos.
