# DEV-03 - Productos

## Objetivo y estado

DEV-03 implementa el flujo de productos de `/productos` dentro del shell real del workspace. El objetivo es permitir consultar el catálogo por negocio, filtrar y agrupar sus variantes, crear productos simples o con varias variantes, consultar el detalle, editar datos comerciales y conservar el historial de cambios, respetando permisos, aislamiento y el contrato existente del backend.

Antes de DEV-03, `app/(workspace)/productos/page.tsx` solo renderizaba `PreparationPlaceholder`. No había catálogo operativo ni formularios funcionales en esa ruta. La implementación funcional legacy permanecía como referencia en el historial de `e2e/products.spec.ts`, bajo `test.describe.skip` por `LEGACY UI`.

Después de DEV-03, `/productos` carga categorías y filas de productos, agrupa las filas por producto, muestra estados de stock, búsqueda, filtros, estados de carga/error/vacío, detalle y formularios accesibles para alta y edición. El catálogo es responsive para desktop, tablet y mobile, sin overflow horizontal del documento.

## Archivos implementados

- `app/(workspace)/productos/page.tsx`: obtiene el rol mediante `getAuth()` y monta `ProductCatalog`.
- `src/components/products/ProductCatalog.tsx`: catálogo, filtros, tarjetas, diálogos de detalle, alta, edición, historial, permisos e imagen.
- `src/components/products/product-utils.ts`: tipos, conversión de cantidades, agrupación por producto y validación del draft.
- `app/styles/products.css`: estilos del catálogo, tarjetas, formularios, variantes, diálogos y responsive.
- `app/globals.css`: integración de los estilos de productos en los estilos globales.
- `tests/product-utils.test.ts`: pruebas unitarias de agrupación, estados y validación.
- `playwright.products.config.ts`: configuración aislada de Playwright para DEV-03.
- `e2e/dev-03/products.spec.ts`: suite E2E funcional y visual de productos.
- `package.json`: script `test:e2e:products` para ejecutar la configuración dedicada.

No se cambiaron las rutas API, Prisma, autenticación ni migraciones. DEV-03 reutiliza los contratos existentes.

## APIs y seguridad

### APIs reutilizadas

- `GET /api/products`: catálogo por filas de variante. Acepta `q`, `categoryId`, `status` y `available`; la UI agrupa las filas por producto y calcula estado agregado.
- `POST /api/products`: alta de producto simple o con `variants[]`; crea el movimiento `INITIAL` cuando el stock inicial es mayor que cero.
- `GET /api/products/:id`: detalle del producto, categoría y variantes activas.
- `PUT /api/products/:id`: edición de datos del producto y variantes existentes; también permite crear variantes nuevas dentro del producto.
- `DELETE /api/products/:id`: archivado lógico del producto.
- `GET /api/products/:id/history`: historial de costo, precio y promoción con usuario y motivo.
- `GET /api/categories`: categorías activas del negocio actual.
- `POST /api/products/image`: carga de JPEG, PNG, WebP o GIF de hasta 5 MB, validando firma y MIME.
- `GET /api/products/image/:filename`: lectura autenticada de imágenes con nombre UUID válido.

La sesión se obtiene server-side con `getAuth()`. Las lecturas requieren sesión y negocio activo. `ADMIN` e `INVENTORY_MANAGER` pueden crear, editar, archivar y cargar imágenes; `SELLER` puede consultar, pero no ve `Nuevo producto` ni puede mutar productos o imágenes. El aislamiento se aplica en cada consulta y operación mediante el `businessId` del negocio activo. No se introdujeron llamadas al endpoint de auditoría ni datos sensibles.

## Componentes y flujos

- **Catálogo:** encabezado, acción `Nuevo producto` según permiso, búsqueda por nombre/SKU/ubicación, filtro de categoría, estado, disponibilidad, limpieza de filtros, estados de carga/error/vacío y tarjetas agrupadas por producto.
- **Tarjeta:** imagen o placeholder accesible, badge `En stock`, `Por agotarse` o `Agotado`, nombre, categoría, SKU, ubicación, existencias, precio aplicado y acciones de detalle/edición.
- **Alta simple:** formulario de datos generales, categoría, ubicación, foto, una variante con SKU, barcode, talla, color, costo, precio, promoción, stock inicial y umbral.
- **Alta con variantes:** permite agregar manualmente una segunda o más variantes. Se conservan SKU, atributos comerciales, precios y stock inicial por variante; no se generan combinaciones automáticamente.
- **Detalle y edición:** el detalle carga producto e historial, muestra variantes, existencias y acción de edición. El formulario de edición reutiliza la estructura del alta y permite actualizar nombre, categoría, ubicación, foto, SKU, atributos, costo, precio, promoción y umbral.
- **Historial:** los cambios de costo, precio y promoción se muestran con valores anterior/nuevo, motivo, usuario y fecha. Si se modifica alguno de esos campos, la UI exige motivo.
- **Imagen:** la selección carga la imagen mediante `POST /api/products/image`, muestra preview y guarda la ruta devuelta por el API.
- **Permisos:** el rol se entrega desde la página server-side al componente client-side; las acciones mutables también quedan protegidas por el backend.
- **Stock en edición:** el stock de una variante existente se muestra como dato de solo lectura en el sentido contractual: `PUT` no lo actualiza. El payload omite `stock` para variantes existentes; solo una variante nueva puede recibir stock inicial.

## Referencias Stitch y alcance visual

La fuente exacta de correspondencia es `docs/ui-redesign/DEV-03-DESIGN-MAPPING.md`:

- Alta simple desktop: `diseno/desktop_crear_producto_simple/screen.png` y `diseno/desktop_crear_producto_simple/code.html`.
- Alta simple mobile: `diseno/mobile_web_crear_producto_simple/screen.png` y `diseno/mobile_web_crear_producto_simple/code.html`.
- Alta con variantes desktop: `diseno/desktop_crear_producto_con_variantes/screen.png` y `diseno/desktop_crear_producto_con_variantes/code.html`.
- Alta con variantes mobile: `diseno/mobile_web_crear_producto_con_variantes/screen.png` y `diseno/mobile_web_crear_producto_con_variantes/code.html`.
- Selección secundaria de variante: `diseno/pantalla_02_selecci_n_de_variantes_de_producto/screen.png` y `diseno/pantalla_02_selecci_n_de_variantes_de_producto/code.html`.

No existen PNG/HTML finales dedicados para catálogo desktop/mobile, detalle, edición, gestión de variantes ni validación/errores. Por lo tanto, no se inventa una comparación visual para esas pantallas. Catálogo, detalle y edición se documentan contra el contrato observable y las fuentes cercanas indicadas en `DEV-03-DESIGN-MAPPING.md`, no como una comparación pixel a pixel.

Se adaptaron shell, tokens, formularios, espaciado, jerarquía, controles táctiles, scroll interno y patrones responsive de las referencias. No se hace una afirmación de pixel-fidelity donde no existe una referencia exacta.

Desviaciones deliberadas frente a ideas visuales no respaldadas por el backend:

- `Disponibles` equivale a `stock`, porque el API no tiene un agregado de reservas/apartados.
- El orden de promoción es informativo y client-side; el servidor no valida que sea menor que el precio normal.
- No hay auto-generación de SKU, generación de combinaciones, promociones temporales ni sincronización externa.
- No se permite editar el stock existente desde este flujo.

## Evidencia E2E

La evidencia final se obtuvo contra PostgreSQL aislado y exclusivo de DEV-03:

- Contenedor: `lucem-retail-dev-03-db`.
- Volumen: `lucem-retail-dev-03-pg`.
- Puerto: `55432`.
- Preparación: `npm run e2e:prepare` PASS.
- Suite: `CI=1 npm run test:e2e:products -- --reporter=list` PASS, `13/13`.
- Desglose: 9 casos originales más loading, error, retry, `401`, categorías, `INVENTORY_MANAGER`, upload real con rechazos y cleanup de blob, y accesibilidad del modal; se incluyen 3 proyectos visuales.
- Capturas: `test-results/dev-03/DEV-03-*.png`.

La cobertura final incluye filtros, estado vacío, detalle, alta simple, alta con 2 variantes, rechazo de SKU duplicado, edición con historial y motivo, permisos de `SELLER`, aislamiento entre Centro y Norte, overflow mobile y capturas desktop/tablet/mobile. Los artefactos están ignorados y no versionados.

La suite enfocada usa `playwright.products.config.ts` con `next dev --hostname 127.0.0.1 --port 3103`, para no depender del artefacto `.next` durante esta ejecución. Esto no constituye evidencia de un servidor de producción; `npm run build` se verifica por separado y pasó.

La corrida final cubre loading/error/reintento de `/api/products`, `401` sin sesión, categorías inexistentes o ajenas, alta y archivado con `INVENTORY_MANAGER`, carga ADMIN de PNG con lectura autenticada, rechazos de MIME/tamaño y cleanup del blob, además de foco, trampa de teclado, Escape, scroll lock y objetivos táctiles del modal a `390x844`.

El caso de `INVENTORY_MANAGER` registra y comprueba el stock inicial persistido en el detalle del producto. No se inventa una comprobación de movimiento: la suite deja como gap la lectura independiente del movimiento `INITIAL` mientras no exista un contrato de lectura del kardex aplicable a esta evidencia.

La limpieza también pasó: `npm run e2e:cleanup` PASS con resultado `0|0`; se retiraron exactamente el contenedor `lucem-retail-dev-03-db` y el volumen `lucem-retail-dev-03-pg`. No se usaron E2E globales o legacy, no hubo llamadas de auditoría y no se incluyeron secretos.

## Checks finales

- `lint`: PASS.
- `typecheck`: PASS.
- `npm test`: PASS, 7 archivos y 17 pruebas.
- `build`: PASS; permanece el warning preexistente del plugin ESLint de Next. Es una verificación separada de la suite enfocada y no una afirmación de servidor de producción.
- `git diff --check`: PASS.

## Bloqueos y riesgos

- No hay PNG/HTML final dedicado para catálogo, detalle, edición, gestión de variantes ni validación, así que la comparación visual exacta continúa bloqueada.
- No existe una lectura independiente del movimiento `INITIAL` dentro del contrato usado por esta suite: no hay `GET` de movimientos; sólo se verifica el stock persistido en el detalle.
- Los errores genéricos del backend pueden limitar la precisión del mensaje mostrado al usuario.
- `available` equivale a `stock` y está respaldado por el API; no hay edición de stock existente desde este flujo.
- El backend no valida que la promoción sea menor que el precio normal; el orden de promoción sólo se informa client-side.
