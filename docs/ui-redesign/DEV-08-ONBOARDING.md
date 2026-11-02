# DEV-08 Onboarding

## Alcance

Registro, sesión automática, estado sin negocios, creación del primer negocio, sucursal principal, giro comercial controlado, confirmación y acceso posterior al Dashboard.

## Contratos verificados

- `POST /api/auth/register` normaliza el correo, valida nombre, contraseña, confirmación y términos, almacena sólo `passwordHash` y crea una sesión real.
- `POST /api/auth/login` permite usuarios válidos sin membresías y los dirige a `/negocios/crear`.
- `POST /api/businesses` exige sesión, nombre, giro permitido e `Idempotency-Key`; crea `Business`, membresía `ADMIN`, asociación de sesión y auditoría en una transacción serializable.
- Los giros persistidos son `ropa`, `papeleria`, `abarrotes`, `ferreteria`, `belleza`, `hogar`, `electronica`, `servicios` y `otro`.
- La selección de negocio conserva la comprobación server-side de membresía.
- OAuth Google/Facebook no está configurado y no se simula.

## Evidencia

La suite aislada `CI=1 npm run test:e2e:onboarding -- --reporter=list` pasó `1/1` contra PostgreSQL E2E real. Verificó directamente `User`, `Business`, `Membership`, giro, sucursal y rol `ADMIN`; también recorrió logout y login posterior. La suite comprobó duplicado de correo `409`, respuesta sin `passwordHash`, cookie `HttpOnly`/`SameSite=Lax`, hash no reversible y replay idempotente `201` sin duplicar negocio.

Capturas sanitizadas: `docs/ui-redesign/dev-08-visual-evidence/` en 1440x900, 768x1024 y 390x844 para registro, creación, giro, confirmación y Dashboard. Las referencias originales en `diseno/` no se modificaron.

## Resultado

Preparación: Docker Engine operativo, plugin Compose ausente, por lo que se usó `docker run` exclusivamente con `lucem-retail-dev-08b-db`, volumen `lucem-retail-dev-08b-pg`, PostgreSQL 16, base `lucem_retail_e2e`, usuario `lucem_e2e` y puerto `55432`. `npm run e2e:prepare` aplicó 0001-0004 y la segunda ejecución reportó `No pending migrations to apply`; conteos seed `3|2|4`, sin duplicados. `npm run e2e:cleanup` terminó `0|0|0` y se retiraron únicamente contenedor/volumen E2E. La base de desarrollo en `5432` permaneció activa y no fue usada.

Regresión final: `npm run lint`, `npm run typecheck`, `npm test` (`24/24`), `npx prisma validate`, `npm run build` y `git diff --check` pasaron. El build emitió únicamente el warning existente sobre la detección del plugin ESLint de Next.
