# FIX-03 — POS responsive y accesibilidad

## Objetivo
Corregir el desbordamiento horizontal de 82px del POS en tablet y la violación seria de nombre accesible del control `.pos-product-trigger`, preservando los flujos comerciales y la interacción accesible.

## Scope
Incluye diagnosticar y corregir la pantalla `/pos` y el punto de selección de producto en `/pos/cobro` a partir de `qa/reports/2026-11-13T06-59-07-473Z-2581222/`: el test midió `document.documentElement.scrollWidth` de 850px en viewport tablet 768px (82px de exceso), y axe registró `label-content-name-mismatch` de impacto serious en `.pos-product-trigger` porque el texto visible no forma parte del nombre accesible. Resolver con cambios mínimos y localizados de CSS/estructura semántica, sin ocultar el defecto mediante `overflow-x: hidden` global.

Validar viewports exactos: desktop 1440x900, tablet 768x1024, mobile 390x844 y estrecho 320x568. Mantener usable el catálogo/búsqueda, selección de variantes, carrito, cantidades, validación de pago, confirmación y ticket; conservar contrato de venta, comprobaciones de stock, aislamiento por negocio y permisos de roles. Mantener foco visible y recorrido/activación por teclado. Añadir aserciones de regresión de ancho, nombre accesible y comportamiento de teclado en los tests POS existentes o el test Playwright específico correspondiente.

Fuera de alcance: rediseño del POS, cambios de modelo/migraciones o API salvo evidencia imprescindible (en cuyo caso se documenta antes de ampliar), cambios a las reglas comerciales, arreglo de módulos no POS, alteraciones de las suites/artefactos QA para maquillar resultados, y aprobar o generar automáticamente baselines visuales.

## User flows
1. ADMIN o SELLER entra a `/pos`; la interfaz cabe en el ancho disponible en los cuatro viewports, mantiene controles y contenido legibles y no crea scroll horizontal del documento.
2. El usuario localiza producto mediante búsqueda y activa un `.pos-product-trigger` con puntero o teclado. El botón conserva texto visible y nombre accesible que lo incluye; foco se muestra y la selección ofrece la variante disponible sin perder contexto.
3. El usuario añade artículos al carrito, modifica cantidades y continúa navegando los controles con Tab/Shift+Tab y teclado. El contenido no queda recortado ni controles relevantes fuera del viewport, también a 320px.
4. Usuario intenta pagar efectivo con importe insuficiente: se comunica el error, el foco sigue operativo y carrito/cantidades permanecen intactos. Con importe válido o método CARD/TRANSFER, confirma la venta una sola vez y recibe ticket; stock disminuye exactamente según la venta.
5. Ante stock insuficiente o conflicto concurrente, se informa el fallo sin venta parcial ni carrito inaccesible. Seller puede operar la venta permitida, pero no obtiene permisos de administración de producto; IDs de variante de otro negocio se rechazan según el contrato existente.

## Modelo de datos
Sin cambios de datos ni schema. Se conservan las entidades y contratos actuales `Product`, `ProductVariant` (incluido SKU, opciones/variante, precio y stock), `Sale`, `SaleLine`, `InventoryMovement`, negocio, usuario y membresía/rol, junto con sus relaciones y restricciones existentes. La reparación se limita a presentación, semántica de controles y pruebas de regresión salvo necesidad concreta documentada.

## Stack y decisiones técnicas
Usar Next.js 15, React 19, TypeScript, Tailwind CSS 4 y patrones CSS/semánticos existentes; Playwright 1.51 y `@axe-core/playwright` 4.14 para verificación. Inspeccionar primero reglas de layout del POS y ancestría de `.pos-product-trigger`; corregir el origen local del ancho (por ejemplo dimensiones mínimas, grid/flex, contenido largo o controles) y no aplicar una supresión global del overflow. Dar al trigger nombre accesible congruente con su texto visible mediante semántica nativa/etiquetado correcto, no `aria-label` contradictorio. Mantener foco visible y comportamiento nativo de botón.

Pruebas dirigidas: `npm run test:e2e:pos` (usa `playwright.pos.config.ts`, suite `e2e/dev-05/pos.spec.ts`). Regresión automatizada con `document.documentElement.scrollWidth <= viewport.width` en los cuatro tamaños, axe sin violaciones serious/critical POS, comprobación de que el nombre accesible incluye el texto visible del trigger y flujo por teclado. Ejecutar `npm run qa:full` después de la suite dirigida. Guardar evidencia reproducible en los directorios de reporte/playwright configurados por los runners, sin editar el reporte fuente.

## Assumptions
- La diferencia de 82px corresponde a 850px de ancho documentado menos 768px, según `functional-playwright-pos-config-ts.log`; el resumen general responsive con cero fallos no invalida este test POS específico ni reemplaza sus viewports.
- Los cinco casos POS marcados NOT_EXECUTED en `FUNCTIONAL-REPORT.md` son brechas de cobertura, no aprobaciones: `PW-9072e0861a5edc52` (venta CASH, ticket y un decremento), `PW-828c7949b2c1d9c2` (CARD, TRANSFER e idempotencia), `PW-b173c4b6cd1b6a03` (conflicto concurrente y aislamiento), `PW-c1cd95fc7e7fb14e` (Seller y contrato de permisos), y `PW-06aa30f00ce27b79` (persistencia tenant y rechazo de variante cruzada). Deben ejecutarse y pasar con evidencia nueva.
- Los casos no ejecutados se deben a que Playwright detuvo la suite tras fallar el test de viewports. No recategorizar el resultado histórico como PASS.
- Baselines visuales ausentes siguen siendo NOT_EXECUTED hasta una revisión humana explícita de capturas comparadas y aprobación deliberada. La ausencia de baseline no es un pase visual ni bloquea inferir que un cambio visual quedó aprobado.
- El reporte full incluye cobertura y fallos de otras áreas; evaluar el resultado POS enfocado por separado del estado global del full.

## Rubric de evaluación
Cada criterio es binario; PASS requiere evidencia nueva y reproducible. Para la suite enfocada ejecutar `npm run test:e2e:pos`; para evaluación integral ejecutar `npm run qa:full`. Registrar el directorio de corrida nuevo indicado en su salida bajo `qa/reports/` y revisar `FUNCTIONAL-REPORT.md`, `ACCESSIBILITY-REPORT.md`, `responsive/overflow-findings.json`, `RUN-RESULT.json` y capturas asociadas. Comparar con el histórico `qa/reports/2026-11-13T06-59-07-473Z-2581222/`, sin modificarlo.

1. **Ancho responsive:** el test Playwright visita 1440x900, 768x1024, 390x844 y 320x568; en cada tamaño `document.documentElement.scrollWidth <= window.innerWidth`, y `responsive/overflow-findings.json` de la corrida nueva no registra overflow horizontal POS. Ningún CSS global oculta overflow.
2. **Nombre accesible:** axe en vista POS no reporta `label-content-name-mismatch` en `.pos-product-trigger`; el nombre accesible incluye el texto visible de cada trigger. La corrida nueva en `ACCESSIBILITY-REPORT.md` no tiene violaciones serious/critical en POS.
3. **Teclado y foco:** test Playwright verifica que el trigger se alcanza por Tab, muestra foco visible y se activa con Enter/Espacio para seleccionar la variante, sin trampa o pérdida de foco; acciones principales de carrito/cobro son alcanzables y operables por teclado.
4. **Flujo y carrito:** los tests de búsqueda/selección, variantes, cantidades y validación de efectivo pasan; efectivo insuficiente conserva carrito y cantidades, y el flujo válido produce ticket sin duplicar venta.
5. **Venta y stock:** caso CASH confirma ticket y exactamente un decremento de stock; CARD y TRANSFER conservan resultados monetarios/contrato existentes y replay idempotente no duplica venta ni movimientos. Se comprueba stock insuficiente/conflicto sin mutación parcial.
6. **Roles y tenant:** caso Seller confirma uso permitido de venta y denegación de mutación de productos; el detalle queda en el negocio correcto y se rechaza una variante ID de otro negocio. No cambian endpoints, autorización ni reglas de stock.
7. **Cinco ejecuciones diferidas:** en la salida Playwright nueva y `FUNCTIONAL-REPORT.md` de la corrida, los cinco IDs `PW-9072e0861a5edc52`, `PW-828c7949b2c1d9c2`, `PW-b173c4b6cd1b6a03`, `PW-c1cd95fc7e7fb14e` y `PW-06aa30f00ce27b79` ya no figuran NOT_EXECUTED y cada caso pasa con evidencia; fallos son FAIL, no se aceptan como brechas aprobadas.
8. **Minimalidad e integridad:** diff de implementación se limita a CSS/markup semántico y aserciones de regresión POS, sin cambios de schema/API ni `overflow-x: hidden` global; `npm run test:e2e:pos` termina código 0 y evidencia PASS de todos sus casos.
9. **Resultado QA full separado:** ejecutar `npm run qa:full` y conservar íntegro su resultado. El criterio POS se considera satisfecho sólo si evidencias específicas de POS en `FUNCTIONAL-REPORT.md`, axe y responsive pasan; el estado general del full se reporta por separado y puede seguir FAIL por hallazgos de otras áreas, sin atribuirlos ni ocultarlos. El histórico esperado es 1 fallo responsive POS (850>768), 5 casos POS NOT_EXECUTED y la violación axe serious indicada; la ejecución nueva debe demostrar el cierre de esos hallazgos POS. Baselines sin aprobación humana explícita permanecen NOT_EXECUTED, aunque el resto de criterios pase.
