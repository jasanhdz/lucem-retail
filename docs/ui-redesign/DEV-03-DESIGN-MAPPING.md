# DEV-03 Design Mapping

## Estado de las fuentes

La pagina actual `app/(workspace)/productos/page.tsx` solo renderiza `PreparationPlaceholder`. La implementacion funcional anterior esta preservada como fuente legacy en el historial de `e2e/products.spec.ts` (todo el bloque esta bajo `test.describe.skip` por `LEGACY UI`). No existe una referencia final dedicada para cada pantalla solicitada.

| Flujo | PNG exacto | HTML exacto | Uso y limite |
| --- | --- | --- | --- |
| Crear simple desktop | `diseno/desktop_crear_producto_simple/screen.png` (2560x2278) | `diseno/desktop_crear_producto_simple/code.html` | Referencia primaria: shell desktop, selector simple/variantes, datos principales, opcionales, precios y footer. |
| Crear simple mobile | `diseno/mobile_web_crear_producto_simple/screen.png` (394x1600) | `diseno/mobile_web_crear_producto_simple/code.html` | Referencia primaria para 390px: header, selector, formulario apilado, accordion, footer fijo y nav inferior. |
| Crear variantes desktop | `diseno/desktop_crear_producto_con_variantes/screen.png` (1533x1600) | `diseno/desktop_crear_producto_con_variantes/code.html` | Referencia primaria para datos generales y matriz editable de variantes. Incluye scroll horizontal de tabla. |
| Crear variantes mobile | `diseno/mobile_web_crear_producto_con_variantes/screen.png` (415x1600) | `diseno/mobile_web_crear_producto_con_variantes/code.html` | Referencia primaria para tarjetas de variante expandidas/colapsadas y footer persistente. |
| Seleccion de variante | `diseno/pantalla_02_selecci_n_de_variantes_de_producto/screen.png` (1600x1280) | `diseno/pantalla_02_selecci_n_de_variantes_de_producto/code.html` | Referencia secundaria para modal, estado agotado, SKU, stock y controles tactiles. Es POS/carrito, no gestion de productos. |
| Catalogo desktop | No existe PNG/HTML final dedicado. | No existe. Fuente cercana: `e2e/products.spec.ts:3-105` y la UI legacy en el commit de respaldo `bf8c45f`. | No inventar una captura de catalogo; usar la prueba legacy para estructura observable: cards, filtros, estados, dialogo de detalle y dialogo de alta. |
| Catalogo mobile | No existe PNG/HTML final dedicado. | No existe. Fuente cercana: `diseno/pantalla_06_punto_de_venta_m_vil_web_responsivo/code.html` y `diseno/mobile_web_inventario_general_y_detalle/code.html`. | Ambas son POS/inventario; solo aportan patrones de lista, busqueda y nav, no contrato de catalogo. |
| Gestion de variantes | No existe PNG/HTML final dedicado. | No existe. Fuente cercana: los HTML de crear variantes desktop/mobile. | Reusar la matriz desktop y las tarjetas mobile, pero no asumir acciones de variante no presentes en API. |
| Detalle de producto | No existe PNG/HTML final dedicado. | No existe. Fuente cercana: `e2e/products.spec.ts:72-105,146-177` y legacy de `bf8c45f`. | El contrato observable exige variantes/existencias e historial; no hay pantalla Stitch final que sustituya esta evidencia. |
| Editar producto | No existe PNG/HTML final dedicado. | No existe. Fuente cercana: `e2e/products.spec.ts:146-177` y los formularios de alta. | Alta y edicion pueden compartir estructura, pero el modo editar debe respetar las limitaciones de `PUT`. |
| Validacion y errores | No existe PNG/HTML final dedicado. | No existe. Fuentes cercanas: estados inline de `desktop_crear_producto_con_variantes/code.html`, `mobile_web_crear_producto_con_variantes/code.html` y `e2e/products.spec.ts:41-70,189-205`. | Los mensajes visuales son referencias de jerarquia; el texto y estado final deben derivar de respuestas reales. |

## Prioridad visual

1. P0: shell de workspace y contexto de negocio; la navegacion existente define `/productos`, permisos visibles y nav inferior.
2. P0: legibilidad inmediata del catalogo: nombre, SKU, categoria, ubicacion, precio/costo, existencias y badge `Disponible`, `Por agotarse` o `Agotado`.
3. P0: formularios operables y accesibles, con acciones principales visibles, una sola region de scroll interna en mobile y retorno de foco.
4. P1: alta simple y alta con variantes, incluyendo foto, precios, stock, umbral y estados inline.
5. P1: detalle con variantes, existencias e historial de precio/costo.
6. P2: decoracion, iconografia, textos promocionales y estados de sincronizacion que no esten respaldados por contratos.

## Tokens y lenguaje

Fuente normativa: `diseno/retail_operational_clarity/DESIGN.md` y `diseno/retail_pos_inventory_system/DESIGN.md`. La implementacion actual tambien tiene tokens en `app/styles/tokens.css`; deben reconciliarse, no duplicarse sin decision.

- Color: primario bosque `#102B2A` / `#001615`, acento `#176B55` / `#166B55`, fondo claro `#F4F6F5` o `#E7FEF8`, superficie `#FFFFFF`, borde `#DCE4E1`, texto secundario `#4B5563` o `#414847`.
- Semantica: success `#15803D`, warning `#B45309` o acento calido `#D9A85A`, error `#B91C1C` / `#BA1A1A`; los estados deben conservar contraste.
- Tipografia: Plus Jakarta Sans para headings y totales; Inter para campos y datos densos. Hay una diferencia real entre ambos DESIGN.md: el primero usa Inter en body y el segundo Plus Jakarta Sans. Priorizar el sistema final de `retail_operational_clarity` para la UI general y conservar numeros tabulares.
- Escala: headings 26-32px desktop, 24-26px mobile; body 14-16px; labels 11-14px.
- Geometria: radios 8px de controles, 12-16px de tarjetas/dialogos, pill para badges; bordes de 1px y sombras sutiles.
- Espacio: gutter 24px desktop, 16px tablet, 12px mobile; minimo tactil 44px; header desktop 64px y mobile 56px como referencia.

## Estructura prevista

- `WorkspaceShell` y `MobileBottomNavigation` siguen siendo el marco real de negocio, rol y navegacion.
- Catalogo: encabezado con titulo y `Nuevo producto`; metricas solo si se pueden calcular del resultado; busqueda; filtros categoria/estado; rail de categorias; grid desktop y lista compacta mobile; estados loading, error y vacio.
- Card: foto o placeholder accesible, badge de stock, nombre/categoria, SKU, ubicacion, precio y acciones `Editar`/detalle.
- Formulario: dialogo accesible compartido por alta/edicion; datos generales; foto; una o varias variantes; errores junto al campo o en alerta; footer sticky.
- Variantes: tabla con scroll horizontal controlado en desktop estrecho y tarjetas expandibles en mobile. `Agregar variante` permanece en el encabezado/legend de la primera variante, como ya exige la evidencia legacy.
- Detalle: dialogo/drawer adaptable con foto, metadata, variantes/existencias, historial y `Editar producto`.

## Responsive

- `1440x900`: sidebar de altura de viewport, contenido con gutter amplio, catalogo de al menos tres columnas, dialogos centrados y footer dentro del dialogo. La matriz puede ser tabla; no ocultar campos requeridos.
- `768x1024`: conservar shell usable, reducir gutters y apilar encabezado/acciones cuando no quepan. La tabla de variantes puede desplazarse solo en su region; no crear overflow horizontal del documento.
- `390x844`: header y nav inferior; catalogo en filas/tarjetas compactas; dialogos ocupan el viewport con body interno desplazable y footer fijo; una sola region de scroll; botones y controles de al menos 44px; no bloquear el scroll de la pagina fuera del dialogo.

## Accesibilidad

- Usar nombres accesibles para catalogo, dialogos, cierre, detalle, filtros y acciones de variante; asociar cada label con su control.
- Mantener foco inicial en cierre, ciclo Tab/Shift+Tab, Escape, retorno al disparador y bloqueo del fondo mientras el dialogo esta abierto.
- No depender solo de color para stock o errores; incluir texto y `role=alert`/`aria-live` cuando corresponda.
- Proveer estados disabled/loading sin perder nombre ni contraste; respetar `prefers-reduced-motion`.
- Mantener orden de lectura y teclado coherente en la matriz desktop y en tarjetas mobile.

## Stitch frente a contratos backend

- Los HTML muestran `SKU manual`, categoria, ubicacion, foto, codigo de barras, talla, color, costo, precio normal, promo, stock y umbral. El backend soporta esos campos en `POST /api/products` y `PUT /api/products/:id`, pero no implementa un endpoint separado de gestion de variantes.
- El backend acepta `POST /api/products` con `variants[]` o un objeto simple. La unicidad real es `(businessId, sku)`; la categoria debe pertenecer al negocio activo; el stock inicial crea un movimiento `INITIAL` si es mayor que cero.
- `PUT /api/products/:id` actualiza producto y variantes existentes, crea variantes nuevas y registra cambios de costo/precio/promo en historial. No actualiza stock de una variante existente; el control visual de stock en editar no debe prometerlo.
- `GET /api/products` devuelve filas por variante, no productos agrupados. La agrupacion de cards y el calculo de estado son responsabilidad UI; `q` busca SKU, barcode, nombre y ubicacion; `categoryId`, `status` y `available` filtran en servidor con las reglas existentes.
- `GET /api/products/:id` devuelve detalle por producto, variantes activas y categoria. `GET /api/products/:id/history` devuelve historial de precio/costo con nombre del usuario.
- `GET /api/categories` solo devuelve categorias activas del negocio. No existe API para crear categoria desde este flujo.
- `POST /api/products/image` acepta JPEG, PNG, WebP o GIF hasta 5 MB verificando firma y MIME; `GET /api/products/image/:filename` requiere sesion y nombre UUID valido. Los HTML mencionan PNG/JPG/WebP, por lo que GIF es capacidad de contrato, no obligacion visual.
- Ambos DESIGN.md sugieren auto-generar SKU, validacion en tiempo real, sincronizacion, margen, promociones temporales y terminales. No se deben convertir en comportamiento obligatorio: no hay endpoint de auto-SKU, ni validacion remota de SKU, ni fecha de promocion, ni sincronizacion externa.
- Auth es server-side mediante `getAuth()` y cookie de sesion. Lectura de productos/categorias requiere sesion y negocio activo; crear, editar, archivar y subir foto requieren `ADMIN` o `INVENTORY_MANAGER`; el aislamiento siempre usa `businessId` activo. `SELLER` puede consultar, no mutar.
- La advertencia de seguridad de DEV-SEC-01 (`GET /api/audit exposes passwordHash`) pertenece a auditoria y no debe reintroducirse en datos de producto, UI o pruebas de DEV-03.

## Fuente de verificacion

La base legacy contiene comprobaciones reales para filtros, vacio mobile, dialogos accesibles, overflow, columnas desktop, centrado, detalle, persistencia, edicion, historial, foto local, agregar variante, scroll interno y nav. Al estar omitida por `LEGACY UI`, DEV-03 debe crear una suite enfocada aislada y no presentar esa suite como evidencia final hasta reactivarla bajo el alcance de este plan.
