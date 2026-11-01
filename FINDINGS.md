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
