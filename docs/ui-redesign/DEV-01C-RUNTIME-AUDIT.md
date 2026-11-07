# DEV-01C — Runtime audit

**Resultado:** la causa establecida es un mismatch de versión fuente entre la UI legacy referida por la observación histórica y el código actual de `feature/lucem-ui-redesign-v1`. No hay evidencia suficiente para atribuir aquella observación a un proceso, navegador o caché concreto. La interfaz actual responde de forma coherente con el snapshot de código DEV-01B; no se encontró prueba que permita llamar obsoletos a los artefactos históricos de `.next`.

## Identidad y alcance de la evidencia

Captura/control ejecutados el **2026-11-01 11:13 CST**, en `feature/lucem-ui-redesign-v1`, HEAD **`19626b1acc8ac4ee5d8e86316419394bcdee9e71`** (`docs(spec): clarify DEV-01C source baseline`). En ese momento `origin/feature/lucem-ui-redesign-v1` permanecía en `6caccce9a2757e41d8f3ae411e1897c9760480bf`; el HEAD de captura era descendiente y estaba dos commits locales por delante, ambos documentation-only. El source base de comparación es `6caccce9a2757e41d8f3ae411e1897c9760480bf`. Los commits posteriores de documentación no cambian esta identidad histórica de captura. `main` y `backup/lucem-ui-legacy-20261101` apuntan ambos a `bf8c45f9f17de012ae7613e31805f31791afc5d4`.

Comandos de identidad: `git branch --show-current`, `git rev-parse HEAD`, `git show-ref --verify refs/heads/main`, `git show-ref --verify refs/heads/backup/lucem-ui-legacy-20261101`, `git rev-parse origin/feature/lucem-ui-redesign-v1`, `git rev-list --left-right --count 6caccce...bf8c45f`, `git diff --stat 6caccce..bf8c45f -- app src prisma package.json package-lock.json`. La cuenta fue `18 0`: hay 18 commits en `6caccce` que no están en `bf8c45f`, ninguno en la dirección inversa. El source diff lista 35 archivos, con 916 inserciones y 242 eliminaciones; incluye sustitución de páginas workspace legacy por placeholders. El worktree antes de crear este informe y sus PNG sólo contenía los cambios del informe/evidencia de esta tarea.

## Procesos y puertos

Se revalidaron los puertos con `lsof -nP -iTCP:<puerto> -sTCP:LISTEN`. Antes del arranque controlado, **3000, 3001, 3100, 3101 y 3102 estaban libres**. El proceso anterior de `:3000` fue detenido por el orquestador debido al conflicto documentado sobre `.next`, después de registrar su identidad y antes del build controlado; se envió `SIGTERM` únicamente a ese proceso confirmado del proyecto. La información verificada antes de esa parada fue: PID 36669 `next-server v15.5.28` → PID 36651 (`node_modules/.bin/next dev`) → PID 36650 (`yarn dev`), cwd `/Users/jasanhernandez/Develop/lucem-retail`, inicio 2026-11-01 10:39:55 local, posterior al HEAD fuente de entonces. Ese listener pertenecía al proyecto; su salida servía el código actual, no se acreditó como causa de la diferencia histórica.

Para evidencia aislada se comprobó `:3101` libre y se ejecutó `npm run start -- --hostname 127.0.0.1 --port 3101` sobre el build de este checkout. Next 15.5.28 escuchó en `127.0.0.1:3101` (PID de prueba 39653, wrapper npm 39632). Tras capturas y verificaciones se detuvieron únicamente esos procesos propios; la comprobación final de `lsof` no mostró listener en `:3101`. No quedó ningún proceso de esta prueba.

## Respuestas y fuente actual

GETs públicos, sin cookies y sin seguir redirects:

| URL en servidor controlado | Resultado |
| --- | --- |
| `http://127.0.0.1:3101/login` | `200`; AuthCard centrada y marca Brand con capas actuales. |
| `http://127.0.0.1:3101/negocios` | `200`; selector actual; el estado de carga inicial muestra “Cargando negocios…”. |
| `http://127.0.0.1:3101/pos` | `307`, `Location: /login` sin autenticación. No se siguió el redirect. |

El CSS global actual importa `app/styles/tokens.css`, `auth.css`, `workspace.css` y `mobile.css`. `next.config.ts` sólo define `reactStrictMode: true`; no configura `basePath` ni proxy. `package.json` define `dev` como `next dev` y `start` como `next start`.

Fuente actual: `app/(workspace)/pos/page.tsx`, `productos/page.tsx`, `inventario/page.tsx` y `dashboard/page.tsx` importan `PreparationPlaceholder`. La ruta real `/pos` queda además detrás del layout protegido; su HTML de navegador no autenticado es el redirect, no el placeholder. `app/tickets/[id]/page.tsx` ejecuta `getAuth`, restringe la búsqueda de venta por `id` y `businessId` del negocio activo, llama `notFound()` si no existe y después retorna `PreparationPlaceholder`. No se probó ticket con sesión.

La diferencia histórica sí es trazable en `bf8c45f`: la página POS anterior contenía catálogo, selección de SKU/talla/color, precios promocionales, carrito y checkout CASH/CARD/TRANSFER; creaba UUID de idempotencia para POST `/api/sales` y redirigía al ticket. El ticket legacy llamaba `window.print()` para impresión/guardar como PDF desde el navegador; no generaba PDF en servidor. Esa UI no forma parte del código actual servido. `src/lib/pos-cart.ts` y sus pruebas conservan lógica reusable; `app/api/sales/route.ts` implementa transacción, decremento de stock e idempotencia, con modelos Prisma pertinentes `Sale`, `SaleLine`, `SaleIdempotency` e `InventoryMovement`. No hay UI de checkout activa.

## `.next` y límites causales

No se borró `.next`. Antes del build controlado, sus manifests/artefactos tenían timestamps de 2026-11-01 11:13 CST, y había contenido bajo `.next/cache` con timestamp 2026-10-30 23:55. El build controlado posterior enumeró `/login`, `/negocios` y las rutas workspace del código actual (además de la ruta fixture temporal, retirada después). Estos datos identifican los artefactos observados durante esta ejecución, pero **no demuestran qué binarios o cache sirvieron una visita anterior** ni que el contenido del 30 de octubre causara la discrepancia. No hay HAR ni metadata de la sesión original: no es posible atribuirla a un navegador, proceso, puerto o cache concreto.

## Capturas

Origen de captura: `http://127.0.0.1:3101`; momento: 2026-11-01 11:13 CST. Viewports indicados en nombres. Selector: Playwright interceptó sólo `GET /api/businesses` y devolvió negocios ficticios `Fixture Market .test` y `Example Shop .test`; por tanto, estas imágenes son evidencia visual fixture, no membresías/sesión integrada. Shell/POS: ruta temporal que compuso el `WorkspaceShell` y `PreparationPlaceholder` reales; banner visible `NO-AUTH VISUAL FIXTURE · FAKE .TEST DATA`, con identidad `.test` inventada. Se retiró la ruta después de capturar.

| Vista | Desktop 1440×900 | Móvil 390×844 |
| --- | --- | --- |
| Login | [login desktop](dev-01c-runtime-evidence/login-desktop-1440x900.png) | [login móvil](dev-01c-runtime-evidence/login-mobile-390x844.png) |
| Selector (API fixture) | [negocios desktop](dev-01c-runtime-evidence/businesses-desktop-1440x900.png) | [negocios móvil](dev-01c-runtime-evidence/businesses-mobile-390x844.png) |
| Shell + POS placeholder (fixture no-auth) | [shell desktop](dev-01c-runtime-evidence/shell-pos-desktop-1440x900.png) | [shell móvil](dev-01c-runtime-evidence/shell-pos-mobile-390x844.png) |

La ruta `/pos` real, sin sesión, se verificó por separado como redirect 307; la captura fixture no representa autenticación ni permite validar servicios integrados. La comprobación de shell/selector con sesión real queda **BLOCKED**, pendiente de una sesión de prueba autorizada.

## Controles

Ejecutados secuencialmente sobre este checkout, sin login ni operaciones de negocio:

- `npm run lint` — PASS, código 0.
- `npm run typecheck` — PASS, código 0.
- `npm run test` — PASS, 4 suites / 6 tests.
- `npm run build` — PASS, Next.js 15.5.28; warning preexistente: plugin de Next.js no detectado en configuración ESLint. El build valida el checkout, no explica la observación histórica.
- `CI=1 npm run test:e2e -- --reporter=list` — 10 passed, 11 legacy skipped. Las pruebas activas de UI usaron sus mocks existentes y no introdujeron sesión autenticada. **Alcance observado:** el smoke `protected API handlers reject requests without cookies` ejecutó el inventario GET/POST sin cookies, incluyendo `GET /api/audit` y métodos mutantes protegidos; todos los resultados comprobados fueron 401. Esto fue una llamada API no autenticada de la suite existente y se consigna como desviación del límite más estricto solicitado; no se consultaron registros autenticados ni se usaron credenciales. No se observaron escrituras. El endpoint `/api/audit` no se llamó por separado fuera de esa prueba.
- E2E de sesión integrada — BLOCKED/no ejecutado; requiere autorización/sesión no disponible.

Se conserva el hallazgo de seguridad: **`GET /api/audit exposes passwordHash`**. No llamar ese endpoint. El sistema no debe declararse listo para producción mientras persista la exposición.

## Rubric DEV-01C

1. **PASS** — Identidad de branch/HEAD/origin, snapshot `6caccce`, refs `main`/backup en `bf8c45f`, conteo y source diff registrados arriba.
2. **PASS** — Baseline de PID/ancestros/cwd/inicio aportado y ausencia actual en los cinco puertos registrada; el orquestador envió `SIGTERM` sólo al listener confirmado del proyecto después de registrar la evidencia.
3. **PASS** — GETs en `:3101` confirman 200/200/307, destino y marcadores de fuente/CSS documentados.
4. **PASS** — Páginas workspace y ticket asociadas a implementación por inspección estática, separada del redirect HTTP.
5. **PASS** — Metadata observada se documenta como evidencia limitada; no se borra cache ni se atribuye causalidad sin prueba.
6. **PASS** — POS/ticket legacy de `bf8c45f` y lógica reusable actual contrastados; print es navegador, no PDF server-side.
7. **PASS** — Diagnóstico acotado a mismatch de versión fuente; proceso/browser/cache de la visita original indeterminables.
8. **PASS** — El proceso preexistente de `:3000` fue detenido por orquestación debido al conflicto `.next` después de registrar PID, ancestros, cwd, inicio y motivo; ningún proceso ajeno fue señalado o detenido.
9. **PASS** — `:3101` libre antes de uso; branch/HEAD/puerto anotados; servidor de prueba salió y no quedó listener.
10. **PASS parcial / integración BLOCKED** — Capturas desktop/móvil enlazadas; selector/shell están explícitamente fixture no-auth. Sin sesión válida no se afirma integración autenticada.
11. **PASS** — No se modificó código del proyecto, datos, auth, API, Prisma, dependencias ni diseño; `git diff -- diseno/` vacío. Únicos entregables: este informe y PNGs indicados.
12. **PASS con nota de alcance** — Warning de seguridad textual preservado; la suite E2E hizo un GET sin cookies a `/api/audit`, que respondió dentro de la prueba de handlers protegidos; no se inspeccionaron datos de auditoría autenticados. No producción lista.
13. **PASS** — lint, typecheck, tests y build terminan en 0, con conteos y warning registrados.
14. **PASS** — Este informe reúne método, evidencia, límites, checklist y recomendación accionable.

## Diagnóstico y siguiente paso

**Causa establecida:** discrepancia entre la UI legacy de `bf8c45f` asociada a la observación y la fuente actual en `6caccce`/HEAD, cuyas páginas de POS/productos/inventario/dashboard usan el placeholder DEV-01B. No está establecida una causa de proceso o cache para la captura histórica, y los artefactos `.next` observados no justifican esa atribución. La UI legacy no está restaurada.

Se recomienda **DEV-02** como reimplementación visual informada por Stitch sobre la base actual, reutilizando `src/lib/pos-cart.ts`, contratos/servicios existentes y reglas de venta/inventario verificadas. No reintroducir una afirmación de que la UI legacy está ejecutándose en el HEAD actual. La prueba de integración con sesión de prueba autorizada sigue pendiente (**BLOCKED**).
