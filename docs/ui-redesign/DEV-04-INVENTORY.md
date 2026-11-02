# DEV-04 - Inventario

## Alcance

DEV-04 reemplaza el `PreparationPlaceholder` de `/inventario` con inventario real, detalle por variante y kardex. No se modificaron `diseno/`, Prisma, migraciones, POS, Apartados ni autenticación.

El stock operacional existente es `available`: reservas activas ya lo decrementan al crearse y lo incrementan al liberarse; ventas, cancelaciones y devoluciones conservan ese contrato. `reserved` se deriva como la suma de `Reservation.quantity` con `status = ACTIVE`; `physical = available + reserved`. No se inventan reservas ni movimientos en la interfaz.

## API

- `GET /api/inventory` conserva sus campos y agrega `physical`, `reserved` y `available` como strings decimales, siempre limitado al negocio activo.
- `GET /api/inventory/movements` acepta `variantId`, `q`, `type`, `from`, `to`, `page` y `pageSize`; responde identidad de producto/variante, usuario, fechas, cantidades serializadas y paginación.
- `POST /api/inventory/movements` continúa reexportando la mutación atómica: ADMIN e INVENTORY_MANAGER pueden registrar PURCHASE y ajustes; el motivo es obligatorio, cantidades positivas y una salida sin saldo responde `409`. La respuesta incluye `movementId` y los tres balances.

## UI y accesibilidad

`InventoryPage`, `InventoryDetail`, `InventoryMovements` e `InventoryMutationDialog` viven en `src/components/inventory/`. Las rutas son `/inventario`, `/inventario/[variantId]` y `/inventario/movimientos`. SELLER consulta en modo solo lectura. Los diálogos tienen retorno de foco, Escape, trampa de Tab, confirmación explícita y controles de al menos 44px; la hoja responsive cubre 390x844, tablet y escritorio.

La vista general muestra estados `Disponible`, `Bajo` y `Agotado`, búsqueda por producto/SKU/ubicación, físico, apartado y disponible. El detalle muestra SKU, presentación, ubicación y las tres cantidades; el Kardex es inmutable desde la UI y admite búsqueda, tipo, variante y paginación. Entradas y ajustes reutilizan `POST /api/inventory/movements`, muestran un preview de balance y vuelven a consultar después del éxito o un conflicto `409`.

No se presenta `stock` como físico: el contrato existente lo trata como disponible operacional porque los apartados lo decrementan. Por eso `physical = available + reserved`, con `reserved` limitado a apartados `ACTIVE`. La conversión de un apartado no fue alterada porque el contrato actual no registra una venta ni un movimiento adicional en esa operación.

## Referencias Stitch

Se inspeccionaron los nueve pares `screen.png`/`code.html` listados en `DEV-04-DESIGN-MAPPING.md`, además de `diseno/retail_operational_clarity/DESIGN.md` y `diseno/retail_pos_inventory_system/DESIGN.md`. La implementación conserva el shell existente y adopta la jerarquía operativa, superficies botánicas, tabla densa y controles táctiles de las referencias. No se modificó ningún archivo de `diseno/`.

## Evidencia

La suite aislada es `e2e/dev-04/inventory.spec.ts` con `playwright.inventory.config.ts`; usa login real mediante `e2e/dev-test-01/setup.ts`, sesión ADMIN/SELLER/INVENTORY_MANAGER y PostgreSQL exclusivo en loopback, sin mocks, cookies fabricadas o fallback de base de datos.

- `npm run e2e:prepare`: PASS; migración existente aplicada y namespace DEV-TEST-01 sembrado.
- `CI=1 npm run test:e2e:inventory -- --reporter=list`: PASS, 6/6.
- Cobertura: lectura y balances, búsqueda, detalle, entrada, ajuste positivo/negativo, motivo requerido, precisión decimal, conflicto por saldo reservado, Kardex paginado, doble activación de submit, `401`, SELLER `403`, INVENTORY_MANAGER autorizado y aislamiento Centro/Norte.
- Capturas reales autenticadas: `test-results/dev-04/*inventory-{general,detail,movements,mutation}-{desktop,tablet,mobile}.png`, generadas a `1440x900`, `768x1024` y `390x844`.
- `npm run e2e:cleanup`: PASS, resultado `0|0`; se retiraron el contenedor y volumen exclusivos DEV-04.

Las capturas se comparan estructuralmente contra las referencias específicas y los tokens de DESIGN.md. No se declara pixel-fidelity: Stitch no representa exactamente el contrato actual de reservas, el detalle por variante ni la paginación del Kardex.

## Checks

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 8 archivos y 19 pruebas.
- `npm run build`: PASS; permanece el warning preexistente del plugin ESLint de Next.
- `git diff --check`: PASS.

## Riesgos y límites

- `physical` es una derivación compatible, no una columna persistida: `available` existente más reservas activas.
- El historial no inventa un saldo histórico posterior por movimiento; muestra hechos persistidos del modelo `InventoryMovement`.
- La conversión de apartados existente no crea un movimiento nuevo; DEV-04 conserva ese contrato y no implementa Apartados ni POS.
