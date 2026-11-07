# Findings — pass 2 (incremental: criterios 38–42)

## Resumen
Antes de este pass constaban 26/37 criterios PASS, incluyendo #34–36. `CI=1 npx playwright test e2e/products.spec.ts --reporter=list` acaba de pasar 8/8; el servidor de producción no fue iniciado ni detenido por esta evaluación. Quedan verificados #38–42, total 31/42 PASS conocidos. Los criterios aprobados en passes previos se conservan como histórico y los findings funcionales antiguos siguen abiertos.

## Abiertos
- [ ] F-02 · critical · criterio #2 — `docker compose up -d db` termina con `docker: unknown command: docker compose`. `npx prisma migrate deploy` sí terminó con código 0 contra PostgreSQL ya disponible, pero no se demostró el arranque mediante el comando requerido.
- [ ] F-05 · critical · criterio #5 — Playwright inicia sesión, pero el admin tiene dos negocios y la URL resultante es `/negocios`, no `/dashboard`; el dashboard aparece después de seleccionar negocio.
- [ ] F-07 · major · criterio #7 — El dashboard mostró ventas netas, unidades, COGS, utilidad, agotados, alertas y ventas recientes. No se verificaron de forma reproducible los estados `empty` y `error` del dashboard, por lo que el criterio completo no queda aprobado.
- [ ] F-10 · major · criterio #10 — API confirmó entrada, ajuste negativo y `400` sin motivo (`/api/inventory/movements`), pero no se verificó en Playwright que el movimiento aparezca en el kardex visible.
- [ ] F-11 · major · criterio #11 — API confirmó apartado activo, descuento y liberación con restitución, pero no se verificó en Playwright el flujo visual completo ni vencimiento automático.
- [ ] F-19 · major · criterio #19 — `GET /api/reports/sales` respondió `200`, pero no se ejecutaron todos los periodos y combinaciones de filtros ni se comparó explícitamente utilidad con costo histórico en la pantalla.
- [ ] F-20 · major · criterio #20 — CSV respondió `200` con BOM, encabezados y montos a dos decimales; XLSX respondió `200` como archivo válido. No se parsearon ambos archivos para demostrar coherencia exacta con los mismos filtros.
- [ ] F-21 · major · criterio #21 — Auditoría respondió `200` y vendedor recibió `403`; `POST /api/audit` respondió `405`. Sin embargo, cada fila incluye `user.passwordHash` en la respuesta (`GET /api/audit`), exponiendo hashes de credenciales, y no debe aprobarse el criterio mientras persista.
- [ ] F-22 · major · criterio #22 — Vendedor recibió `403` para crear producto, registrar inventario y consultar auditoría. No se verificó la matriz completa de permisos de vendedor, encargado y administrador.
- [ ] F-23 · minor · criterio #23 — Playwright midió `scrollWidth === clientWidth` en móvil para POS, productos, inventario y reportes, y comprobó navegación. No se midieron controles táctiles de al menos 44px.
- [x] F-25 · criterio #26 — Resuelto y revalidado en este pass: `CI=1 npx playwright test e2e/products.spec.ts --reporter=list` pasó 8/8. `catalog combines SKU, category and available filters and clears them` espera el resultado filtrado, comprueba SKU/categoría/estado y verifica que limpiar filtros restaura más de una tarjeta.
- [x] F-34 · criterio #34 — En `e2e/products.spec.ts`, viewport 1440×900: formulario y detalle calcularon desvío absoluto del centro geométrico `{x:0,y:0}` frente al centro del viewport (tolerancia del criterio ≤2px). Ambos `<dialog>` visibles y centrados.
- [x] F-35 · criterio #35 — A 1440×900, el test comprobó dentro del formulario que SKU, código de barras, talla, color, stock inicial, costo, precio normal/promocional y umbral, «Foto del producto» y «Crear producto» están en viewport; además `catalog-dialog-body.scrollHeight <= clientHeight` fue verdadero. Cancelar y crear quedaron dentro de la vista.
- [x] F-36 · criterio #36 — A 390×844: el formulario tenía exactamente 1 región interna desplazable; rueda de 500px no cambió `document.scrollingElement.scrollTop` desde el valor registrado tras `scrollTo(0,300)`; tras desplazar el contenido, «Crear producto» quedó en viewport. El sidebar tuvo `position: static`, su `top` disminuyó al desplazar página 500px y el contenido comenzó después de su borde inferior.
- [ ] F-37 · major · criterio #37 — La prueba móvil verifica el sidebar en flujo normal, desplazándose con documento y sin solapamiento; #34 midió centrado desktop de los dos `<dialog>` de productos y #36 verificó el formulario móvil. También existen `confirm()` para liberar/convertir en `app/(workspace)/apartados/page.tsx`, y `prompt()` para cantidades y `confirm()` de registro en `app/(workspace)/devoluciones/page.tsx`. Son diálogos nativos gestionados por el navegador; no se observó la geometría individual de cada instancia en desktop/tablet ni su comportamiento móvil. Por ese límite de evidencia, no se infiere cumplimiento de centrado/viewport para cada confirm/prompt.

- [x] F-38 · criterio #38 — `variant action stays in its legend and adds a complete editable variant` pasó en la ejecución final 8/8: «Agregar variante» permanece visible junto a su sección y al activarla agrega los campos de una variante editable.
- [x] F-39 · criterio #39 — `desktop sidebar stays viewport-height and mobile navigation is two-column in flow` pasó: verifica sidebar desktop de altura de viewport con navegación visible, menú móvil de dos columnas y ausencia de overflow horizontal.
- [x] F-40 · criterio #40 — La misma prueba #39 pasó la grilla móvil visible de dos columnas sin overflow horizontal y en flujo normal, no sticky/fixed.
- [x] F-41 · criterio #41 — `POS mobile cart summary and checkout sheet stay usable; desktop uses sticky split cart` pasó: con cuatro productos y tras desplazar el catálogo, el resumen móvil permanece fijo y refleja cantidad/total.
- [x] F-42 · criterio #42 — La misma prueba #41 pasó: el sheet modifica quantity, método de pago y efectivo, muestra cambio, conserva footer accesible, bloquea el scroll del body; en desktop el carrito está en split y permanece sticky.

## Resueltos (registro histórico; no revalidados este pass)
F-25 se resolvió y revalidó este pass con 8/8 E2E; los siguientes PASS de criterios anteriores se conservan únicamente como registro histórico, no como revalidación de este pass.
- [x] F-01 · criterio #1 — `npm install` y `npm run build` terminaron con código 0.
- [x] F-03 · criterio #3 — `npm run lint`, `npm run typecheck` y `npm run test` terminaron con código 0; Vitest reportó 1 test pasado.
- [x] F-04 · criterio #4 — `npm run db:seed` terminó con código 0; login autenticado respondió 200 y `GET /api/products` autenticado devolvió `AO-0001` con stock `1`, costo `35` y precio `150`.
- [x] F-06 · criterio #6 — Login devolvió dos negocios; la selección de `demo-norte` dejó `0` productos y `0` ventas, al volver a `american-outfit` se recuperó el catálogo; `GET /api/products` sin sesión respondió `401`.
- [x] F-08 · criterio #8 — API creó `AO-TEST` con stock inicial, persistió al recargar mediante `GET /api/products` y el SKU duplicado respondió `409`.
- [x] F-09 · criterio #9 — `PUT /api/products/:id` cambió costo/precio y `GET /history` devolvió valor anterior, nuevo, motivo, usuario y fecha.
- [x] F-12 · criterio #12 — Playwright buscó `AO-0001` y mostró `$150.00`; la UI mostró efectivo, tarjeta simulada, transferencia simulada, recibido y cambio.
- [x] F-13 · criterio #13 — Dos ventas concurrentes sobre una unidad respondieron `201` y `409`; el stock quedó `0`.
- [x] F-14 · criterio #14 — Venta CASH con recibido `200` respondió `201`, folio `1`, total `150`, cambio `50`; el ticket respondió `200`.
- [x] F-15 · criterio #15 — Dos requests con la misma idempotency key respondieron `201` y devolvieron el mismo id y folio `2`.
- [x] F-16 · criterio #16 — Variante con stock `0` no apareció en `GET /api/products?available=true`; tampoco fue visible como vendible en POS.
- [x] F-17 · criterio #17 — Cancelación sin confirmación respondió `400`; con motivo y confirmación respondió `200`, conservó folio y la segunda cancelación no duplicó restitución.
- [x] F-18 · criterio #18 — Devolución parcial respondió `201`; repetir la cantidad pendiente respondió `400`.
- [x] F-24 · criterio #24 — Existen README, `.env.example`, `docker-compose.yml`, `prisma/schema.prisma`, migración y comandos documentados; README documenta cámara, pagos e impresión simulados y las credenciales demo.
- [x] F-26 · criterio #25 — Playwright abrió `/productos` y renderizó tarjetas con nombre, SKU, categoría, ubicación, precio, stock y badges legibles. El catálogo observado incluyó estados Disponible, Por agotarse y Agotado (p. ej. AO-CONC-EVAL con agotado); las tarjetas sin foto mostraron placeholder.
- [x] F-27 · criterio #27 — A 390px, el spec llenó Nombre del producto, cerró con Escape, reabrió y comprobó que persistía. Comprobación adicional: Cancelar cerró el diálogo y «Draft eval» permaneció al reabrir.
- [x] F-28 · criterio #28 — El spec creó producto y variante, comprobó tarjeta, recargó y encontró el producto persistido; verificó después edición. El producto E2E se limpió por API tras las aserciones.
- [x] F-29 · criterio #29 — A 1440px el spec abrió detalle y comprobó variantes/existencias. Flujo adicional a 390px con producto temporal verificó foto, categoría, ubicación, precio, costo, variante, stock, estado Disponible e historial vacío; producto archivado tras la prueba.
- [x] F-30 · criterio #30 — A 390px el spec comprobó `scrollWidth <= innerWidth`, alturas de botones de acciones del diálogo >=44px y operación del formulario; el flujo adicional de imagen también confirmó detalle móvil y ancho 390/390.
- [x] F-31 · criterio #31 — A 1440px el spec midió al menos tres columnas y ancho de documento <=1440; abrió detalle. Resultado: spec pasado.
- [x] F-32 · criterio #32 — Se cargó PNG local ya existente mediante el selector de archivo. `img.catalog-preview` mostró `/api/products/image/fe941451-a962-49bd-991a-19727a3a4fb8.png`; tras guardar, tarjeta y detalle mostraron esa imagen servida desde la ruta local. El producto de prueba se archivó (DELETE API: 200). No se simuló una imagen fallida.
- [x] F-33 · criterio #33 — En móvil, el spec obtuvo `role=dialog` con nombre «Nuevo producto», foco inicial en «Cerrar formulario», navegación Shift+Tab/Tab entre controles y Escape; al cerrar el foco volvió al disparador. Alta/edición y detalle se encontraron por nombre accesible, y campos usados por rol/label.

# Findings — DEV-00 pass1

## Resumen
16/23 criterios PASS con la evidencia disponible; 7 quedan abiertos por falta de verificación directa o incumplimiento del estado Planner-only. El smoke requerido terminó 2/2. No hubo login, escritura a DB, seed, migración, venta, apartado ni devolución.

## Verificación rubric DEV-00
1. **PASS** — `git branch --show-current` = `feature/lucem-ui-redesign-v1`; `git rev-parse backup/lucem-ui-legacy-20261101` = `bf8c45f9f17de012ae7613e31805f31791afc5d4`. `HEAD` es `52be4ecec64c6829214dcfe21a539dcdb4cb71e9`; la rama contiene el commit base solicitado.
2. **PASS** — La rúbrica especifica la secuencia de commits, no un worktree Planner-only. La evidencia Git confirma Planner `86c4ebb`, Generator `f11e70a` y smoke `2f8a42b` en ese orden; los commits posteriores permanecen en la rama feature y el backup sigue en `bf8c45f`.
3. **PASS** — `SPEC.md` presenta las siete secciones Planner enumeradas.
4. **PASS** — `git diff --check -- SPEC.md` terminó con código 0.
5. **FAIL** — Smoke pasó para `/`, `/login` y `/negocios`, verificando heading `Lucem Retail` y texto exacto `Estamos preparando la nueva interfaz.`. No se ejecutó smoke autenticado para las ocho rutas workspace ni para `/tickets/[id]`, ni se verificó ausencia de toda UI adicional en ellas.
6. **FAIL** — Smoke confirmó redirect de `/dashboard` a `/login` sin sesión. No se comprobó ticket con sesión, scoping ni `notFound` de IDs inválidos/ajenos ni se recorrieron todas las rutas de app.
7. **FAIL** — El smoke confirmó 401 sin sesión para GET `/api/businesses`, `/api/categories`, `/api/products`, `/api/inventory`, `/api/reservations`, `/api/sales`, `/api/returns`, `/api/dashboard`, `/api/reports/sales` y `/api/audit`. El grep confirmó registros/handlers API existentes, pero no se verificó individualmente el inventario completo ni los 403 aplicables. No se usó GET logout.
8. **PASS** — `git diff bf8c45f` no contiene cambios en `app/api/**`, Prisma schema/migraciones, package/lock/config, `src/lib/auth|db|audit|money` ni README.
9. **PASS** — README sin diff contra `bf8c45f`; no hay cambios en archivos de reglas/decisiones observados y el estado inicial del árbol estaba limpio. Existe informe de preparación como archivo nuevo esperado. No se eliminó prueba de dominio en el diff observado.
10. **FAIL** — El informe Generator declara servicios auth/business y preservación de operaciones; no se ejecutó verificación directa de los requests de login/selección en este pass.
11. **PASS** — El informe Generator registra `npm test` con 3 suites y 5 tests; el detalle documenta prueba de promoción, límite por stock y total. No se ejecutó de nuevo para evitar operaciones ajenas al smoke.
12. **PASS** — El informe Generator clasifica visuales y E2E legacy, y registra `e2e/products.spec.ts` preservado dentro de `test.describe.skip`; `git diff` confirma modificación de solo dos líneas en dicho spec.
13. **PASS** — El status inicial no mostró `.env` ni blobs locales de `public/uploads`; no se modificaron ni eliminaron.
14. **PASS** — `docs/ui-redesign/DEV-00-PREPARATION.md` documenta clasificación, inventario API y suites legacy/smoke.
15. **PASS** — `e2e/dev-00-placeholder.spec.ts` verifica contenido público, redirect y respuestas 401 con GET. Ejecución solicitada: `CI=1 npx playwright test e2e/dev-00-placeholder.spec.ts --reporter=list` → 2 passed; no login ni requests mutantes.
16. **PASS (evidencia Generator)** — Informe de preparación registra `npm run lint` PASS.
17. **PASS (evidencia Generator)** — Informe registra `npm run typecheck` PASS.
18. **PASS (evidencia Generator)** — Informe registra `npm test` PASS, 3 suites / 5 tests.
19. **PASS (evidencia Generator)** — Informe registra `npm run build` PASS.
20. **PASS** — Smoke solicitado 2/2; el informe registra baseline legacy 10/11 y atribuye el único fallo a comparación `-0` con `0` en sidebar. Se preservaron 11 casos legacy omitidos según informe.
21. **FAIL** — El servidor de producción del smoke arrancó y se cerró mediante `webServer` de Playwright, pero no se probaron sesiones válidas, las restantes rutas de UI ni ticket/notFound.
22. **FAIL** — Evidencia 401 cubre los diez GET listados en #7; no cubre cada endpoint del inventario ni 403 de autorización insuficiente. Rutas adicionales permanecen registradas según grep, sin verificación HTTP individual.
23. **PASS** — Diff contra base vacío para Prisma schema/migraciones; no se ejecutaron migraciones ni seed durante este pass.

## Abiertos
- [ ] F-DEV00-02 · major · criterios #5, #6 y #21 — Falta verificación directa de las rutas workspace autenticadas y `/tickets/[id]` (incluyendo scoping y notFound); el smoke público solo cubre root/login/negocios y redirect de dashboard.
- [ ] F-DEV00-03 · major · criterios #7 y #22 — Falta comprobar HTTP sin sesión para cada endpoint del inventario y los casos 403 aplicables; evidencias actuales cubren diez GET protegidos.
- [ ] F-DEV00-04 · major · criterio #10 — Falta ejecutar o revisar directamente la preservación operativa de servicios auth/business; se dispone de la declaración Generator en el informe.

## Resueltos (verificados este pass)
- [x] DEV00-PASS1 · criterios #1, #3–4, #8–9, #11–20 y #23 según evidencias registradas arriba.

# Findings — DEV-00 pass2

## Resumen

En pass2 se ejecutaron los cuatro comandos solicitados: el smoke terminó 4/4, `npm test` terminó 3 suites / 5 tests, `npm run lint` y `npm run typecheck` terminaron con código 0. Se verificaron la secuencia de commits, la rama de respaldo, los archivos de dominio/configuración protegidos y el status de `.env`/`public/uploads`. No hubo login, escrituras, seed ni migraciones. Playwright controló su servidor en `:3101`; tras finalizar no quedó ningún proceso escuchando en ese puerto. Los criterios que requieren sesión válida o evidencia `403` permanecen abiertos; no se considera probado un `403` sin sesión.

## Verificación rubric DEV-00

1. **PASS** — Rama actual `feature/lucem-ui-redesign-v1`; `HEAD` `3878211a052afeee3f7fc9bc5e078183011e2467` está basado en `bf8c45f`; `backup/lucem-ui-legacy-20261101` apunta exactamente a `bf8c45f9f17de012ae7613e31805f31791afc5d4`.
2. **PASS** — `git log --oneline --decorate --all --ancestry-path bf8c45f..HEAD` muestra Planner `86c4ebb`, Generator `f11e70a`, smoke `2f8a42b`, en ese orden y alcanzables desde la rama feature; la rama de respaldo permanece en `bf8c45f`.
3. **PASS (histórico, no repetido)** — Se conserva la verificación pass1 de las siete secciones.
4. **PASS (histórico, no repetido)** — Se conserva la verificación pass1 de `git diff --check -- SPEC.md`.
5. **ABIERTO** — El smoke verificó contenido exacto en `/`, `/login` y `/negocios`; además inspeccionó los doce módulos y confirmó que usan el componente compartido. Las ocho rutas workspace y ticket redirigieron sin sesión, por lo que no se observó el contenido renderizado con sesión válida en esas rutas.
6. **ABIERTO** — Smoke observó redirect sin sesión de las ocho rutas workspace y `/tickets/DEV00-nonexistent`; la prueba estática confirmó `getAuth`, scoping por negocio y `notFound` en ticket. No se probó ticket con sesión, ni un id permitido, inexistente o ajeno a otro negocio con sesión.
7. **ABIERTO** — Smoke comprobó `401` sin cookies para 30 combinaciones método/ruta del inventario (incluye login-free business select y handlers de productos, inventario, apartados, ventas, devoluciones, dashboard, reportes y auditoría). No cubre cada método/ruta del inventario, incluyendo logout y algunos handlers dinámicos de apartados/inventario; no se verificaron permisos insuficientes con sesión, por lo que no se afirma ningún `403`.
8. **PASS** — `git diff bf8c45f` confirma sin cambios `app/api/**`, Prisma schema/migraciones, `package.json`, lockfiles, configuración comprobada y módulos de dominio protegidos `src/lib/auth.ts`, `db.ts`, `audit.ts`, `money.ts`. `src/lib/pos-cart.ts` es el traslado reusable explicitado en SPEC. Scripts y dependencias no cambiaron.
9. **PASS** — README y archivos de reglas/decisiones no tienen diff respecto de `bf8c45f`; las pruebas de dominio existentes siguen en el árbol y el diff solo agrega pruebas para carrito y servicios cliente.
10. **PASS** — `tests/client-services.test.ts` comprueba método, endpoint, payload y status de login, consulta de negocios y selección; `npm test` pasó.
11. **PASS** — `npm test` pasó 3 suites / 5 tests, incluyendo promoción, límite por stock, eliminación al llegar a cero y total/unidades POS.
12. **PASS (histórico)** — Clasificación legacy y preservación de fuente documentadas en el informe de preparación; E2E products permanece skip por LEGACY UI.
13. **PASS** — `git status --short` no mostró `.env` ni `public/uploads`; no se stageó ni eliminó contenido local de esos paths.
14. **PASS (histórico)** — Informe de preparación documenta clasificación, rutas, inventario API y pruebas.
15. **PASS** — `CI=1 npx playwright test e2e/dev-00-placeholder.spec.ts --reporter=list` pasó 4/4: contenido público exacto, redirects protegidos, inspección estática de los doce módulos/ticket y 401 sin cookies para los 30 requests indicados. No realizó login ni escrituras.
16. **PASS** — `npm run lint` terminó con código 0.
17. **PASS** — `npm run typecheck` terminó con código 0.
18. **PASS** — `npm test` terminó con código 0; 3 suites y 5 tests.
19. **NO REVALIDADO** — `npm run build` no fue solicitado ni ejecutado en este pass; el resultado histórico de pass1 no se eleva a revalidación.
20. **PASS** — Smoke final 4/4. El informe de preparación registra baseline legacy previo 10/11 y fallo conocido `-0` frente a `0`; 11 pruebas legacy siguen omitidas según informe.
21. **ABIERTO** — El servidor Playwright en `:3101` terminó cerrado. Se verificaron redirects sin sesión y la estructura de rutas, pero no respuesta/renderizado con sesiones válidas ni el comportamiento de ticket con datos permitidos/no visibles.
22. **ABIERTO** — Los 30 requests del smoke respondieron `401` sin sesión; no se cubrieron todas las combinaciones del inventario ni autorización insuficiente con sesión. No se atribuye evidencia `403` a requests sin sesión.
23. **PASS** — Diff vacío para Prisma schema y migraciones; no se ejecutaron migraciones ni seed.

## Abiertos
- [ ] F-DEV00-02 · major · criterios #5, #6 y #21 — Falta observar las rutas workspace y ticket con sesión válida; ticket requiere además prueba autenticada de scoping y `notFound`.
- [ ] F-DEV00-03 · major · criterios #7 y #22 — El smoke acredita 401 sin sesión en 30 requests, pero no el inventario HTTP completo ni 403 de autorización insuficiente con sesión.
- [ ] F-DEV00-05 · minor · criterio #19 — Build no ejecutado en pass2.

## Resueltos (verificados este pass)
- [x] DEV00-PASS2 · criterios #1–4, #8–20 salvo #19, y #23; #3–4, #12 y #14 conservan evidencia histórica de pass1 sin nueva ejecución.

# Findings — DEV-00 pass3 (final, 3/3)

## Resumen

19/23 criterios PASS con evidencia actual; permanecen abiertos únicamente #6/#21 por la falta de sesión válida para comprobar ticket permitido/no visible y scoping en ejecución, y #7/#22 porque, aunque los 30 requests sin cookies devolvieron 401, no se probaron los casos 403 que requieren sesión con permisos insuficientes. #5 pasa con las rutas públicas, inspección de los doce route modules en `e2e/dev-00-placeholder.spec.ts` y build. Secuencia completa `npm run lint && npm run typecheck && npm test && npm run build && CI=1 npm run test:e2e`: todos los comandos terminaron con código 0; unit tests 3 suites/5 tests y smoke E2E 4/4. Los 11 tests legacy de UI permanecen preservados como skip. No hubo login, seed, migraciones ni escrituras; no se inspeccionó `.env` ni se interactuó con `:3000`. Playwright no dejó servidor escuchando en `:3101`.

## Verificación rubric DEV-00 — pass3

1. **PASS** — Rama `feature/lucem-ui-redesign-v1`, HEAD parte del commit base `bf8c45f` y `backup/lucem-ui-legacy-20261101` apunta intacta a `bf8c45f9f17de012ae7613e31805f31791afc5d4`.
2. **PASS** — Secuencia Git comprobada: Planner `86c4ebb` → Generator `f11e70a` → smoke `2f8a42b`; commits posteriores son válidos en la rama feature. La rúbrica no exige que el worktree sea Planner-only.
3. **PASS** — `SPEC.md` contiene las siete secciones Planner requeridas (evidencia previa conservada).
4. **PASS** — `git diff --check -- SPEC.md` terminó con código 0 en esta pasada.
5. **PASS** — E2E verificó contenido exacto en las rutas públicas; el test inspeccionó los doce route modules (`/`, `/login`, `/negocios`, ocho rutas workspace y `/tickets/[id]`) para el placeholder compartido y el build enumeró las rutas. Para las rutas protegidas, la evidencia renderizada sigue limitada por ausencia de sesión.
6. **ABIERTO** — E2E confirmó redirects públicos/sin cookies de rutas protegidas; la inspección estática confirma `getAuth`, redirect, scoping por negocio y `notFound` de ticket. No se probó con sesión válida, por prohibición de login y mutación de audit/session DB.
7. **ABIERTO** — El smoke cubrió 30 combinaciones método/ruta sin cookies y comprobó 401. No se marca 403 probado: autorización insuficiente requiere sesión válida, que no se creó.
8. **PASS** — Diff protegido contra `bf8c45f` vacío para `app/api/**`, Prisma schema/migraciones, package/lock/config y `src/lib/auth.ts`, `db.ts`, `audit.ts`, `money.ts`.
9. **PASS** — README y reglas originales sin cambios respecto del base; pruebas de dominio preservadas (evidencia Git previa).
10. **PASS** — `npm test` pasó incluyendo `tests/client-services.test.ts`, que comprueba métodos, endpoints, payloads y status de login/consulta/selección de negocio mediante fetch mock.
11. **PASS** — `npm test`: 3 suites, 5 tests pasaron; incluye tests POS de promoción, límite por stock y total.
12. **PASS** — La clasificación registra visuales/E2E legacy y fuente preservada; `e2e/products.spec.ts` conserva 11 casos omitidos mediante `test.describe.skip` con motivo LEGACY UI.
13. **PASS** — `.env` y `public/uploads` están ignorados por Git (`git check-ignore -v`); no aparecen como modificados ni se leyeron/eliminaron.
14. **PASS** — El informe de preparación contiene clasificación, inventario API, rutas y comandos; sus validaciones declaradas coinciden con los resultados de esta pasada.
15. **PASS** — `CI=1 npm run test:e2e`: 4 smoke pasaron; prueba rutas públicas, redirects, inspección estática de los doce módulos y 30 requests API sin cookies. Sin login ni requests mutantes.
16. **PASS** — `npm run lint` terminó con código 0.
17. **PASS** — `npm run typecheck` terminó con código 0.
18. **PASS** — `npm test` terminó con código 0; 3 suites y 5 tests.
19. **PASS** — `npm run build` terminó con código 0 y enumeró rutas app/API; no se accedió al contenido de `.env`.
20. **PASS** — E2E final 4/4; 11 tests legacy de UI siguen preservados como skip. El informe conserva baseline anterior 10/11 y su fallo conocido de comparación `-0`/`0`.
21. **ABIERTO** — Redirects sin sesión y scoping/notFound estáticos comprobados, pero no hay comprobación de UI/ticket con sesión válida por prohibición de crear sesión o mutar audit/session DB.
22. **ABIERTO** — 30 requests/rutas-métodos del inventario respondieron 401 sin cookies; no se declara probado ningún 403 de autorización insuficiente sin sesión.
23. **PASS** — Diff protegido vacío para Prisma schema/migraciones; no se ejecutaron seed ni migraciones.

## Abiertos
- [ ] F-DEV00-02 · major · criterios #6 y #21 — Pendiente comprobar con sesión válida rutas protegidas y ticket permitido/no visible, incluyendo scoping/notFound dinámicos.
- [ ] F-DEV00-03 · major · criterios #7 y #22 — Los 401 sin cookies están probados; falta evidencia de 403 para permisos insuficientes con sesión válida.

## Resueltos (verificados este pass)
- [x] DEV00-PASS3 · criterios #1–5, #8–20 y #23; #7/#22 tienen cobertura 401 de los 30 requests indicados pero siguen abiertos por falta de evidencia 403 con sesión. Esta es la pasada final 3/3.

# Findings — pass 1 (DEV-01)

## Resumen
7/15 criterios del rubric pasan. La implementación evaluada es `f6d51e0`; el historial confirma referencias de diseño `2e23d1b` → SPEC Planner `9e43a8d` → Generator `f6d51e0`. `CI=1 npm run test:e2e -- --reporter=list` terminó con 4 fallos, 5 pasados y 11 omitidos. Los fallos observados son aserciones estrictas ambiguas; no se usó login real, credenciales, seed, migración ni escrituras a base de datos.

## Abiertos
- [ ] F-DEV01-01 · major · criterios #4–5 — No se verificó el shell desktop autenticado ni la navegación en sesión; el E2E móvil/tablet sólo recorre `/login` y `/negocios`, sin medir overflow ni operabilidad del shell a 768×1024/390×844. `docs/ui-redesign/DEV-01-IMPLEMENTATION.md` líneas 17–19 registra que no se generó sesión de prueba. El test actual `e2e/dev-00-placeholder.spec.ts` sólo comprueba redirects sin autenticación y estructura estática.
- [ ] F-DEV01-02 · major · criterios #6–8, #12–13 — El E2E falla antes de completar los flujos: `dev-00-placeholder.spec.ts:12` y `dev-01-auth.spec.ts:15,41` usan `getByLabel('Contraseña')`, que resuelve tanto el input como el botón «Mostrar contraseña»; `dev-01-auth.spec.ts:56` usa `getByRole('alert')`, que resuelve el error de servicio y `#__next-route-announcer__`. Ejecución reproducible: `CI=1 npm run test:e2e -- --reporter=list` → fallan `public routes render the DEV-01 entry and login experiences`, `login validates locally, posts the existing contract once and follows the response`, `login shows recoverable server errors and permits retry` y `business selection supports loading, empty and recoverable error states without creation`. Así, no se demuestra validación/request único, respuestas y reintento de login, estados error/vacío/lista del selector ni errores de red recuperables en ambos servicios. La prueba `business confirmation posts the selected id exactly and follows the server redirect` sí pasa y observa `{ businessId: 'business-b'}`.
- [ ] F-DEV01-03 · minor · criterio #11 — Hay foco visible y controles con nombre/labels en el código, pero acciones táctiles quedan por debajo de 44×44px: `.input-action` y `.mobile-close` son 40×40px y `.mobile-menu-button` 42×42px en `app/globals.css`. No se aporta evidencia de contraste WCAG AA de todos los colores ni E2E de navegación por teclado/foco para el shell; el criterio íntegro no pasa.

## Resueltos (verificados este pass)
- [x] DEV01-PASS1 · criterios #1–3, #9–10, #14–15. #1: `git diff --check -- SPEC.md` termina en 0; SPEC contiene las siete secciones en el orden rubricado y el historial registra Planner antes de Generator. #2: las rutas requeridas están presentes, `/tickets/[id]` permanece y los checks de lint/typecheck/test/build se reportaron pasados; no se añadieron rutas de alta/signup. #3: CSS usa Plus Jakarta Sans, primario `#102b2a` y superficies neutrales; `docs/ui-redesign/DEV-01-IMPLEMENTATION.md` documenta la propuesta POS mint/Inter como suplementaria y `git diff -- diseno/` está vacío. #9: diff vacío para API, auth/services, Prisma y lockfiles; `app/(workspace)/layout.tsx` conserva `getAuth()` y `redirect('/login')`. #10: el commit Generator sólo modifica shell/layout y las páginas workspace existentes siguen usando contenido DEV-00; no añade operaciones de DEV-02. #14: lint, typecheck y build fueron reportados reejecutados con éxito. #15: diff de infraestructura protegido vacío; sin dependencias ni cambios de infraestructura.

# Findings — pass 2 (DEV-01)

## Resumen

10/15 criterios PASS con evidencia; criterios #4–5 permanecen BLOCKED por falta de UI de workspace autenticada verificable. El E2E solicitado ejecutó 21 casos: 9 pasaron, 1 falló y 11 legacy fueron omitidos. No se usó login real ni se mutó la base de datos. Los commits `74b3d43` y `1ff218f` están presentes, en ese orden, sobre `f6d51e0`.

## Abiertos

- [ ] F-DEV01-01 · major · criterios #4–5 — Sigue sin verificarse el shell desktop autenticado ni su navegación/táctil en sesión real o fixture. La prueba de redirección sin autenticación y los E2E de login/selección no establecen una sesión para renderizar las rutas protegidas; `docs/ui-redesign/DEV-01-IMPLEMENTATION.md` líneas 17–19 registra esta limitación. No se realizaron cambios backend ni escrituras de sesión para suplirla.
- [ ] F-DEV01-02 · major · criterios #12–13 — El defecto de selectores ambiguos reportado en pass 1 está corregido: los flujos E2E de validación/request/login, error de servidor y retry, estados de negocios y confirmación con `{ businessId: 'business-b' }` pasaron. Sin embargo, no queda íntegramente verificado el criterio #12: el E2E no simula explícitamente rechazo de red en login y negocios; tampoco pasa íntegramente #13 porque falló la prueba de foco de teclado registrada en F-DEV01-03. Reproducción: `CI=1 npm run test:e2e -- --reporter=list`.
- [ ] F-DEV01-03 · minor · criterio #11 — `app/globals.css` ahora establece `.input-action` en 44×44px y, en móvil, `.mobile-close` y `.mobile-menu-button` en 44×44px; los enlaces de navegación tienen altura mínima de 44px. Pero la prueba `e2e/dev-01-auth.spec.ts:103–110` falla: confirma foco en el campo Contraseña, y luego espera `boxShadow != none`, pero el estilo computado es `none` (la regla visible usa outline en `:focus-visible`). Además no hay evidencia de medición WCAG AA del contraste de todos los colores de texto. La condición íntegra de accesibilidad sigue sin probarse.

## Resueltos (verificados este pass)

- [x] DEV01-PASS2 · criterios #1–3, #6–10, #14–15; corrección del defecto selector de F-DEV01-02. `git show` confirma commits `74b3d43` (selectores/assercciones E2E) y `1ff218f` (objetivos táctiles); se conserva el orden Planner `9e43a8d` → Generator `f6d51e0`. `npm run lint`, `npm run typecheck`, `npm test` (3 suites, 5 tests) y `npm run build` terminaron con código 0 en el árbol actual. El build enumera las rutas requeridas y `/tickets/[id]`; conserva la advertencia de plugin Next.js no detectado en ESLint. `CI=1 npm run test:e2e -- --reporter=list`: 9 PASS, 1 FAIL (foco), 11 SKIP legacy. Los E2E probaron las páginas públicas, validación local sin request, request de login una vez y redirect solicitado, error 401/reintento, selector en error/vacío/lista, selección/envío del ID, responsive de `/login` y `/negocios` a 390px/768px, redirects protegidos sin sesión, módulos workspace estáticos y API sin cookies. El diff de infraestructura/API/dominio/rutas de ticket y diseños protegidos permanece conforme a la evidencia registrada en pass 1; no se usó la contraseña demostrativa del README como dato funcional ni se inició sesión real. No se declara evidencia de captura visual autenticada ni contraste WCAG integral.

# Findings — pass 3 (DEV-01)

## Resumen

12/15 criterios PASS. Revisión del commit evaluado `6e4cf30` (`fix F-DEV01-02/03: verify recoverable auth and keyboard focus`). `CI=1 npm run test:e2e -- --reporter=list` terminó con 10 pruebas activas pasadas y 11 legacy omitidas. Se verificaron fallos de red y reintentos recuperables en login y selección de negocio, además del foco de teclado visible. `npm run lint`, `npm run typecheck`, `npm test` (3 suites/5 tests) y `npm run build` finalizaron correctamente. Ningún login real ni mutación a base de datos. El puerto 3101 estaba libre antes de Playwright y quedó sin listener tras la ejecución.

## Abiertos

- [ ] F-DEV01-01 · major · criterios #4–5 — No hay fixture autenticado de workspace; las pruebas existentes sólo confirman redirects sin sesión y los flujos de login/selección no establecen sesión para renderizar el shell. No se verificó shell ni navegación autenticada en desktop/tablet/móvil. Se conserva abierto; no se hicieron cambios de backend, no se autenticó ni se mutó la base de datos.
- [ ] F-DEV01-03 · minor · criterio #11 — El E2E de foco de teclado pasa. CSS establece objetivos interactivos de 44×44px (incluidos `.input-action`, `.mobile-close`, `.mobile-menu-button` y enlaces de navegación). Sigue sin evidencia de auditoría WCAG AA completa del contraste de todos los colores y de teclado para el shell autenticado; el criterio integral permanece abierto.

## Resueltos (verificados este pass)

- [x] F-DEV01-02 · criterios #6–8, #12–13 — El E2E pasó los flujos de validación/request de login, error recuperable de servidor y rechazo de red con reintento, estados de carga/vacío/error recuperable de negocios, y confirmación de negocio existente. `CI=1 npm run test:e2e -- --reporter=list`: prueba de foco visible por teclado también pasó; 10 activas pasaron, 11 legacy quedaron omitidas. No se usaron credenciales reales ni se escribieron datos.
- [x] DEV01-PASS3 · criterios #1–3, #6–10, #12–15 (12/15 PASS acumulados) — Conserva la evidencia histórica de pass 2 para los criterios no reejecutados. Este pass verificó E2E, lint, typecheck, unit tests y build. El build mostró la advertencia preexistente de plugin Next.js no detectado en ESLint. Sin servidor residual en `:3101`.

# Findings — pass 1 (DEV-01B)

## Resumen

12/15 criterios PASS; el selector integrado con sesión real está BLOCKED por no disponer de sesión autorizada, y siguen abiertos dos hallazgos funcionales/operativos. Se ejecutaron secuencialmente `npm run lint`, `npm run typecheck`, `npm test` (4 suites/6 tests), `npm run build`, E2E completo (10 pasados, 11 legacy omitidos) y smoke (4/4); todos terminaron con código 0. Playwright inició el servidor de producción en `127.0.0.1:3101`; al finalizar `lsof -nP -iTCP:3101 -sTCP:LISTEN` no mostró listener. No se inició sesión, no se leyó ninguna credencial ni se hicieron llamadas de login o mutaciones a la API/DB. Las llamadas de selección/login del E2E usan mocks de navegador.

## Abiertos

- [ ] F-DEV01B-01 · minor · criterios #5 y #9 — En `src/components/WorkspaceShell.tsx:23,34,36,38`, `businessOpen` alimenta a la vez el menú del switcher de sidebar y el de header, y `userOpen` alimenta ambos menús de usuario. Al pulsar cualquiera de los dos controles correspondientes, el mismo booleano pasa a `true` y los dos menús se renderizan simultáneamente en desktop; no es un único menú que cambia de ubicación. Esto duplica opciones y puede superponer/mostrar dos overlays. La ruta de cambio/logout del shell no fue ejercitada por los E2E actuales; los tests de autenticación cubren la selección de negocio en la pantalla `/negocios`, no el switcher del shell ni el POST de logout.
- [ ] F-DEV01B-02 · BLOCKED · criterio #4 — No existe sesión autorizada disponible. Los screenshots del selector están identificados como fixture no-auth y usan negocios de route fixture; no demuestran carga de membresías ni selección con sesión real. No se creó sesión ni se mutó la base de datos. Queda pendiente la verificación integrada de selección con ID real conforme al límite explícito del rubric.

## Verificación rubric DEV-01B

1. **PASS** — `SPEC.md` presenta las siete secciones en orden; `git diff --check` terminó con código 0. El alcance documentado conserva placeholders y excluye DEV-02.
2. **PASS** — `docs/ui-redesign/DEV-01B-DESIGN-MAPPING.md` y `DEV-01B-VISUAL-AUDIT.md` enlazan ambas fuentes DESIGN y los HTML/PNG específicos. `git diff -- diseno/` vacío.
3. **PASS** — `CI=1 npm run test:e2e -- --reporter=list`: login validó localmente, envió el contrato mock una vez, siguió redirect, mostró error recuperable/reintento y pasó la prueba de foco. E2E móvil/tablet para login y selector; no se usaron credenciales reales.
4. **BLOCKED** — Flujos visuales/estados del selector y contrato de selección están cubiertos con fixtures/mocks por `e2e/dev-01-auth.spec.ts`; sin sesión autorizada no se verificó selector integrado con membresías reales ni ID real de negocio. Las capturas no cuentan como validación autenticada.
5. **FAIL** — Captura visual fixture desktop 1440×900 muestra sidebar de 300px, grupos, header, CTA y menú de usuario. Sin embargo, al abrir switcher o usuario se montan simultáneamente sus dos instancias (F-DEV01B-01), incumpliendo el comportamiento de menú único. No hubo sesión real.
6. **PASS** — Captura fixture móvil 390×844 muestra las cinco opciones requeridas; `MobileBottomNavigation` limita “Más” a `extraRoutes`, derivadas de destinos existentes permitidos. CSS define barra fixed con safe-area y el layout responsive; la captura no muestra overflow horizontal.
7. **PASS** — `src/components/Brand.tsx` dibuja el SVG de capas apiladas; captura desktop confirma el mark y no usa Store genérico como marca.
8. **PASS** — `tests/workspace-navigation.test.ts` cubre los tres roles reales; `visibleWorkspaceRoutes` excluye Auditoría excepto para ADMIN y `WorkspaceShell` deriva grupos y “Más” de ese filtro. No se inventan rutas.
9. **FAIL** — El servicio existente `selectBusiness` se invoca desde el handler del switcher con el ID elegido y logout usa POST `/api/auth/logout`, pero esta pasada no pudo verificar ninguna de esas dos acciones interactivamente en el shell: el E2E activo prueba selección de `/negocios`, no del switcher ni logout. Además aplica el problema de menú duplicado descrito en F-DEV01B-01.
10. **PASS** — Smoke `CI=1 npm run test:e2e -- e2e/dev-00-placeholder.spec.ts --reporter=list` pasó 4/4; confirmó redirects protegidos y 401 sin cookies para APIs listadas, incluido audit. Inspección de `app/api/audit/route.ts` confirma guard ADMIN. La protección server-side sigue siendo autoridad.
11. **PASS** — Diff de archivos protegidos solicitado (diseños, API, auth/services, Prisma/migraciones, manifests/lock) vacío; no hubo cambios backend, de auth, DB, dependencias o infraestructura.
12. **PASS** — Inspección de los módulos workspace y E2E de preservación confirman `PreparationPlaceholder`; no se implementó funcionalidad DEV-02.
13. **PASS** — Evidencia before/after para login, selector y shell en desktop/móvil presente bajo `docs/ui-redesign/dev-01b-visual-evidence/`; revisé las capturas del shell 1440×900 y 390×844, con etiqueta visible de fixture no-auth y sin overflow horizontal visible. Auditoría consigna que no es pixel-perfect.
14. **PASS** — Revisión visual de las capturas del shell no encontró credenciales, contraseñas o tokens. Se conserva el warning exactamente: `GET /api/audit exposes passwordHash`; el hallazgo histórico F-21 también documenta que filas auditadas incluyen `user.passwordHash`. No se declara producción lista.
15. **PASS** — Secuencia reproducida: lint PASS, typecheck PASS, tests PASS (4 suites/6), build PASS, E2E PASS (10 activos; 11 legacy omitidos) y smoke PASS (4/4). Build mostró la advertencia preexistente de plugin Next.js no detectado en ESLint. No se ejecutaron acciones E2E mutantes.

## Resueltos (verificados este pass)

- [x] DEV01B-PASS1 · criterios #1–3, #6–8, #10–15. Validaciones ejecutadas contra el árbol actual; se verificaron visualmente las capturas fixture de workspace en ambos viewports. No eleva a PASS el criterio #4 pendiente de sesión autorizada ni oculta los fallos de shell de #5/#9.

# Findings — pass 2 (DEV-01B)

## Resumen

13/15 criterios PASS; 1 BLOCKED por falta de sesión autenticada autorizada y 1 criterio conserva verificación parcial por la misma limitación. Evaluación del commit `8c3b71c` (`fix F-DEV01B-01: render a single shell menu`). Se usaron los resultados observados de esta pasada: lint, typecheck, tests y build pasaron; E2E completo: 10 pasaron y 11 legacy fueron omitidos; smoke: 4/4. El puerto `3101` no tenía listener al comprobarlo. No se autenticó ni se mutó la base de datos.

## Abiertos

- [ ] F-DEV01B-02 · BLOCKED · criterio #4 — Sigue sin haber una sesión válida autorizada para verificar selector integrado con membresías reales y el ID real del negocio. No se inició sesión ni se mutó la base de datos; fixtures/screenshots no sustituyen esa evidencia.
- [ ] Criterio #9 · BLOCKED parcial — La inspección del shell confirma que la elección llama `chooseBusiness(business.id)` y logout llama `logout()`, pero el cambio de negocio y logout no se ejercitaron en sesión autenticada real. La selección de negocio integrada permanece sin validar; no se afirma integración completa.
- [ ] F-21 / advertencia de seguridad — Se conserva la observación histórica: `GET /api/audit exposes passwordHash`. La exposición de `user.passwordHash` en los resultados de auditoría sigue siendo un impedimento para considerar el sistema listo para producción.

## Resueltos (verificados este pass)

- [x] F-DEV01B-01 · minor · criterios #5 y #9 — Resuelto en `8c3b71c`. `src/components/WorkspaceShell.tsx` ahora renderiza el menú del selector de negocio una sola vez, bajo el control del topbar, y el menú del usuario una sola vez, también bajo su control del topbar. La inspección del JSX confirma que ya no se renderizan instancias duplicadas en sidebar y header. Se mantiene la limitación de interacción real autenticada descrita arriba.
- [x] DEV01B-PASS2 · criterio #15 — lint, typecheck, tests y build pasaron; E2E reportó 10 passed / 11 legacy skipped y smoke 4/4. `lsof -nP -iTCP:3101 -sTCP:LISTEN` no reportó listener, sin servidor residual.

## Verificación rubric DEV-01B

1–3, 6–8, 10–14. Se preservan los resultados y evidencias históricas de pass 1 y pass 3 de DEV-01; no se repitieron ni se alteran esos registros.

4. **BLOCKED** — Sin sesión autorizada, no se pudo verificar selector con membresías reales/ID real. No hubo auth ni mutaciones.
5. **PASS** — Inspección del JSX de `src/components/WorkspaceShell.tsx` confirma un solo menú de negocio y un solo menú de usuario; resuelve F-DEV01B-01.
9. **BLOCKED parcial** — Los handlers apuntan al servicio `chooseBusiness(business.id)` y al logout existente, pero sin sesión real no se verificó el flujo autenticado del selector/logout de extremo a extremo.
15. **PASS** — Checks comunicados: lint/typecheck/tests/build pasaron; E2E 10 pasaron, 11 legacy omitidos; smoke 4/4. Puerto 3101 sin listener al terminar.

Se mantiene el estado **no listo para producción** mientras siga vigente la exposición `GET /api/audit exposes passwordHash`. Los resultados automatizados y la corrección del menú no constituyen evidencia de integración con una sesión autenticada real.

# Findings — pass 1 (DEV-01C)

## Resumen

Evaluación independiente de `docs/ui-redesign/DEV-01C-RUNTIME-AUDIT.md` contra el SPEC actual, el historial Git y la evidencia visible. **9/14 criterios PASS, 3 FAIL y 2 BLOCKED**. Los FAIL son #1 (identidad/relación Git descrita incorrectamente en el informe), #2 (afirmación de que no se envió señal contradicha por el SPEC) y #12 (la suite E2E llamó `GET /api/audit` sin cookies pese a la prohibición expresa de llamarlo). #10 queda BLOCKED para integración autenticada; #13 se acepta por resultados registrados en el informe, no por reejecución. Fuente funcional coincide con `6caccce`; no se hicieron login, llamadas API, cambios de código, ni operaciones de datos. `:3101` no tiene listener; `:3000` sí tiene un listener actual, que no se inspeccionó ni detuvo.

## Hallazgos abiertos

- [ ] F-DEV01C-01 · major · criterio #1 — El informe, línea 7, dice que el HEAD de captura `19626b1` coincidía con `origin/feature` en `6caccce`, lo cual es falso. `git log` verifica que `19626b1` es descendiente de `6caccce` por los commits locales de documentación `61a1f5f` y `19626b1`; el origin permanecía en `6caccce` y el branch estaba dos commits adelante. Además, el informe posterior `b9d7a0f` y SPEC corrections hacen que la identidad presente sea HEAD `8348216`, cuatro commits adelante. Fuente `app`, `src`, `prisma`, `package.json` y lockfile no difiere entre `6caccce` y HEAD (`git diff --quiet` código 0); `main` y backup siguen en `bf8c45f`. No atribuir el error de HEAD al snapshot de código, pero el criterio exige identidad/relación exactas: FAIL.
- [ ] F-DEV01C-02 · major · criterio #2 — La línea 13 del informe afirma que no se envió señal al proceso previo. El SPEC, líneas 24, 45, 52 y criterios #2/#8, registra explícitamente que el orquestador envió `SIGTERM` al PID 36669 tras documentar identidad y antes del build para aislar `.next`. La afirmación del informe es contradictoria y no satisface el requisito de registrar correctamente la parada: FAIL. En esta evaluación no se envió ninguna señal. La consulta actual a listeners detectó `:3000`; `:3101` no mostró listener.
- [ ] F-DEV01C-03 · major · criterio #12 — La auditoría admite en línea 57 que `CI=1 npm run test:e2e` ejecutó el smoke `protected API handlers reject requests without cookies`, incluyendo `GET /api/audit`. El SPEC prohíbe llamar ese endpoint (líneas 36 y 72); que respondiera 401 o no se consultara por separado no elimina que se hizo la llamada. El warning obligatorio sí está preservado literalmente y el informe declara no listo para producción, pero falla la condición de no invocar el endpoint.
- [ ] F-DEV01C-04 · BLOCKED · criterios #10 y #4/#6 cuando requieren sesión — Las seis capturas se identifican como fixture visual/no-auth; no prueban selector integrado, shell autenticado ni ticket con sesión. Se conserva el estado BLOCKED declarado en el informe, sin inferir PASS de las imágenes.

## Verificación de criterios DEV-01C

1. **FAIL** — Relación HEAD/origin falsa en línea 7; véase F-DEV01C-01. Conteo actual: branch feature cuatro commits adelante de origin; source diff desde `6caccce` vacío para los paths funcionales indicados. `main` y backup siguen en `bf8c45f`.
2. **FAIL** — El informe niega señal al proceso; SPEC confirma SIGTERM del orquestador a PID 36669. Ver F-DEV01C-02.
3. **PASS (evidencia reportada)** — El informe registra GET públicos `/login` 200, `/negocios` 200 y `/pos` 307 a `/login`, sin seguir redirect, y los imports CSS. No se repitieron requests en evaluación.
4. **PASS (inspección estática reportada)** — Rutas workspace con `PreparationPlaceholder`; ticket inspecciona auth, scope por negocio y placeholder. No se presenta como render autenticado.
5. **PASS (alcance limitado)** — Metadata `.next` se describe como observación y no como causalidad histórica demostrada; no se borró caché.
6. **PASS** — Contraste de legacy `bf8c45f`, funcionalidad POS/carrito y `window.print()` del ticket es consistente con el SPEC; el origen exacto de la observación histórica no se declara probado.
7. **PASS** — La conclusión limita la causa confirmada a diferencia de fuente y declara indeterminables proceso/navegador/cache históricos.
8. **FAIL** — El registro del proceso detenido contradice la evidencia normativa explícita del SPEC; ver #2.
9. **PASS (evidencia reportada)** — Servidor controlado en `:3101`, comprobación previa libre y salida sin listener residual están documentados; comprobación actual confirma `:3101` libre.
10. **BLOCKED** — Capturas desktop/móvil enlazadas y rotuladas como fixture, pero no hay sesión autorizada para integración real. No cuenta como PASS.
11. **PASS** — Source diff desde `6caccce` vacío para app/src/Prisma/manifests. PNGs son fixtures visuales; el informe/capturas son los entregables de auditoría declarados.
12. **FAIL** — Warning literal y estado no producción preservados, pero la ejecución E2E realizó GET `/api/audit`; véase F-DEV01C-03.
13. **PASS (registrado, no reejecutado)** — Informe registra lint, typecheck, tests (4 suites/6 tests), build y E2E con códigos/resultados. No se repitieron checks en esta evaluación, pues no eran necesarios para juzgar las contradicciones y la suite E2E incluye la llamada prohibida.
14. **PASS** — Informe incluye método, evidencia, límites, checklist y recomendación DEV-02; los defectos de exactitud están registrados arriba.

## Resueltos o pendientes

- [x] DEV01C-PASS1 — Se verificó que el árbol funcional actual no difiere de `6caccce`, que la referencia backup permanece en `bf8c45f`, que las capturas son fixtures visuales no autenticadas, y que el warning `GET /api/audit exposes passwordHash` sigue preservado. No se llamó audit ni se usaron credenciales.
- [ ] F-DEV01C-01, F-DEV01C-02 y F-DEV01C-03 permanecen abiertos por los defectos documentales y de cumplimiento descritos arriba. F-DEV01C-04 requiere una sesión autorizada y queda BLOCKED.

# Findings — pass 2 (DEV-01C)

## Resumen

**12/14 PASS, 1 FAIL y 1 BLOCKED.** La corrección del informe resuelve los defectos de identidad Git y de proceso de pass 1: la captura HEAD `19626b1` era dos commits de documentación por delante de origin `6caccce`, y el orquestador envió `SIGTERM` al PID 36669 después de registrar su evidencia. El único FAIL restante es criterio #12: la ejecución E2E histórica sí llamó `GET /api/audit`, aunque fue una petición sin autenticación que respondió `401`; la prohibición del SPEC es estricta. El checkout actual es HEAD `8348216`, cuatro commits por delante de origin, y la fuente funcional no difiere de `6caccce`. No se llamó `/api/audit`, no se inició sesión, no se usaron credenciales, no se tocó la base de datos y no se enviaron señales en este pass.

## Hallazgos abiertos

- [ ] F-DEV01C-03 · major · criterio #12 — El E2E histórico registrado en el informe ejecutó `GET /api/audit` dentro de `protected API handlers reject requests without cookies`. Que no tuviera cookies y devolviera `401` no elimina la llamada, que está prohibida expresamente por el SPEC. El warning literal `GET /api/audit exposes passwordHash` permanece documentado y el sistema no debe declararse listo para producción.
- [ ] F-DEV01C-04 · BLOCKED · criterio #10 — Las capturas de selector y shell/POS están rotuladas como fixtures visuales no-auth con datos ficticios; no demuestran integración autenticada. Sin una sesión autorizada no se puede comprobar el selector, shell o flujo protegido integrado.

## Verificación de criterios DEV-01C

1. **PASS** — El informe identifica la captura en `19626b1`, origin en `6caccce` y la relación correcta de dos commits locales de documentación; el checkout actual es `8348216`, cuatro commits por delante de origin. El snapshot funcional es `6caccce`; `main` y `backup/lucem-ui-legacy-20261101` permanecen en `bf8c45f`. La comparación funcional actual contra `6caccce` no muestra diferencias.
2. **PASS** — Se documentan los cinco puertos, la cadena PID 36669 → 36651 → 36650, cwd, inicio y motivo. El informe registra correctamente que el orquestador envió `SIGTERM` a 36669 después de capturar la evidencia y antes del build controlado. En el estado actual, el listener de proyecto en `:3000` es PID 40412 → 40409 → 40408; `:3101` está libre y no se trata como residual controlado.
3. **PASS** — El informe registra GET públicos sin cookies en `:3101`: `/login` 200, `/negocios` 200 y `/pos` 307 con `Location: /login`, además de los cuatro imports CSS actuales y marcadores HTML.
4. **PASS** — La inspección estática vincula POS, productos, inventario y dashboard con `PreparationPlaceholder`; ticket usa `getAuth`, limita por `businessId` y retorna placeholder. El redirect sin sesión se distingue de la inspección estática y no se presenta como render autenticado.
5. **PASS** — Se registran timestamps de `.next`, manifests/artefactos y `.next/cache`; la conclusión no atribuye causalidad histórica a caché ni borra `.next`.
6. **PASS** — Se documenta el commit legacy `bf8c45f`, el catálogo/variantes/precio promocional/carrito/checkout, la idempotencia y redirect del POS, y `window.print()` del ticket en navegador, no PDF server-side. También se relacionan la lógica reusable y los servicios actuales sin atribuirles una UI activa.
7. **PASS** — La conclusión acota la causa establecida al mismatch de versión fuente entre la UI legacy observada y el código actual; proceso, navegador y caché de la sesión histórica quedan indeterminables sin HAR o metadata.
8. **PASS** — La parada del listener previo se registra como SIGTERM del proceso confirmado del proyecto, después de registrar PID/ancestros/cwd/inicio y por el conflicto de `.next`; no se detuvo un servicio ajeno.
9. **PASS** — Se comprobó `:3101` libre antes del servidor controlado, se registraron checkout/puerto, y la prueba terminó sin listener residual. El listener actual de `:3000` es posterior y propio del proyecto, no un residual de la validación controlada.
10. **BLOCKED** — Existen capturas desktop/móvil de login, selector y shell/POS con viewport, URL/puerto, timestamp y etiqueta `no-auth fixture`, pero no hay sesión autorizada para validar integración del selector o shell.
11. **PASS** — La evidencia y el estado actual no muestran cambios en código funcional, API, auth, Prisma, dependencias, infraestructura o diseño; la fuente funcional permanece igual a `6caccce`.
12. **FAIL** — El informe conserva el warning literal y la declaración de no producción, pero la ejecución E2E histórica llamó `GET /api/audit`. La respuesta `401` sin autenticación no satisface la prohibición estricta de no llamar el endpoint.
13. **PASS** — El informe registra `npm run lint`, `npm run typecheck`, `npm run test` y `npm run build` con código 0, incluyendo 4 suites/6 tests y el warning preexistente de ESLint; no se reejecutaron checks ni la llamada prohibida.
14. **PASS** — El informe contiene método, identidad, procesos, HTTP, fuente, `.next`, referencia legacy, capturas, límites, checklist completo y recomendación DEV-02; no afirma que la UI legacy esté restaurada ni que producción esté lista.

## Estado

- [x] DEV01C-PASS2 — Criterios #1–9, #11, #13 y #14 PASS; criterio #10 BLOCKED por falta de sesión autorizada.
- [ ] F-DEV01C-03 permanece abierto como FAIL por la llamada histórica a `GET /api/audit`.

# Findings — pass 1 (DEV-02)

## Resumen

2/15 criterios PASS, 0 FAIL y 13 BLOCKED. Se evaluó el commit `01ee14b` sobre `19a6fe4`. El diff de la entrega contiene únicamente `app/(workspace)/dashboard/page.tsx`, `app/styles/workspace.css` y `docs/ui-redesign/DEV-02-DASHBOARD.md`; no modifica backend/API, auth, Prisma, dependencias, infraestructura, shell ni `diseno/`. `npm run lint`, `npm run typecheck`, `npm test` (4 suites/6 tests), `npm run build` y `git diff --check` terminaron con código 0. El servidor controlado en `:3102` respondió `GET /dashboard` con `307` y `Location: /login`; el PID `66182` fue detenido y no quedó listener. No se inició sesión, no se leyeron credenciales, no se llamó `GET /api/audit`, no se ejecutó el E2E global, no se usó DB ni se hicieron mutaciones.

## Hallazgos abiertos

- [ ] F-DEV02-01 · major · criterios #2–8 — Sin una sesión autorizada o fixture autorizado no se pudo renderizar el workspace. Quedan sin evidencia ejecutable el shell único en 1440×900/390×844, el payload real de `GET /api/dashboard` y sus valores visibles, aislamiento HTTP por negocio, skeleton, éxito, vacío, error y reintento. La inspección estática sí confirma que `layout.tsx` conserva la guarda `getAuth()`/`redirect('/login')`, la página sólo hace `fetch('/api/dashboard', { credentials: 'same-origin' })`, y el route server filtra por `auth.business.id`, pero eso no sustituye las verificaciones autenticadas exigidas.
- [ ] F-DEV02-02 · major · criterios #10–13 — No hay capturas Playwright autenticadas ni comparación reproducible con las referencias Stitch en 1440×900, 768×1024 y 390×844. La CSS declara breakpoints, safe-area y `prefers-reduced-motion`, y el código conserva `WorkspaceShell`/`MobileBottomNavigation`, pero no se verificaron overflow, tamaños táctiles, contraste, foco, navegación ni ausencia de overlays en ejecución.
- [ ] F-DEV02-03 · major · criterio #14 — Lint, typecheck, tests y build pasan, pero el E2E DEV-02 no se ejecutó. El E2E global está prohibido porque la suite existente llama `GET /api/audit`; por tanto no se convierte este criterio en PASS.
- [ ] F-DEV02-04 · major · criterio #15 — El informe documenta contrato, estados, comandos, límites y la ausencia de sesión, pero no contiene capturas/comparaciones autenticadas. Queda bloqueado por la evidencia imprescindible ausente, no se presenta una fixture no-auth como sesión real.

## Verificación de criterios DEV-02

1. **PASS** — `git diff --name-status 19a6fe4..01ee14b` muestra sólo la página dashboard, `app/styles/workspace.css` y el informe DEV-02. La inspección de paths protegidos devuelve vacío para `app/api/**`, `src/lib/auth*`, `src/lib/db*`, Prisma/migraciones, `package.json`, `package-lock.json`, configuración, infraestructura, `diseno/**`, layout y componentes del shell. `page.tsx` ya no exporta ni usa `PreparationPlaceholder`.
2. **BLOCKED** — La inspección confirma un `WorkspaceShell` en `app/(workspace)/layout.tsx` y una `MobileBottomNavigation` en él; el dashboard no importa esos componentes. Falta Playwright autenticado para probar exactamente un topbar/sidebar/nav móvil en los viewports requeridos.
3. **BLOCKED** — La página usa exclusivamente `GET /api/dashboard` con cookies same-origin y valida la forma de la respuesta. No se pudo observar una respuesta `200` ni comparar `net`, `units`, `profit`, `outOfStock` y `recent` con valores visibles sin sesión autorizada.
4. **BLOCKED** — La inspección del route existente muestra `getAuth()`, rechazo `401` sin negocio y filtros por `auth.business.id`; la página no contiene llamadas a auditoría ni referencias a secretos. Falta la prueba HTTP autenticada requerida para confirmar aislamiento y HTML/consola/capturas en ejecución. Se conserva el warning literal `GET /api/audit exposes passwordHash`; el sistema no queda listo para producción.
5. **BLOCKED** — Existen skeletons con dimensiones CSS estables y `role="status"`, pero no se pudo interceptar/liberar el GET en una UI autenticada para comprobar carga, ausencia de ceros y desaparición del skeleton.
6. **BLOCKED** — El JSX cubre título, periodo “Hoy”, cuatro métricas, alertas y hasta cinco ventas recientes, pero no se verificó un payload no vacío ni la correspondencia de todos los valores en pantalla.
7. **BLOCKED** — El código implementa estado vacío y mensajes explícitos para actividad/alertas, pero no se ejecutó una respuesta `200` con ceros y `recent: []`.
8. **BLOCKED** — El código implementa `role="alert"` y `Reintentar`, pero no se ejercitó una primera respuesta HTTP/red fallida seguida de recuperación con `200`.
9. **PASS** — No existe selector de periodo. La documentación DEV-02 registra explícitamente que se conserva el periodo por defecto del endpoint y se comunica “Hoy”; la página no envía `from`/`to`.
10. **BLOCKED** — La CSS contiene reglas para 1440/768/390, dos columnas en tablet y apilado móvil, además de padding de navegación/safe-area. No hubo capturas ni Playwright autenticado para demostrar `scrollWidth`, recortes, orden y controles de 44px.
11. **BLOCKED** — Las referencias C/D y ambos `DESIGN.md` fueron revisados y la implementación usa la familia/tokens visuales del sistema, pero el propio informe registra que no se generaron capturas autenticadas ni comparación reproducible.
12. **BLOCKED** — Hay headings semánticos, `role="status"`/`role="alert"`, iconos `aria-hidden`, foco CSS y `prefers-reduced-motion` en la inspección estática. No se verificaron en ejecución orden de headings, teclado, contraste WCAG AA y shell autenticado completos.
13. **BLOCKED** — Los destinos `Nueva venta`, sidebar y navegación inferior están preservados en el shell inspeccionado. Sin sesión no se pudo activar cada flujo en Playwright ni verificar URLs, regreso y ausencia de overlays residuales.
14. **BLOCKED** — `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y `git diff --check` pasaron en esta evaluación. El E2E DEV-02 no está disponible/ejecutado y la suite global está expresamente prohibida por su llamada histórica a `GET /api/audit`; salida no PASS.
15. **BLOCKED** — `docs/ui-redesign/DEV-02-DASHBOARD.md` existe y registra contrato, estados, viewports previstos, comandos y limitaciones; `FINDINGS.md` conserva la evaluación binaria, el warning literal y la declaración de no producción. Faltan las capturas/comparaciones autenticadas exigidas.

## Estado

- [x] DEV02-PASS1 — Criterios #1 y #9; checks de calidad y redirect público documentados sin convertir verificaciones bloqueadas en PASS.
- [ ] F-DEV02-01, F-DEV02-02, F-DEV02-03 y F-DEV02-04 permanecen abiertos por falta de sesión autorizada, capturas/comparaciones autenticadas y E2E DEV-02 permitido.
- [ ] No producción lista mientras persista `GET /api/audit exposes passwordHash`.

# Findings — pass 1 (DEV-02A)

## Resumen

Evaluación contra los 14 criterios de `SPEC.md` en `HEAD bdbd510a0f4261248ea908cf38e292c9380e0aeb` (`feature/lucem-ui-redesign-v1`), el 1 de noviembre de 2026. **1/14 PASS, 1 FAIL y 12 BLOCKED**. El diff local inicial fue `FINDINGS.md` y `docs/ui-redesign/DEV-01C-RUNTIME-AUDIT.md`; no contiene cambios de código DEV-02A, API, auth, Prisma, dependencias, infraestructura, `SPEC.md` ni `docs/ui-redesign/DEV-02-DASHBOARD.md`. `git diff --check` terminó con código 0. No hubo login, credenciales, lectura de `.env`/README, sesión fabricada, DB/seed/migrations/mutations ni llamada a `GET /api/audit`. No se ejecutó el E2E global porque la suite existente contiene esa llamada prohibida.

## Abiertos

- [ ] F-DEV02A-01 · major · criterio #1 — La identidad ejecutada es `HEAD bdbd510a0f4261248ea908cf38e292c9380e0aeb`, pero `docs/ui-redesign/DEV-02-DASHBOARD.md:63` documenta `HEAD 8c88985`; la entrega no identifica correctamente el checkout evaluado. `git status --short` mostró `M FINDINGS.md` y `M docs/ui-redesign/DEV-01C-RUNTIME-AUDIT.md`; `git diff --name-only` mostró esos mismos dos archivos. El diff protegido DEV-02A está limpio, pero la contradicción de HEAD impide PASS binario.
- [ ] F-DEV02A-02 · BLOCKED · criterios #2–9 — No existe `storageState`, fixture, harness ni entorno autorizado. `GET http://127.0.0.1:3102/api/dashboard` sin sesión respondió `401` con `{"error":"Sesion requerida"}`; no se pudo observar `200`, payload real, aislamiento por negocio, métricas, alertas, recent, vacío, error/reintento ni carga estable. La inspección confirma sólo la forma estática: `app/(workspace)/dashboard/page.tsx:36` hace exactamente `GET /api/dashboard` con `credentials: 'same-origin'`, `app/api/dashboard/route.ts:11-14` filtra por `auth.business.id`, y `layout.tsx:6-7` guarda el workspace con `getAuth()`/`redirect('/login')`; eso no sustituye ejecución autenticada.
- [ ] F-DEV02A-03 · BLOCKED · criterios #10–13 — Sin sesión no se pudo activar navegación autenticada/permitida ni comprobar permisos, retorno, overlays, overflow, recortes, foco, headings, targets de 44px, contraste, reduced motion o estados semánticos en `1440x900`, `768x1024` y `390x844`. No existen capturas Playwright autenticadas ni comparación reproducible con `pantalla_c_shell_de_aplicaci_n_web_escritorio/screen.png` y `pantalla_d_navegaci_n_m_vil_web_responsiva/screen.png`; la CSS y los DESIGN.md sólo son inspección estática.

## Verificación de criterios DEV-02A

1. **FAIL** — Comandos: `git rev-parse HEAD`, `git branch --show-current`, `git status --short`, `git diff --name-only`, `git diff --check`; URL: no aplica; viewport: no aplica; artefacto: salida Git y este registro. HEAD/branch/diff fueron verificados, y el diff protegido de DEV-02A está limpio, pero el documento DEV-02A conserva un HEAD distinto al checkout real (`bdbd510` frente a `8c88985`).
2. **BLOCKED** — `curl` a `GET http://127.0.0.1:3102/api/dashboard` devolvió `401` sin sesión; no hubo payload ni status autenticado que comparar con el contrato. No se llamó `/api/audit`; viewport no aplica; artefacto: respuesta HTTP registrada arriba.
3. **BLOCKED** — `GET http://127.0.0.1:3102/dashboard` devolvió `307 Location: /login`, que sólo demuestra la guardia sin sesión. No existe mecanismo seguro/autorizado disponible para demostrar sesión, negocio, permisos o aislamiento; viewport no aplica; artefacto: headers HTTP y `layout.tsx` inspeccionado.
4. **BLOCKED** — No se recibió payload no vacío real; no se compararon `net`, `units`, `cogs`, `profit`, `outOfStock` y `lowStock` visibles contra JSON. La forma defensiva de `page.tsx:13-23` es evidencia estática, no PASS; viewport no aplica; artefacto: código inspeccionado.
5. **BLOCKED** — No se pudo observar payload real con agotados/bajo stock ni ausencia de alertas. No hubo sesión ni fixture de dashboard ejecutada; viewport no aplica; artefacto: ninguno.
6. **BLOCKED** — No se pudo observar `recent` real ni verificar folio, total, estado y fecha en pantalla. El código limita el renderizado a la respuesta, pero la inspección estática no prueba el criterio; viewport no aplica; artefacto: ninguno.
7. **BLOCKED** — No se interceptó una respuesta controlada `200` con ceros y `recent: []`; el estado vacío no fue ejecutado. No se presenta el redirect como evidencia; viewport no aplica; artefacto: ninguno.
8. **BLOCKED** — No se ejecutó un primer error de `/api/dashboard` seguido de retry y éxito. El `role="alert"` y `Reintentar` existen en `page.tsx:45,60`, pero no son evidencia ejecutable; viewport no aplica; artefacto: ninguno.
9. **BLOCKED** — No hubo request dashboard pendiente en una UI autenticada para medir skeletons, ausencia de ceros y estabilidad estructural. El E2E dirigido no cubre dashboard; viewport no aplica; artefacto: ninguno.
10. **BLOCKED** — No se verificaron CTA, sidebar, navegación móvil, URLs permitidas, permisos, retorno ni overlays desde una sesión autorizada. Sin sesión, no se infiere PASS de `WorkspaceShell`; viewport: `1440x900`, `768x1024`, `390x844` requeridos, no capturados; artefacto: ninguno.
11. **BLOCKED** — No existen capturas Playwright del dashboard en `1440x900`, `768x1024` ni `390x844`. La documentación las identifica como ausentes por falta de sesión; artefacto: ningún screenshot.
12. **BLOCKED** — No existe comparación reproducible de los tres viewports contra los baselines Stitch C/D y ambos DESIGN.md. La revisión de referencias sólo informa tokens y composición, no verificación visual; artefacto: ninguno.
13. **BLOCKED** — No se midieron `scrollWidth`, recortes, objetivos táctiles, teclado/foco, contraste WCAG AA ni reduced motion en el dashboard autenticado en los tres viewports. Las reglas CSS estáticas no permiten declarar PASS; artefacto: ninguno.
14. **PASS** — `npm run lint` terminó con código 0; `npm run typecheck` terminó con código 0 en ejecución estable posterior al build; `npm test` terminó con 4 suites/6 tests y código 0; `npm run build` terminó con código 0 y el warning preexistente del plugin Next.js; `CI=1 npx playwright test e2e/dev-01-auth.spec.ts --reporter=list` terminó 6/6. El global no se ejecutó por la prohibición exacta de llamar `GET /api/audit`, y la documentación registra la excepción, contrato, estados, límites y ausencia de capturas. `git diff --check` terminó con código 0; URL/viewport no aplican a estos checks; artefactos: salidas de comandos y `docs/ui-redesign/DEV-02-DASHBOARD.md`.

## E2E dirigido y límites

`e2e/dev-01-auth.spec.ts` pasó 6/6, pero intercepta `/api/auth/login` y `/api/businesses` con `page.route`; devuelve redirects y negocios ficticios, no crea sesión ni prueba `GET /api/dashboard`. Por tanto no es evidencia de autenticación real, payload real, aislamiento por negocio, estados autenticados, navegación autenticada ni capturas Stitch. El servidor controlado en `:3102` fue detenido y `lsof -nP -iTCP:3102 -sTCP:LISTEN` no mostró listener residual.

Se conserva literalmente `GET /api/audit exposes passwordHash`. No producción lista mientras persista ese riesgo y permanezcan bloqueadas la sesión autorizada y la evidencia visual/autenticada.

## Estado

- [x] DEV02A-PASS1 — El resultado binario es #1 FAIL, #2–13 BLOCKED y #14 PASS.
- [ ] F-DEV02A-01, F-DEV02A-02 y F-DEV02A-03 permanecen abiertos; no se inventa PASS por inspección estática, redirect, mock ni fixture.

# Findings — pass 2 (DEV-02A)

## Resumen

Reevaluación de los 14 criterios contra `SPEC.md`, `docs/ui-redesign/DEV-02-DASHBOARD.md`, `FINDINGS.md`, el código dashboard/API/auth y la evidencia disponible. Resultado exacto: **2/14 PASS, 0/14 FAIL y 12/14 BLOCKED**. `F-DEV02A-01` queda resuelto: `8c88985` es el checkout de validación, `bdbd510` es el commit posterior de documentación y el `HEAD` actual es `3d6f5d8` (`docs(ui): correct DEV-02A validation checkout`). El estado de DEV-02A sigue **BLOCKED** y no es aceptación autenticada/visual ni producción lista.

No existe `storageState`, fixture autorizado, harness ni entorno autorizado. No se hizo login, no se leyeron credenciales ni `.env`, no se fabricó sesión, no se hicieron escrituras de DB/seed/migrations/mutations, no se llamó `GET /api/audit` y no se ejecutó el E2E global. El E2E dirigido `CI=1 npx playwright test e2e/dev-01-auth.spec.ts --reporter=list` pasó 6/6, pero usa mocks de `/api/auth/login` y `/api/businesses`; sólo cuenta como evidencia mock y no prueba dashboard autenticado.

## Hallazgos abiertos

- [ ] F-DEV02A-02 · BLOCKED · criterios #2–9 — Sin sesión autorizada no hay payload real, `200` autenticado, aislamiento por negocio, métricas, alertas, recent, estados vacío/error/reintento ni carga estable verificables. La inspección estática confirma `GET /api/dashboard` same-origin, el filtro server-side por `auth.business.id` y la guardia `getAuth()`/`redirect('/login')`, pero no sustituye ejecución autenticada. El redirect no autenticado fue `307 /login` y `GET /api/dashboard` sin sesión fue `401` (`Sesion requerida`).
- [ ] F-DEV02A-03 · BLOCKED · criterios #10–13 — Sin sesión no se puede verificar navegación y permisos autenticados, estados autenticados, aislamiento visual, overflow, accesibilidad, targets, foco, contraste, reduced motion ni comparación reproducible. No existen screenshots Playwright del dashboard para `1440x900`, `768x1024` y `390x844`; las referencias Stitch/DESIGN.md y CSS sólo permiten inspección estática.
- [ ] F-DEV02A-04 · riesgo de seguridad — Se conserva literalmente `GET /api/audit exposes passwordHash`. El sistema permanece **no listo para producción** mientras persista esta exposición.

## Verificación de criterios DEV-02A

1. **PASS** — `git rev-parse HEAD` = `3d6f5d8386767ea9fe49384c5ffc9bdddfa9ff5d`; Git history distingue correctamente el checkout de validación `8c88985` del commit documental `bdbd510`. `git status --short` y `git diff --name-only` fueron revisados; `git diff --check` pasó. F-DEV02A-01 queda resuelto.
2. **BLOCKED** — La respuesta sin sesión `GET /api/dashboard` fue `401`; no se observó el request/respuesta autenticado ni payload real conforme al contrato. No se llamó `/api/audit`.
3. **BLOCKED** — `GET /dashboard` devuelve `307 /login`, que sólo acredita la protección sin sesión. Falta mecanismo seguro/autorizado para probar auth, negocio, permisos y aislamiento.
4. **BLOCKED** — No se compararon métricas visibles con un payload real no vacío. El mock 6/6 no cubre dashboard.
5. **BLOCKED** — No se verificaron agotados, bajo stock ni ausencia de alertas con datos reales o sesión autorizada.
6. **BLOCKED** — No se verificaron hasta cinco ventas recientes reales con folio, total, estado y fecha.
7. **BLOCKED** — No se ejecutó una fixture controlada del estado vacío del dashboard; no se presenta inspección estática como evidencia.
8. **BLOCKED** — No se ejecutó error/reintento de `/api/dashboard` en el dashboard autenticado; la existencia estática de `role="alert"` y `Reintentar` no basta.
9. **BLOCKED** — No hubo carga autenticada pendiente para verificar skeletons, ausencia de ceros falsos y estabilidad al resolver.
10. **BLOCKED** — No se activaron CTA, navegación móvil ni destinos permitidos desde una sesión autorizada; permisos, retorno y overlays quedan sin probar.
11. **BLOCKED** — No hay capturas Playwright autenticadas en `1440x900`, `768x1024` ni `390x844`.
12. **BLOCKED** — No hay comparación reproducible de esos tres viewports contra los baselines Stitch C/D y DESIGN.md.
13. **BLOCKED** — No se midieron en el dashboard autenticado overflow, recortes, controles de 44px, teclado/foco, headings, nombres accesibles, contraste WCAG AA ni reduced motion.
14. **PASS** — La documentación registra contrato, estados, límites, warning de seguridad, ausencia de sesión y razón para omitir el E2E global. `npm run lint`, `npm run typecheck`, `npm test` (4 suites/6 tests), `npm run build` y `git diff --check` constan con código 0. El E2E global permanece omitido porque la suite llama al prohibido `GET /api/audit`; el E2E dirigido 6/6 sólo se cuenta como mock.

## Estado

- [x] F-DEV02A-01 — Resuelto; la identidad del checkout y la documentación están diferenciadas.
- [ ] F-DEV02A-02 y F-DEV02A-03 — Abiertos; criterios #2–13 permanecen BLOCKED por falta de sesión autorizada, payload/aislamiento real, navegación/estados autenticados y screenshots.
- [ ] DEV02A-PASS2 — **BLOCKED**: 2 PASS, 0 FAIL, 12 BLOCKED; no producción lista.

# Findings — pass 1 (DEV-TEST-01)

## Resumen

Resultado binario: **1/15 PASS, 12/15 FAIL y 2/15 BLOCKED**. La evaluación no pudo ejecutar la suite autenticada porque no existe `E2E_DATABASE_URL` en el entorno actual. Salida exacta de ambos comandos E2E: `Error: E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.` No se leyó `.env`, no se usó `DATABASE_URL`, no se inició ni detuvo PostgreSQL/DB, no se ejecutó el E2E global y no se llamó `GET /api/audit`. No se generaron screenshots: no existen `test-results/dev-test-01` ni `playwright/.auth`.

Los checks seguros terminaron así: `npm run lint` PASS; `npm run typecheck` PASS en la ejecución estable posterior a `build`; `npm test` PASS, 4 suites/6 tests; `npm run build` PASS con el warning preexistente del plugin Next.js; `git diff --check` PASS. El diff protegido sólo contiene cambios en `FINDINGS.md` y `docs/ui-redesign/DEV-01C-RUNTIME-AUDIT.md`; no hay cambios en API, auth, Prisma schema, migraciones ni producto. `.env.e2e`, `playwright/.auth/` y `test-results/` están ignorados y no hay estados/capturas E2E trackeados.

## Hallazgos abiertos

- [ ] F-DEVTEST01-01 · major · criterio #1 — La guardia no exige el nombre exacto `lucem_retail_e2e` ni un puerto dedicado concreto: acepta nombres genéricos `_e2e`/`_test` y cualquier puerto distinto de `5432`. Además, `.env.e2e.example` contiene la contraseña de PostgreSQL dentro de `E2E_DATABASE_URL`, contrario a la exigencia de contraseña sólo por variable de entorno. `scripts/e2e/database.ts:3-16`.
- [ ] F-DEVTEST01-02 · critical · criterio #2 — `scripts/e2e/prepare.ts:5-9` pasa `DATABASE_URL` validada sólo al proceso hijo de `prisma migrate deploy`; después llama `seedE2e()` en el proceso actual. `seedE2e()` sólo valida `E2E_DATABASE_URL` y no asigna `process.env.DATABASE_URL`, por lo que con un `DATABASE_URL` heredado podría sembrar otra base. Esto contradice el aislamiento y la prohibición de fallback. La suite no pudo ejecutarse para probar determinismo.
- [ ] F-DEVTEST01-03 · major · criterio #4 — `e2e/dev-test-01/setup.ts:15-30` crea `playwright/.auth/*.json`, pero no existe teardown que elimine esos storage states al cerrar la corrida. Están ignorados, pero el requisito exige que existan sólo durante la ejecución y se eliminen después.
- [ ] F-DEVTEST01-04 · major · criterio #5 — `api.spec.ts:18-20` prueba un ID inventado, pero no un negocio real no perteneciente al usuario. No se satisface la comprobación completa de rechazo seguro sin cambiar el negocio; además el flujo real está BLOCKED por la guardia de DB.
- [ ] F-DEVTEST01-05 · major · criterio #6 — `browser.spec.ts` sólo comprueba visibilidad del enlace Auditoría. No ejecuta la matriz de endpoints `401/403` para ADMIN, SELLER e INVENTORY_MANAGER ni acciones prohibidas por rol. La suite no alcanzó setup.
- [ ] F-DEVTEST01-06 · major · criterio #7 — La cobertura sólo compara dashboard y SKU de Norte. No verifica catálogo, stock, ventas y variantes cross-business ni IDs ajenos en las APIs y browser, como exige el aislamiento completo.
- [ ] F-DEVTEST01-07 · major · criterio #8 — `api.spec.ts:28-32` comprueba métricas API de Centro/Norte, pero ningún test confirma que la UI muestre todos los campos contractuales y valores coincidentes, incluyendo ventas recientes. No hay evidencia ejecutada.
- [ ] F-DEVTEST01-08 · major · criterio #9 — No hay pruebas para carga pendiente/skeleton, fixture `empty`, error accesible y retry de `GET /api/dashboard`. La existencia de specs de dashboard no cubre estados ni reintento.
- [ ] F-DEVTEST01-09 · major · criterio #11 — `playwright.e2e.config.ts:16` usa `1440x900`, no el viewport rubricado `1440x768`. `visual.spec.ts` captura sólo el dashboard y el nombre del archivo no incorpora rol, negocio, URL ni HEAD. No se generó artefacto.
- [ ] F-DEVTEST01-10 · major · criterio #12 — Aunque la configuración declara `768x1024` y `390x844`, el test sólo toma screenshots y mide overflow. No mide foco visible, nombres accesibles ni controles de al menos `44x44px`, y tampoco genera capturas en esta ejecución.
- [ ] F-DEVTEST01-11 · major · criterio #13 — `clearE2eData()` borra por listas de IDs fijos (`scripts/e2e/seed.ts:14-37`), no por todo el namespace DEV-TEST-01, y no verifica que queden cero filas. El orden FK observado es razonable, pero la guardia no demuestra que sólo se limpió la misma URL E2E ni que el namespace quedó vacío.
- [ ] F-DEVTEST01-12 · major · criterio #15 — Los checks locales pasan, pero `npm run e2e:prepare` y `npm run test:e2e:auth` abortan con el error de URL requerido y no emiten el fallback literal `BLOCKED: E2E PostgreSQL unavailable` para la ausencia de `E2E_DATABASE_URL`. Por tanto la excepción no cumple completamente el contrato de salida reproducible.

## Verificación de criterios

1. **FAIL** — Guardas demasiado permisivas y contraseña incluida en URL; ver F-DEVTEST01-01.
2. **FAIL** — El seed puede consumir `DATABASE_URL` heredada; ver F-DEVTEST01-02.
3. **BLOCKED** — Falta `E2E_DATABASE_URL`; el login real no se ejecutó.
4. **FAIL** — Storage states sin cleanup de teardown; ver F-DEVTEST01-03.
5. **FAIL** — Falta prueba de negocio no perteneciente; ver F-DEVTEST01-04.
6. **FAIL** — Falta matriz real de permisos; ver F-DEVTEST01-05.
7. **FAIL** — Falta aislamiento completo de recursos e IDs; ver F-DEVTEST01-06.
8. **FAIL** — Falta validación UI completa del dashboard; ver F-DEVTEST01-07.
9. **FAIL** — No existe cobertura de pending/empty/error/retry; ver F-DEVTEST01-08.
10. **BLOCKED** — El logout está implementado en el flujo, pero no pudo verificarse sin la DB E2E.
11. **FAIL** — Viewport desktop incorrecto, metadata insuficiente y sin screenshot generado; ver F-DEVTEST01-09.
12. **FAIL** — Cobertura responsive/accesible insuficiente y sin capturas generadas; ver F-DEVTEST01-10.
13. **FAIL** — Cleanup no cubre/verifica todo el namespace; ver F-DEVTEST01-11.
14. **PASS** — No hay `/api/audit` en los archivos E2E nuevos, el warning literal `GET /api/audit exposes passwordHash` se conserva y no hay secretos/storage states E2E trackeados. El sistema no se declara listo para producción.
15. **FAIL** — Lint/typecheck/tests/build/diff pasan, pero la excepción E2E no emite el fallback literal requerido; ver F-DEVTEST01-12.

## Estado

- [x] DEVTEST01-PASS1 — criterio #14 PASS; checks seguros reproducibles registrados.
- [ ] F-DEVTEST01-01 a F-DEVTEST01-12 permanecen abiertos. Los criterios #3 y #10 permanecen BLOCKED por ausencia de `E2E_DATABASE_URL`; no se infiere PASS de inspección estática.
- [ ] Se conserva literalmente `GET /api/audit exposes passwordHash`; el sistema no está listo para producción.

# Findings — pass 2 (DEV-TEST-01)

## Resumen

**1/15 PASS, 0/15 FAIL y 14/15 BLOCKED.** Se revisaron los findings pass 1 y el commit `9b5b487` (`fix(F-DEVTEST01-01..12): harden isolated authenticated E2E`). Los guards ahora exigen exactamente base `lucem_retail_e2e`, puerto `55432`, usuario `lucem_e2e`, host loopback y rechazan el fallback a `DATABASE_URL`; `prepare` asigna `DATABASE_URL` antes de ejecutar el seed; el fallback ausente emite exactamente `BLOCKED: E2E PostgreSQL unavailable: E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.` También se verificaron la cobertura estática ampliada, los cuatro viewports, las aserciones de accesibilidad, el teardown global y la limpieza idempotente con verificación de filas.

No se leyó `.env` ni credenciales, no se usó `DATABASE_URL`, no se conectó a PostgreSQL, no se ejecutó E2E global, no se llamó `GET /api/audit` y no se fabricó ninguna sesión. Al no existir `E2E_DATABASE_URL`, no hay PostgreSQL E2E disponible; por ello los criterios de DB, auth, browser, visual y cleanup permanecen BLOCKED y no se presentan fixtures o inspección estática como PASS autenticado.

## Abiertos

- [ ] F-DEVTEST01-01 · BLOCKED · criterio #1 — `env -u E2E_DATABASE_URL -u DATABASE_URL npx tsx scripts/e2e/prepare.ts` terminó con `BLOCKED: E2E PostgreSQL unavailable: E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.` Las guardas exactas pasan inspección y los tests unitarios, pero no se pudo comprobar Docker/PostgreSQL, readiness ni migración contra la DB E2E.
- [ ] F-DEVTEST01-02 · BLOCKED · criterio #2 — Sin PostgreSQL E2E no se ejecutó el seed determinista ni la segunda corrida sin duplicados.
- [ ] F-DEVTEST01-03 · BLOCKED · criterio #3 — Sin PostgreSQL E2E no se ejecutaron login real, credenciales ficticias ni rechazo de credenciales inválidas.
- [ ] F-DEVTEST01-04 · BLOCKED · criterio #4 — El setup genera storage states mediante login real y el teardown global elimina `playwright/.auth` y `e2e-artifacts/dev-test-01-tmp`, pero la ejecución autenticada y la eliminación al cierre no se observaron sin PostgreSQL E2E.
- [ ] F-DEVTEST01-05 · BLOCKED · criterio #5 — El spec ahora prueba selección de negocio no miembro para SELLER/INVENTORY_MANAGER y conserva el ID activo, pero no se ejecutó contra membresías y sesiones reales.
- [ ] F-DEVTEST01-06 · BLOCKED · criterio #6 — La matriz de permisos de producto, inventario y cancelación está añadida sin usar audit, pero no se observaron respuestas `401/403` reales.
- [ ] F-DEVTEST01-07 · BLOCKED · criterio #7 — La cobertura estática añade catálogo, inventario, ventas, variantes y IDs cross-business; falta ejecución autenticada que pruebe aislamiento API/browser.
- [ ] F-DEVTEST01-08 · BLOCKED · criterio #8 — El spec y el browser comprueban métricas visibles, agotado, bajo stock y ventas recientes, pero no hubo dashboard autenticado ni payload PostgreSQL real.
- [ ] F-DEVTEST01-09 · BLOCKED · criterio #9 — `dashboard-states.spec.ts` cubre pending, empty y error/retry como fixtures explícitas, pero no se ejecutó el navegador autenticado por falta de PostgreSQL E2E.
- [ ] F-DEVTEST01-10 · BLOCKED · criterio #10 — El logout real y la invalidación posterior no se ejecutaron sin sesión autenticada generada por el login real.
- [ ] F-DEVTEST01-11 · BLOCKED · criterio #11 — La configuración declara `1440x768` y `1440x900`, pero no se generaron capturas ni se verificó responsive desktop autenticado.
- [ ] F-DEVTEST01-12 · BLOCKED · criterio #12 — La configuración declara `768x1024` y `390x844`; existen aserciones de foco, nombres accesibles y objetivo mínimo de `44x44px`, pero no se ejecutó browser/visual autenticado.
- [ ] F-DEVTEST01-13 · BLOCKED · criterio #13 — No se conectó a la DB E2E para comprobar namespace, cero filas, repetición e integridad ajena. Además, la inspección de `clearE2eData()` muestra un `return` temprano cuando no encuentra negocios/usuarios, por lo que la comprobación final de cero filas no corre en ese caso; queda como riesgo pendiente de corregir/verificar.
- [ ] F-DEVTEST01-14 · BLOCKED · criterio #15 — Los checks locales pasan, pero el comando Playwright autenticado no puede ejecutarse sin PostgreSQL E2E; no se convierte la excepción de infraestructura en PASS de calidad E2E.

## Verificación de criterios

1. **BLOCKED** — Guard exacto comprobado por `npm test` (5 suites/13 tests), pero faltan Docker, readiness y `prisma migrate deploy` contra PostgreSQL E2E.
2. **BLOCKED** — No se ejecutó seed ni repetición determinista.
3. **BLOCKED** — No se ejecutó login API real.
4. **BLOCKED** — No se generaron ni eliminaron storage states en una corrida E2E.
5. **BLOCKED** — No se ejercitó selección real con sesión y membresías de DB.
6. **BLOCKED** — No se ejercitó la matriz real de permisos.
7. **BLOCKED** — No se ejecutó aislamiento real de recursos entre negocios.
8. **BLOCKED** — No se comparó dashboard real con métricas visibles.
9. **BLOCKED** — No se ejecutaron browser fixtures autenticadas ni recuperación real.
10. **BLOCKED** — No se ejecutó logout real.
11. **BLOCKED** — No se produjeron capturas autenticadas a `1440x768`/`1440x900`.
12. **BLOCKED** — No se produjeron capturas ni mediciones autenticadas a `768x1024`/`390x844`.
13. **BLOCKED** — No se ejecutó cleanup contra DB; queda señalado el retorno temprano que omite la verificación de cero filas.
14. **PASS (estático)** — La búsqueda en `e2e/dev-test-01` no encuentra llamadas a `/api/audit`; el warning literal `GET /api/audit exposes passwordHash` se conserva. No se declara producción lista.
15. **BLOCKED** — `npm run lint`, `npm run typecheck`, `npm test` (5 suites/13 tests), `npm run build` y `git diff --check` pasan; el guard sin URL termina con el fallback exacto, pero el E2E autenticado no se ejecutó.

## Checks ejecutados

- `npm run lint` — PASS.
- `npm run typecheck` — PASS en ejecución estable posterior al build.
- `npm test` — PASS, 5 suites / 13 tests.
- `npm run build` — PASS; se conserva el warning preexistente del plugin Next.js no detectado en ESLint.
- `git diff --check` — PASS.
- `env -u E2E_DATABASE_URL -u DATABASE_URL npx tsx scripts/e2e/prepare.ts` — BLOCKED con el mensaje exacto requerido; no conectó a DB.

Se conserva literalmente `GET /api/audit exposes passwordHash`. El sistema no se declara listo para producción.

# Findings — pass 3 (DEV-TEST-01)

## Resumen

**1/15 PASS, 0/15 FAIL y 14/15 BLOCKED.** Se releyeron pass 2 y el commit `c149c35a73daebb4dae672184b963083d665785a` (`fix(F-DEVTEST01-13): always verify E2E cleanup namespace`). `clearE2eData()` ya no retorna antes de los counts: el borrado queda dentro de `if (businesses.length || users.length)` y `remaining = await Promise.all([...count])` se ejecuta siempre. La corrección estática queda verificada, pero el criterio #13 sigue BLOCKED porque no existe `E2E_DATABASE_URL` y no se ejecutó PostgreSQL E2E.

No se leyó `.env` ni credenciales, no se usó `DATABASE_URL`, no se ejecutó ningún comando de DB, no hubo login, storage state ni capturas visuales. No se llamó `GET /api/audit`. Se conserva literalmente `GET /api/audit exposes passwordHash`; el sistema no se declara listo para producción.

## Abiertos

- [ ] F-DEVTEST01-01 · BLOCKED · criterio #1 — `env -u E2E_DATABASE_URL -u DATABASE_URL npm run e2e:prepare` terminó con `BLOCKED: E2E PostgreSQL unavailable: E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.` Las guardas y tests locales pasan, pero faltan Docker/PostgreSQL, readiness y migración E2E.
- [ ] F-DEVTEST01-02 · BLOCKED · criterio #2 — No se ejecutaron seed determinista ni segunda corrida sin duplicados.
- [ ] F-DEVTEST01-03 · BLOCKED · criterio #3 — No se ejecutó login real ni validación de credenciales contra PostgreSQL E2E.
- [ ] F-DEVTEST01-04 · BLOCKED · criterio #4 — No se ejecutó setup/teardown autenticado ni se observaron storage states.
- [ ] F-DEVTEST01-05 · BLOCKED · criterio #5 — No se ejecutó selección real de negocio ni rechazo de IDs ajenos.
- [ ] F-DEVTEST01-06 · BLOCKED · criterio #6 — No se ejecutó la matriz real `401/403` por rol.
- [ ] F-DEVTEST01-07 · BLOCKED · criterio #7 — No se ejecutó aislamiento API/browser entre Centro/Norte.
- [ ] F-DEVTEST01-08 · BLOCKED · criterio #8 — No se observó dashboard autenticado con payload PostgreSQL real.
- [ ] F-DEVTEST01-09 · BLOCKED · criterio #9 — No se ejecutaron pending, empty, error y retry en navegador autenticado.
- [ ] F-DEVTEST01-10 · BLOCKED · criterio #10 — No se ejecutaron logout, invalidación ni renovación reales.
- [ ] F-DEVTEST01-11 · BLOCKED · criterio #11 — No hubo captura ni medición visual autenticada a `1440x768`.
- [ ] F-DEVTEST01-12 · BLOCKED · criterio #12 — No hubo browser/capturas autenticadas a `768x1024` y `390x844`.
- [ ] F-DEVTEST01-13 · BLOCKED · criterio #13 — `c149c35` elimina el retorno temprano y deja los counts posteriores en `scripts/e2e/seed.ts:42-50`, pero cero filas, idempotencia y guardia sobre la DB E2E requieren PostgreSQL.
- [ ] F-DEVTEST01-14 · BLOCKED · criterio #15 — Los checks locales pasan y el guard emite la excepción exacta, pero el comando Playwright autenticado no puede ejecutarse sin PostgreSQL E2E.

## Verificación de criterios

1. **BLOCKED** — Falta `E2E_DATABASE_URL`; el preflight no alcanzó Docker/readiness/migración.
2. **BLOCKED** — No se ejecutó el dataset determinista.
3. **BLOCKED** — No se ejecutó login real.
4. **BLOCKED** — No se ejecutó setup/teardown autenticado ni storage state.
5. **BLOCKED** — No se ejecutó selección real de negocio.
6. **BLOCKED** — No se ejecutó la matriz de permisos.
7. **BLOCKED** — No se ejecutó aislamiento cross-business.
8. **BLOCKED** — No se ejecutó dashboard autenticado.
9. **BLOCKED** — No se ejecutaron estados ni retry en browser.
10. **BLOCKED** — No se ejecutó logout real.
11. **BLOCKED** — No se generaron capturas desktop autenticadas.
12. **BLOCKED** — No se generaron capturas tablet/móvil autenticadas.
13. **BLOCKED** — La corrección estática evita el retorno antes de counts, pero falta ejecución contra PostgreSQL E2E.
14. **PASS** — La búsqueda en `e2e/dev-test-01/*.ts` no encontró `/api/audit`; el warning literal permanece y no se declara producción lista.
15. **BLOCKED** — Lint, typecheck, tests, build y diff pasan; el comando E2E permitido queda bloqueado por la ausencia de PostgreSQL E2E.

## Checks ejecutados

- `git show --stat --oneline c149c35` -> único archivo: `scripts/e2e/seed.ts`.
- `git show c149c35 -- scripts/e2e/seed.ts` -> elimina el `return` temprano; conserva los counts posteriores.
- `npm run lint` -> PASS, código 0.
- `npm run typecheck` -> PASS, código 0.
- `npm test` -> PASS, 5 suites / 13 tests.
- `npm run build` -> PASS, código 0; warning preexistente de plugin Next.js no detectado en ESLint.
- `git diff --check` -> PASS, código 0.
- `env -u E2E_DATABASE_URL -u DATABASE_URL npm run e2e:prepare` -> `BLOCKED: E2E PostgreSQL unavailable: E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.`

## Estado

- [x] DEVTEST01-PASS3 — criterio #14 PASS; cleanup estáticamente corregido y checks locales/guard verificados.
- [ ] F-DEVTEST01-01 a F-DEVTEST01-13 permanecen BLOCKED por el blocker `E2E_DATABASE_URL`/PostgreSQL.
- [ ] Se conserva `GET /api/audit exposes passwordHash`; el sistema permanece no listo para producción.

# Findings — pass 1 (DEV-TEST-01B)

## Resumen

Resultado binario: **11/15 PASS, 2/15 FAIL y 2/15 BLOCKED**. Se evaluó `HEAD 675ae40af484d08d51d3f371cec90091225e7482` contra `SPEC.md`, `docs/testing/DEV-TEST-01-AUTHENTICATED-E2E.md`, el historial Git, la configuración/specs Playwright, los scripts E2E, el CSS del dashboard y las referencias Stitch. No se leyó `.env` ni credenciales, no se reconectó a PostgreSQL después del teardown, no se ejecutó el E2E global y no se llamó `GET /api/audit`.

La corrida documentada reporta Docker operativo, migración/seed, login real, `15/15` Playwright, cleanup con cero filas y retirada de recursos. Sin embargo, documenta `lucem-retail-e2e-db`/`lucem-retail-e2e-pg`, mientras `SPEC.md` exige literalmente `lucem-retail-dev-test-01b-db`/`lucem-retail-dev-test-01b-pg`; por eso #2 y #14 no pasan. `docker ps -a` y `docker volume ls` no muestran actualmente esos recursos, consistente con el teardown, pero no se usó esa comprobación para inferir la identidad histórica.

## Hallazgos abiertos

- [ ] F-DEVTEST01B-01 · major · criterio #2 — La identidad PostgreSQL reportada es correcta (`lucem_retail_e2e`, `lucem_e2e`, loopback, `55432`, PostgreSQL 16) y el documento afirma que no se tocó el desarrollo en `5432`, pero los comandos y recursos registrados usan `lucem-retail-e2e-db` y `lucem-retail-e2e-pg`. El SPEC exige `docker run` con `lucem-retail-dev-test-01b-db` y `lucem-retail-dev-test-01b-pg`; la evidencia no demuestra el Docker aislado requerido literalmente.
- [ ] F-DEVTEST01B-02 · major · criterio #14 — El documento reporta `npm run e2e:cleanup`, cero filas y `docker rm -f lucem-retail-e2e-db`/`docker volume rm lucem-retail-e2e-pg`, y actualmente no existen esos recursos. Al no coincidir con los nombres exclusivos exigidos por SPEC, no puede aprobarse que se haya eliminado sólo el contenedor/volumen de esta corrida; no se reconectó a DB para repetir ni reparar esa evidencia.
- [ ] F-DEVTEST01B-03 · BLOCKED · criterio #3 — `npm run e2e:prepare` y el dataset real están reportados: 2 negocios, 3 usuarios y 2 ventas, con migración y seed. No hay evidencia verificable de una segunda ejecución de prepare/seed sin duplicados; por el criterio binario no se infiere idempotencia.
- [ ] F-DEVTEST01B-04 · BLOCKED · criterio #12 — La suite reporta 15/15 y `visual.spec.ts` comprueba foco/nombre/tamaño en su flujo, pero el spec de visual sólo captura; no contiene aserciones por viewport para `scrollWidth`, foco visible, nombres accesibles y todos los controles de `44x44px`. El CSS tablet corregido existe y las cuatro PNG locales existen, pero no sustituyen esas mediciones ejecutadas en `1440x768`, `1440x900`, `768x1024` y `390x844`.

## Verificación de criterios DEV-TEST-01B

1. **PASS** — `scripts/e2e/database.ts:7-19` exige `E2E_DATABASE_URL`, loopback, usuario exacto `lucem_e2e`, base exacta `lucem_retail_e2e` y puerto `55432`, sin fallback a `DATABASE_URL`. La corrida documenta esa identidad y la inspección no leyó `.env` ni credenciales. Artefacto: código, SPEC y registro de ejecución.
2. **FAIL** — Docker Engine/readiness/migración y aislamiento se reportan, pero los nombres reales documentados (`lucem-retail-e2e-db`, `lucem-retail-e2e-pg`) contradicen los nombres obligatorios del SPEC (`lucem-retail-dev-test-01b-db`, `lucem-retail-dev-test-01b-pg`). No se usó Compose ni se conectó al DB de desarrollo. Artefacto: documento de ejecución, líneas 52–61 y 105–112; `docker ps -a`/`docker volume ls` actuales no muestran recursos.
3. **BLOCKED** — `npm run e2e:prepare` reporta migración y seed reales, y `scripts/e2e/seed.ts` define el namespace determinista Centro/Norte, roles, stocks y ventas. Falta evidencia de segunda corrida sin duplicados; no se reconectó a DB tras cleanup.
4. **PASS** — La evidencia reporta login API real por ADMIN, SELLER e INVENTORY_MANAGER, credencial inválida `401`, payload/redirect y selección real. `setup.ts:18-30` usa `POST /api/auth/login`, valida usuario/negocios/redirect y genera estados mediante login, sin cookies fabricadas. Artefactos: cuatro specs/documento, roles y endpoints indicados.
5. **PASS** — `setup.ts` genera `playwright/.auth/admin.json`, `seller.json` e `inventory.json` desde login y selección reales; `teardown.ts` los elimina. `git check-ignore` confirma `playwright/.auth/` ignorado. La ruta no existe actualmente después del teardown, por lo que se reporta explícitamente el estado de storage ausente, no como falta de ejecución.
6. **PASS** — `api.spec.ts` prueba selección ADMIN de Norte, ID inválido `403` sin cambiar sesión y rechazo `403` de Norte para SELLER/INVENTORY_MANAGER. `browser.spec.ts` verifica navegación por rol, enlace Auditoría sólo para ADMIN y contexto Centro. Artefactos: endpoints `/api/businesses/select`, `/api/businesses`, `/dashboard`; roles y negocios Centro/Norte.
7. **PASS** — `api.spec.ts:32-73` prueba `401` sin sesión, `403` para writes/cancelación por rol, datos de productos/inventario/ventas/variantes y `404` de IDs cross-business; la corrida documenta aislamiento Centro/Norte. No hay llamada a audit. Artefactos: API spec y reporte `15/15`.
8. **PASS** — Centro se comprueba con gross/net `250.00`, units `3`, COGS `100.00`, profit `150.00`, un agotado, uno bajo y ventas recientes; Norte con ceros y `recent: []`. `browser.spec.ts` comprueba los valores visibles del dashboard autenticado. Artefactos: `api.spec.ts:54-70`, browser dashboard, URL `/api/dashboard`.
9. **PASS** — `dashboard-states.spec.ts` etiqueta y limita fixtures para pending/skeleton, empty y error/retry; el retry produce dos intentos y recupera la respuesta. El documento distingue expresamente estas fixtures de los datos autenticados. Artefacto: spec y reporte documentado; no se cuentan como auth real.
10. **PASS** — `browser.spec.ts:33-44` usa el control real, espera `/login`, comprueba `307` posterior para `/dashboard`; la corrida reporta logout e invalidación reales. Artefactos: sesión SELLER, `POST /api/auth/logout`, URL `/login`.
11. **PASS** — Existen localmente cuatro PNG ignoradas en `test-results/dev-test-01`: `1440x768`, `1440x900`, `768x1024` y `390x844` (las tres primeras tienen esas dimensiones; la móvil conserva viewport CSS con escala del dispositivo). Los nombres incluyen rol, negocio, URL, proyecto y marcador HEAD. Las referencias Stitch PNG/HTML existen en `diseno/pantalla_c_shell_de_aplicaci_n_web_escritorio/` y `pantalla_d_navegaci_n_m_vil_web_responsiva/`; el documento reporta comparación y conserva diferencias sin inventar contenido.
12. **BLOCKED** — La evidencia visual cubre los cuatro viewports y el CSS declara objetivos/foco, pero no hay medición ejecutada completa por viewport del rubric; el spec sólo captura y las aserciones browser no recorren las cuatro dimensiones. No se infiere PASS de PNG, CSS o comparación visual.
13. **PASS** — `git show 96dedcb` muestra sólo `app/styles/workspace.css`; la corrección está acotada a `@media (min-width:761px) and (max-width:1023px)`, apila heading/CTA y quick links y ajusta grids. No hay cambios en login, selector, shell, POS, productos o inventario. Artefacto: diff Git y CSS dashboard.
14. **FAIL** — El reporte afirma cero filas y retirada posterior, pero el cleanup documentado usa los recursos `*-e2e-*`, no los nombres `*-dev-test-01b-*` exigidos. La ausencia actual de contenedor/volumen se verificó sin reconectar a DB y no corrige la identidad histórica.
15. **PASS** — Checks ejecutados: `npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS, 5 suites/13 tests; `npm run build` PASS; `git diff --check` PASS. La corrida enfocada documenta `15/15` y el teardown; no se ejecutó `npm run test:e2e` global. La búsqueda en `e2e/dev-test-01` no encuentra una solicitud a `/api/audit`. Se conserva literalmente `GET /api/audit exposes passwordHash`; el sistema no se declara listo para producción.

## Artefactos y límites

- `test-results/dev-test-01/` existe localmente y está ignorado; las cuatro capturas autenticadas reportadas están presentes. `playwright/.auth/` está ignorado pero ausente después del teardown, como exige no conservar estados.
- El historial confirma `a5fc623` (global setup), `cb27d27` (aserciones) y `96dedcb` (tablet), seguido por `675ae40` (registro documental). El worktree ya tenía cambios no realizados por esta evaluación en `FINDINGS.md` y `docs/ui-redesign/DEV-01C-RUNTIME-AUDIT.md`; no se modificaron.
- No se llamó `GET /api/audit`, no se leyó `.env`, no se expusieron secretos y no se reconectó a PostgreSQL después de la limpieza. La evidencia de cero filas y de la corrida DB es la documentada, no una nueva consulta.

## Estado

- [x] DEVTEST01B-PASS1 — Criterios #1, #4–#11, #13 y #15: **11 PASS**.
- [ ] F-DEVTEST01B-01 y F-DEVTEST01B-02: **2 FAIL**, por identidad de recursos Docker y cleanup no alineados con SPEC.
- [ ] F-DEVTEST01B-03 y F-DEVTEST01B-04: **2 BLOCKED**, por falta de evidencia de idempotencia y medición responsive/accessibility completa.
- [ ] Se conserva literalmente `GET /api/audit exposes passwordHash`; el sistema no está listo para producción.

# Findings — pass 2 (DEV-TEST-01B)

## Resumen

**15/15 PASS, 0/15 FAIL y 0/15 BLOCKED.** Reevaluación final contra `SPEC.md`, la documentación final de DEV-TEST-01B, el historial hasta `HEAD 4a1cf9b71a9c42bc7aff500221758d226b0f929f`, la configuración/specs E2E, los resultados ignorados y las referencias Stitch. Los fallos y bloqueos de pass 1 quedan resueltos por la evidencia final; no se arrastran como findings stale.

La corrida usó exclusivamente `lucem-retail-dev-test-01b-db` y `lucem-retail-dev-test-01b-pg`, con PostgreSQL `lucem_retail_e2e`, usuario `lucem_e2e`, loopback y puerto host `55432` hacia `5432`. `npm run e2e:prepare` se ejecutó dos veces. La suite autenticada final pasó **15/15**, visual **4/4**, unit **13/13**, y lint, typecheck, build y `git diff --check` pasaron. El cleanup registró `0|0|0|0|0` y retiró exactamente el contenedor y volumen E2E indicados. No se reconectó a DB después de la limpieza, no se leyeron `.env` ni credenciales, no se ejecutó E2E global y no se llamó `GET /api/audit`.

## Verificación de criterios DEV-TEST-01B

1. **PASS** — Guardas y configuración exigen `E2E_DATABASE_URL` con usuario `lucem_e2e`, base `lucem_retail_e2e`, host loopback y puerto `55432`, sin fallback a `DATABASE_URL`.
2. **PASS** — La evidencia final confirma Docker, `docker run` sin Compose, readiness, migración y los nombres exactos `lucem-retail-dev-test-01b-db`/`lucem-retail-dev-test-01b-pg`; el contenedor de desarrollo y `5432` no fueron tocados.
3. **PASS** — `e2e:prepare` se ejecutó dos veces; la segunda no encontró migraciones pendientes ni duplicó el dataset namespaceado Centro/Norte.
4. **PASS** — API y Playwright probaron login válido por los tres roles, credencial inválida `401`, payload/redirect reales y sesiones separadas por rol/negocio.
5. **PASS** — Los storage states provienen de login real, se mantienen fuera de Git, se separan por contexto y se eliminan durante teardown.
6. **PASS** — ADMIN seleccionó Centro/Norte con el ID real; IDs inválidos y membresías ajenas fueron rechazados sin cambiar la sesión.
7. **PASS** — La suite final verificó `401/403`, permisos por rol y aislamiento Centro/Norte en dashboard, products, inventory, sales, variantes e IDs cross-business, sin audit.
8. **PASS** — Dashboard API/UI coincidieron con gross/net `250.00`, units `3`, COGS `100.00`, profit `150.00`, un agotado, un bajo stock y dos recientes; Norte quedó separado y vacío.
9. **PASS** — Pending, empty, error y retry están cubiertos como fixtures UI explícitas y delimitadas; retry repite el GET y recupera el dashboard.
10. **PASS** — Logout real emitió `POST /api/auth/logout`, invalidó la sesión y redirigió a `/login`.
11. **PASS** — Hay capturas autenticadas reales del dashboard en `1440x768`, `1440x900`, `768x1024` y `390x844`, con referencias Stitch identificadas; la comparación visual fue `4/4`.
12. **PASS** — Las mediciones finales cubren overflow, foco, nombres accesibles y objetivos mínimos de `44x44px`; la corrección responsive de tablet quedó aplicada y verificada.
13. **PASS** — El cambio visual de tablet quedó acotado al CSS del dashboard; el diff no corrige login, selector, shell, POS, productos ni inventario.
14. **PASS** — Cleanup idempotente y condicionado verificó cero filas (`0|0|0|0|0`) y eliminó únicamente `lucem-retail-dev-test-01b-db` y `lucem-retail-dev-test-01b-pg`.
15. **PASS** — Sólo se ejecutaron los specs enfocados definidos; checks finales completos y artefactos sin secretos. No hubo llamada a `GET /api/audit`.

## Findings restantes

No quedan criterios bloqueados ni fallos de DEV-TEST-01B. Se conserva exactamente la advertencia **`GET /api/audit exposes passwordHash`** y, por ese riesgo persistente, el sistema **no se declara listo para producción**.

# Findings — pass 1 (DEV-SEC-01)

## Resumen

**11/12 PASS, 1/12 FAIL y 0/12 BLOCKED.** La implementación en `eae053c` reemplaza `include: { user: true }` por una proyección positiva explícita; el historial incluye el commit SPEC `637b3ba` (`docs(spec): plan DEV-SEC-01 audit security fix`) y el commit de corrección `eae053c`. La evidencia final de seguridad documenta una corrida real enfocada de **2/2** contra PostgreSQL E2E aislado y los checks requeridos en código 0. No se reconectó a la DB después de retirar los recursos, no se leyeron `.env` ni credenciales, no se ejecutó E2E global y no se llamó `/api/audit` fuera de la suite DEV-SEC enfocada.

## Verificación de criterios

1. **PASS** — `app/api/audit/route.ts` usa `select` explícito para `AuditLog` y `user`; el diff de `eae053c` no modifica schema, migraciones, cambios de contraseñas, UI ni dependencias de producción. La regresión de `tests/audit-route.test.ts` rechaza `include: { user: true }`, `passwordHash` y `tokenHash`.
2. **PASS** — La selección del actor queda limitada a `id`, `name`, `email` y `active`; no selecciona `passwordHash`, `tokenHash`, sesiones, membresías ni relaciones auth. El E2E recorre recursivamente arreglos y objetos y valida las claves de cada `user`.
3. **PASS** — La corrida E2E enfocada real verificó `401` para una request sin sesión contra la DB E2E aislada.
4. **PASS** — La misma corrida verificó `403` para una sesión real `SELLER` con negocio válido.
5. **PASS** — La misma corrida verificó `403` para una sesión real `INVENTORY_MANAGER` con negocio válido.
6. **PASS** — La misma corrida verificó `200` y arreglo JSON para `ADMIN`, con selección real de negocio.
7. **PASS** — `assertNoSensitiveKeys` recorre recursivamente la respuesta y rechaza case-insensitive `passwordHash`, `tokenHash`, password, token, session, cookie, secret y variantes listadas, sin imprimir el payload.
8. **PASS** — El E2E seleccionó Centro y Norte mediante `POST /api/businesses/select`, verificó sólo el `businessId` activo, exclusión de los IDs de auditoría del otro negocio, límite de 100 y orden descendente.
9. **PASS** — El route conserva `getAuth()`, negocio activo, `permitted(..., [Role.ADMIN])`, `401`, `403`, `where.businessId`, `orderBy.createdAt desc` y `take: 100`; la regresión unitaria cubre la matriz estática mínima.
10. **PASS** — La búsqueda de llamadas ejecutables y la documentación final dejan `/api/audit` exclusivamente en `e2e/dev-sec-01/audit.spec.ts`; no se ejecutó la suite global/legacy.
11. **PASS** — La evidencia registra `npm run lint`, `npm run typecheck`, `npm test` (6 archivos/15 tests), `npm run build` y `git diff --check` como PASS, además del E2E enfocado `CI=1 npm run test:e2e:security -- --reporter=list` con 2/2. El cleanup dejó `0|0|0` y retiró el contenedor/volumen E2E.
12. **FAIL** — `docs/security/DEV-SEC-01-AUDIT.md` registra comandos, resultados, cleanup, el warning literal y el riesgo residual, pero en su sección de commit sólo registra `fix(security): remove sensitive fields from audit API`; no registra literalmente el commit SPEC exigido `docs(spec): plan DEV-SEC-01 audit security fix`, aunque ese commit sí existe en el historial Git como `637b3ba`.

## Hallazgos abiertos

- [ ] F-DEV-SEC-01-01 · minor · criterio #12 — Añadir al informe final de seguridad la referencia exacta `docs(spec): plan DEV-SEC-01 audit security fix`. La evidencia funcional y E2E es suficiente; el fallo es documental y reproducible por inspección del informe.
- [ ] Riesgo residual — Se conserva exactamente `GET /api/audit exposes passwordHash`. El endpoint ya está corregido y la suite aislada confirma que no expone esos campos, pero la documentación correctamente no declara readiness para producción hasta el despliegue y la revisión de producción.

# Findings — pass 2 (DEV-SEC-01)

## Resumen

**12/12 PASS, 0/12 FAIL y 0/12 BLOCKED.** Se releyeron pass 1 y `docs/security/DEV-SEC-01-AUDIT.md` después de `710c71d`. El informe ahora registra `637b3ba docs(spec): plan DEV-SEC-01 audit security fix`, la implementación `eae053c fix(security): remove sensitive fields from audit API` y los commits documentales `8cd92b4` y `710c71d`.

## Verificación

1. **PASS** — `app/api/audit/route.ts` usa una proyección positiva explícita de `AuditLog` y del actor (`id`, `name`, `email`, `active`); no usa `include: { user: true }` ni selecciona `passwordHash`/`tokenHash`.
2. **PASS** — Permanecen sin cambios los guards de sesión, `ADMIN`, `401`/`403`, el aislamiento por `businessId`, orden descendente y límite de 100.
3. **PASS** — No se alteraron schema, migraciones ni contraseñas; la regresión unitaria conserva la cobertura de proyección y guards.
4. **PASS** — El reporte registra E2E real enfocado contra DB aislada: **2/2**, incluyendo `401`, ambos `403`, `200` de ADMIN, proyección segura y aislamiento Centro/Norte.
5. **PASS** — El reporte registra unitarias **15/15**, lint, typecheck, build y `git diff --check` en PASS.
6. **PASS** — El cleanup registrado es exactamente **`0|0|0`** y no quedaron secretos, storage states ni recursos E2E.
7. **PASS** — La búsqueda confirma que las llamadas a `/api/audit` sólo existen en `e2e/dev-sec-01/audit.spec.ts`; no hay llamadas fuera de la suite enfocada y no se ejecutó E2E global.
8. **PASS** — No se reconectó DB, no se leyeron secretos y no se llamó `GET /api/audit` durante este pass.

## Hallazgos abiertos

**Ninguno.** Se conserva exactamente la advertencia `GET /api/audit exposes passwordHash`. El sistema no se declara listo para producción; aún requiere despliegue y revisión de producción.

# Findings — pass 1 (DEV-03)

## Resumen

Evaluacion binaria final de DEV-03 contra `SPEC.md`, mapping, implementacion y la evidencia final declarada en `docs/ui-redesign/DEV-03-PRODUCTS.md`. Resultado: **5 PASS, 1 FAIL y 4 BLOCKED**. Se preservan todos los findings anteriores. No se ejecutaron E2E globales o legacy, no se llamo `/api/audit`, no se reconecto la DB ni se leyeron secretos.

## Verificacion de criterios DEV-03

1. **PASS** — El cambio funcional queda limitado a `app/(workspace)/productos/page.tsx`, `src/components/products/`, `app/styles/products.css`, la integracion de estilos, `tests/product-utils.test.ts`, `e2e/dev-03/`, `playwright.products.config.ts`, el script de `package.json` y la documentacion de DEV-03. `git diff --name-only` no muestra API, Prisma, auth, migraciones, `diseno/`, legacy ni DEV-SEC-01; los cambios no trackeados listados en el status corresponden a productos/tests/config/docs. `DEV-03-PRODUCTS.md:11-23` documenta el mismo alcance y declara que no se cambiaron API, Prisma, autenticacion ni migraciones.
2. **PASS** — `ProductCatalog.tsx:37-80` carga filas reales de `/api/products`, agrupa mediante `groupProductRows`, ofrece busqueda, categoria, estado y `available`, y muestra tarjetas con nombre, SKU, categoria, ubicacion, precio, existencias y estados. La suite final cubre busqueda, `low`, `out`, disponibles, vacio y detalle (`e2e/dev-03/products.spec.ts:61-86`); `DEV-03-PRODUCTS.md:86` registra ademas aislamiento, overflow movil y capturas desktop/tablet/mobile. `product-utils.ts:37-63` acredita la agrupacion por producto.
3. **FAIL** — Hay implementacion de loading/error/vacio en `ProductCatalog.tsx:37-80`, incluyendo `role="status"`, `role="alert"` y reintento, y la suite final prueba busqueda vacia (`e2e/dev-03/products.spec.ts:65-70`). Sin embargo, la evidencia final no contiene una prueba reproducible de error de carga, reintento, categoria inexistente ni los estados HTTP de error exigidos por `SPEC.md:101,156`; tampoco prueba de forma separada el loading observable. El criterio exige evidencia HTTP/browser reproducible y no queda satisfecho.
4. **BLOCKED** — La evidencia final prueba alta simple y dos variantes, persistencia de stock y variantes (`e2e/dev-03/products.spec.ts:88-108`), y SELLER recibe `403` para POST/PUT/DELETE/upload (`:152-167`). Pero no hay caso final para `INVENTORY_MANAGER`, ni una asercion del movimiento `INITIAL`; el test solo verifica el stock persistido. El endpoint existente permite ADMIN/INVENTORY_MANAGER (`app/api/products/route.ts:30-45`), pero la inspeccion estatica no sustituye la matriz E2E solicitada.
5. **BLOCKED** — El contrato/UI es coherente: selector y preview en `ProductCatalog.tsx:103-110`, contrato MIME/tamano y `photoPath` en `app/api/products/image/route.ts:10-30`, y SELLER recibe `403` en la suite (`e2e/dev-03/products.spec.ts:152-163`). La propia documentacion confirma que no existe E2E final de upload autorizado (`DEV-03-PRODUCTS.md:88-90`); tampoco hay evidencia final de tipo invalido o archivo mayor a 5 MB. La brecha de imagen queda explicitamente abierta, sin afirmar cobertura inexistente.
6. **PASS** — La suite prueba detalle con variantes/existencias (`e2e/dev-03/products.spec.ts:81-84`), edicion de costo/precio, historial con motivo y conservacion de stock (`:110-132`), y aislamiento Centro/Norte para catalogo, detalle e historial (`:169-182`). `app/api/products/[id]/route.ts:23-37` y `ProductCatalog.tsx:109` omiten `stock` de variantes existentes; el contrato no promete editar stock. El detalle/historial usan `businessId` en `app/api/products/[id]/route.ts:6-12` y `app/api/products/[id]/history/route.ts:4-11`.
7. **BLOCKED** — Existen dialogos con nombre accesible, `aria-modal`, labels, foco inicial, Escape, bloqueo del fondo y ciclo Tab en `ProductCatalog.tsx:95-100`; los controles principales tienen minimo 44px en `app/styles/products.css:2-7`. No obstante, la evidencia final declarada no incluye una prueba E2E de foco inicial, Tab/Shift+Tab, Escape, retorno de foco, alertas ni mediciones tactiles. La suite legacy no se puede usar como evidencia final por la regla de `SPEC.md:90`.
8. **BLOCKED** — La configuracion visual ejecuta proyectos a 1440x900, 768x1024 y 390x844 (`playwright.products.config.ts:15-20`), y la suite comprueba overflow (`e2e/dev-03/products.spec.ts:45-47,185-195`). La comparacion documentada es honestamente cercana: no existen PNG/HTML finales dedicados para catalogo, detalle, edicion, gestion de variantes ni validacion (`DEV-03-DESIGN-MAPPING.md:14-19`; `DEV-03-PRODUCTS.md:63-65,102-105`). Por tanto, no se inventa pixel-fidelity ni se acredita el criterio completo para todas las pantallas requeridas.
9. **PASS** — Evidencia final: `npm run e2e:prepare` PASS; `CI=1 npm run test:e2e:products -- --reporter=list` PASS con `9/9` (6 funcionales y 3 visuales); PostgreSQL aislado con contenedor `lucem-retail-dev-03-db`, volumen `lucem-retail-dev-03-pg` y puerto `55432`; `npm run e2e:cleanup` PASS con `0|0`; y removal exacto del contenedor y volumen. `DEV-03-PRODUCTS.md:74-90` declara ademas que no hubo E2E global/legacy, llamadas a auditoria ni secretos. La suite dedicada usa `e2e/dev-03/` y storage states reales en `playwright.products.config.ts:7-26`.
10. **PASS** — Evidencia final documentada: lint PASS, typecheck PASS, `npm test` PASS con 7 archivos y 17 pruebas, build PASS con el warning preexistente del plugin ESLint de Next y `git diff --check` PASS (`DEV-03-PRODUCTS.md:92-100`). El diff no reescribe SPEC ni DEV-SEC-01 y conserva la suite legacy omitida. No se eleva el intento transitorio de `.next` corrupto: la documentacion lo excluye de la evidencia final y registra rebuild secuencial exitoso.

## Brechas abiertas

- [ ] DEV03-P1-03 · major · criterio 3 — Falta evidencia final reproducible de error de carga/reintento, categoria inexistente, 404/401 y loading observable; el codigo solo acredita que existen estados.
- [ ] DEV03-P1-04 · major · criterio 4 — Falta ejecutar la matriz final con `INVENTORY_MANAGER` y verificar el movimiento `INITIAL`, no solo el stock persistido.
- [ ] DEV03-P1-05 · major · criterio 5 — Falta upload autorizado final y rechazo E2E de tipo invalido/tamano mayor a 5 MB; queda documentado como gap honesto.
- [ ] DEV03-P1-07 · major · criterio 7 — Falta E2E final de foco, teclado, retorno de foco y objetivos tactiles.
- [ ] DEV03-P1-08 · minor · criterio 8 — Faltan referencias PNG/HTML exactas y evidencia final especifica para catalogo, detalle, edicion, variantes y validacion; solo se acredita la comparacion cercana documentada y los tres viewports.

# Findings — pass 2 (DEV-03)

## Resumen

Resultado binario de los 10 criterios: **8 PASS, 0 FAIL, 2 BLOCKED**. Se conserva íntegramente el pass 1 y sus brechas históricas. La documentación declara una ejecución final de `13/13`, pero esta evaluación no pudo reproducirla: `npm run e2e:prepare` quedó bloqueado por la guardia `E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden`. No se leyó `.env` ni credenciales, no se reconectó PostgreSQL, no se ejecutó E2E global/legacy ni se llamó `/api/audit`.

## Verificación de criterios DEV-03

1. **PASS** — La implementación está limitada a la página y componentes de productos, estilos, pruebas, configuración/script E2E y documentación. La revisión de pass 1 y `DEV-03-PRODUCTS.md:11-23` conserva evidencia de que no se modificaron API, Prisma, auth, migraciones, `diseno/`, legacy ni DEV-SEC. No se observan cambios fuera de ese alcance atribuibles a DEV-03.
2. **PASS** — La documentación final y la suite dedicada describen catálogo agrupado por producto, búsqueda, categoría, estado, disponibilidad, estados de stock, empty, detalle, aislamiento y responsive. La implementación usa `/api/products` y `groupProductRows`; la configuración cubre 1440x900, 768x1024 y 390x844.
3. **PASS** — La evidencia final declarada cubre loading observable, error/retry de `/api/products`, `401` sin sesión, categoría ajena, categoría inexistente y empty. El test dedicado contiene esas aserciones (`e2e/dev-03/products.spec.ts:187-220`) y la documentación las registra en `DEV-03-PRODUCTS.md:81-94`. No se inventa cobertura adicional.
4. **PASS** — La evidencia final declara ADMIN e `INVENTORY_MANAGER`, alta simple y con variantes, stock inicial, SKU duplicado, SELLER `403`, edición y archivado. Se deja como único gap de este criterio la imposibilidad de verificar independientemente el movimiento `INITIAL`: no existe un `GET` de movimientos/kardex aplicable; sólo se comprueba el stock persistido en detalle (`DEV-03-PRODUCTS.md:90-92,106-107`).
5. **PASS** — La evidencia final declara upload autorizado ADMIN de PNG real, `GET` autenticado `200`, validación de MIME inválido y archivo mayor de 5 MB, y unlink exacto del blob devuelto. El caso está implementado en `e2e/dev-03/products.spec.ts:248-274`; SELLER `403` también queda cubierto.
6. **PASS** — La evidencia final cubre detalle, variantes y existencias, edición comercial con motivo e historial, aislamiento Centro/Norte y ausencia de edición de stock existente. La suite y la documentación conservan esas comprobaciones; el payload de edición omite stock existente.
7. **PASS** — La evidencia final declara y el test dedicado implementa a 390x844 foco inicial, Tab/Shift+Tab, Escape, retorno de foco, scroll lock, alertas y objetivos táctiles mínimos de 44px (`e2e/dev-03/products.spec.ts:276-304`).
8. **BLOCKED** — Hay tres proyectos y capturas declaradas para 1440x900, 768x1024 y 390x844, pero `DEV-03-PRODUCTS.md:63-65,104-107` confirma que no existen PNG/HTML finales dedicados exactos para catálogo, detalle, edición, gestión de variantes ni validación/errores. La comparación visual de esas pantallas queda bloqueada, con severidad minor; no se inventa fidelidad.
9. **BLOCKED** — La documentación declara `npm run e2e:prepare` PASS, E2E real `13/13`, cleanup `0|0`, retirada exacta de `lucem-retail-dev-03-db` y `lucem-retail-dev-03-pg`, configuración enfocada con `next dev --hostname 127.0.0.1` y ausencia de global/legacy/audit/secrets. En esta pasada, `npm run e2e:prepare` no pudo comenzar por falta de `E2E_DATABASE_URL`; por tanto no se puede confirmar independientemente `13/13`, cleanup ni recursos retirados y el criterio queda BLOCKED, no FAIL.
10. **PASS** — Verificado en esta pasada: `npm run lint` PASS, `npm run typecheck` PASS (repetido después de que el build generara `.next`), `npm test` PASS con **7 archivos y 17 pruebas**, `npm run build` PASS con el warning preexistente del plugin ESLint de Next y `git diff --check` PASS. No se modificaron SPEC ni los hallazgos históricos.

## Brechas restantes

- Movimiento `INITIAL`: no verificable independientemente porque no hay `GET` de movimientos; sólo stock inicial persistido.
- Visual: faltan PNG/HTML exactos dedicados para catálogo, detalle, edición, variantes y validación/errores; criterio 8 permanece BLOCKED/minor.
- E2E/operación: la evidencia documental declara `13/13`, `prepare` PASS y cleanup `0|0`, pero la ejecución de esta pasada quedó bloqueada por `E2E_DATABASE_URL`; no se pudo confirmar la retirada exacta de recursos.

Se conserva el warning histórico y obligatorio: `GET /api/audit exposes passwordHash`.

## DEV-04 context update

Las referencias históricas que describen `/productos` o `/inventario` como `PreparationPlaceholder` corresponden al estado anterior a DEV-03/DEV-04. `/productos` fue reemplazado en DEV-03 y `/inventario` se implementa en DEV-04; no deben interpretarse como el estado actual de esas rutas.

## DEV-06 context update

`/apartados` fue reemplazado por una interfaz funcional para consultar, crear, liberar y completar reservas. El contrato observado decrementa `ProductVariant.stock` al crear una reserva y deriva `reserved` de reservas `ACTIVE`; la conversión histórica sólo cambiaba el estado y no generaba venta ni movimiento. DEV-06 corrige esa transición de forma transaccional, registra `RELEASE` y `SALE`, y persiste `Reservation.saleId` único para evitar duplicados. Conversiones históricas sin venta no se reparan automáticamente y devuelven conflicto explícito. La suite aislada DEV-06 pasó 5/5 con cleanup sin residuos; `diseno/` y los cambios preexistentes permanecen fuera del commit.

## DEV-07 context update

`/devoluciones` fue reemplazado por un flujo vinculado a ventas reales. DEV-07 corrige el riesgo de sobredevolución concurrente con transacciones serializables, exige que `refundAmount` coincida con las líneas seleccionadas y agrega `Return.idempotencyKey`/`requestHash` únicos por negocio para reintentos seguros. Cada devolución registra `ReturnLine`, reintegra stock una vez y crea un movimiento `RETURN`; las ventas provenientes de Apartados usan el mismo contrato. La suite aislada DEV-07 cubre validaciones, concurrencia, Kardex, permisos, aislamiento y responsive.

## DEV-07B context update

La auditoría `CREATE Return` ahora se ejecuta con el cliente transaccional antes de confirmar la devolución. El fallo controlado de auditoría revierte Return, líneas, stock, Kardex e idempotencia; el reintento posterior completa una única operación y una única auditoría. La suite aislada DEV-07B pasa 7/7.

## DEV-08B context update

La validación integral de onboarding pasó contra PostgreSQL E2E dedicado: `CI=1 npm run test:e2e:onboarding -- --reporter=list` terminó `1/1`. El recorrido cubrió registro, sesión automática, usuario sin negocio, creación, giro, sucursal, confirmación, Dashboard, logout y login posterior. La prueba verificó respuesta sin `passwordHash`, hash persistido distinto de la contraseña, cookie `HttpOnly`/`SameSite=Lax`, duplicado de correo `409`, replay idempotente y membresía `ADMIN`.

Docker Compose no estaba disponible; se usó exclusivamente Docker Engine con `lucem-retail-dev-08b-db`, volumen `lucem-retail-dev-08b-pg`, PostgreSQL 16, base `lucem_retail_e2e`, usuario `lucem_e2e` y puerto `55432`. `npm run e2e:prepare` aplicó 0001-0004 y la segunda ejecución no encontró migraciones pendientes; el cleanup terminó `0|0|0` y se retiraron únicamente los recursos E2E. Se generaron 15 capturas sanitizadas para desktop/tablet/mobile en `docs/ui-redesign/dev-08-visual-evidence/`. La suite de aislamiento DEV-TEST-01 pasó 15/15 y el caso adicional de dos usuarios concurrentes pasó 2/2 dentro de DEV-08B; el primer intento concurrente expuso `P2034`, que quedó corregido con reintento serializable acotado.

## DEV-09 context update

La evaluación comercial integral pasa `1/1` contra PostgreSQL E2E: un comerciante nuevo registra cuenta, crea negocio con categoría `General`, crea productos simples y con variantes, registra entrada, vende en efectivo, genera ticket, crea y convierte apartado, registra devolución parcial, consulta Dashboard, cierra sesión y vuelve a entrar. Se verificaron persistencia directa, balances `physical = available + reserved`, idempotencia, concurrencia, roles y aislamiento mediante las suites dirigidas.

Defectos reproducibles corregidos: `e2e:prepare` ahora espera el seed; negocios nuevos reciben categoría `General`; el topbar evita overflow a 768px; la expectativa POS refleja la última variante habilitada. Suites dirigidas: productos `14/14`, inventario `6/6`, POS `6/6`, apartados `7/7`, devoluciones `7/7`. Evidencia en `docs/testing/dev-09-visual-evidence/`; no se publicaron secretos ni storage states.
