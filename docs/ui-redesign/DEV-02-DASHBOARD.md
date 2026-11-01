# DEV-02 Dashboard operativo

## Entrega

- Ruta implementada: `app/(workspace)/dashboard/page.tsx`.
- Estilos: `app/styles/workspace.css`, aislados con el prefijo `dashboard-`.
- No se modificaron `SPEC.md`, `FINDINGS.md`, el shell, APIs, auth, Prisma, dependencias ni infraestructura.
- Commit: `feat(ui): implement Stitch operational dashboard`.

## Referencias exactas

- `diseno/pantalla_c_shell_de_aplicaci_n_web_escritorio/screen.png` y `code.html`: composición desktop, sidebar/topbar, superficies y jerarquía.
- `diseno/pantalla_d_navegaci_n_m_vil_web_responsiva/screen.png` y `code.html`: composición móvil y navegación inferior. El dashboard no monta una navegación adicional.
- `diseno/retail_operational_clarity/DESIGN.md`: Plus Jakarta Sans, canvas neutral, superficies blancas, verde profundo y alertas semánticas.
- `diseno/retail_pos_inventory_system/DESIGN.md`: contraste operativo, tarjetas, badges, tipografía numérica y objetivos táctiles mínimos de 44px.

La página ocupa únicamente `.workspace-content`; `WorkspaceShell` continúa siendo el único shell y `MobileBottomNavigation` la única navegación inferior.

## Datos integrados

Se consume exclusivamente `GET /api/dashboard` con `credentials: 'same-origin'`. La respuesta se valida defensivamente y se muestran `net`, `units`, `cogs`, `profit`, `outOfStock`, `lowStock` y hasta cinco elementos de `recent`. Los importes se formatean como MXN con `Intl.NumberFormat('es-MX')` y las fechas con `Intl.DateTimeFormat('es-MX')`; no se recalculan métricas ni se usan datos de muestra.

No se implementó selector de periodo: se conserva el periodo por defecto del endpoint y la UI lo comunica como “Hoy”. No se consulta `/api/reservations`, porque no es necesario para este corte. No se llama `GET /api/audit`.

## Componentes y estados

- Contexto de resumen, CTA `Venta y cobro directo`, accesos a POS/Catálogo/Inventario.
- Métricas de ventas netas, unidades, costo de ventas y utilidad estimada.
- Alertas explícitas de agotados y stock bajo, incluyendo estado sin alertas.
- Actividad reciente con folio, importe, estado y fecha.
- Carga con skeletons estables y `role="status"`.
- Vacío inequívoco con `role="status"`, sin ventas inventadas.
- Error HTTP, JSON inválido o red con `role="alert"` y `Reintentar`.
- Foco visible, iconos decorativos con `aria-hidden`, enlaces semánticos, controles táctiles y `prefers-reduced-motion`.

## Verificación

Ejecutado en `/Users/jasanhernandez/Develop/lucem-retail` el 1 de noviembre de 2026:

- `npm run lint` — PASS, código 0.
- `npm run typecheck` — PASS, código 0.
- `npm run test` — PASS, 4 suites y 6 tests.
- `npm run build` — PASS, código 0; permanece el warning preexistente “The Next.js plugin was not detected in your ESLint configuration”.
- `git diff --check` — PASS, código 0.
- `npm run start -- -p 3102` + `curl -I http://127.0.0.1:3102/dashboard` — PASS, `307 Location: /login`; el proceso fue detenido y `lsof -nP -iTCP:3102 -sTCP:LISTEN` quedó sin listener.

## Viewports y capturas

La CSS implementa breakpoints para 1440px, tablet menor de 1024px y móvil menor de 760px, con padding inferior para la navegación existente y safe-area. No se generaron capturas autenticadas: el entorno no proporcionó una sesión autorizada y no se usaron las credenciales del README.

La comparación visual reproducible queda BLOCKED por ausencia de sesión autorizada. Baselines previstos: `pantalla_c_shell_de_aplicaci_n_web_escritorio/screen.png` para 1440x900 y `pantalla_d_navegaci_n_m_vil_web_responsiva/screen.png` para 768x1024/390x844. Las referencias se usaron como guía de composición, no como evidencia de sesión real.

El E2E global no se ejecutó: `e2e/dev-00-placeholder.spec.ts` incluye una llamada a `GET /api/audit`, explícitamente prohibida por DEV-02. No se ejecutaron login, seed, migraciones, mutaciones ni llamadas a auditoría.

## Riesgos y límites

- La integración autenticada, las métricas reales y las capturas a 1440x900, 768x1024 y 390x844 requieren una sesión autorizada del entorno; sólo el redirect no autenticado puede verificarse sin crear sesión.
- No se afirma producción lista mientras persista el warning de seguridad: `GET /api/audit exposes passwordHash`.
- La semántica de COGS, devoluciones y periodo permanece bajo el contrato existente del backend; el cliente no la corrige.
