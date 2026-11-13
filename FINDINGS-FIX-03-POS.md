# Findings — FIX-03 POS

## Resultado

**Rubric POS: 9/9 criterios PASS.** La evidencia nueva cierra los dos hallazgos históricos de POS. El reporte QA full no está globalmente aprobado: su estado general es **FAIL** por cobertura restante y baselines visuales no ejecutados; ese resultado se conserva y se reporta por separado.

Evidencia histórica: `qa/reports/2026-11-13T06-59-07-473Z-2581222/` registró 850px de ancho de documento en viewport 768px y la violación axe serious `label-content-name-mismatch` en `.pos-product-trigger`. El snapshot de error de Playwright estaba en `Devoluciones`: el test midió inmediatamente después de volver desde checkout sin esperar ni afirmar `/pos`. La causa del fallo de ancho fue **TEST_DEFECT**, una carrera de transición de ruta, no un elemento POS desbordado. La corrección de accesibilidad sí fue de aplicación.

Suite dirigida: `npm run test:e2e:pos`, **7/7 PASS**, con viewports 1440x900, 768x1024, 390x844 y 320x568 y casos de ventas, stock, roles y tenant. La regresión ahora afirma URL `/pos` y `.pos-page` antes de medir, y proporciona detalles del elemento infractor si falla. El trigger eliminó el `aria-label` en conflicto e incorpora `Ver producto` solo para lectores de pantalla, de modo que su nombre accesible conserva SKU/producto/disponibilidad visibles. Las aserciones comprueban nombre accesible, axe dirigido sin `label-content-name-mismatch`, foco visible y selección con Enter.

QA full: `qa/reports/2026-11-13T08-03-11-837Z-2677651/`. Playwright **105/105 PASS**; axe **0 violaciones**, incluido `/pos`; hallazgos responsive **0**, incluido POS. QA Lab global **FAIL** exclusivamente por 76 estados y 311 controles sin cobertura, 20 estados UNDETERMINED y un criterio de baselines visuales aprobados NOT_EXECUTED. Los baselines no se aprobaron ni generaron. Los cinco casos POS que previamente quedaron NOT_EXECUTED tras el fallo serial ahora se ejecutaron y pasaron en la suite POS 7/7 y en QA full.

Verificaciones adicionales: `npm run typecheck`, `npm run lint`, `npm test` (**73/73**) y E2E DB verify pasaron; la DB de verificación fue PostgreSQL 16, `lucem_retail_e2e` / `lucem_e2e`, `role_superuser=false`. Para FIX-03, los únicos archivos de implementación/prueba modificados fueron `src/components/pos/POSProductCard.tsx` y `e2e/dev-05/pos.spec.ts`. No hizo falta CSS: el ancho reportado provenía de la carrera de transición, no de overflow del POS.

## Criterios binarios

- [x] **1 · Ancho responsive — PASS.** Suite POS pasa en los cuatro viewports exigidos. La medición espera y valida estar en `/pos` y dentro de `.pos-page`; QA full reporta cero hallazgos responsive POS.
- [x] **2 · Nombre accesible — PASS.** Nombre del trigger incluye el producto/SKU visible; axe dirigido no detecta `label-content-name-mismatch`; QA full tiene cero violaciones axe, incluida la ruta POS.
- [x] **3 · Teclado y foco — PASS.** E2E POS verifica indicador de foco y activación con Enter para seleccionar el producto/variante.
- [x] **4 · Flujo y carrito — PASS.** Suite POS 7/7 pasa con los escenarios de ventas y los cinco casos POS antes diferidos ya ejecutados y aprobados.
- [x] **5 · Venta y stock — PASS.** Casos E2E POS de ventas y stock pasan; suite completa 7/7.
- [x] **6 · Roles y tenant — PASS.** Casos E2E POS de roles y aislamiento tenant pasan; suite completa 7/7.
- [x] **7 · Cinco ejecuciones diferidas — PASS.** Los cinco casos POS que antes estaban NOT_EXECUTED se ejecutaron y pasaron en la nueva suite 7/7 y en el QA full final.
- [x] **8 · Minimalidad e integridad — PASS.** FIX-03 se limitó al markup semántico del trigger y a su regresión POS; no requirió CSS, no se aplicó ocultamiento global de overflow ni se cambiaron modelo/API. `npm run test:e2e:pos` terminó PASS 7/7.
- [x] **9 · QA full separado — PASS para POS.** Corrida full registrada; evidencia específica de POS pasa en Playwright, axe y responsive. El estado global QA Lab permanece FAIL y no se presenta como PASS; baselines siguen NOT_EXECUTED sin aprobación ni generación.

## Abiertos

- El QA Lab full conserva **76 estados y 311 controles sin cobertura**, además de **20 estados UNDETERMINED**. No son fallos POS, pero el resultado global sigue FAIL.
- Baselines visuales aprobados: **NOT_EXECUTED**. No se generaron ni aprobaron; no se atribuye un pase visual.

## Resueltos

- [x] Medición incorrecta de ancho por carrera de transición de ruta: clasificada como **TEST_DEFECT** y corregida esperando/assertando `/pos` y `.pos-page` antes de medir.
- [x] Nombre accesible incompatible con texto visible en `.pos-product-trigger`: corregido en markup, con texto visible incorporado al nombre calculado y cobertura axe/E2E.
- [x] Cinco casos POS anteriormente NOT_EXECUTED: ejecutados y PASS en las corridas nuevas.
