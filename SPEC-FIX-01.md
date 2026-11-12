# FIX-01 — Corrección de consulta de catálogo

## Objetivo
Corregir la consulta dinámica del catálogo que provoca PostgreSQL `42601` cuando se busca un producto.

## Scope
Inspeccionar y corregir únicamente la composición SQL de `GET /api/products`, preservar filtros, ordenamiento, paginación, resúmenes, categorías, variantes y aislamiento por negocio. Añadir una regresión QA reproducible contra `lucem_qa` y ejecutar regresiones existentes de productos, POS, devoluciones y seguridad. No cambiar reglas de negocio ni fixtures comerciales; no modificar `SPEC.md`, cambios DEV-DATA-01, staging, Cloudflare o n8n.

## User flows
1. ADMIN centro solicita el catálogo paginado, búsquedas por nombre y SKU, sin resultados, filtros por categoría/disponibilidad/stock, órdenes admitidos, páginas y resúmenes; todas las respuestas conservan su contrato JSON.
2. ADMIN centro busca por SKU exclusivo de Norte y recibe cero productos; ADMIN Norte lo encuentra en su negocio. No se revelan IDs, variantes ni conteos de otro negocio.
3. Una regresión Playwright ejecuta primero contra PostgreSQL `lucem_qa`; antes del arreglo falla con la respuesta 500/SQL inválida al usar `q`, y después pasa todas las aserciones funcionales.
4. Las suites existentes de productos, POS, devoluciones y seguridad vuelven a ejecutarse sin debilitar aserciones. Fallos ajenos quedan identificados y con estado explícito.

## Modelo de datos
Sin cambios de esquema, migraciones ni nuevos campos. Reutiliza productos, categorías, variantes y dos negocios sintéticos ya provisionados en `lucem_qa`.

## Stack y decisiones técnicas
Next.js Route Handler, TypeScript, Prisma `Prisma.sql`/`Prisma.join`, PostgreSQL y Playwright existente. La prueba se añade a `e2e/dev-03/products.spec.ts`, usa datos de `scripts/e2e/seed.ts`, contexto ADMIN-centro/ADMIN-norte y limpieza `afterAll` existente. No se permite `$queryRawUnsafe`, concatenación de valores en SQL ni fallback de base.

## Assumptions
- La evidencia QA del 2026-11-12 y la reproducción local identifican un error de sintaxis en SQL parametrizado de la búsqueda `q`; la línea del `Promise.all` es el punto de ejecución, no necesariamente la causa.
- La base de reproducción es exclusivamente `lucem_qa` en loopback:55433. Preflight e identidad se validan antes de cada setup.
- `SPEC.md` y los cambios locales DEV-DATA-01 son trabajo ajeno a FIX-01 y permanecen intactos.

## Rubric de evaluación
1. La prueba de regresión se ejecuta contra `lucem_qa`, falla antes del arreglo por error SQL en búsqueda y pasa después sin modificar sus aserciones.
2. Catálogo sin query, búsqueda por nombre/SKU/sin resultados, categoría, filtros de inventario, todos los sorts y paginación responden con status/JSON válidos y resumen coherente.
3. Una búsqueda de SKU Norte en Centro no revela productos Norte; la misma búsqueda en Norte encuentra sólo resultados de ese negocio. La composición mantiene filtros parametrizados con `Prisma.sql`.
4. Suites de productos, POS, devoluciones y seguridad ejecutadas producen resultados registrados; no se modifican aserciones ni se afirma PASS para casos no corridos.
5. Typecheck, lint y suite unitaria pasan; `git diff` confirma que no se tocaron migraciones, staging, Cloudflare, n8n, cambios DEV-DATA-01 ni `SPEC.md`.
