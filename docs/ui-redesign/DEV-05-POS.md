# DEV-05 POS

Implementación de `/pos` y `/tickets/[id]` sobre `WorkspaceShell` con datos reales de `GET /api/products?q&categoryId` y `POST /api/sales`. El catálogo puede mostrar una variante agotada para comunicarla y bloquear su acción; las líneas vendibles usan únicamente `stock` como disponibilidad operacional. No expone físico, reservado, IVA, cupones, clientes, crédito, terminal ni cola offline. Las líneas conservan `variantId` y el precio aplicado es `promoPrice ?? price`, sin exigir que la promoción sea menor.

El checkout soporta CASH, CARD y TRANSFER. CASH valida efectivo insuficiente y muestra cambio local; cada intento conserva una sola clave de idempotencia, no reintenta respuestas inciertas y conserva el carrito en 400/409/red. El ticket queda limitado por negocio activo y muestra folio, fecha, vendedor, SKU, líneas, precios efectivos, total, forma de pago, recibido y cambio.

## Arquitectura y archivos

- `src/components/pos/POSPage.tsx`: estado de catálogo seleccionado, carrito y checkout; navega al ticket sólo después de `201`.
- `POSCatalog`, `POSProductCard` y `POSVariantDialog`: agrupación visual por producto, búsqueda/categoría y selección accesible de variante concreta.
- `POSCart` y `POSCheckout`: líneas por `variantId`, límites de stock, cantidades, total a centavos, métodos de pago y cambio.
- `app/tickets/[id]/page.tsx`: lectura server-side por venta y negocio activo; imprime con `window.print()` y ofrece nueva venta.
- `src/lib/pos-cart.ts`: helpers existentes reutilizados para precio aplicado, cantidades, total y payload de venta.

## Stitch y desviaciones

Se revisaron los seis pares PNG/HTML y ambos `DESIGN.md`, documentados en `DEV-05-DESIGN-MAPPING.md`. Se adoptan la composición catálogo/carrito, selector de variantes, cobro, éxito/ticket y estados responsive. Se omiten deliberadamente IVA, descuentos, cupones, clientes, crédito, pagos divididos, terminal bancaria, CFDI y cola offline porque no existen en los contratos aprobados.

## Evidencia E2E

- Suite: `e2e/dev-05/pos.spec.ts`, configuración `playwright.pos.config.ts`, login real y PostgreSQL aislado.
- Cobertura: catálogo/búsqueda, variante agotada deshabilitada, carrito, efectivo insuficiente, CASH persistido, ticket, CARD, TRANSFER, replay idempotente, clave reutilizada con payload distinto, conflicto concurrente `409`, aislamiento Norte y permisos SELLER.
- Capturas: `test-results/dev-05/` con `fullPage:false`, estados POS desktop/tablet/mobile y ticket persistido. Los artefactos no contienen cookies ni storageState.
- El riesgo de conversión de apartados permanece fuera de DEV-05: el contrato actual no crea un movimiento nuevo al convertir.

## Checks

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 9 archivos y 23 pruebas.
- `npm run build`: PASS, con el warning preexistente del plugin ESLint de Next.
- `git diff --check`: PASS.
