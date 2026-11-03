# DEV-11R Lote A: evidencia visual de Productos

Las capturas corregidas se generaron contra el runtime real con PostgreSQL E2E, en viewport desktop `1533x1600` y mobile `390x1600`. Las comparaciones están normalizadas por ancho; las diferencias de altura se rellenan con el fondo del canvas. Se actualizan por cada ronda tomando como referencia principal los cuatro HTML/PNG de creación, y la captura simple más reciente compartida por el usuario.

| Estado | Alta simple desktop | Alta con variantes desktop | Alta simple mobile | Alta con variantes mobile |
| --- | --- | --- | --- | --- |
| Stitch original | [screen](../../../diseno/desktop_crear_producto_simple/screen.png) | [screen](../../../diseno/desktop_crear_producto_con_variantes/screen.png) | [screen](../../../diseno/mobile_web_crear_producto_simple/screen.png) | [screen](../../../diseno/mobile_web_crear_producto_con_variantes/screen.png) |
| Runtime anterior disponible | [catálogo](../dev-11-visual-evidence/products-catalog-desktop.png) | [catálogo](../dev-11-visual-evidence/products-catalog-desktop.png) | [catálogo](../dev-11-visual-evidence/products-catalog-mobile.png) | [catálogo](../dev-11-visual-evidence/products-catalog-mobile.png) |
| Runtime corregido | [captura](products-simple-corrected-desktop.png) | [captura](products-variants-corrected-desktop.png) | [captura](products-simple-corrected-mobile.png) | [captura](products-variants-corrected-mobile.png) |

El baseline histórico de este repositorio sólo capturaba el catálogo, no el formulario abierto; por eso se referencia como tal y no se presenta como una captura falsa del modal anterior. Las capturas corregidas cubren el nuevo formulario de viewport completo, selector simple/variantes, matriz de variantes, footer sticky y composición responsive.
