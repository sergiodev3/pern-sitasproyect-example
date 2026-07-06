# 📊 Diagramas de arquitectura

Estos diagramas son material de **referencia visual**, no un step secuencial — puedes leerlos ahora para tener el mapa completo antes de empezar, o al final como repaso. Están en formato [Mermaid](https://mermaid.js.org/), que GitHub y la vista previa de Markdown de VSCode renderizan de forma nativa (abre este archivo con `Ctrl+Shift+V` en VSCode).

## 1. Flujo general de la aplicación

Cómo viaja una petición a través de las capas (ver [Step 03](step-03-backend-arquitectura-capas.md) y [Step 09](step-09-roles-de-usuario-y-estados-de-citas.md)):

```mermaid
flowchart TD
    U[Usuario] -->|navegador| FE[Frontend: React + Vite]
    FE -->|axios, withCredentials: true| BE[Backend: Express]
    BE --> CORS[CORS + express.json + cookieParser]
    CORS --> RT[Routes]
    RT --> AM{authMiddleware<br/>¿cookie JWT válida?}
    AM -->|no| E401[401 No autenticado]
    AM -->|sí, ruta /api/admin/*| RA{requireAdmin<br/>¿role === 'admin'?}
    RA -->|no| E403[403 Acceso solo para administradores]
    RA -->|sí| CT
    AM -->|sí, ruta normal| CT[Controllers]
    CT --> SV[Services]
    SV -->|SQL con parámetros $1, $2...| DB[(PostgreSQL)]
    DB --> SV
    SV --> CT
    CT --> RES[Respuesta JSON]
    RES --> FE
    FE --> U
```

## 2. Flujo de autenticación

Desde el login hasta una petición protegida, incluyendo por qué el token nunca toca `localStorage` (ver [Step 04](step-04-auth-jwt-httponly-cookies.md)):

```mermaid
sequenceDiagram
    actor C as Cliente (navegador)
    participant FE as Frontend (React)
    participant BE as Backend (Express)
    participant DB as PostgreSQL

    C->>FE: Completa el formulario de login
    FE->>BE: POST /api/auth/login {email, password}
    BE->>DB: SELECT password_hash, role WHERE email = $1
    DB-->>BE: fila del usuario
    BE->>BE: bcrypt.compare(password, password_hash)
    BE->>BE: jwt.sign({ sub: id, role })
    BE-->>FE: 200 + Set-Cookie: token (HttpOnly, Secure*, SameSite)
    FE-->>C: Redirige a /appointments

    Note over FE,BE: En cada petición protegida siguiente...
    FE->>BE: GET /api/appointments (la cookie viaja SOLA, JS no la toca)
    BE->>BE: authMiddleware: jwt.verify(token) → req.userId, req.userRole
    BE->>DB: SELECT ... WHERE user_id = $1
    DB-->>BE: filas
    BE-->>FE: 200 + citas
    FE-->>C: Renderiza la lista
```

## 3. Diagrama entidad-relación

El modelo de datos completo, incluyendo `role` y `status` del [Step 09](step-09-roles-de-usuario-y-estados-de-citas.md):

```mermaid
erDiagram
    USERS ||--o{ APPOINTMENTS : "agenda"
    USERS {
        uuid id PK
        text name
        text email UK
        text password_hash
        text role "client | admin"
        timestamptz created_at
    }
    APPOINTMENTS {
        uuid id PK
        uuid user_id FK
        text title
        text description
        timestamptz scheduled_at
        text status "scheduled | completed | no_show | cancelled"
        timestamptz created_at
    }
```

> El índice único es parcial (`WHERE status <> 'cancelled'`) y por eso no se puede expresar como una simple marca `UK` en este diagrama — ver el detalle en el Step 09.

## 4. Casos de uso

diagrama UML "casos de uso"; lo aproximamos con un flowchart que separa actores, un límite de sistema (`subgraph`) y las acciones disponibles para cada rol:

```mermaid
flowchart LR
    Cliente((Cliente))
    Admin((Administrador))

    subgraph Sistema["Mini Plataforma de Reservas y Citas"]
        UC1([Registrarse])
        UC2([Iniciar sesión])
        UC3([Agendar cita])
        UC4([Ver mis citas])
        UC5([Cancelar cita])
        UC6([Ver todas las citas])
        UC7([Marcar cita completada])
        UC8([Marcar cita no asistió])
    end

    Cliente --> UC1
    Cliente --> UC2
    Cliente --> UC3
    Cliente --> UC4
    Cliente --> UC5
    Admin --> UC2
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
```

## 5. Estados de una cita

El ciclo de vida completo de una cita, introducido en el [Step 09](step-09-roles-de-usuario-y-estados-de-citas.md):

```mermaid
stateDiagram-v2
    [*] --> scheduled: POST /appointments
    scheduled --> completed: admin marca completada
    scheduled --> no_show: admin marca no asistió
    scheduled --> cancelled: cliente cancela
    completed --> [*]
    no_show --> [*]
    cancelled --> [*]
```

Nota que **todas** las transiciones parten de `scheduled` — ninguna ruta permite, por ejemplo, pasar de `cancelled` a `completed`. Eso es exactamente lo que garantizan los guards `WHERE status = 'scheduled'` en `appointments.service.js`.
