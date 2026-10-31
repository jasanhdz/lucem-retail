# Lucem Retail

## Objetivo
Construir una primera version web usable para que American Outfit administre productos, inventario, ventas POS, apartados, devoluciones, reportes y auditoria por negocio con stock consistente.

## Scope

Entra:
- Login demo con credenciales sembradas, cierre de sesion manual y expiracion por 30 minutos de inactividad.
- Seleccion de negocio cuando el usuario pertenece a mas de uno, negocio activo aislado en servidor y roles administrador, vendedor y encargado de inventario.
- Dashboard responsive con ventas del dia, unidades, costo de mercancia vendida, utilidad bruta, agotados, alertas y ventas recientes.
- Catalogo y alta/edicion de productos, categorias, variantes, SKU unico por negocio, codigo de barras opcional, talla, color, foto local opcional, ubicacion, costo, precio normal/promocional y limite de stock bajo.
- Rediseño de la interfaz de catálogo de productos: grilla de tarjetas con imagen y estado de inventario claramente visible, filtros por búsqueda/categoría/estado, alta y edición mediante modal accesible, y detalle de producto en modal o drawer adaptable. La presentación es una decisión de interfaz; no constituye ni modifica reglas de dominio o inventario.
- En el modal de alta/edición, «Agregar variante» permanece visible junto al encabezado/sección de variantes y no queda oculta detrás del footer.
- Todos los diálogos y prompts/confirmaciones de UI, incluidos alta/edición y detalle de producto, confirmaciones de apartados/devoluciones/cancelaciones y captura de cantidades, se presentan centrados horizontal y verticalmente en desktop/tablet (nunca anclados a una esquina). El formulario de alta/edición en escritorio organiza campos compactamente y a 1440x900 muestra simultáneamente la variante base, imagen y acciones sin scroll interno innecesario. En móvil el diálogo puede ocupar el viewport completo, con una sola área de contenido desplazable y acciones siempre accesibles, sin scroll del documento subyacente ni scrolls anidados.
- En móvil, encabezado/navegación lateral pertenece al flujo normal del documento: se desplaza con la página y no queda sticky, fijo, superpuesto ni permite que el contenido se deslice por debajo; el contenido queda visualmente contenido en su propia área. El detalle de producto también se centra en escritorio, no se alinea a la izquierda ni arriba.
- En escritorio, el sidebar del workspace ocupa la altura del viewport y mantiene usable la navegación al desplazar el contenido; si el menú excede la altura disponible, solo el nav desplaza. En móvil, todas las opciones se presentan en grilla compacta visible, sin scroll horizontal ni sticky/fijo.
- Inventario con existencia entera o decimal de hasta dos posiciones, entradas, ajustes con motivo, kardex inmutable, apartados, liberaciones, vencimientos y devoluciones.
- POS con busqueda por nombre/SKU, filtro por categoria, simulacion documentada de lector de codigo, carrito Zustand, cantidades limitadas al stock y metodos efectivo, tarjeta y transferencia.
- En móvil, una barra fija inferior del carrito aparece cuando hay artículos y muestra cantidad y total; abre/cierra un bottom-sheet de líneas, steppers, método de pago, efectivo/cambio y «Cobrar» siempre accesible. Solo desplaza el contenido del panel, sin overlay de página. En desktop, carrito contiguo al catálogo en layout split y sticky dentro del área usable. Ambas presentaciones comparten una única fuente de estado de carrito.
- Cobro atomico con folio consecutivo por negocio, captura de efectivo recibido, cambio, ticket imprimible/descargable, idempotencia, cancelacion con motivo y restitucion de stock.
- Apartados con cliente opcional, vencimiento, anticipo opcional, notas, estados activo/liberado/convertido/vencido.
- Devolucion ligada a venta, validacion de cantidades pendientes, motivo, reembolso y reintegro atomico de existencia.
- Reportes por dia, semana, mes y rango, filtros por usuario/categoria/producto/metodo, ventas brutas/netas, unidades, COGS, utilidad y exportaciones CSV y Excel.
- Auditoria inmutable de login/logout y acciones relevantes, filtrada por negocio.
- PostgreSQL en Docker Compose, Prisma con migraciones, seed de American Outfit y producto de prueba AO-0001.
- README, `.env.example`, pruebas unitarias e integracion basicas y validaciones de lint, typecheck, build y migracion.

Fuera:
- Facturacion fiscal, impuestos, descuentos, contabilidad completa, integraciones bancarias reales, terminales de tarjeta, impresion fisica garantizada, clientes obligatorios, multiples ubicaciones fisicas, offline con confirmacion, app nativa, recuperacion de contrasena, backups desde UI y almacenamiento externo.
- Camara real: el boton de escaneo puede resolver un SKU demo AO-0001 y debe mostrar claramente que es una simulacion de primera version.
- Pagos tarjeta/transferencia: se registran como pagos confirmados simulados, sin proveedor externo; la UI y README deben declararlo.
- Fotos: almacenamiento local validado y ruta relativa; sin subir archivos binarios al repositorio.
- El rediseño se limita a presentación e interacción del catálogo existente; conserva captura, validaciones, permisos y operaciones de productos, variantes, inventario e historial.

## User flows

### Autenticacion y negocio
1. `GET /login` muestra correo, contrasena y credenciales demo visibles de forma controlada.
2. `POST /api/auth/login` recibe `{email,password}`, valida credenciales con hash, crea sesion httpOnly y registra `LOGIN`; responde usuario, negocios accesibles y redireccion sugerida.
3. Si hay varios negocios, `/negocios` lista negocios y `POST /api/businesses/select` recibe `{businessId}`; el servidor verifica membresia, actualiza sesion y redirige `/dashboard`.
4. Si hay un negocio, se activa automaticamente; el selector de cabecera permite cambiarlo y recarga el contexto.
5. `POST /api/auth/logout` cierra sesion y registra `LOGOUT`. Cualquier endpoint protegido devuelve `401` sin sesion, `403` por rol o `404` sin revelar recursos de otro negocio.

### Dashboard
1. `/dashboard` llama `GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD`.
2. La respuesta entrega ventas netas/brutas, unidades, COGS usando costo historico, utilidad, agotados, alertas y ultimas ventas.
3. Las tarjetas y estados de carga, vacio y error se adaptan a celular, tableta y escritorio.

### Productos y variantes
1. `/productos` llama `GET /api/products?q=&categoryId=&status=` y permite filtrar por texto/categoria/estado. Presenta resultados en una grilla de tarjetas con imagen (o placeholder), nombre, SKU/variantes, categoría, ubicación, precio, costo y existencias con estado Disponible, Por agotarse o Agotado. En escritorio de 1440px aprovecha varias columnas y densidad adecuada; el layout es mobile-first y evita overflow horizontal accidental.
2. La búsqueda por nombre, SKU/código y ubicación, las categorías y el filtro de estado se pueden combinar y actualizar la grilla; se muestran resultados, cantidad y estados vacíos/cargando/error. Los controles táctiles tienen al menos 44px y los filtros no fuerzan overflow de la página en móvil.
3. Las acciones de alta y edición abren un modal accesible. En escritorio es modal centrado; en móvil se adapta al viewport (drawer/panel de pantalla completa con contenido desplazable y acciones alcanzables). Se puede cerrar con Escape y botón visible de cierre/cancelación; cerrar y volver a abrir sin guardar conserva los valores capturados durante la sesión del formulario.
4. El formulario de alta/edición conserva toda la captura existente: nombre, categoría, ubicación, foto opcional, una o más variantes con SKU, barcode, talla, color, costo, precio, promo, stock inicial y mínimo. La imagen local opcional ofrece vista previa, alternativa de carga y placeholder/fallback si falta o falla la carga.
5. `POST /api/products` crea producto, variantes, entrada inicial y auditoría en transacción; `PUT /api/products/:id` edita datos y registra cambios de precio/costo; `DELETE` no borra histórico y solo archiva si es necesario. Tras guardar, la lista se actualiza y refleja el producto/edición y su estado de inventario.
6. Al seleccionar una tarjeta se abre detalle de producto en modal/drawer responsivo con foto, categoría, ubicación, precio/costo, variantes, existencias, umbral y badges de stock bajo/agotado; incluye historial de cambios de precio/costo y auditoría cuando esté disponible. Las mismas operaciones y datos siguen sujetos a permisos y reglas existentes.
7. `GET /api/products/:id/history` muestra cambios de costos/precios y auditoria. SKU duplicado en el mismo negocio responde `409`.
8. Todos los diálogos y prompts/confirmaciones de UI del proyecto (incluidos formularios/detalles de producto, apartados, devoluciones, cancelaciones y captura de cantidades) usan la geometría responsive común: centrados horizontal y verticalmente en desktop/tablet. El formulario de producto en escritorio dispone de campos compactos y evita scroll interno innecesario; en móvil puede ocupar el viewport completo, con una sola región de contenido desplazable, acciones alcanzables y bloqueo del scroll de fondo.
9. La navegación/encabezado lateral móvil forma parte del flujo normal y se desplaza junto con la página; el contenido permanece visualmente dentro de su área sin overlay ni solapamiento.
10. En desktop el sidebar ocupa la altura del viewport y mantiene navegación usable al desplazar contenido; solo el nav desplaza si excede el espacio. En móvil todas las opciones se muestran en grilla compacta visible, en flujo normal, sin sticky/fixed ni overflow horizontal.

### Inventario y apartados
1. `/inventario` llama `GET /api/inventory?status=&q=` y muestra disponibles, bajos, agotados, apartados y movimientos recientes.
2. `POST /api/inventory/movements` recibe `{variantId,quantity,type,reason}`; entradas/ajustes requieren permisos y motivo, validan no negatividad y escriben movimiento/auditoria sin editar historico.
3. `POST /api/reservations` recibe `{variantId,quantity,customerName,expiresAt,deposit,notes}` y en transaccion valida stock, descuenta disponible, crea apartado y movimiento `RESERVATION`.
4. `POST /api/reservations/:id/release` o `POST /api/reservations/:id/convert` exige confirmacion, cambia estado y devuelve o consume existencias segun el caso. Un job/endpoint de vencimiento marca apartados vencidos y restituye stock.

### POS y venta
1. `/pos` llama `GET /api/products?available=true&q=&categoryId=`; las tarjetas muestran SKU, talla/color, precio, stock y badge de estado.
2. Añadir, quitar y cambiar cantidad actualiza el carrito Zustand sin permitir superar stock conocido; el servidor vuelve a validar al cobrar.
3. El panel muestra subtotal/total MXN, metodo y, para efectivo, monto recibido y cambio. `POST /api/sales` recibe `{items:[{variantId,quantity}],paymentMethod,receivedAmount,idempotencyKey}`.
4. La API ejecuta una transaccion con bloqueo/actualizacion condicional de stock: valida todas las lineas antes de cambiar alguna, crea folio unico por negocio, venta, lineas con precio/costo historicos y movimientos. Si falta stock, rechaza la venta completa.
5. Responde venta, folio, total, cambio, estado y URL de ticket. El segundo request con la misma idempotency key devuelve el mismo resultado sin duplicar venta.
6. `/tickets/:id` muestra ticket imprimible/descargable con folio, fecha/hora local, lineas, total, metodo, recibido y cambio.
7. `POST /api/sales/:id/cancel` recibe `{reason,confirmation:true}`, valida permiso, conserva folio, marca cancelada, restituye stock en transaccion y audita.

### Devoluciones
1. `/devoluciones` consulta `GET /api/returns?search=` y una venta mediante `GET /api/sales/:id`.
2. `POST /api/returns` recibe `{saleId,items:[{saleLineId,quantity}],reason,refundAmount,confirmation:true}`; valida que no exceda cantidad vendida menos devuelta, reintegra stock y afecta netos/utilidad en una transaccion.
3. Responde devolucion y movimientos; el historial de venta permanece visible.

### Reportes y exportacion
1. `/reportes` usa `GET /api/reports/sales?from=&to=&userId=&categoryId=&productId=&paymentMethod=`.
2. Muestra KPIs, margen/desglose por SKU, mix por categoria, tickets recientes y filtros de periodo.
3. `GET /api/reports/export.csv?...` y `GET /api/reports/export.xlsx?...` aplican exactamente los mismos filtros, devuelven archivo descargable UTF-8 con encabezados claros y montos de dos decimales.

### Auditoria
1. `/auditoria` llama `GET /api/audit?from=&to=&action=&userId=` solo para administrador.
2. Cada fila muestra usuario, negocio, fecha UTC presentada en `America/Mexico_City`, accion, entidad e identificador; no hay endpoints de edicion/eliminacion.

## Modelo de datos

Usar Prisma y PostgreSQL. Todos los modelos de negocio incluyen `id`, `businessId` cuando aplique, `createdAt`, `updatedAt` donde la entidad sea mutable y relaciones con FK. Importes y cantidades son `Decimal(12,2)`.

- `User`: `id String cuid`, `email String unique`, `name String`, `passwordHash String`, `active Boolean`, timestamps. Relaciones a membresias, ventas, movimientos, apartados, devoluciones, auditoria y sesiones.
- `Business`: `id`, `name`, `timezone` default `America/Mexico_City`, `currency` default `MXN`, `createdAt`. Relaciones a membresias, categorias, productos, variantes y operaciones.
- `Membership`: `id`, `userId`, `businessId`, `role enum ADMIN|SELLER|INVENTORY_MANAGER`, `canCancelSales Boolean`, timestamps; unique `(userId,businessId)`.
- `Session`: `id`, `userId`, `activeBusinessId nullable`, `tokenHash unique`, `expiresAt`, `lastActivityAt`, `createdAt`; cookie guarda token opaco.
- `Category`: `id`, `businessId`, `name`, `active`; unique `(businessId,name)`.
- `Product`: `id`, `businessId`, `name`, `photoPath nullable`, `categoryId`, `location`, `archived Boolean`, timestamps. Relaciones a variantes e historial.
- `ProductVariant`: `id`, `businessId`, `productId`, `sku`, `barcode nullable`, `size nullable`, `color nullable`, `cost Decimal`, `price Decimal`, `promoPrice nullable`, `stock Decimal`, `lowStockThreshold Decimal`, `active Boolean`, timestamps; unique `(businessId,sku)` y opcional `(businessId,barcode)` cuando no nulo.
- `PriceCostHistory`: `id`, `businessId`, `variantId`, `userId`, `field enum COST|PRICE|PROMO_PRICE`, `oldValue Decimal nullable`, `newValue Decimal nullable`, `reason`, `createdAt`.
- `InventoryMovement`: `id`, `businessId`, `variantId`, `userId`, `type enum INITIAL|PURCHASE|ADJUSTMENT_IN|ADJUSTMENT_OUT|RESERVATION|RELEASE|SALE|SALE_CANCEL|RETURN|CORRECTION`, `quantity Decimal` signed by effect, `reason nullable`, `referenceType nullable`, `referenceId nullable`, `createdAt`; append-only.
- `Reservation`: `id`, `businessId`, `variantId`, `userId`, `quantity Decimal`, `customerName nullable`, `expiresAt`, `deposit Decimal nullable`, `notes nullable`, `status enum ACTIVE|RELEASED|CONVERTED|EXPIRED`, timestamps.
- `Sale`: `id`, `businessId`, `userId`, `folio Int`, `status enum CONFIRMED|CANCELLED`, `paymentMethod enum CASH|CARD|TRANSFER`, `subtotal Decimal`, `total Decimal`, `receivedAmount Decimal nullable`, `changeAmount Decimal`, `cancelReason nullable`, `cancelledAt nullable`, `createdAt`; unique `(businessId,folio)`.
- `SaleLine`: `id`, `saleId`, `variantId`, `quantity Decimal`, `unitPrice Decimal`, `unitCost Decimal`, `lineTotal Decimal`.
- `SaleIdempotency`: `id`, `businessId`, `key String`, `saleId`, `requestHash String`, `createdAt`; unique `(businessId,key)`.
- `Return`: `id`, `businessId`, `saleId`, `userId`, `reason`, `refundAmount Decimal`, `createdAt`.
- `ReturnLine`: `id`, `returnId`, `saleLineId`, `quantity Decimal`, `amount Decimal`.
- `AuditLog`: `id`, `businessId nullable`, `userId nullable`, `action`, `entityType`, `entityId nullable`, `metadata Json`, `createdAt`; append-only.

## Stack y decisiones técnicas

- Next.js estable actual con TypeScript estricto, App Router y Route Handlers; version exacta queda fijada en `package.json`/lockfile al instalar.
- Tailwind CSS con tokens del diseño local: slate profundo, emerald, amber y rose; superficies claras, tarjetas redondeadas, sombras suaves, chips y tipografias Inter/Plus Jakarta Sans con fallback local.
- El catálogo de productos usa grilla responsiva de tarjetas: una o dos columnas compactas según anchura móvil y varias columnas en desktop (p. ej., 3–4 a 1440px, ajustadas al ancho útil); imagen con proporción consistente, estados de inventario con etiquetas/texto además de color y densidad que mantiene legibles SKU, precio y stock. Búsqueda, filtros por categoría/estado y botones de acción no provocan overflow horizontal.
- Todos los diálogos y prompts/confirmaciones de UI usan una presentación accesible y centrada horizontal y verticalmente en desktop/tablet, sin anclaje a esquina; alta/edición y detalle mantienen título, foco gestionado, cierre por Escape y botón explícito, con retorno de foco al disparador. En escritorio el formulario de producto compacta los campos para mostrar variante base, imagen y acciones a 1440x900 sin scroll interno innecesario. En móvil el diálogo puede ocupar el viewport completo, bloquea el scroll de fondo y ofrece una sola región desplazable con acciones siempre accesibles, sin scrolls anidados. La navegación lateral móvil permanece en el flujo normal y se desplaza con el documento, sin overlay; el contenido no queda debajo de ella. El detalle de producto se centra en escritorio. La presentación no define reglas de dominio.
- Zustand para usuario, negocio activo y carrito; datos persistentes solo via API. React Server Components para lectura y Client Components para interacciones.
- El carrito POS tiene una sola fuente de estado compartida por resumen móvil, bottom-sheet y panel desktop, sin copias sincronizadas. En móvil el resumen fijo inferior aparece con artículos; abre/cierra un bottom-sheet sin overlay de página, con scroll solo en el contenido y «Cobrar» siempre accesible. En desktop catálogo y carrito quedan contiguos en split, con carrito sticky dentro del área usable.
- El sidebar desktop ocupa la altura visible del viewport y conserva navegación accesible; si el nav excede el espacio, solo esa región desplaza. En móvil todas las opciones se muestran en grilla compacta en flujo normal, sin sticky/fixed ni overflow horizontal.
- Prisma ORM tipado, PostgreSQL 16 en `docker-compose.yml`, migraciones en `prisma/migrations`, seed en `prisma/seed.ts`.
- Zod para validar payloads y respuestas de dominio; bcrypt/argon2 para hashes; sesion propia httpOnly, same-site y expiracion por inactividad.
- `decimal.js`/Prisma Decimal para calculos monetarios; no usar `number` para importes de dominio.
- `exceljs` para XLSX y generador CSV con BOM UTF-8; `@playwright/test` para smoke UI y Vitest para unitarias/integracion.
- Estructura: `app/(auth)`, `app/(workspace)/dashboard|pos|productos|inventario|apartados|devoluciones|reportes|auditoria`, `app/api/**`, `src/domains/{auth,businesses,products,inventory,sales,reservations,returns,reports,audit}`, `src/components`, `src/lib`, `prisma`, `tests`.
- Comandos: `docker compose up -d db`, `npm install`, `npx prisma migrate dev`, `npm run db:seed`, `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`.
- Seed: negocio American Outfit / Sucursal Centro, segundo negocio demo para probar selector, admin `admin@americanoutfit.local` / `Demo123!`, vendedor y encargado de inventario con contrasenas demo documentadas en README, categorias minimas y AO-0001 con costo 35, precio 150, stock 1.
- La UI debe mostrar estados loading/empty/error/success, confirmaciones en acciones sensibles, controles de al menos 44px, navegacion inferior en movil y sidebar/cabecera adaptada en escritorio. No usar las imagenes remotas de la referencia como dependencia funcional.
- README documentara simulaciones de escaner, pagos no conectados, impresion como vista imprimible, credenciales demo, Docker, migraciones, seed, comandos, permisos y limites de primera version.

## Assumptions

- La primera version opera conectada a PostgreSQL; no se confirma ninguna venta offline.
- Un negocio representa la unidad de aislamiento. Aunque se muestre “Sucursal Centro”, no se implementan multiples ubicaciones fisicas.
- El selector de negocio guarda el activo en sesion; cada request obtiene el negocio desde sesion y nunca confia solo en un `businessId` del cliente.
- El primer folio de cada negocio es `1` y se incrementa dentro de la transaccion de venta; cancelaciones no reutilizan folios.
- Los precios son finales, sin IVA ni descuentos; el precio aplicado es promo si existe y no supera el normal, de lo contrario el normal.
- Stock disponible es el campo de variante menos apartados ya descontados; no se permite resultado negativo y una venta se rechaza completa si cualquier linea falla.
- La alerta baja aplica cuando `stock > 0` y `stock <= lowStockThreshold`; cero es agotado y no aparece en catalogo vendible.
- Las devoluciones reducen ventas netas y utilidad usando precio/costo historicos de las lineas devueltas; cancelaciones excluyen todo el ticket.
- Una devolucion parcial puede registrar reembolso simulado; no se procesa dinero real.
- Los ajustes negativos, cancelaciones, devoluciones, liberaciones y conversiones piden confirmacion en UI y la API exige payload de confirmacion cuando corresponda.
- El lector de camara se reemplaza por una accion demo que busca AO-0001; el campo barcode manual funciona completamente.
- La foto es opcional; si no hay almacenamiento writable, la app conserva el formulario sin foto y documenta la limitacion, sin romper alta de producto.
- Las pruebas de concurrencia usan dos operaciones sobre la misma variante y deben demostrar que solo una venta confirma la ultima existencia.

## Rubric de evaluación

Cada criterio es binario: PASS solo con evidencia del comando o flujo indicado; cualquier error, resultado parcial o suposicion es FAIL.

1. `npm install` y `npm run build` terminan con codigo 0 desde un checkout limpio.
2. `docker compose up -d db && npx prisma migrate deploy` termina con codigo 0 y PostgreSQL acepta conexion usando `.env.example` configurado.
3. `npm run lint && npm run typecheck && npm run test` terminan con codigo 0.
4. `npm run db:seed` termina con codigo 0 y crea American Outfit, usuarios demo, roles, categorias y AO-0001 visible via `GET /api/products` autenticado.
5. En Playwright, `/login` permite iniciar sesion con `admin@americanoutfit.local` / `Demo123!`, muestra el negocio activo y redirige a `/dashboard`.
6. En Playwright, un usuario con dos negocios selecciona uno y las respuestas posteriores solo muestran productos y ventas de ese negocio; `curl` sin sesion recibe `401`.
7. En Playwright, dashboard muestra ventas, unidades, COGS, utilidad, agotados, alertas y ventas recientes, con estados de carga/error/vacio visibles en el flujo correspondiente.
8. En Playwright, administrador o encargado crea AO-TEST con variante, stock inicial, costo y precio; al recargar sigue visible, y SKU duplicado devuelve `409` por `curl`.
9. En Playwright, la edicion de costo/precio muestra margen y el historial contiene usuario, valor anterior, valor nuevo, motivo y fecha.
10. En Playwright, inventario registra entrada y ajuste negativo con motivo, actualiza stock y muestra el movimiento en kardex; un ajuste sin motivo devuelve `400`.
11. En Playwright, crear apartado descuenta stock, muestra estado activo, y liberar/vencerlo devuelve exactamente la cantidad; no se puede apartar mas que la existencia.
12. En Playwright, POS permite buscar AO-0001, agregarlo al carrito, mostrar `$150.00 MXN`, elegir efectivo/tarjeta/transferencia y ocultar o mostrar recibido/cambio correctamente.
13. Con dos requests concurrentes de `curl` o prueba de integracion sobre una sola unidad, como maximo una venta responde `201`; la otra responde conflicto y el stock queda `0`, nunca negativo.
14. En Playwright, cobrar efectivo con recibido `200` sobre total `150` crea venta con folio, cambio `50`, movimiento de salida y ticket; el ticket es imprimible/descargable.
15. Repetir el mismo `POST /api/sales` con la misma idempotency key devuelve el mismo folio sin duplicar venta, linea ni movimiento.
16. En Playwright, una variante en stock `0` aparece agotada, no se puede agregar al POS y no se muestra como disponible para venta.
17. En Playwright, cancelar una venta exige confirmacion y motivo, conserva folio, marca cancelada, restituye stock una sola vez y excluye el ticket de ventas netas.
18. En Playwright, una devolucion parcial ligada a una venta valida cantidades, reintegra inventario y reduce ventas netas/utilidad; una cantidad mayor responde `400`.
19. En Playwright, reportes aceptan hoy/semana/mes/rango, filtros de usuario/categoria/producto/metodo y calculan utilidad con costo historico, no costo actual.
20. `curl -OJ` sobre exportaciones CSV y XLSX con los mismos filtros produce archivos descargables con encabezados, MXN a dos decimales y datos coherentes con la pantalla.
21. En Playwright, auditoria de administrador muestra login, alta/edicion, movimiento, apartado, venta, cancelacion y devolucion; no existe mutacion para editar/eliminar auditoria y un vendedor recibe `403`.
22. En Playwright, vendedor puede consultar y vender, no puede administrar usuarios/productos o ajustes restringidos; encargado puede productos/inventario/apartados/devoluciones, y administrador puede todo permitido.
23. En Playwright a viewport movil y escritorio, POS, productos, inventario y reportes son utilizables sin overflow horizontal accidental, con controles tactiles y navegacion adaptada.
24. README, `.env.example`, `docker-compose.yml`, `prisma/schema.prisma`, migraciones y comandos de arranque existen; README identifica explicitamente escaner, pagos e impresion simulados y no contiene secretos reales.
25. En Playwright, `/productos` presenta el catálogo existente en grilla de tarjetas con imagen o placeholder, nombre, SKU, categoría, ubicación, precio y existencias; Disponible, Por agotarse y Agotado se distinguen con etiqueta legible y estado visual.
26. En Playwright, buscar por nombre y SKU y combinar búsqueda con categoría y estado actualiza las tarjetas correctas, permite limpiar filtros y muestra estado vacío cuando no hay coincidencias.
27. En Playwright, al abrir alta, ingresar valores, cerrar con Escape y volver a abrir, los valores escritos siguen presentes; el botón visible de cierre/cancelación también cierra sin descartar esos valores de la sesión del formulario.
28. En Playwright, guardar un producto nuevo válido crea producto, variantes y stock inicial, cierra el formulario y la tarjeta recién creada aparece en la grilla con sus datos actuales; el producto persiste tras recargar.
29. En Playwright, abrir una tarjeta muestra el detalle responsive con foto o placeholder, categoría, ubicación, precio/costo, variantes, existencias y badge bajo/agotado según corresponda; se muestra historial cuando hay registros disponibles.
30. En Playwright a viewport 390px, catálogo, filtros, tarjetas, alta/edición y detalle son utilizables, sus acciones táctiles tienen al menos 44px y `document.documentElement.scrollWidth <= window.innerWidth` (sin overflow horizontal de página).
31. En Playwright a viewport 1440px, el catálogo ocupa varias columnas de tarjetas sin estirarlas a ancho completo ni producir overflow, y búsqueda/filtros/acciones permanecen visibles y utilizables.
32. En Playwright, cargar una imagen local válida la previsualiza en el formulario y aparece en la tarjeta/detalle tras guardar; una imagen ausente o fallida conserva placeholder/fallback y no rompe el flujo.
33. En Playwright, los diálogos exponen rol y nombre accesibles, controles tienen etiquetas asociadas, botones de icono tienen nombre accesible, foco entra al abrir y vuelve al disparador al cerrar; Tab/Escape permiten operar y salir del diálogo por teclado.
34. En Playwright a viewport 1440x900, abrir el formulario de producto y el detalle verifica que cada diálogo está centrado horizontal y verticalmente en el viewport (centros geométricos coinciden con el centro del viewport con tolerancia de 2px), sin anclaje a esquina.
35. En Playwright a viewport 1440x900, el formulario con una variante base muestra simultáneamente los campos de variante, imagen/vista previa y acciones; el área de contenido del diálogo no requiere scroll para acceder a ellos y botones de cancelar/guardar son visibles.
36. En Playwright en viewport móvil, abrir un diálogo deja `document.scrollingElement.scrollTop` inmóvil/bloqueado al intentar desplazar el fondo, no existe scroll anidado entre contenedor/diálogo/contenido, el contenido usa como máximo una región desplazable y se puede alcanzar y activar cada botón de acción.
37. En Playwright en viewport móvil, la navegación/encabezado lateral tiene posición de flujo normal (no sticky/fixed), se desplaza fuera de vista al desplazar la página y no tapa, solapa ni se separa visualmente del contenido. El barrido de todos los diálogos y prompts/confirmaciones de UI encontrados en el proyecto verifica que cumplen centrado desktop/tablet y el comportamiento móvil especificado; reporta cada instancia inspeccionada.
38. En Playwright, al abrir alta/edición con variantes y desplazar el formulario, «Agregar variante» permanece visible junto al encabezado/sección y no queda cubierta por el footer; activarla agrega una nueva variante editable.
39. En Playwright desktop, al desplazarse una página larga hasta el fondo, el sidebar sigue visible a altura de viewport y cada opción de navegación es accesible; si el menú excede el espacio, solo el nav desplaza.
40. En Playwright móvil, todas las opciones de navegación están visibles en grilla compacta; `document.documentElement.scrollWidth <= window.innerWidth` y el menú está en flujo normal, sin sticky/fixed.
41. En Playwright móvil con catálogo desplazable, al agregar/modificar productos el resumen del carrito permanece fijo al fondo y actualiza cantidad total de unidades y total monetario.
42. En Playwright móvil, abrir/cerrar bottom-sheet permite modificar cantidad, método de pago y efectivo, muestra cambio correcto y cobrar con footer visible; solo una región del contenido desplaza, el body no tiene overflow/scroll al operar el panel y no hay overlay de página. En desktop, catálogo y carrito aparecen contiguos en split y el carrito permanece visible/sticky dentro del área usable.
