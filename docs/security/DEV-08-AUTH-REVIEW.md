# DEV-08 Auth Review

## Revisión

- Registro usa bcrypt con coste 12 y no devuelve hash, contraseña ni token.
- El correo se normaliza antes de consultar y crear el usuario; duplicados terminan en `409`.
- La sesión se crea server-side con token aleatorio y sólo su hash se almacena en PostgreSQL.
- La creación de negocio toma el usuario de `getAuth()`, ignora cualquier `userId` o rol enviado por el cliente y asigna `ADMIN` exclusivamente al usuario autenticado.
- Giro se valida contra allowlist server-side; no se acepta enum arbitrario del cliente.
- Idempotencia usa `(userId, key)` y hash del payload. Replay idéntico devuelve el negocio original; mismo key con payload distinto devuelve `409`.
- La transacción serializable agrupa negocio, membresía, sesión, idempotencia y auditoría.
- Selección de negocio exige membresía existente. `getAuth()` no hace fallback a una membresía ajena cuando la sesión no tiene negocio activo.
- El borrador client-side no contiene credenciales sensibles.

## OAuth

Google/Facebook no están configurados en este repositorio. No se agregaron handlers ni botones con comportamiento simulado.

## Riesgos residuales

- La cookie conserva una expiración de navegador de 30 minutos; la actividad de sesión se desliza en PostgreSQL, pero no se muta la cookie desde Server Components porque Next.js lo prohíbe. Esto evita errores runtime y requiere middleware o Route Handler dedicado si se necesita extender también el `Max-Age` del navegador.
- La idempotencia protege solicitudes repetidas con key; el cliente genera una key nueva para cada intento de creación.

## Evidencia

La validación usa PostgreSQL dedicado `lucem_retail_e2e`, usuario `lucem_e2e`, loopback y puerto `55432`. No se usan mocks ni `DATABASE_URL` como fallback.

## Resultado DEV-08B

`CI=1 npm run test:e2e:onboarding -- --reporter=list`: `1 passed`. La respuesta de registro no incluyó `passwordHash`; PostgreSQL confirmó un hash distinto de la contraseña, una membresía `ADMIN`, giro `PAPELERIA` y sucursal `Matriz DEV-08`. El replay con la misma key devolvió el negocio original sin duplicarlo y el correo repetido devolvió `409`.

El cleanup terminó con `0|0|0` para usuario, negocio y membresía del namespace, y los recursos Docker E2E fueron eliminados. No se publicaron contraseñas, cookies, storage states ni payloads sensibles.
