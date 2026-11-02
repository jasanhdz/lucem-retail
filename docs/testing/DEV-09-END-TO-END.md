# DEV-09 End-to-End

## Alcance

Se validó el recorrido de un comerciante nuevo contra PostgreSQL E2E: registro, primer negocio, categoría inicial, productos, inventario, POS, ticket, apartado, conversión, devolución, Dashboard, logout y login posterior.

## Resultado

- DEV-09 integral: `1/1 PASS`.
- DEV-06 reservas dirigido: `7/7 PASS`.
- DEV-07 devoluciones dirigido: `7/7 PASS`.
- DEV-05 POS dirigido: `6/6 PASS`.
- DEV-04 inventario dirigido: `6/6 PASS`.
- DEV-03 productos dirigido: `14/14 PASS`.
- Unitarias: `24/24 PASS`.
- Lint, typecheck, Prisma validate, build y `git diff --check`: PASS.

## Preparación y cleanup

Se usó exclusivamente Docker Engine con PostgreSQL 16, contenedor `lucem-retail-dev-09-db`, volumen `lucem-retail-dev-09-pg`, base `lucem_retail_e2e`, usuario `lucem_e2e`, host loopback y puerto `55432`. Se aplicaron las migraciones 0001–0004. La segunda preparación indicó `No pending migrations to apply` y el seed esperó a finalizar antes de retornar.

El namespace DEV-09 se eliminó mediante teardown transaccional. El cleanup E2E finalizó sin residuos y se retiraron únicamente el contenedor y volumen de pruebas. La base de desarrollo en `5432` no se utilizó.

## Defectos corregidos

- La preparación E2E esperaba incorrectamente el seed; ahora `prepare.ts` aguarda `seedE2e()`.
- Un negocio nuevo no tenía categorías, bloqueando el primer producto; la creación transaccional ahora genera `General`.
- El Dashboard tenía overflow horizontal a 768px por el topbar; se ajustó el layout tablet.
- La expectativa POS esperaba `NORMAL` aunque `LOW` era la última variante habilitada; se corrigió la prueba, manteniendo el comportamiento accesible real.

## Riesgos residuales

- La renovación de actividad se desliza en PostgreSQL, pero la cookie conserva su `Max-Age` original porque no puede mutarse desde Server Components. Se documenta en la revisión de auth de DEV-08; requiere middleware o Route Handler dedicado si el producto exige extender también la expiración del navegador.
- Las escrituras de auditoría posteriores a algunas transacciones heredadas no forman parte del alcance DEV-09; devoluciones sí conserva auditoría dentro de la transacción y rollback verificado.

Capturas sanitizadas: `docs/testing/dev-09-visual-evidence/` en 1440x900, 768x1024 y 390x844.
