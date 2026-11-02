# DEV-06 - Apartados

## Alcance

`/apartados` reemplaza el placeholder por consulta, búsqueda, filtros, creación, liberación y cumplimiento de apartados. La pantalla reutiliza el shell, navegación, tokens y patrones responsive de Inventario y POS. No se modificó `diseno/`.

La UI muestra producto/variante, SKU, cantidad, cliente opcional, vencimiento, estado y responsable. ADMIN e INVENTORY_MANAGER pueden mutar; SELLER sólo consulta. No se exponen anticipos, deuda, pagos parciales ni clientes obligatorios.

## Contratos observados

- `GET /api/reservations` incluye variante, producto y responsable, y filtra por `businessId` activo.
- `POST /api/reservations` exige variante activa, cantidad positiva y `expiresAt` futuro; usa actualización condicional de stock y movimiento `RESERVATION`.
- `POST /api/reservations/:id/release` y `/expire` son idempotentes para estados terminales y restauran stock sólo al salir de `ACTIVE`.
- `POST /api/reservations/:id/convert` ahora exige método de pago, crea venta/línea y retorna `saleId`.

## Cumplimiento

La conversión transaccional hace `ACTIVE -> CONVERTED`, crea la venta, registra `RELEASE +quantity`, incrementa temporalmente la disponibilidad reservada y registra `SALE -quantity`. El resultado neto conserva `available`, reduce `reserved` y reduce `physical`; no se aplica una venta ordinaria adicional desde POS.

Se añadió `Reservation.saleId` opcional y único mediante la migración `0002_reservation_sale`, permitiendo repetir la operación y devolver la misma venta sin duplicar efectos.

## Evidencia

- `CI=1 npm run test:e2e:reservations -- --reporter=list`: PASS, 7/7.
- Cobertura: creación/liberación, cantidades persistidas, sobre-reserva, concurrencia, cumplimiento, replay, Kardex, UI responsive, SELLER `403`, `401` y aislamiento Centro/Norte.
- Capturas autenticadas: `test-results/dev-06/*reservations-{desktop,tablet,mobile}.png`, `fullPage:false`, 1440x900, 768x1024 y 390x844.
- Cleanup del namespace E2E: `0` reservas DEV-06 y `0` ventas con folio de fixture.

## Checks

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 23 pruebas.
- `npm run build`: PASS; permanece el warning preexistente del plugin ESLint de Next.
- `git diff --check`: PASS.

## Riesgos

- Conversiones históricas creadas antes de DEV-06 con estado `CONVERTED` pero sin `saleId` no se reparan automáticamente; el endpoint devuelve conflicto explícito para evitar inventar ventas.
- La captura de venta conserva el precio/costo vigente al completar, conforme al modelo actual, no un snapshot de precio al crear el apartado.
