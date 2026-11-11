# Contrato de calidad para funcionalidades nuevas

Todo cambio de Lucem Retail que añada una página, ruta API, formulario, modal, acción, rol, permiso o proceso comercial debe acompañar su código con cobertura declarativa y pruebas. El descubrimiento puede detectar rutas y superficies interactivas; no puede inferir por sí mismo el resultado de negocio.

## Lista obligatoria para Forge

1. Añadir/actualizar una capacidad con ID estable en `qa/features/registry.ts`.
2. Registrar rutas y métodos afectados, módulo, descripción, roles, criticidad y dependencias.
3. Declarar los estados observables (carga, vacío, error, validación, éxito, permisos) en `requiredStates`.
4. Añadir referencias a pruebas ejecutables y fixtures sintéticas propiedad de QA.
5. Declarar controles críticos de la página y sus flujos; no basta con que exista un botón.
6. Añadir invariantes de negocio sólo si ya están definidos por el producto y el esquema/código.
7. Añadir capturas requeridas por estado y viewport; incluir referencia Stitch aprobada si existe.
8. Añadir comprobaciones axe y responsive para los estados representativos.
9. Ejecutar `npx lucem-audit --coverage --changed`, pruebas del módulo y el perfil pertinente en `lucem_qa`.
10. Confirmar que el informe enlaza el ID de capacidad con el test, evidencia y resultado; dejar lo no ejecutado como `NOT_EXECUTED` o `BLOCKED`.

## Puerta CI

Una ruta nueva sin registro funcional produce `UNCOVERED` y falla la comprobación de cobertura de cambios. Una ruta registrada sin test válido también falla. Una ruta previa sin test permanece visible en la matriz; no se oculta para hacer verde el pipeline. Un estado de una capacidad existente descubierto en la UI pero ausente de `requiredStates`/declaración también aparece como superficie no registrada y no cuenta como PASS.

Las capacidades futuras pueden registrarse `implemented: false`, `status: NOT_IMPLEMENTED`; se documentan, pero no son aprobadas. Un test definido que no corrió queda `NOT_EXECUTED`; una precondición no disponible queda `BLOCKED`.

## Seguridad de datos

Los flujos mutables usan exclusivamente `QA_DATABASE_URL` para `lucem_qa` local. No reutilizar `DATABASE_URL`, la base E2E, staging, producción ni Cloudflare. Cada fixture debe tener namespace propio y cleanup en `finally`; los IDs que no pertenezcan a la ejecución no se borran. Ningún storageState, token, password, trace sin sanitizar, dump o dato personal real se comparte en el ZIP.
