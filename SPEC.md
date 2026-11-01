# DEV-02A — Validación autenticada y visual del dashboard existente

## Objetivo
Validar de extremo a extremo el dashboard ya implementado en `/dashboard`, sin reconstruirlo ni ampliar su producto, usando únicamente una sesión segura y autorizada cuando exista.

## Scope

**Incluye**

- Inspeccionar el `HEAD`, el diff relevante y la implementación existente de `/dashboard`, `WorkspaceShell`, autenticación, permisos y `GET /api/dashboard`.
- Validar la integración autenticada del dashboard existente: acceso, aislamiento por negocio, contrato, payload, métricas, alertas, ventas recientes, estados vacío/error/reintento y navegación permitida.
- Ejecutar pruebas Playwright y conservar evidencia para `1440x900`, `768x1024` y `390x844`, incluyendo capturas y mediciones de overflow, accesibilidad y objetivos táctiles.
- Comparar cada viewport con la referencia Stitch aplicable y con los tokens de `diseno/retail_operational_clarity/DESIGN.md` y `diseno/retail_pos_inventory_system/DESIGN.md`.
- Registrar evidencia, comandos, URLs, commit evaluado, limitaciones y cualquier `PASS`, `FAIL` o `BLOCKED` en `docs/ui-redesign/DEV-02-DASHBOARD.md`; consolidar findings en `FINDINGS.md` sólo en el rol que corresponda.
- El Generator posterior sólo podrá corregir diferencias visuales comprobadas por capturas, mediciones o comparación reproducible. No podrá inventar payloads, sesiones, permisos, resultados, capturas ni evidencia.

**Fuera de alcance y prohibiciones**

- No reconstruir el dashboard, reemplazar el shell, crear nuevos módulos, añadir rutas, inventar acciones, cambiar contratos ni implementar funcionalidades de negocio.
- No modificar API, auth, permisos, servicios, Prisma, migraciones, seed, infraestructura, dependencias, README ni credenciales documentadas.
- No usar credenciales del README, `.env` o secretos descubiertos; no crear usuarios, sesiones, cookies persistentes ni fixtures que se presenten como autenticación real.
- No escribir en DB: quedan prohibidos login que persista una sesión si no hay mecanismo seguro autorizado, seed, migraciones, ventas, inventario, auditoría o cualquier mutación.
- No llamar `GET /api/audit` bajo ninguna circunstancia. La advertencia `GET /api/audit exposes passwordHash` debe permanecer documentada y excluye declarar producción lista.
- No capturar ni documentar contraseñas, tokens, cookies, `passwordHash`, datos personales innecesarios o respuestas sensibles.
- Si no existe un mecanismo de sesión seguro y autorizado ya disponible en el entorno, la validación autenticada y visual se marca `BLOCKED` con la evidencia ausente; no se inventa una sesión ni se sustituye por el redirect `/login`.

## User flows

1. **Preflight y HEAD** — Registrar `git rev-parse HEAD`, rama, `git status --short` y `git diff --name-only`. Confirmar que el checkout evaluado contiene la implementación existente y que no hay cambios de este Planner fuera de `SPEC.md`. No alterar el worktree ni detener procesos ajenos.
2. **Disponibilidad de sesión** — Inspeccionar el mecanismo existente de `app/(workspace)/layout.tsx` y la documentación/entorno autorizado, sin leer o imprimir secretos. Si existe una sesión entregada de forma segura, usarla sólo en memoria o un `storageState` autorizado y temporal. Si no existe sesión ni mecanismo aprobado, registrar `BLOCKED` y detener los flujos autenticados.
3. **Entrada al dashboard** — Con la sesión autorizada, abrir `/dashboard`, comprobar que la guardia existente permite el acceso, que el negocio activo es el correcto y que aparece un único `WorkspaceShell`. Sin sesión, comprobar sólo el redirect esperado sin llamarlo evidencia autenticada.
4. **Carga y contrato** — Observar la solicitud `GET /api/dashboard` con cookies same-origin, sin mutación y sin `GET /api/audit`. Comprobar status, URL, parámetros existentes y forma del JSON contra el contrato actual. Mientras la respuesta está pendiente deben verse skeletons accesibles, no ceros inventados ni datos previos atribuidos a la nueva carga.
5. **Éxito con datos** — Con una respuesta real de la sesión autorizada, o con una respuesta interceptada explícitamente rotulada como fixture de contrato, verificar `gross`, `net`, `units`, `cogs`, `profit`, `outOfStock`, `lowStock` y `recent`. Comparar los valores visibles con el JSON recibido, sin recalcular ni completar datos en el cliente.
6. **Alertas y actividad** — Verificar agotados y bajo stock como estados explícitos, y hasta cinco ventas recientes con folio, total, estado y fecha. Los ceros deben comunicar ausencia de alertas; la lista no puede crear enlaces, ventas o acciones no soportadas.
7. **Vacío** — Interceptar sólo una respuesta controlada `200` con métricas cero y `recent: []`, rotulada como fixture, y verificar un estado vacío distinguible de carga y error, sin ventas ficticias y con ausencia de alertas comunicada.
8. **Error y reintento** — Interceptar una primera respuesta HTTP no exitosa, JSON inválido o rechazo de red. Verificar `role="alert"`, mensaje accionable sin datos sensibles y botón `Reintentar`; al reintentar debe emitirse otro `GET /api/dashboard`, limpiarse el error y mostrarse éxito sin recarga completa ni request mutante.
9. **Navegación y permisos** — Desde la sesión autorizada, activar sólo destinos que ya aparecen para ese rol, CTA Nueva venta y navegación móvil; verificar URLs existentes, ausencia de duplicación/overlays residuales y retorno al dashboard. No usar un rol o permiso supuesto: si no existe evidencia autorizada para la matriz, marcar el criterio `BLOCKED` o `FAIL` según corresponda.
10. **Capturas y comparación** — Capturar el dashboard en `1440x900`, `768x1024` y `390x844`, con URL, `HEAD`, estado de sesión y fuente de datos claramente rotulados. Comparar cada captura con `diseno/pantalla_c_shell_de_aplicaci_n_web_escritorio/screen.png` en desktop y con `diseno/pantalla_d_navegaci_n_m_vil_web_responsiva/screen.png` en tablet/móvil. Una fixture no-auth sólo sirve para composición y nunca prueba integración autenticada.
11. **Cierre de evidencia** — Ejecutar los comandos definidos en Stack, revisar que no haya secretos en artefactos, y documentar resultados exactos. Si la sesión falta, documentar `BLOCKED`, el mecanismo buscado y la evidencia ausente; no convertir un redirect, mock o captura fixture en `PASS` autenticado.

## Modelo de datos

- No se agregan ni modifican tablas, campos, tipos, relaciones, sesiones ni migraciones. Esta especificación sólo observa datos existentes.
- La fuente funcional es `GET /api/dashboard`; acepta, si ya están soportados, `from` y `to` en `YYYY-MM-DD`. No se exige añadir selector ni parámetros nuevos.
- El payload esperado es `{ gross: string, net: string, units: number, cogs: string, profit: string, outOfStock: number, lowStock: number, recent: RecentSale[] }`.
- `RecentSale` esperado es `{ id: string, folio: number, total: string, status: 'CONFIRMED' | 'CANCELLED', createdAt: string }`.
- Los importes son decimales serializados y las fechas son serializadas; la validación compara formato y valor mostrado con la respuesta, sin corregir la semántica del backend.
- El aislamiento esperado es el `Business` activo resuelto por la autenticación existente. No se puede inferir aislamiento desde una fixture ni desde datos del README.
- `null`, JSON inválido, campos ausentes, tipos incorrectos, `401`, `403` o `5xx` no son éxito: deben producir el estado de error definido o `BLOCKED` si la comprobación requiere sesión no disponible.

## Stack y decisiones técnicas

- Mantener Next.js 15, React 19, TypeScript, CSS existente, `lucide-react`, Playwright, Vitest y las dependencias ya instaladas. No instalar librerías.
- La validación debe inspeccionar `app/(workspace)/dashboard/page.tsx`, `app/(workspace)/layout.tsx`, `src/components/WorkspaceShell.tsx`, estilos existentes y el route handler existente; no reestructurarlos.
- Usar Playwright para red, estados, navegación, mediciones y capturas. Interceptar únicamente respuestas controladas para estados vacío/error/reintento; no interceptar una respuesta y presentarla como datos reales.
- Usar una sesión sólo mediante un mecanismo seguro/autorizado ya existente y con autorización explícita del entorno. No enviar credenciales, crear sesión ni persistir `storageState` en el repositorio. Si no es posible, marcar `BLOCKED`.
- Para cada captura registrar viewport, URL, `HEAD`, baseline, herramienta/comando, resultado y diferencias observables. Comparar composición, shell, jerarquía, espaciado, superficies, tipografía, navegación y estados, no sólo similitud subjetiva.
- Comprobar `scrollWidth <= clientWidth`, recortes, foco visible, orden de headings, nombres accesibles, `role="status"`, `role="alert"`, teclado, contraste WCAG AA cuando sea medible, `prefers-reduced-motion` y objetivos interactivos de al menos `44x44px`.
- Comandos obligatorios de calidad: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y `CI=1 npm run test:e2e -- --reporter=list`, siempre que la suite no viole esta especificación. Si una suite existente llama `GET /api/audit`, no ejecutarla; registrar el comando omitido y la razón exacta.
- No ejecutar `npm run db:seed`, `npx prisma migrate deploy`, `docker-compose` para crear datos, login real no autorizado, POST/PUT/PATCH/DELETE ni ninguna operación de escritura.

## Assumptions

- El dashboard ya implementado y su shell son el objeto de validación; el Planner no autoriza cambios de producto ni reconstrucción visual.
- La guardia server-side existente es la autoridad para autenticación; un mock de navegación, un `200` interceptado o `/login` no demuestran sesión real.
- Sólo una sesión proporcionada por el entorno mediante un mecanismo seguro y autorizado puede desbloquear criterios autenticados. Si el checkout no expone ese mecanismo o no se entrega la sesión, el estado correcto es `BLOCKED`, con evidencia concreta y sin workaround inventado.
- Las fixtures controladas son válidas únicamente para aislar estados de UI y deben identificarse en el nombre del test, captura y documentación; no prueban negocio, permisos, aislamiento ni métricas reales.
- La referencia Stitch guía la composición visual, pero no es evidencia de auth, contrato ni datos. El baseline no autoriza copiar HTML, crear módulos o sustituir el shell.
- `GET /api/audit exposes passwordHash` sigue siendo un riesgo abierto; ningún resultado visual o de calidad puede declararse producción lista mientras persista.
- No se implementa selector de periodo para DEV-02A. Si la UI existente lo contiene, sólo se valida el contrato que ya exista; no se añade comportamiento para hacerlo pasar.
- Las correcciones posteriores quedan limitadas a diferencias visuales comprobadas. Cada corrección debe conservar el contrato, los permisos, el shell, los estados y las prohibiciones de esta especificación.

## Rubric de evaluación

Todos los criterios son binarios y deben registrar comando, URL, fecha, `HEAD`, viewport y artefacto. `PASS` exige toda la evidencia indicada; `FAIL` significa contradicción o verificación fallida; `BLOCKED` sólo aplica cuando una sesión o autorización imprescindible no está disponible, indicando exactamente qué evidencia falta. Nunca se cuenta `BLOCKED` como `PASS`.

1. **HEAD y alcance** — `git rev-parse HEAD`, `git status --short` y `git diff --name-only` identifican el checkout; la validación no modifica otro archivo y el trabajo evaluado no reconstruye dashboard, shell ni módulos. PASS sólo si el diff observado coincide con el alcance documentado.
2. **Contrato y request** — Playwright o inspección HTTP observa exactamente `GET /api/dashboard`, same-origin, sin request mutante ni `GET /api/audit`; status y payload cumplen el modelo de datos. Una fixture debe estar etiquetada y no cuenta como datos reales.
3. **Auth safety** — Existe evidencia de un mecanismo seguro y autorizado, la sesión se usa sin credenciales README ni secretos persistidos, el dashboard respeta auth/negocio/permisos y no expone tokens, `passwordHash` o datos sensibles. Si falta sesión o autorización, BLOCKED; no se inventa PASS.
4. **Payload y métricas** — Con payload no vacío, E2E o fixture de contrato demuestra que `net`, `units`, `cogs`, `profit`, `outOfStock` y `lowStock` visibles coinciden exactamente con el JSON recibido, con formato monetario/numérico legible y sin cálculos inventados.
5. **Alertas** — La UI distingue agotados y bajo stock, muestra sus conteos del payload y comunica explícitamente ausencia cuando son cero; no oculta ni inventa alertas.
6. **Recent** — La UI muestra como máximo cinco elementos reales de `recent`, con folio, total, estado y fecha correspondientes al JSON; no agrega enlaces, acciones ni ventas ficticias.
7. **Vacío** — Una respuesta controlada `200` con métricas cero y `recent: []` produce estado vacío identificable, no skeleton/error, sin datos ficticios y con ausencia de alertas/actividad comunicada.
8. **Error y retry** — Una respuesta HTTP fallida, JSON inválido o red caída produce `role="alert"` accionable sin información sensible; `Reintentar` repite sólo `GET /api/dashboard`, limpia el error y recupera el éxito sin recarga ni mutación.
9. **Carga estable** — Con el GET pendiente, Playwright encuentra estado accesible de carga, ausencia de ceros falsos y dimensiones estructurales estables; al resolver, skeletons desaparecen y aparecen datos del payload.
10. **Navegación y permisos** — Con autorización suficiente, CTA, navegación existente y menú móvil llevan sólo a rutas existentes permitidas por el rol, sin shell duplicado, overlays o listeners residuales; sin evidencia de sesión/rol el criterio es BLOCKED.
11. **Capturas responsive** — Existen capturas Playwright identificadas de `1440x900`, `768x1024` y `390x844`, con URL, `HEAD` y origen de datos; la sesión real está demostrada o la captura está rotulada fixture y el componente autenticado queda BLOCKED.
12. **Comparación Stitch** — Para los tres viewports existe comparación reproducible contra los baselines C/D y DESIGN.md, registrando herramienta, baseline, salida y discrepancias; PASS sólo si shell, jerarquía, espaciado, superficies, tipografía y navegación son consistentes, sin “se ve bien” como única evidencia.
13. **Overflow y accesibilidad** — En los tres viewports `scrollWidth <= clientWidth`, no hay recortes, los controles miden al menos `44x44px`, headings y nombres accesibles son coherentes, teclado/foco y estados semánticos funcionan, y se verifica contraste WCAG AA y reduced motion cuando la herramienta lo permita.
14. **Calidad y documentación** — `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y el E2E permitido terminan en código 0, o cada excepción queda registrada como BLOCKED con salida exacta; `docs/ui-redesign/DEV-02-DASHBOARD.md` contiene contrato, estados, capturas/comparaciones, comandos, límites y el warning de seguridad. No se ejecutan seed, migraciones, escrituras ni `GET /api/audit`.
