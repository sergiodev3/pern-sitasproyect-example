# Step 04 — Autenticación: JWT en cookies HttpOnly

> **Objetivo:** registro, login y protección de rutas con JWT — pero guardando el token donde los atacantes no pueden alcanzarlo: una cookie **HttpOnly**.

```bash
cd backend
npm install bcrypt jsonwebtoken
```

## 1. ¿Dónde guardar el token? (la decisión de seguridad más importante)

En muchos tutoriales MERN el login devuelve el token en el JSON y el frontend lo guarda en `localStorage`. Funciona… y es exactamente lo que un atacante espera:

| | `localStorage` | Cookie **HttpOnly** |
|---|---|---|
| ¿Un script inyectado (XSS) puede robar el token? | **Sí**: `localStorage.getItem('token')` y se lo lleva | **No**: JavaScript no puede leer la cookie, ni el tuyo ni el del atacante |
| ¿Viaja automáticamente al backend? | No, hay que ponerlo a mano en cada petición | Sí, el navegador la adjunta solo |
| ¿Vulnerable a CSRF? | No | Mitigable con `sameSite` (lo configuramos) |
| ¿El frontend sabe si hay sesión? | Sí (lee el token) | No directamente → por eso existe `GET /auth/me` |

**Decisión del proyecto:** el token JWT viaja SOLO en una cookie `HttpOnly`. El frontend jamás lo ve ni lo toca.

## 2. Hash de contraseñas con bcrypt

Nunca se guarda la contraseña: se guarda su **hash** con salt ([`services/auth.service.js`](../backend/src/services/auth.service.js)):

```js
const passwordHash = await bcrypt.hash(password, 10); // 10 = rondas de costo
// ...al hacer login:
const passwordOk = await bcrypt.compare(password, user.password_hash);
```

Dos detalles profesionales del service:

- **Error 23505 → 409.** En vez de hacer un `SELECT` previo para ver si el email existe (que deja una ventana de carrera), intentamos el `INSERT` y capturamos la violación del `UNIQUE`:

```js
} catch (error) {
  if (error.code === '23505') {
    throw new ApiError(409, 'Ya existe una cuenta con ese email');
  }
  throw error;
}
```

- **Mensajes que no filtran información.** Si el email no existe o la contraseña está mal, la respuesta es la misma: `401 Credenciales inválidas`. Nunca le confirmes a un atacante qué emails están registrados.

## 3. Emitir la cookie en el login ([`controllers/auth.controller.js`](../backend/src/controllers/auth.controller.js))

```js
const COOKIE_OPTIONS = {
  httpOnly: true,                                       // invisible para JS
  secure: env.NODE_ENV === 'production',                // solo HTTPS en prod
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,                          // 1 día
};

res.cookie('token', jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: '1d' }), COOKIE_OPTIONS);
```

**¿Por qué `sameSite` cambia según el entorno?**

- En desarrollo, frontend (`localhost:5173`) y backend (`localhost:3000`) son el **mismo sitio** (mismo host, distinto puerto) → `lax` funciona y protege contra CSRF.
- En producción suelen ser dominios distintos (`app.vercel.app` → `api.onrender.com`) → hace falta `none`, y `none` **exige** `secure: true`. Detalle completo en el [Step 08](step-08-deploy-produccion.md).

## 4. El middleware de protección ([`middlewares/auth.middleware.js`](../backend/src/middlewares/auth.middleware.js))

```js
export function authMiddleware(req, res, next) {
  const token = req.cookies?.token;            // gracias a cookie-parser
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.userId = payload.sub;                  // "quién soy" para las capas siguientes
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
```

Proteger rutas es componer middlewares en la ruta:

```js
router.get('/me', authMiddleware, authController.me);
// y en citas, TODO el router de golpe:
router.use(authMiddleware);
```

## 5. `GET /auth/me`: la pieza que todos olvidan

Como el frontend no puede leer la cookie, al recargar la página no tiene forma de saber si hay sesión. La solución: un endpoint protegido que devuelve el usuario actual. El frontend lo llama una vez al montar la app (lo verás en el [Step 06](step-06-frontend-react-vite-ts.md)).

## 6. CORS con credenciales ([`app.js`](../backend/src/app.js))

```js
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
```

- `credentials: true` — sin esto el navegador **descarta las cookies** en peticiones cross-origin. Es el error #1 al conectar frontend y backend.
- Con credenciales, `origin` no puede ser `'*'`: debe ser la URL exacta del frontend.

## 7. Pruébalo

```bash
# Registro (guarda la cookie en cookies.txt)
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@mail.com","password":"secreta123"}'
# → 201 y un header: Set-Cookie: token=...; HttpOnly

# Ruta protegida usando la cookie guardada
curl -b cookies.txt http://localhost:3000/api/auth/me
# → {"user":{...}}

# Sin cookie → 401
curl http://localhost:3000/api/auth/me
# → {"error":"No autenticado"}
```

## ✅ Checkpoint

- [ ] El registro devuelve `Set-Cookie` con `HttpOnly`.
- [ ] `/auth/me` funciona con cookie y da 401 sin ella.
- [ ] Sabes explicar por qué localStorage + XSS = token robado, y por qué la cookie HttpOnly no.

**Siguiente:** [Step 05 — Validaciones con Zod y reglas de negocio](step-05-validaciones-zod-y-reglas-negocio.md)
