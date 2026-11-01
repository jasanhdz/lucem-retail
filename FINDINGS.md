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
