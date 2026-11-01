# Lucem Retail — DEV-00 Preparación de fundación

## Objetivo
Preparar de forma verificable la fundación del rediseño preservando íntegramente el dominio y sustituyendo únicamente la presentación visual existente por un placeholder común, sin construir una UI nueva.

## Scope

Entra:
- Trabajar sobre `feature/lucem-ui-redesign-v1`, basada en `bf8c45f`; conservar la rama de respaldo que ya existe desde ese mismo commit.
- Reemplazar únicamente la presentación visual anterior en `/`, `/login`, `/negocios`, las ocho rutas workspace `/dashboard`, `/pos`, `/productos`, `/inventario`, `/apartados`, `/devoluciones`, `/reportes`, `/auditoria`, y `/tickets/[id]` por el mismo componente compartido, no visual.
- El placeholder renderiza exactamente el heading `Lucem Retail` y el texto `Estamos preparando la nueva interfaz.`. No incorpora navegación, formularios, dashboard ni assets nuevos.
- Mantener el layout protegido existente con `getAuth` y su redirect. La página de ticket conserva sesión y scoping por negocio y responde `notFound` para recursos no visibles/no existentes. Mantener todas las rutas existentes.
- Extraer de `BusinessSelector` y de los formularios login/selección las llamadas API a servicios cliente reusable; mantener las operaciones existentes de iniciar sesión y seleccionar negocio.
- Extraer a lógica reusable la mecánica client-side del carrito POS y conservar sus promociones, cantidades limitadas por stock y total; acompañarla con test significativo. No se cambia ninguna regla de dominio/API.
- Mantener las respuestas y el contrato operativo existentes para login API aunque la UI de login sea placeholder; en DEV-00 no se añade UI de fallback de autenticación.
- Crear `docs/ui-redesign/DEV-00-PREPARATION.md` como informe de clasificación completa de archivos/pantallas y pruebas: UI sustituida, visuales legacy conservados, servicios/lógica reusable, pruebas de dominio preservadas y E2E UI legacy.
- Clasificar como legacy las pantallas visuales antiguas y los E2E de UI preexistentes. Preservar su fuente. Marcar los E2E legacy de productos fuera del run por defecto sin borrarlos. Añadir únicamente E2E smoke para placeholder y 401/auth/ruta protegida.
- Conservar README y sus instrucciones originales.

Fuera:
- Cualquier UI nueva, flujo de navegación, login visual funcional, selector visual, dashboard, formularios, componentes Stitch o assets nuevos.
- Cambios a endpoints o contratos API, reglas de negocio, autorización, permisos, sesiones, aislamiento multiempresa, operaciones, cálculos fuera del traslado reusable explícito del carrito, ni comportamiento persistente.
- Cambios a cualquier `app/api/**`, Prisma/schema, migraciones o seed, Postgres/Docker, env example, package/lock/config/dependencias, fuentes/código de diseño, README, y `src/lib/auth`, `src/lib/db`, `src/lib/audit`, `src/lib/money`.
- Cambios o eliminación de pruebas de dominio existentes. No desinstalar, subir ni bajar dependencias.
- Incluir en Git blobs de `public/uploads` o `.env` locales, ni borrar esos archivos locales.

Inventario de API existente que debe permanecer registrado y operativo: autenticación login/logout; selección de negocio; categorías; productos CRUD/historial/imagen; inventario/movimientos; apartados CRUD/liberar/convertir/vencer; ventas CRUD/cancelar; devoluciones; dashboard; reportes y exportación CSV/XLSX; auditoría. Preservar las rutas exactas actuales y su protección, sin crear ni retirar endpoints.

## User flows

1. Un visitante solicita `/`: la ruta muestra el placeholder compartido con `Lucem Retail` y `Estamos preparando la nueva interfaz.`.
2. Un visitante solicita `/login`: aparece el mismo placeholder. No se ofrece formulario de login en esta fase; los servicios cliente reusable extraídos conservan la llamada login y la API existente sigue aceptándola.
3. Un usuario autenticado que requiere elegir negocio solicita `/negocios`: aparece el mismo placeholder. El servicio reusable de selección conserva la operación de selección de negocio y la API existente sigue validando membresía y actualizando la sesión.
4. Una sesión ausente accede a una ruta protegida del workspace: el `getAuth` del layout conserva su redirect existente. Con sesión válida, cada una de `/dashboard`, `/pos`, `/productos`, `/inventario`, `/apartados`, `/devoluciones`, `/reportes` y `/auditoria` muestra el mismo placeholder.
5. POS conserva en lógica reusable el estado/mecánica actual del carrito: agregar/quitar/actualizar, aplicación promocional existente, tope de cantidad según stock conocido y cálculo del total; el test verifica estos comportamientos. La pantalla visual POS anterior queda legacy y no se reconstruye.
6. El acceso a `/tickets/[id]` conserva autenticación, sesión y restricción al negocio activo. Para ticket permitido muestra el placeholder común; para ticket inexistente o fuera del negocio devuelve `notFound`, sin filtrar datos de otro negocio.
7. Las llamadas de auth y selección de negocio siguen yendo a sus endpoints existentes mediante servicios cliente reusable. Las rutas `app/api/**` preservan status y respuestas existentes; requests sin sesión reciben `401`, y autorización insuficiente recibe `403` donde aplique.
8. E2E smoke verifica el texto exacto y la ruta del placeholder, así como la respuesta no autenticada y protección/redirect de rutas. E2E UI antiguo queda marcado legacy; el E2E de productos se conserva y excluye del run por defecto.

## Modelo de datos

- No se modifica el modelo Prisma/PostgreSQL: tablas, campos, tipos, relaciones, índices, restricciones, migraciones y seed permanecen idénticos al commit base.
- No se introduce persistencia, tablas, columnas ni migraciones para placeholder, servicios cliente o estado reusable del carrito.
- Servicios cliente auth/business mantienen los payloads y respuestas de los endpoints actuales. La lógica reusable POS conserva las representaciones y reglas de promoción, cantidades y total que ya usa la aplicación; no cambia el modelo de venta.

## Stack y decisiones técnicas

- Mantener exactamente versiones, dependencias, scripts y configuración existentes (Next.js/TypeScript/React, Prisma/PostgreSQL y herramientas de pruebas ya instaladas). Sin cambios a `package.json`, lockfiles o configuración.
- Un único componente compartido sin responsabilidades visuales de navegación/formulario constituye el placeholder para todas las rutas indicadas; mantener texto y heading exactos.
- Mantener el layout protegido, `getAuth`, redirects, sesión, scoping del ticket y manejo `notFound` existentes.
- Extraer las llamadas de auth y selección de negocio en servicios cliente reutilizables desde los consumidores actuales, sin eliminar la capacidad operativa de login/selección ni alterar contratos.
- Extraer mecánica POS reusable y conservar test unitario de promoción, límite por stock y total. Mantener intacto `src/lib/money`.
- E2E smoke nuevo limitado a placeholder y 401/auth/protected route. Marcar y excluir del comando por defecto el E2E legacy de productos sin borrar o reescribir su fuente; conservar los demás E2E antiguos etiquetados legacy y todas las pruebas de dominio.
- Informe de clasificación: `docs/ui-redesign/DEV-00-PREPARATION.md`, con clasificación completa, inventario de rutas API anterior, pruebas legacy/smoke, verificación de criterios y baseline observado.
- Sin migraciones en DEV-00. Arranque y base de datos continúan usando los comandos, Docker Compose, `.env.example`, Postgres y seed documentados actualmente.
- Validación secuencial: criterios numerados en orden, ejecutando los checks apropiados; `git diff --check -- SPEC.md`. Registrar lint, typecheck, test, build y E2E-smoke. Documentar baseline E2E legacy previo 10/11 y que el test de sidebar falla únicamente por comparar `-0` con `0`.

## Assumptions

- El fallback visual/autenticación no existe hasta una fase posterior; login API permanece funcional pese a que `/login` sea placeholder.
- Placeholder significa el mismo componente y exactamente heading `Lucem Retail` y texto `Estamos preparando la nueva interfaz.` en las once ubicaciones declaradas (root, login, negocios, ocho rutas workspace y ticket), sin interfaz adicional.
- Las rutas de aplicación y APIs existentes se identifican desde el commit base; no se renombran rutas ni se altera su protección.
- Las llamadas de `BusinessSelector` y formularios de login/selección contienen comportamiento que debe sobrevivir en servicios cliente reutilizables, aunque desaparezca su UI.
- Las promociones, cantidades límite por stock y total POS son mecánica existente que debe portarse junto con prueba; no se redefinen promociones ni operaciones de negocio.
- `TicketActions`, `Screen`, `Skeleton` y `WorkspaceNavigation` son presentación puramente visual. Los cálculos monetarios permanecen en `src/lib/money`.
- Las pruebas E2E UI anteriores, incluidas las de productos, son legacy, pero su fuente queda preservada; E2E products se excluye del run por defecto. Ninguna prueba de dominio se clasifica para eliminación.
- La rama `backup/lucem-ui-legacy-20261101` existe y apunta al mismo commit base que la rama feature.
- Los blobs de `public/uploads` y `.env` locales no se versionan ni se borran.
- El baseline legado conocido es 10/11 E2E; el fallo restante de sidebar se debe solamente a comparación de `-0` con `0`. Se documenta como baseline, sin modificar reglas de negocio para ocultarlo.

## Rubric de evaluación

Cada criterio es binario y se valida secuencialmente. PASS requiere evidencia verificable; ante FAIL se detiene la secuencia, se informa el criterio y no se afirma PASS global.

1. `git branch --show-current` es `feature/lucem-ui-redesign-v1`; `git rev-parse HEAD` parte de `bf8c45f`; `backup/lucem-ui-legacy-20261101` y la rama feature apuntan al mismo commit base.
2. La secuencia es verificable en Git: el commit Planner `86c4ebb`, que registra `SPEC.md`, precede a los commits Generator `f11e70a` (implementación) y `2f8a42b` (smoke), en ese orden; los tres commits pertenecen a `feature/lucem-ui-redesign-v1`. El worktree puede contener commits Generator/Evaluator posteriores. `backup/lucem-ui-legacy-20261101` permanece intacta en `bf8c45f`.
3. La especificación contiene exactamente las siete secciones Planner: `Objetivo`, `Scope`, `User flows`, `Modelo de datos`, `Stack y decisiones técnicas`, `Assumptions`, `Rubric de evaluación`.
4. `git diff --check -- SPEC.md` termina con código 0.
5. El placeholder compartido presenta heading exacto `Lucem Retail` y texto exacto `Estamos preparando la nueva interfaz.` en `/`, `/login`, `/negocios`, las ocho rutas workspace y `/tickets/[id]`; no añade navegación, login, dashboard o formularios.
6. Layout protegido conserva `getAuth` y redirect; ticket conserva sesión, scoping de negocio y `notFound` para id inexistente o ajeno; las rutas existentes siguen registradas.
7. Todas las rutas `app/api/**` siguen registradas/protegidas y el inventario cubre auth login/logout, businesses/select, categories, products CRUD/history/image, inventory/movements, reservations CRUD/release/convert/expire, sales CRUD/cancel, returns, dashboard/reports/export CSV/XLSX y audit. Requests no autenticados devuelven `401` y los casos de autorización insuficiente `403` donde proceda.
8. Diff de implementación no modifica `app/api/**`, `prisma/schema.prisma`, migraciones, package/lock/config; tampoco cambia esquema/datos, Docker/env example, dependencias, fuente/código de diseño ni `src/lib/auth|db|audit|money`.
9. Reglas de negocio y documentación originales permanecen intactas; README existente sigue presente. No se eliminan pruebas de dominio.
10. Servicios cliente reutilizables de auth y selección de negocio conservan requests y operaciones existentes; iniciar sesión y seleccionar negocio siguen soportados por sus APIs.
11. La lógica reutilizable POS conserva promoción, límite por stock y total, con test que verifica esos tres resultados y sin alterar API/reglas de dominio.
12. `TicketActions`, `Screen`, `Skeleton` y `WorkspaceNavigation` se clasifican como visuales; pantallas antiguas y E2E UI se etiquetan legacy, sus fuentes se conservan y E2E products queda fuera del run por defecto.
13. `.env` local no está stageado y no se elimina ningún blob local de `public/uploads`.
14. `docs/ui-redesign/DEV-00-PREPARATION.md` enumera la clasificación completa de pantallas, componentes, servicios, lógica/test y pruebas legacy/smoke, además del inventario API.
15. Solo se agregan E2E smoke para placeholder y 401/auth/ruta protegida; smoke comprueba las rutas y el texto exactos sin depender de las pantallas legacy.
16. `npm run lint` termina con código 0.
17. El comando de typecheck definido por el proyecto (actualmente `npm run typecheck`) termina con código 0.
18. `npm run test` termina con código 0, incluyendo la prueba reusable POS.
19. `npm run build` termina con código 0.
20. El comando E2E-smoke del proyecto termina con código 0; informe registra el baseline E2E legacy anterior 10/11 y explica que el único fallo del test de sidebar compara `-0` con `0`.
21. La aplicación arranca con comandos/provisión existentes y las rutas de UI declaradas responden conforme a sesión, placeholder y notFound.
22. La enumeración/verificación de rutas API confirma que las rutas del inventario siguen accesibles y protegidas con status `401`/`403` apropiados; no se alteran contratos ni endpoints.
23. No hay migraciones nuevas y Prisma/PostgreSQL/Docker/seed permanecen como en el commit base.
