# DEV-00 — Preparación

## Clasificación

| Clasificación | Archivos y elementos | Resultado |
|---|---|---|
| PRESERVAR | `app/api/**`, Prisma schema/migrations/seed, `src/lib/auth.ts`, `db.ts`, `audit.ts`, `money.ts`, README, reglas y decisiones | Contratos de dominio y operación intactos |
| PRESERVAR | Todas las ocho rutas workspace y `/tickets/[id]` | Las rutas siguen registradas; workspace autentica y ticket limita consulta por id y negocio activo |
| REFACTORIZAR | `src/components/PreparationPlaceholder.tsx`, `src/lib/pos-cart.ts`, `src/services/auth.ts`, `src/services/businesses.ts` | Placeholder neutral común; mecánica carrito y requests cliente extraídos |
| REFACTORIZAR | `tests/pos-cart.test.ts`, `tests/client-services.test.ts`, `e2e/dev-00-placeholder.spec.ts` | Casos de carrito, contratos fetch y smoke no mutante |
| ELIMINAR | `Screen`, `Skeleton`, `WorkspaceNavigation`, `TicketActions`, `BusinessSelector` | Componentes visuales obsoletos. Servicios equivalentes quedan bajo `src/services` |
| REVISAR | `e2e/products.spec.ts` | Fuente completa preservada dentro de `test.describe.skip` por LEGACY UI |

## Endpoints existentes

Inventario observado bajo `app/api`: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/businesses`, `POST /api/businesses/select`, `GET /api/categories`; `GET,POST /api/products`; `GET,PUT,DELETE /api/products/[id]`; `GET /api/products/[id]/history`; `POST /api/products/image`; `GET /api/products/image/[filename]`; `GET,POST /api/inventory`; `POST /api/inventory/movements`; `GET,POST /api/reservations`; `POST /api/reservations/[id]`, `POST /api/reservations/[id]/release`, `POST /api/reservations/[id]/convert`, `POST /api/reservations/expire`; `GET,POST /api/sales`; `GET /api/sales/[id]`; `POST /api/sales/[id]/cancel`; `GET,POST /api/returns`; `GET /api/dashboard`; `GET /api/reports/sales`; `GET /api/reports/export.csv`; `GET /api/reports/export.xlsx`; `GET /api/audit`.

## Rutas y reutilización

El placeholder exacto se reexporta desde las doce rutas `/`, `/login`, `/negocios`, `/dashboard`, `/pos`, `/productos`, `/inventario`, `/apartados`, `/devoluciones`, `/reportes`, `/auditoria` y `/tickets/[id]`. Layout workspace conserva exclusivamente `getAuth`, redirect y children. La página de ticket consulta la venta por id y negocio activo y ejecuta `notFound()` cuando no es visible. Los servicios mantienen login y selección/consulta de negocios contra los endpoints actuales.

Los componentes visuales extraídos y la UI histórica quedan legacy. `public/uploads` y `diseno/` son datos/artefactos existentes. El conjunto unitario del proyecto permanece y se agregan pruebas significativas para precio promocional, tope de stock, eliminación en cero, total/unidades y contratos fetch (método, path, payload y status).

## E2E y baseline

`e2e/products.spec.ts` se conserva íntegro funcionalmente, encapsulado en `test.describe.skip` con motivo `LEGACY UI`: sus aserciones requieren presentación y ejecutan mutaciones, incompatibles con el placeholder. `e2e/dev-00-placeholder.spec.ts` cubre las doce rutas del placeholder, redirects sin sesión de las ocho rutas workspace y ticket, scoping/notFound del ticket mediante inspección estática, y treinta combinaciones de método/endpoint protegido con 401 sin cookie. No inicia sesión ni efectúa escrituras. Baseline previo conocido: 10/11; única falla reportada compara `-0` con `0` en sidebar.

## Validaciones

Validación secuencial concluida: `npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS (3 suites, 5 tests); `npm run build` PASS; `npm run test:e2e` PASS (4 smoke, 11 legacy omitidos). El primer ensayo del smoke identificó métodos no implementados (`405`); la tabla final solo prueba métodos existentes. Los requests de API carecen de cookie y se rechazan en `getAuth` antes de leer o mutar datos. No se realizó login, seed, migración ni escritura a la base de datos durante DEV-00.
