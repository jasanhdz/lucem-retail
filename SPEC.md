## Objetivo
Activar y evaluar DEV-TEST-01B como una corrida E2E autenticada, reproducible y aislada que valide auth, tenancy, dashboard y su comparacion visual contra Stitch sin tocar la infraestructura de desarrollo.

## Scope
**Incluye**

- Activar el Docker Engine ya operativo con `docker run`, sin Compose, usando exclusivamente el contenedor `lucem-retail-dev-test-01b-db` y el volumen `lucem-retail-dev-test-01b-pg`.
- Validar antes de conectar una URL PostgreSQL explicita con host loopback, usuario exacto `lucem_e2e`, base exacta `lucem_retail_e2e` y puerto exacto `55432`; el proceso recibe esa URL mediante `E2E_DATABASE_URL` y nunca obtiene `DATABASE_URL` por fallback.
- Ejecutar `npm run e2e:prepare`, que aplica las migraciones existentes y prepara un dataset namespaceado `DEV-TEST-01` en la DB ya guardada; no reescribir schema, migraciones, scripts, Docker ni configuracion.
- Ejecutar Playwright real, enfocado en `e2e/dev-test-01/api.spec.ts`, `browser.spec.ts`, `dashboard-states.spec.ts` y `visual.spec.ts`, con login, seleccion, permisos, scoping, dashboard, logout, API y navegador reales contra PostgreSQL E2E.
- Capturar y comparar el dashboard autenticado con la referencia Stitch de DEV-TEST-01B en `1440x768`, `1440x900`, `768x1024` y `390x844`; registrar diferencias y corregir, si procede, unicamente el dashboard.
- Ejecutar cleanup idempotente y condicionado por las mismas guardas, retirar unicamente el contenedor y volumen de esta corrida, y documentar comandos, salida, HEAD, evidencia y resultado exacto `PASS`, `FAIL` o `BLOCKED`.

**Fuera de alcance y prohibiciones**

- No modificar infraestructura ni crear compatibilidad para Compose: no usar `docker compose`, `docker-compose`, `docker compose down` ni detener el contenedor o volumen de desarrollo existente.
- Prohibido usar, inspeccionar para la corrida o conectar el contenedor de desarrollo, el puerto `5432`, la base `lucem_retail`, cualquier DB compartida, seed demo o credenciales demo.
- Prohibido usar `DATABASE_URL` como fuente, fallback o sustituto de `E2E_DATABASE_URL`; si falta la variable E2E o falla una guardia, no se conecta a ninguna otra DB.
- Prohibido ejecutar el E2E global (`npm run test:e2e`), suites legacy, smoke global o cualquier spec fuera de los cuatro archivos DEV-TEST-01 indicados.
- Prohibido invocar `GET /api/audit` desde setup, API, browser, fixtures, traces o smoke. Debe conservarse literalmente la advertencia `GET /api/audit exposes passwordHash`; no se declara produccion lista.
- Prohibido imprimir o guardar contrasenas, URLs con secretos, cookies, tokens, `storageState` o dumps. No fabricar sesiones con SQL, Prisma, `addCookies`, `document.cookie` ni headers inventados.
- El alcance de correccion visual se limita al dashboard autenticado observado en los cuatro viewports; no corregir login, selector, shell, POS, productos, inventario ni otras pantallas.

## User flows
1. **Preflight** — Registrar rama, `git rev-parse HEAD` y `git status --short` sin secretos. Comprobar que `docker info` funciona, que el contenedor y volumen exclusivos no existen o pertenecen a esta corrida, y que `55432` esta libre. Rechazar cualquier proceso o contenedor de desarrollo.
2. **Base E2E por Docker** — Con shell tracing desactivado, ejecutar `docker run --detach --name lucem-retail-dev-test-01b-db --volume lucem-retail-dev-test-01b-pg:/var/lib/postgresql/data --publish 55432:5432 --env-file "$E2E_DOCKER_ENV_FILE" postgres:16-alpine`; el archivo local no versionado contiene solo los valores requeridos para `POSTGRES_USER=lucem_e2e`, `POSTGRES_PASSWORD` efimera y `POSTGRES_DB=lucem_retail_e2e`. Esperar `pg_isready` dentro de esa instancia, sin revelar la salida sensible.
3. **Guardas y prepare** — Construir `E2E_DATABASE_URL` localmente y validar host loopback, usuario `lucem_e2e`, puerto `55432`, database `lucem_retail_e2e`, esquema permitido y ausencia de `5432`, `lucem_retail`, `prod`, `production`, `staging` o hosts externos. Ejecutar `npm run e2e:prepare` con `E2E_DATABASE_URL` y `SESSION_SECRET` E2E explicitos; el comando debe terminar con migracion y seed namespaceado o emitir `BLOCKED: E2E PostgreSQL unavailable: ...` sin fallback.
4. **Login API real** — Para ADMIN, SELLER e INVENTORY_MANAGER, enviar `POST /api/auth/login` con credenciales ficticias de variables no versionadas, comprobar `200`, usuario, negocios y redirect contractual; comprobar credencial invalida `401`. Nunca registrar el valor de la cookie.
5. **Sesion Playwright real** — Generar `storageState` temporal exclusivamente desde login real, separado por rol/negocio y fuera de Git; usarlo en Playwright sin cookies o tokens manuales. Renovar un estado expirado repitiendo login, no editando archivos o DB.
6. **Seleccion y scoping** — ADMIN abre `/negocios`, recibe exactamente Centro y Norte, ejecuta `POST /api/businesses/select` con el ID real y comprueba redirect `/dashboard`; repetir ambos negocios. Un ID inventado o membership ajena debe rechazarse sin cambiar la sesion.
7. **Auth, permisos y aislamiento API** — Con cada estado real, comprobar `401` sin sesion, permisos derivados de los route handlers para los tres roles y rechazo seguro de acciones no permitidas. Comparar productos, variantes, inventario, ventas y dashboard entre Centro y Norte; un ID cross-business no puede filtrar datos.
8. **Dashboard real** — En cada negocio aplicable, esperar `GET /api/dashboard` real y comprobar `{ gross, net, units, cogs, profit, outOfStock, lowStock, recent }` contra el dataset conocido, incluyendo venta, COGS/utilidad, agotado, bajo stock y hasta cinco recientes.
9. **Estados recuperables** — Interceptar unicamente `/api/dashboard` para estados UI etiquetados `fixture`: pendiente, vacio y error/reintento. Verificar skeleton sin ceros inventados, `role=alert` accesible y que retry emite otro GET y recupera el dashboard real; estas fixtures no cuentan como evidencia autenticada.
10. **Logout real** — Desde cada sesion browser, usar el control existente, comprobar `POST /api/auth/logout`, invalidacion posterior y redirect `/login`; no borrar `storageState` antes de la asercion.
11. **Visual Stitch dashboard** — En una sesion real y con datos reales, capturar login solo como contexto de flujo si la suite lo requiere, pero comparar contra Stitch exclusivamente el dashboard en `1440x768`, `1440x900`, `768x1024` y `390x844`. Registrar URL, rol, negocio, viewport, HEAD, referencia Stitch y si cada imagen es real o fixture. Si la referencia Stitch no esta disponible o no es identificable, marcar la comparacion `BLOCKED`, no inventar un PASS.
12. **Accesibilidad y responsive** — En esas cuatro dimensiones comprobar `scrollWidth <= clientWidth`, foco visible, nombres accesibles y controles interactivos de al menos `44x44px`; el criterio visual solo cubre dashboard y no autoriza correcciones de otras pantallas.
13. **Cleanup y cierre** — Incluso tras fallos, ejecutar `npm run e2e:cleanup` solo con la misma `E2E_DATABASE_URL`, namespace `DEV-TEST-01` y guardas confirmadas. Verificar cero filas del namespace y, despues, eliminar solo el contenedor exclusivo y su volumen exclusivo. Si la identidad no coincide, no borrar y marcar `BLOCKED`.

## Modelo de datos
- Se conserva el Prisma schema y las migraciones existentes; DEV-TEST-01B no crea tablas ni cambia relaciones. Toda escritura ocurre en `lucem_retail_e2e`.
- **Identidad y tenancy:** `User(id, email, name, passwordHash, active)`, `Business(id, name, timezone, currency)`, `Membership(userId, businessId, role, canCancelSales)` y `Session(userId, activeBusinessId, tokenHash, expiresAt, lastActivityAt)`. La sesion valida el flujo real de auth y la membership determina el scoping.
- **Dataset:** dos negocios namespaceados, `DEV-TEST-01 Centro` y `DEV-TEST-01 Norte`; ADMIN en ambos; SELLER e INVENTORY_MANAGER solo en Centro; tres emails `.invalid.test` y contrasenas efimeras no versionadas.
- **Catalogo e inventario:** `Category(businessId, name, active)`, `Product(businessId, categoryId, name, location, archived)`, `ProductVariant(businessId, productId, sku, barcode, size, color, cost, price, promoPrice, stock, lowStockThreshold, active)` e `InventoryMovement(businessId, variantId, userId, type, quantity, reason, referenceType, referenceId)`. SKUs y nombres usan `DEV-TEST-01-`, con stock cero, bajo y vendible.
- **Ventas:** `Sale(businessId, userId, folio, status, paymentMethod, subtotal, total, receivedAmount, changeAmount)` y `SaleLine(saleId, variantId, quantity, unitPrice, unitCost, lineTotal)`. Centro tiene ventas deterministas para dashboard; Norte tiene datos separados y sin ventas o dataset distinto.
- Cleanup respeta foreign keys y solo elimina IDs, emails, SKU, nombres y folios del namespace; no usa `TRUNCATE` global ni toca `AuditLog`, seed demo o tablas ajenas. `GET /api/audit` no es parte del modelo de evidencia.

## Stack y decisiones técnicas
- Mantener Next.js `15.3`, React `19`, TypeScript, Prisma `6.7`, PostgreSQL `16-alpine`, Playwright `1.51`, bcryptjs y los scripts existentes. No agregar dependencias ni reescribir infraestructura.
- Docker Engine debe estar operativo. El unico arranque permitido es `docker run` con nombre, volumen y puerto exclusivos; `docker compose` esta ausente y no se sustituye por Compose.
- La URL aceptada es exactamente `postgresql://lucem_e2e:<secreto>@127.0.0.1:55432/lucem_retail_e2e?schema=public` o loopback equivalente validado. `E2E_DATABASE_URL` es la unica fuente; se asigna internamente a `process.env.DATABASE_URL` solo despues de validar y solo dentro de los procesos `e2e:prepare`, Playwright y cleanup. No se lee `.env`, no se hereda ni se imprime `DATABASE_URL`.
- Variables locales obligatorias: `E2E_DATABASE_URL`, `E2E_DOCKER_ENV_FILE`, `E2E_ADMIN_PASSWORD`, `E2E_SELLER_PASSWORD`, `E2E_INVENTORY_PASSWORD` y `SESSION_SECRET`; todas quedan fuera de Git. Passwords, cookies, tokens, estados y URLs completas nunca aparecen en logs, screenshots, traces o commits.
- Secuencia exacta: `docker version`; `docker info`; `docker run` exclusivo; readiness con `pg_isready`; `npm run e2e:prepare`; `CI=1 npm run test:e2e:auth -- --reporter=list`; `CI=1 npm run test:e2e:visual -- --reporter=list`; `npm run e2e:cleanup`; eliminacion segura del contenedor y volumen propios. No ejecutar `npm run test:e2e`.
- `playwright.e2e.config.ts` debe usar servidor en `127.0.0.1:3101` con la DB E2E validada y no reutilizar un servidor de configuracion desconocida. API y browser usan requests reales; solo `dashboard-states.spec.ts` puede interceptar respuestas UI expresamente marcadas fixture.
- Stitch es la fuente de comparacion visual entregada para DEV-TEST-01B. La evidencia debe conservar referencias legibles y hashes/nombres de las imagenes, pero no se modifican docs de diseño ni se incluyen secretos. Correcciones, si alguna, quedan limitadas a dashboard.
- Ante Docker ausente, daemon inoperativo, puerto ocupado, guardia fallida, readiness/migracion/prepare fallida, referencia Stitch ausente o cleanup no verificable, registrar comando exacto, codigo y salida sanitizada, y emitir `BLOCKED: E2E PostgreSQL unavailable: ...` para bloqueos de infraestructura; no degradar a mocks ni a otra DB.

## Assumptions
- Docker Engine ya esta instalado y operativo al iniciar la corrida; esta fase lo activa, pero no lo instala ni cambia el contenedor de desarrollo.
- `E2E_DATABASE_URL` ya puede ser provista por el entorno local/CI no versionado. Su valor se valida por parseo antes de que Prisma o la app se inicialicen; la ausencia nunca se resuelve con `DATABASE_URL`.
- `npm run e2e:prepare`, los cuatro specs DEV-TEST-01 y cleanup existentes son la implementacion a ejecutar; el Planner no los reescribe. Si no reflejan estas guardas, el resultado es BLOCKED/FAIL documentado, no un cambio de infraestructura.
- Las credenciales ficticias se inyectan solo desde variables locales y se usan en requests reales. No se escriben en snapshots, traces, capturas, reportes ni mensajes de error.
- Un PASS requiere evidencia de API, browser y visual autenticos; un mock o fixture solo puede probar estados UI delimitados y siempre se etiqueta `fixture`.
- La comparacion Stitch se hace contra el dashboard de datos reales en los cuatro viewports exactos. La ausencia, ambiguedad o mismatch no diagnosticable de la referencia es BLOCKED para visual, no permiso para comparar contra capturas anteriores.
- El warning `GET /api/audit exposes passwordHash` permanece literal y mantiene el sistema fuera de una declaracion de produccion lista, aunque los demas criterios pasen.
- La limpieza no es valida si no demuestra la misma DB, contenedor, volumen y namespace; ante duda se conserva el recurso y se marca BLOCKED para evitar borrar infraestructura ajena.

## Rubric de evaluacion
Todos los criterios son binarios y registran comando, codigo, HEAD, rol, negocio, endpoint o URL, viewport y artefacto. `PASS` exige toda la evidencia; `FAIL` contradice el contrato; `BLOCKED` solo aplica cuando falta infraestructura, autorizacion o referencia imprescindible y nunca cuenta como PASS.

1. **Guardas exactas** — El preflight acepta solo `E2E_DATABASE_URL` con usuario `lucem_e2e`, base `lucem_retail_e2e`, loopback y puerto `55432`, y rechaza `DATABASE_URL`, `5432`, desarrollo, produccion y hosts externos.
2. **Docker aislado** — `docker info`, `docker run`, readiness y migracion/prepare funcionan con `lucem-retail-dev-test-01b-db` y `lucem-retail-dev-test-01b-pg`; no se usa Compose ni el contenedor de desarrollo. Si no, queda el bloqueo exacto documentado.
3. **Dataset reproducible** — Prepare crea exactamente los usuarios, negocios, memberships, catalogo, stocks y ventas namespaceados; una segunda corrida no duplica datos.
4. **Login real** — API y Playwright prueban login valido por rol, credencial invalida `401`, payload y redirect reales, sin imprimir credenciales o cookies.
5. **Storage state seguro** — Los estados se generan por login real, quedan fuera de Git, no usan cookies/token fabricados y se renuevan repitiendo login.
6. **Seleccion real** — ADMIN cambia Centro/Norte mediante `POST /api/businesses/select` con ID real; ID inventado o ajeno se rechaza sin cambiar la sesion.
7. **Permisos e aislamiento** — Requests reales comprueban `401`, matriz de roles y ausencia de datos/IDs cross-business sin llamar `GET /api/audit`.
8. **Dashboard contractual** — `GET /api/dashboard` real y la UI coinciden en gross, net, units, cogs, profit, outOfStock, lowStock y recent con el dataset conocido.
9. **Estados UI delimitados** — Pending, empty, error y retry accesibles funcionan solo con fixtures etiquetadas; retry repite GET y ninguna fixture se presenta como dato real.
10. **Logout real** — El control emite `POST /api/auth/logout`, invalida la sesion y redirige a `/login`; no se simula borrando estado.
11. **Visual Stitch dashboard** — Existen capturas autenticadas reales del dashboard en `1440x768`, `1440x900`, `768x1024` y `390x844`, comparadas con referencias Stitch identificadas; ausencia de referencia es BLOCKED, no PASS.
12. **Responsive y accesibilidad dashboard** — En los cuatro viewports el dashboard no tiene overflow, conserva foco/nombres accesibles y los controles miden al menos `44x44px`.
13. **Correccion acotada** — Cualquier cambio visual realizado por esta fase afecta solo dashboard; el diff no contiene correcciones de login, selector, shell, POS, productos, inventario u otras pantallas.
14. **Cleanup seguro** — Cleanup idempotente elimina solo el namespace en la DB E2E, verifica cero filas y retira solo el contenedor/volumen exclusivos; una guardia fallida evita borrar.
15. **Cierre y seguridad** — Se ejecutan solo los cuatro specs enfocados y los comandos definidos, no existe llamada a `GET /api/audit`, no hay secretos en artefactos, y cada resultado final queda documentado exactamente como `PASS`, `FAIL` o `BLOCKED`.
