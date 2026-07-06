# Step 11 — Probar la API con Thunder Client

> **Objetivo:** aprender a probar todos los endpoints de la API desde VSCode, con una interfaz visual en vez de escribir comandos `curl` a mano — incluyendo el manejo de la cookie de sesión.

## 1. Instalar la extensión

En VSCode, abre la pestaña de Extensiones (`Ctrl+Shift+X`) y busca **Thunder Client** (id del marketplace: `rangav.vscode-thunder-client`). Instálala y verás un ícono de rayo ⚡ en la barra lateral izquierda — ábrelo.

## 2. Crear una Collection

1. En la pestaña **Collections**, haz clic en **New Collection**.
2. Nómbrala `Reservas y Citas API`.
3. Dentro de la collection, crea tres carpetas (botón derecho sobre la collection → **New Folder**): `Auth`, `Appointments` y `Admin`. Así organizamos las requests igual que las carpetas `routes/` del backend.

## 3. Crear un Environment (para no repetir la URL en cada request)

1. Pestaña **Env** → **New Environment** → nómbralo `Local`.
2. Agrega una variable:

   | Name | Value |
   |---|---|
   | `baseUrl` | `http://localhost:3000/api` |

3. Selecciona `Local` como environment activo (menú desplegable arriba a la derecha).
4. En cada request usarás `{{baseUrl}}` en vez de escribir la URL completa — si algún día cambias el puerto o despliegas a producción, solo editas la variable una vez.

## 4. Cómo maneja Thunder Client las cookies de sesión

Nuestra API usa cookies **HttpOnly** para la sesión (ver [Step 04](step-04-auth-jwt-httponly-cookies.md)) — no hay ningún token que copiar y pegar a mano. Thunder Client se comporta como un navegador dentro de tu workspace: cuando `POST /auth/login` responde con `Set-Cookie`, la guarda automáticamente y la reenvía en las siguientes requests **dentro del mismo environment**, sin que tengas que hacer nada extra.

Para confirmarlo: después de un login exitoso, abre la respuesta y ve a la pestaña **Cookies** (junto a Body/Headers) — ahí debe aparecer `token` marcada como `HttpOnly`.

## 5. Carpeta `Auth`

### Health Check
- **GET** `{{baseUrl}}/health`
- Sin body.
- Esperado: `200` — `{ "status": "ok", "serverTimeUtc": "..." }`.

### Register
- **POST** `{{baseUrl}}/auth/register`
- Pestaña **Body** → **JSON**:
  ```json
  { "name": "Ana Cliente", "email": "ana@mail.com", "password": "secreta123" }
  ```
- Esperado: `201` con `{ "user": { "id": "...", "role": "client", ... } }`. Revisa la pestaña Cookies de la respuesta: debe traer `token`.

### Login
- **POST** `{{baseUrl}}/auth/login`
- Body JSON: `{ "email": "ana@mail.com", "password": "secreta123" }`
- Esperado: `200` con el `user`. Vuelve a poner la cookie de sesión (pisa la anterior).

### Me
- **GET** `{{baseUrl}}/auth/me`
- Sin body — la cookie viaja sola.
- Esperado: `200` con el usuario actual. Si borras la cookie manualmente (pestaña Cookies → ícono de basura) y repites la request, debe dar `401`.

### Logout
- **POST** `{{baseUrl}}/auth/logout`
- Esperado: `200`, `{ "message": "Sesión cerrada" }`. Repetir `Me` después de esto debe dar `401`.

## 6. Carpeta `Appointments` (requiere sesión de cliente — corre Login primero)

### Create
- **POST** `{{baseUrl}}/appointments`
- Body JSON (ajusta la fecha a una futura en formato ISO/UTC):
  ```json
  { "title": "Corte de cabello", "description": "Con Ana", "scheduled_at": "2030-01-15T18:00:00.000Z" }
  ```
- Esperado: `201` con la cita, `"status": "scheduled"`.
- Repite la misma request sin cambiar nada → `409` (misma hora duplicada).

### List
- **GET** `{{baseUrl}}/appointments`
- Esperado: `200` con un array — tu historial completo (incluye canceladas y completadas si las hay).

### Cancel
- **DELETE** `{{baseUrl}}/appointments/<ID>` (copia un `id` de la respuesta de List)
- Esperado: `204` sin contenido. Repite la request con el mismo id → `409` (ya no está pendiente).
- Verifica en `List` que esa cita ahora aparece con `"status": "cancelled"` (no desapareció).
- Truco: vuelve a correr `Create` con la misma fecha de la cita cancelada — ahora debería funcionar (`201`), gracias al índice único parcial explicado en el [Step 09](step-09-roles-de-usuario-y-estados-de-citas.md).

## 7. Carpeta `Admin` (requiere sesión de administrador)

> Antes de probar esta carpeta, crea el primer admin desde una terminal — Thunder Client no ejecuta scripts npm:
> ```bash
> npm run db:seed-admin
> ```

### Login como admin
- **POST** `{{baseUrl}}/auth/login`
- Body: `{ "email": "admin@barberia.com", "password": "la-que-hayas-puesto-en-.env" }`
- Esto reemplaza la cookie de sesión por la del admin (Thunder Client solo guarda una cookie activa por dominio+environment).

### List All
- **GET** `{{baseUrl}}/admin/appointments`
- Esperado: `200` con TODAS las citas de TODOS los usuarios, incluyendo `user_name`/`user_email`.
- Prueba de seguridad: vuelve a hacer `Login` con un cliente normal y repite esta request → debe dar `403`.

### Mark Completed
- **PATCH** `{{baseUrl}}/admin/appointments/<ID>/status`
- Body JSON: `{ "status": "completed" }`
- Esperado: `200` con la cita actualizada. Repetir la misma request → `409`.

### Mark No-show
- **PATCH** `{{baseUrl}}/admin/appointments/<ID>/status`
- Body JSON: `{ "status": "no_show" }`
- Prueba con un `status` fuera del enum, ej. `{ "status": "cualquier_cosa" }` → `400` (rechazado por Zod antes de tocar la base de datos).

## 8. Compartir tu Collection con compañeros

Botón derecho sobre la collection → **Export** → genera un archivo `.json`. Puedes compartirlo por Git o Slack; cualquier compañero con Thunder Client lo importa con **Collections → Import**. (No incluimos un archivo de colección ya armado en este repo a propósito: el formato de exportación cambia entre versiones de la extensión, así que la fuente de verdad son estos pasos escritos, no un `.json` que podría quedar desactualizado.)

## ✅ Checkpoint

- [ ] Puedes ejecutar el flujo completo de un cliente (register → create → list → cancel → re-agendar) sin usar la terminal.
- [ ] Confirmaste visualmente la cookie `HttpOnly` en la pestaña Cookies de la respuesta.
- [ ] Probaste los 4 casos de error de la carpeta Admin: 403 (no admin), 409 (repetido), 400 (status inválido), y el 404 de una cita inexistente.

---

**Siguiente:** [Diagramas de arquitectura](diagramas.md) — para visualizar todo lo construido hasta ahora.
