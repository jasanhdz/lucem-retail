# DEV-11R-A2 Visual Review

Estado: **VISUAL REVIEW PENDING**

El lote no se marca como aprobación visual. Las pruebas funcionales pasan, pero las cuatro comparaciones requieren revisión del usuario contra Stitch.

## Diagnóstico Del Runtime

La rama y HEAD verificados fueron `feature/lucem-ui-redesign-v1` y `31da5f8cff61844548c0629abd5f5f732e9e4c22`. `localhost:3000` estaba atendido por el proceso `next-server` PID `94523`, iniciado desde:

`/Users/jasanhernandez/Develop/lucem-retail`

El proceso tenía CWD exacto del worktree actual. Los otros dos procesos `next-server` antiguos no escuchaban en el puerto 3000. El endpoint local de sesión y la captura real confirmaron que el runtime era el código local, no un worktree ajeno ni una build obsoleta.

Conclusión: **el código nuevo local sí estaba siendo servido**. La discrepancia reportada no era caché ni proceso antiguo: la implementación anterior había convertido el modal en un overlay de viewport completo, pero conservaba una composición de modal y no reproducía el shell/estructura Stitch.

## Cambios A2

- Se eliminó la envoltura visual `products-modal-backdrop` para la alta de Productos.
- La edición se renderiza como superficie integrada al workspace y oculta el catálogo mientras está activa.
- Se conserva `role="dialog"` no modal para compatibilidad de accesibilidad y foco; `aria-modal="false"` y el body ya no se bloquea.
- Desktop ahora incluye shell real, breadcrumb, hero, selector de presentación, tarjeta de datos principales, valores simples, sección independiente de variantes y footer de acciones.
- Mobile usa composición vertical, tarjetas de variantes, navegación inferior existente y footer por encima de la navegación.
- La presentación simple oculta la matriz de variantes y muestra SKU, costo, precio y existencia en la sección principal.
- La información opcional se presenta en un acordeón, preservando carga de imagen y ubicación.
- Variantes conserva la matriz editable y su estado funcional.

## Comparaciones

Las imágenes `comparison-*-side-by-side.png` colocan Stitch a la izquierda y el runtime corregido a la derecha. `comparison-*-overlay.png` superpone ambas imágenes tras normalizar el ancho.

| Vista | Stitch | Runtime corregido | Side-by-side | Overlay |
| --- | --- | --- | --- | --- |
| Simple desktop | [original](../../diseno/desktop_crear_producto_simple/screen.png) | [runtime](dev-11r-visual-evidence/products-simple-corrected-desktop.png) | [comparación](dev-11r-visual-evidence/comparison-simple-desktop-side-by-side.png) | [overlay](dev-11r-visual-evidence/comparison-simple-desktop-overlay.png) |
| Variantes desktop | [original](../../diseno/desktop_crear_producto_con_variantes/screen.png) | [runtime](dev-11r-visual-evidence/products-variants-corrected-desktop.png) | [comparación](dev-11r-visual-evidence/comparison-variants-desktop-side-by-side.png) | [overlay](dev-11r-visual-evidence/comparison-variants-desktop-overlay.png) |
| Simple mobile | [original](../../diseno/mobile_web_crear_producto_simple/screen.png) | [runtime](dev-11r-visual-evidence/products-simple-corrected-mobile.png) | [comparación](dev-11r-visual-evidence/comparison-simple-mobile-side-by-side.png) | [overlay](dev-11r-visual-evidence/comparison-simple-mobile-overlay.png) |
| Variantes mobile | [original](../../diseno/mobile_web_crear_producto_con_variantes/screen.png) | [runtime](dev-11r-visual-evidence/products-variants-corrected-mobile.png) | [comparación](dev-11r-visual-evidence/comparison-variants-mobile-side-by-side.png) | [overlay](dev-11r-visual-evidence/comparison-variants-mobile-overlay.png) |

Viewports del runtime: desktop `1440x900`, mobile `390x844`. Las capturas se tomaron con datos E2E y el shell real de la aplicación.

## Geometría Revisada

- Desktop: el sidebar ocupa aproximadamente 300px del viewport de 1440px; el formulario queda dentro del área de workspace y ya no aparece como tarjeta modal centrada.
- Desktop: selector, datos principales, valores simples/matriz y acciones siguen una columna de contenido única con ancho útil amplio.
- Mobile: el contenido se apila a 390px; las variantes pasan a tarjetas y el footer queda sobre la navegación inferior.
- Mobile: el acordeón de información opcional permanece cerrado inicialmente, como en Stitch.

## Diferencias Pendientes

- Stitch usa datos demostrativos completos y una topbar/shell de referencia que no siempre coincide con el contenido real de sesión E2E.
- El modelo funcional actual no añade campos nuevos de API sólo para replicar textos demostrativos de Stitch.
- La matriz real conserva el contrato de variantes existente y puede mostrar más filas/errores que la composición estática del PNG.
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
