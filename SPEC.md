## Objetivo
Corregir la exposición de datos de autenticación en `GET /api/audit` seleccionando explícitamente sólo los campos legítimos del usuario, conservar sus contratos de autorización y aislamiento por negocio, y demostrarlo con pruebas reales contra una DB E2E aislada.

## Scope
**Incluye**

- Cambiar únicamente la consulta de `app/api/audit/route.ts`: reemplazar `include: { user: true }` por una relación `user` con `select` explícito.
- Permitir sólo `id`, `name`, `email` y `active` si cada campo es necesario para identificar al actor y mostrar su estado en la auditoría; si un consumidor no justifica alguno, seleccionar sólo el subconjunto justificado.
- Mantener `getAuth()`, el requisito de negocio activo, la autorización exclusiva `ADMIN`, las respuestas `401` y `403`, el límite de 100 filas, el orden descendente y `where.businessId === auth.business.id`.
- Añadir la evidencia de seguridad en `docs/security/DEV-SEC-01-AUDIT.md`, incluyendo comandos, resultados, alcance, limitaciones, warning de riesgo de producción y el commit exacto.
- Añadir pruebas unitarias/regresión del contrato de selección o del handler según el patrón existente, además de una suite dirigida DEV-SEC con requests HTTP reales contra PostgreSQL E2E.

**Fuera de alcance y prohibiciones**

- No modificar `prisma/schema.prisma`, migraciones, seed productivo, modelos, relaciones, contraseñas, hash de contraseñas, sesiones, tokens, permisos generales, UI, consumidores no relacionados, dependencias o infraestructura.
- No devolver, seleccionar, serializar ni copiar `passwordHash`, `tokenHash`, sesiones, cookies, tokens, credenciales ni otros datos de autenticación. La respuesta de auditoría no debe incluir relaciones anidadas de `User`.
- No debilitar `ADMIN`, no convertir `401` en `403`, no convertir `403` en `200` y no eliminar el aislamiento `businessId`.
- Hasta este SPEC, las suites legacy y la corrida E2E global no pueden llamar `GET /api/audit`, ni desde setup, fixtures, smoke, browser, traces o tests compartidos. La suite DEV-SEC es la única excepción y sólo puede llamar el endpoint contra la DB E2E aislada y validada; nunca contra desarrollo, producción o una DB compartida.
- No ejecutar `npm run test:e2e` global ni suites legacy como evidencia de DEV-SEC. No usar mocks, sesiones fabricadas, SQL de sesión, `addCookies`, `document.cookie`, headers inventados, `DATABASE_URL` como fallback ni credenciales demo.

## User flows
1. **Preflight aislado** — Registrar branch, `git rev-parse HEAD` y `git status --short` sin secretos. Validar `E2E_DATABASE_URL` con host loopback, usuario `lucem_e2e`, base `lucem_retail_e2e` y puerto `55432`; si falta o falla la guarda, emitir `BLOCKED: E2E PostgreSQL unavailable: ...` sin usar otra DB.
2. **Preparación E2E** — Iniciar únicamente la infraestructura E2E ya documentada con `docker run` y los recursos exclusivos de DEV-TEST-01; ejecutar `npm run e2e:prepare`. Aplicar las migraciones existentes sólo para preparar la DB aislada y usar el namespace existente, sin modificar schema ni migraciones.
3. **401 sin sesión** — Con un `APIRequestContext` sin cookies, solicitar `GET /api/audit` contra el servidor DEV-SEC levantado con la DB E2E. Esperar `401`, sin inspeccionar registros ni aceptar un fallback de base de datos.
4. **403 por rol** — Autenticar mediante el flujo real `POST /api/auth/login` y sesión real de Playwright/API. Con una sesión `SELLER` y otra `INVENTORY_MANAGER`, seleccionar un negocio al que pertenezcan y solicitar `GET /api/audit`; esperar `403` en ambos casos. No usar estas sesiones para probar un `200` ni modificar permisos.
5. **200 de ADMIN y contrato seguro** — Autenticar un `ADMIN` mediante login real, seleccionar un negocio real de la DB E2E y solicitar `GET /api/audit`. Esperar `200`, arreglo JSON y filas auditadas con el contrato existente; cada `user`, si está presente, sólo puede contener los campos seleccionados legítimos (`id`, `name`, `email`, `active`, o el subconjunto justificado).
6. **Escaneo recursivo sensible** — Recorrer recursivamente todo el JSON de la respuesta `200`, incluyendo arreglos y objetos anidados. Fallar si aparece cualquier clave case-insensitive igual o equivalente a `passwordHash`, `tokenHash`, `password`, `token`, `session`, `sessions`, `cookie`, `secret` o material auth equivalente; no comparar ni registrar valores sensibles.
7. **Aislamiento por negocio** — Con el mismo `ADMIN`, seleccionar Centro y Norte usando `POST /api/businesses/select` real y llamar `GET /api/audit` en cada contexto. Verificar que las filas de cada respuesta sólo tienen `businessId` del negocio activo, que un registro exclusivo del otro negocio no aparece y que el límite/orden se conserva. Usar IDs deterministas del namespace E2E, no IDs de producción.
8. **Regresión y cierre** — Ejecutar el test unitario/regresión enfocado, verificar que no quedan llamadas a `/api/audit` fuera de DEV-SEC en suites legacy/global, ejecutar lint, typecheck, tests, build y el E2E dirigido DEV-SEC. Ejecutar `npm run e2e:cleanup` con la misma URL y eliminar sólo los recursos E2E propios, incluso tras fallos; documentar resultados y teardown en `docs/security/DEV-SEC-01-AUDIT.md`.

## Modelo de datos
- Se conserva sin cambios el modelo Prisma. `AuditLog` contiene `id: String`, `businessId: String?`, `userId: String?`, `action: String`, `entityType: String`, `entityId: String?`, `metadata: Json` y `createdAt: DateTime`; su relación opcional `user` apunta a `User`.
- `User` contiene `id: String`, `email: String`, `name: String`, `passwordHash: String`, `active: Boolean`, timestamps y relaciones a `Membership`, `Session`, ventas, movimientos, apartados, devoluciones y auditoría.
- La consulta no cambia tablas ni relaciones: filtra `AuditLog.businessId` con el negocio activo y, cuando existe `user`, proyecta sólo `id`, `name`, `email` y `active` o el subconjunto documentado como necesario. `passwordHash` queda fuera por diseño.
- `Session` (`userId`, `activeBusinessId`, `tokenHash`, expiración y actividad) no se selecciona ni se serializa. `Membership` tampoco se incluye en la respuesta; sus datos sólo participan en `getAuth()` y en la decisión ADMIN.
- `metadata` se conserva como dato del evento existente, pero la prueba recursiva inspecciona la respuesta completa y rechaza claves sensibles aunque aparezcan dentro de `metadata` u otra estructura anidada.
- El dataset de prueba es el namespace E2E existente, con negocios Centro/Norte, usuarios ADMIN/SELLER/INVENTORY_MANAGER y registros de auditoría identificables por negocio. Cleanup debe respetar foreign keys y no tocar datos fuera de ese namespace.

## Stack y decisiones técnicas
- Mantener Next.js `15.3`, React `19`, TypeScript, Prisma `6.7`, PostgreSQL `16-alpine`, Playwright `1.51`, Vitest y los scripts existentes. No agregar dependencias.
- La implementación se limita a `app/api/audit/route.ts`; la prueba unitaria/regresión se ubica en `tests/` siguiendo Vitest y el E2E dirigido en `e2e/dev-sec-01/` o la carpeta DEV-SEC equivalente que ya exista. La evidencia se escribe en `docs/security/DEV-SEC-01-AUDIT.md`.
- Preferir `select: { user: { select: { ... } } }` con una lista positiva y tipada. No usar `include: { user: true }`, serialización manual de un `User` completo, allowlist posterior al `findMany` ni consultas que carguen relaciones auth innecesarias.
- Conservar el handler como autoridad server-side: `getAuth()` primero, ausencia de negocio `401`, `permitted(..., [Role.ADMIN])` `403`, y consulta limitada al `businessId` activo. No cambiar contratos de error o paginación existentes.
- La suite DEV-SEC debe usar `playwright.e2e.config.ts` o una configuración enfocada equivalente con `E2E_DATABASE_URL` validada y servidor en loopback. Puede llamar `GET /api/audit` únicamente en ese proceso y contra esa DB; el escaneo sensible debe ser recursivo y no imprimir payloads completos.
- Secuencia requerida: `npm run e2e:prepare`; test E2E DEV-SEC enfocado con `CI=1` y reporter list; `npm run e2e:cleanup`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `git diff --check`. No ejecutar `npm run test:e2e` global.
- Si Docker, PostgreSQL, guardas, migración, autenticación o cleanup no están disponibles, registrar el comando y salida sanitizada como `BLOCKED`; no degradar a mocks ni a una base alternativa. La evidencia final debe incluir el warning literal `GET /api/audit exposes passwordHash` y declarar el riesgo de producción hasta que la corrección sea implementada y verificada.
- El commit requerido para esta especificación es exactamente `docs(spec): plan DEV-SEC-01 audit security fix`; no hacer push ni merge.

## Assumptions
- El endpoint actual sigue siendo `GET /api/audit`, requiere sesión con negocio activo y está restringido a `ADMIN`; esos contratos son requisitos de preservación, no decisiones para relajar.
- `id`, `name`, `email` y `active` son los únicos campos de `User` potencialmente justificables para identificar al actor y mostrar su estado; si los consumidores actuales no necesitan todos, la implementación debe seleccionar menos, nunca más.
- Los consumidores existentes no requieren `passwordHash`, `tokenHash`, sesiones, membresías completas ni cualquier relación auth para representar una fila de auditoría. Si una prueba descubre lo contrario, se trata como defecto de diseño y no se amplía este scope.
- Los registros de auditoría de prueba pueden contener `metadata` creada por operaciones existentes; el scan recursivo es obligatorio precisamente para impedir que un secreto sobreviva fuera de la relación `user`.
- La DB E2E es desechable, aislada y namespaceada; la ausencia de `E2E_DATABASE_URL` bloquea la validación y nunca autoriza usar `DATABASE_URL`.
- El alcance de prohibición de `GET /api/audit` para suites legacy/global rige hasta este SPEC: la suite DEV-SEC sí debe ejercer el endpoint, pero exclusivamente en la DB E2E aislada, con credenciales ficticias no versionadas y sin reutilizar sus resultados en otras suites.
- El warning de producción permanece durante el estado Planner y hasta que un cambio posterior implemente la selección segura y la evidencia requerida. Este commit sólo reemplaza `SPEC.md`.

## Rubric de evaluación
Todos los criterios son binarios. `PASS` exige evidencia reproducible del comando, código HTTP, rol, negocio, DB E2E y artefacto; `FAIL` contradice el contrato; `BLOCKED` sólo aplica a infraestructura/autorización imprescindible y nunca cuenta como PASS.

1. **Selección positiva** — Inspección y regresión demuestran que `include: { user: true }` fue reemplazado por `user.select` explícito; el diff no modifica schema, migraciones, password changes, UI o dependencias.
2. **Campos seguros** — La respuesta `200` sólo expone `User.id`, `name`, `email`, `active` o el subconjunto justificado; no expone `passwordHash`, `tokenHash`, sesiones, membresías ni relaciones auth.
3. **401 preservado** — Request real sin sesión a `GET /api/audit` contra DB E2E devuelve exactamente `401` y no usa otra DB.
4. **SELLER 403** — Sesión real `SELLER` con negocio válido recibe exactamente `403` en `GET /api/audit`.
5. **INVENTORY_MANAGER 403** — Sesión real `INVENTORY_MANAGER` con negocio válido recibe exactamente `403` en `GET /api/audit`.
6. **ADMIN 200** — Sesión real `ADMIN` recibe exactamente `200` y un arreglo JSON de auditoría contra la DB E2E.
7. **Escaneo recursivo** — El test recorre todo el JSON y falla ante `passwordHash`, `tokenHash`, password, token, session, cookie, secret o equivalente sensible en cualquier profundidad; no imprime valores.
8. **Aislamiento** — ADMIN obtiene sólo filas del negocio seleccionado en Centro y Norte; no aparece ningún registro, `businessId` o dato del otro negocio.
9. **Guardas preservadas** — El route mantiene `getAuth`, negocio activo, `permitted(..., [Role.ADMIN])`, `401`, `403`, orden descendente y `take: 100`; el test unitario/regresión cubre la matriz mínima.
10. **Prohibición de suites** — La búsqueda y ejecución confirman que legacy/global no llama `GET /api/audit`; toda llamada existente del endpoint pertenece exclusivamente al E2E DEV-SEC contra la DB E2E.
11. **Checks del proyecto** — `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y `git diff --check` terminan con código 0; el E2E dirigido real termina PASS o queda BLOCKED con la razón exacta, sin convertir mocks en evidencia.
12. **Evidencia y cierre** — `docs/security/DEV-SEC-01-AUDIT.md` registra comandos, resultados, cleanup, warning literal `GET /api/audit exposes passwordHash`, riesgo de producción, commit exacto `docs(spec): plan DEV-SEC-01 audit security fix`, y no contiene secretos; no se hace push ni merge.
