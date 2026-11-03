# DEV-11R-A2 Visual Review

Estado: **VISUAL REVIEW PENDING**

El lote no se marca como aprobación visual. Las pruebas funcionales pasan, pero las cuatro comparaciones requieren revisión del usuario contra Stitch.

## Diagnóstico Del Runtime

La rama y HEAD verificados fueron `feature/lucem-ui-redesign-v1` y `31da5f8cff61844548c0629abd5f5f732e9e4c22`. `localhost:3000` estaba atendido por el proceso `next-server` PID `94523`, iniciado desde:

`/Users/jasanhernandez/Develop/lucem-retail`

El proceso tenía CWD exacto del worktree actual. Los otros dos procesos `next-server` antiguos no escuchaban en el puerto 3000. El endpoint local de sesión y la captura real confirmaron que el runtime era el código local, no un worktree ajeno ni una build obsoleta.

Conclusión: **el código nuevo local sí estaba siendo servido**. La discrepancia reportada no era caché ni proceso antiguo: la implementación anterior había convertido el modal en un overlay de viewport completo, pero conservaba una composición de modal y no reproducía el shell/estructura Stitch.

Tras los ajustes visuales se volvió a verificar el runtime: `localhost:3000` lo sirve `next-server` PID `3516` con CWD `/Users/jasanhernandez/Develop/lucem-retail`. Una sesión Playwright autenticada inspeccionó `/productos` y confirmó heading `Crear Producto`, `.products-editor-surface` presente, `.products-modal-backdrop` ausente y buscador del topbar presente. La captura real está en [runtime-localhost3000-simple-desktop.png](dev-11r-visual-evidence/runtime-localhost3000-simple-desktop.png).

## Cambios A2

- Se eliminó la envoltura visual `products-modal-backdrop` para la alta de Productos.
- La edición se renderiza como superficie integrada al workspace y oculta el catálogo mientras está activa.
- Se conserva `role="dialog"` no modal para compatibilidad de accesibilidad y foco; `aria-modal="false"` y el body ya no se bloquea.
- Desktop ahora incluye shell real, breadcrumb, hero, selector de presentación, tarjeta de datos principales, valores simples, sección independiente de variantes y footer de acciones.
- Mobile usa composición vertical, tarjetas de variantes, navegación inferior existente y footer por encima de la navegación.
- La presentación simple oculta la matriz de variantes y muestra SKU, costo, precio y existencia en la sección principal.
- La información opcional se presenta en un acordeón, preservando carga de imagen y ubicación.
- Variantes conserva la matriz editable y su estado funcional.
- El selector se adapta a control segmentado móvil; los campos opcionales quedan después de los requeridos.
- La matriz desktop usa una celda por campo y una fila por combinación; en mobile se mantienen tarjetas plegables.
- El buscador del topbar en Productos reutiliza la consulta existente del catálogo.
- Las tarjetas del catálogo se compactaron y el sidebar de Productos usa marca storefront y navegación activa oscura.
- Textos, placeholders, marca de contexto “Mostrador directo”, estado “Recomendado”, contador de opcionales, unidades/currency y acciones se alinearon con la última captura Stitch compartida por el usuario.
- El editor simple no muestra banners ni notas ajenos al flujo de la referencia; las ayudas de stock aparecen en el propio campo y edición conserva su nota de sólo lectura.
- El topbar ahora refleja sucursal activa, búsqueda del catálogo, nueva venta, acceso a auditoría y rol del usuario; el indicador de desarrollo Next.js se desactivó para no superponer el footer del sidebar.
- La referencia Stitch más reciente de alta simple se tomó como fuente directa para títulos, textos auxiliares, texto recomendado, símbolos de moneda, unidades, contador de opcionales y acciones inferiores.

## Comparaciones

Las imágenes `comparison-*-side-by-side.png` colocan Stitch a la izquierda y el runtime corregido a la derecha. `comparison-*-overlay.png` superpone ambas imágenes tras normalizar el ancho.

| Vista | Stitch | Runtime corregido | Side-by-side | Overlay |
| --- | --- | --- | --- | --- |
| Simple desktop | [original](../../diseno/desktop_crear_producto_simple/screen.png) | [runtime](dev-11r-visual-evidence/products-simple-corrected-desktop.png) | [comparación](dev-11r-visual-evidence/comparison-simple-desktop-side-by-side.png) | [overlay](dev-11r-visual-evidence/comparison-simple-desktop-overlay.png) |
| Variantes desktop | [original](../../diseno/desktop_crear_producto_con_variantes/screen.png) | [runtime](dev-11r-visual-evidence/products-variants-corrected-desktop.png) | [comparación](dev-11r-visual-evidence/comparison-variants-desktop-side-by-side.png) | [overlay](dev-11r-visual-evidence/comparison-variants-desktop-overlay.png) |
| Simple mobile | [original](../../diseno/mobile_web_crear_producto_simple/screen.png) | [runtime](dev-11r-visual-evidence/products-simple-corrected-mobile.png) | [comparación](dev-11r-visual-evidence/comparison-simple-mobile-side-by-side.png) | [overlay](dev-11r-visual-evidence/comparison-simple-mobile-overlay.png) |
| Variantes mobile | [original](../../diseno/mobile_web_crear_producto_con_variantes/screen.png) | [runtime](dev-11r-visual-evidence/products-variants-corrected-mobile.png) | [comparación](dev-11r-visual-evidence/comparison-variants-mobile-side-by-side.png) | [overlay](dev-11r-visual-evidence/comparison-variants-mobile-overlay.png) |

Viewports del runtime: desktop `1533x1600`, mobile `390x1600`. Las capturas se tomaron con datos E2E y el shell real de la aplicación. La altura mobile permite ver el flujo de alta junto con la navegación inferior fija sin que la captura de página completa coloque sus elementos en mitad del formulario.

## Geometría Revisada

- Desktop: el sidebar ocupa aproximadamente 300px del viewport de 1533px; el formulario queda dentro del área de workspace y ya no aparece como tarjeta modal centrada.
- Desktop: selector, datos principales, valores simples/matriz y acciones siguen una columna de contenido única con ancho útil amplio.
- Mobile: el contenido se apila a 390px; las variantes pasan a tarjetas y el footer queda sobre la navegación inferior.
- Mobile: el acordeón de información opcional permanece cerrado inicialmente, como en Stitch.

## Diferencias Pendientes

- Stitch usa datos demostrativos completos y una topbar/shell de referencia que no siempre coincide con el contenido real de sesión E2E.
- El modelo funcional actual no añade campos nuevos de API sólo para replicar textos demostrativos de Stitch.
- La matriz real conserva el contrato de variantes existente y puede mostrar más filas/errores que la composición estática del PNG.
- Las opciones “Usuarios y permisos” y “Configuración” del sidebar se muestran deshabilitadas porque el proyecto no tiene rutas para esas áreas.
- El icono de campana enlaza a la auditoría existente, ya que no hay una API separada de notificaciones.
- El footer conserva la versión real del paquete (`0.1.0`), no la versión ilustrativa del PNG.
- Stitch muestra valores demostrativos dentro de los campos; React conserva esos ejemplos como placeholders para no prellenar involuntariamente precio, SKU o stock en un producto nuevo.
- La captura Stitch reciente de alta simple no incluye el sidebar en su encuadre, mientras que el runtime conserva el sidebar integrado de la aplicación.
- El topbar no tiene un centro/API de notificaciones; la campana navega al módulo de auditoría existente. Los enlaces administrativos sin páginas disponibles se mantienen deshabilitados aunque visualmente presentes.
- La aprobación visual final queda pendiente de la revisión humana de las cuatro comparaciones.

## Resultados Funcionales

- Productos E2E: `14/14` PASS.
- Alta simple, alta con variantes, edición, SKU duplicado, validaciones, permisos, stock de sólo lectura e aislamiento por negocio: cubiertos por DEV-03.
- Captura A2: `1/1` PASS para las cuatro vistas corregidas.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- DEV-09 integral: `1/1` PASS.
- `npm test -- --run`: `24/24` PASS.
- `npx prisma validate`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
