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

## DEV-08 — Registro y onboarding de negocio

### Alcance

- Implementar registro con validación de nombre, correo, contraseña, confirmación y términos.
- Crear sesión real después del registro y dirigir a usuarios sin negocio al onboarding.
- Crear negocios sólo para el usuario autenticado, con giro controlado, sucursal principal y membresía `ADMIN`.
- Mantener aislamiento por membresía, selección segura de negocio e idempotencia persistida para evitar duplicados.
- Verificar el flujo completo con PostgreSQL E2E dedicado, capturas responsive y regresión del proyecto.

### Fuera de alcance

- No simular ni agregar OAuth mientras Google/Facebook no estén configurados.
- No modificar las referencias Stitch originales ni mezclar datos E2E con desarrollo/producción.
- No iniciar módulos fuera de onboarding.

### Rutas y contratos

- `POST /api/auth/register` devuelve `201` y crea sesión; correo duplicado devuelve `409`.
- `POST /api/auth/login` devuelve `/negocios/crear` para usuarios sin membresías.
- `POST /api/businesses` exige `Idempotency-Key`, valida el giro y crea negocio, membresía ADMIN, sesión activa y auditoría dentro de una transacción serializable.
- `GET /api/businesses` devuelve sólo negocios de las membresías del usuario autenticado.

### Validación

- Suite dirigida: `CI=1 npm run test:e2e:onboarding -- --reporter=list` con `E2E_DATABASE_URL` validada.
- Regresión: lint, typecheck, tests, Prisma validate, build y `git diff --check`.
- Evidencia visual: `docs/ui-redesign/dev-08-visual-evidence/` en 1440x900, 768x1024 y 390x844.
- Resultado DEV-08B: E2E `2/2`, auth/isolation `15/15`, unitarias `24/24`, cleanup `0|0|0`; Docker Compose no disponible, se usó sólo Docker Engine con PostgreSQL E2E dedicado.

## DEV-09 — Validación integral del recorrido comercial

### Alcance

- Validar con PostgreSQL E2E aislado el recorrido de comerciante nuevo desde registro hasta venta, apartado, conversión, devolución, Dashboard y re-login.
- Comprobar persistencia, cantidades, Kardex, tickets, auditoría transaccional, idempotencia, concurrencia, permisos, aislamiento y responsive en los módulos ya implementados.
- Corregir únicamente defectos de integración reproducibles; no agregar módulos ni rediseñar pantallas.

### Resultado y rubric

- DEV-09 integral debe pasar mediante `CI=1 npm run test:e2e:dev-09 -- --reporter=list` sin mocks ni base compartida.
- Productos, inventario, POS, apartados y devoluciones deben conservar sus suites dirigidas PASS.
- Cada balance debe satisfacer `physical = available + reserved`, sin saldos negativos ni movimientos duplicados.
- El usuario nuevo debe obtener categoría `General`, negocio ADMIN, persistencia de operaciones y acceso posterior al mismo negocio.
- Las capturas deben cubrir 1440x900, 768x1024 y 390x844 sin overflow horizontal.

## DEV-10 — Estabilización de sesiones y consistencia de auditoría comercial

### Alcance

- Mantener una política de sesión sliding idle de 30 minutos con renovación sólo desde Route Handlers, umbral de cinco minutos, cookie `HttpOnly`/`SameSite=Lax`/`Secure` en producción y validación de usuario, sesión y membresía.
- Hacer atómicas las auditorías de ventas, inventario, apartados, productos, cancelaciones, creación de negocio y devoluciones usando el `Prisma.TransactionClient` existente.
- Probar fallos de auditoría sólo con PostgreSQL E2E dedicado y controles explícitos; no exponer inyección de fallos en producción.

### Resultado y rubric

- DEV-10 debe pasar `npm run test:e2e:dev-10` con cookie y `Session.expiresAt` coherentes, sin renovar sesiones revocadas y con logout efectivo.
- Un fallo de auditoría debe revertir completamente la operación comercial, stock, Kardex, reservas, auditoría e idempotencia aplicables; el retry debe ser seguro y no duplicar movimientos.
- Deben pasar DEV-09, suites dirigidas de productos/inventario/POS/apartados/devoluciones, auth, unit tests, lint, typecheck, Prisma validate, build y `git diff --check`.
- Contratos y riesgos quedan documentados en `docs/security/DEV-10-SESSION-LIFECYCLE.md` y `docs/security/DEV-10-COMMERCIAL-AUDIT.md`.

## DEV-11 — Auditoría y cierre visual contra Google Stitch

### Alcance

- Inventariar recursivamente todos los pares `screen.png`/`code.html` de `diseno/` sin modificar las referencias originales.
- Comparar runtime real en 1440x900, 768x1024 y 390x844 contra Stitch; corregir diferencias visuales P0/P1 reproducibles sin agregar módulos ni alterar reglas comerciales.
- Mantener fuera de alcance Reportes, Administración de empleados y configuraciones nuevas; Dashboard, Apartados y Devoluciones sólo se capturan como superficies MVP cuando no exista referencia Stitch dedicada.

### Resultado y rubric

- DEV-11 debe entregar `docs/ui-redesign/DEV-11-STITCH-FINAL-AUDIT.md`, `DEV-11-VIEW-COVERAGE.md` y evidencia runtime sanitizada en `docs/ui-redesign/dev-11-visual-evidence/`.
- La matriz debe declarar el total real de referencias, equivalentes implementados, N/A justificados y P0/P1/P2 abiertos; no afirmar cobertura total si una referencia queda fuera del alcance aprobado.
- Deben pasar DEV-09, las suites dirigidas de las pantallas modificadas, unitarias, lint, typecheck, Prisma validate, build y `git diff --check`.

## DEV-03 — Catalogo de productos y variantes

### Scope

**Incluye**

- Reemplazar el placeholder de `/productos` por catalogo responsive con busqueda, filtros, estados de carga/error/vacio, tarjetas/lista, detalle, alta simple, alta con variantes y edicion.
- Reusar exclusivamente los contratos existentes: `GET /api/categories`; `GET,POST /api/products`; `GET,PUT,DELETE /api/products/:id`; `GET /api/products/:id/history`; `POST /api/products/image`; `GET /api/products/image/:filename`.
- Mantener el shell, contexto de negocio, navegacion y roles existentes, con dialogos accesibles y adaptacion 1440x900, 768x1024 y 390x844.
- Cubrir visualmente catalogo, formularios, variantes, detalle, edicion, validacion y errores con fuentes documentadas en `docs/ui-redesign/DEV-03-DESIGN-MAPPING.md`.

**Fuera de alcance y prohibiciones**

- No modificar `prisma/schema.prisma`, migraciones, seed, auth, permisos, contratos API, servicios server, reglas de negocio ni `docs/security/DEV-SEC-01-AUDIT.md`.
- No crear endpoints nuevos para categorias, variantes, auto-SKU, sincronizacion, promociones temporales, margen, terminales o kárdex.
- No hacer inventario operativo desde editar producto: el `PUT` actual no actualiza stock de variantes existentes. No implementar borrado fisico; `DELETE` archiva.
- No mezclar la evidencia de `e2e/products.spec.ts` legacy con la nueva evidencia: la suite existente esta omitida por `LEGACY UI` y se conserva intacta.

### Flujos ejecutables

1. Sesion: autenticar por flujo real, seleccionar negocio y abrir `/productos`; sin sesion, la ruta redirige y las APIs devuelven `401`.
2. Catalogo: cargar categorias y variantes, agrupar por `product.id`, mostrar nombre, SKU, categoria, ubicacion, precio, costo, stock y estado; probar busqueda por nombre/SKU/ubicacion, categoria y `available|low|out` segun contrato.
3. Alta simple: abrir `Nuevo producto`, completar nombre, categoria y una variante con SKU, costo, precio y stock; enviar `POST /api/products`; comprobar `201`, tarjeta y persistencia tras recarga.
4. Alta con variantes: agregar al menos dos variantes con talla/color, barcode opcional, costos/precios, promo opcional, stock y umbral; comprobar que `variants[]` llega al mismo POST, que se crean movimientos iniciales si hay stock y que cada SKU se refleja.
5. Imagen: seleccionar una imagen local permitida, llamar `POST /api/products/image`, guardar el `photoPath`, mostrarla en tarjeta/detalle y comprobar error para tipo no permitido o mas de 5 MB.
6. Detalle: abrir una tarjeta, llamar `GET /api/products/:id` y `/history`, mostrar variantes activas, existencias, precios/costos e historial; cerrar por boton y Escape y devolver foco.
7. Edicion: abrir `Editar`, cambiar nombre, ubicacion y costo/precio/promo de una variante existente; enviar `PUT`, comprobar tarjeta actualizada e historial. No afirmar cambio de stock existente.
8. Errores: comprobar vacio por busqueda, error de carga, categoria inexistente, SKU duplicado `409`, producto no encontrado `404`, falta de sesion `401` y rol insuficiente `403`; los mensajes deben derivar del contrato, no del texto Stitch.
9. Aislamiento: con un negocio activo, no mostrar productos/categorias ni aceptar detalle, historial o mutacion de otro negocio; repetir una lectura en dos negocios de la DB E2E aislada.

### Roles y contratos

- `ADMIN` e `INVENTORY_MANAGER`: pueden crear, editar, archivar y subir imagen; `ADMIN` conserva todas las acciones visibles de administracion.
- `SELLER`: puede consultar catalogo, categorias, detalle e historial segun sesion, pero recibe `403` en POST/PUT/DELETE de productos y POST de imagen.
- Lecturas requieren `getAuth()` y negocio activo. Cada query y mutacion debe quedar limitada por `businessId` activo; no aceptar IDs ajenos.
- `GET /api/products` devuelve variantes planas y soporta `q`, `categoryId`, `status=archived|out|low` y `available=true`; la UI agrupa y calcula la presentacion de producto.
- `POST /api/products` requiere nombre, `categoryId`, SKU, costo y precio por variante; stock es opcional y por defecto cero. Categoria ajena o SKU duplicado terminan en el error de conflicto existente.
- `PUT /api/products/:id` actualiza datos generales y campos de variante existentes, crea variantes sin `id` y registra historia de costo/precio/promo. `DELETE` marca `archived=true`.
- `GET /api/products/:id/history` devuelve `field`, valores anterior/nuevo, razon, fecha y nombre de usuario. `GET /api/categories` devuelve categorias activas ordenadas.

### Validaciones soportadas y no soportadas

**Soportadas por contrato actual**

- Campos obligatorios de alta: `name`, `categoryId`, `sku`, `cost`, `price`; numeros finitos no negativos para costo, precio y stock; unicidad de SKU por negocio; categoria activa del negocio.
- Stock cero se representa como agotado y `available=true` lo excluye; `status=low` usa `lowStockThreshold` y stock mayor que cero.
- Foto valida firma y MIME de JPEG, PNG, WebP o GIF y limite de 5 MB; el endpoint devuelve `photoPath`.
- `404` para producto no visible por negocio, `409` para conflicto/datos invalidos en mutaciones y `401/403` segun sesion/rol.

**No soportadas por contrato actual**

- No existe validacion server-side de que `promoPrice < price`; el helper visual de los HTML no es contrato. Si se muestra, debe ser una validacion cliente informativa y no una garantia de servidor.
- No existe validacion remota/autogeneracion de SKU, combinacion unica de talla/color, limite de variantes, formato de barcode, fecha de promocion ni moneda configurable.
- `photoPath` se acepta como valor de producto en POST/PUT sin que esos handlers validen que apunte a una imagen previamente subida; no prometer una guarda mas estricta sin cambio API.
- No existe endpoint para actualizar stock desde editar; usar inventario queda fuera de DEV-03.

### E2E aislado

- Crear una suite enfocada `e2e/dev-03/` sin reactivar ni editar `e2e/products.spec.ts`. Usar `playwright.e2e.config.ts`, login real, seleccion real de negocio, sesiones reales y solo `E2E_DATABASE_URL` validada contra PostgreSQL loopback/namespace DEV-03.
- Preparar y limpiar exclusivamente recursos DEV-03 con los scripts existentes. Si falta la URL, Docker, migracion, credenciales ficticias o cleanup, registrar `BLOCKED: E2E PostgreSQL unavailable: ...`; nunca usar `DATABASE_URL`, mocks, cookies fabricadas, headers inventados ni datos de produccion.
- Separar datos por negocio Centro/Norte o namespace equivalente existente; limpiar productos, variantes, historial, movimientos e imagenes creados por la suite aun tras fallos.
- Cubrir API/browser: matriz ADMIN/INVENTORY_MANAGER/SELLER, `401/403/404/409`, aislamiento cross-business, persistencia, imagen, filtros, detalle, edicion, historia y mobile sin overflow.

### Comparacion visual y checks

- Comparar capturas reales a `1440x900`, `768x1024` y `390x844` contra las referencias exactas y cercanas listadas en el mapping. Registrar diferencias de estructura, no exigir pixeles de HTML Stitch cuando no existe referencia exacta.
- Verificar en desktop al menos tres columnas, dialogos centrados, footer visible y sin overflow horizontal. En tablet verificar apilado y scroll local de matriz. En mobile verificar lista compacta, nav inferior, controles >=44px, una region interna de scroll, fondo bloqueado solo durante dialogo y retorno de foco.
- Ejecutar, en este orden: `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; E2E DEV-03 enfocado con `CI=1` y reporter list; cleanup; `git diff --check`.
- Inspeccionar que no cambien API, Prisma, auth, permisos, tests legacy, UI fuera de productos, `diseno/` ni la especificacion DEV-SEC-01.

### Riesgos

- La UI activa es placeholder y la cobertura productiva anterior esta omitida; el cambio debe preservar los contratos sin tratar la referencia legacy como implementacion actual.
- La respuesta plana por variante puede duplicar tarjetas si la agrupacion UI es incorrecta; `status=low` y stock agregado requieren pruebas con varias variantes.
- El backend acepta decimales, campos opcionales y errores genericos; mensajes visuales demasiado especificos pueden contradecir la respuesta real.
- Los HTML contienen textos de auto-SKU, sincronizacion y validaciones que no existen en APIs; implementarlos como funcionalidad seria scope creep.
- Las imagenes locales estan fuera del control de la suite si no se namespacean; no versionar nuevos blobs.

### Criterios de aceptacion binarios

1. **PASS/FAIL** — Solo se modifican las pantallas y estilos necesarios de productos; no hay cambios en APIs, Prisma, auth, permisos, `diseno/`, DEV-SEC-01 ni la suite legacy.
2. **PASS/FAIL** — Catalogo autenticado carga por negocio, agrupa variantes y muestra nombre, SKU, categoria, ubicacion, precio, stock y los tres estados sin overflow en 390px.
3. **PASS/FAIL** — Busqueda, categoria, estado, `available`, limpiar filtros, loading, error y vacio tienen evidencia HTTP/browser reproducible.
4. **PASS/FAIL** — ADMIN/INVENTORY_MANAGER completan alta simple y alta con varias variantes, persisten tras recarga y reflejan stock inicial/movimiento; SELLER recibe `403` al mutar.
5. **PASS/FAIL** — Imagen valida se guarda y se muestra; tipos invalidos y mas de 5 MB muestran error sin dejar un producto inconsistente.
6. **PASS/FAIL** — Detalle y edicion funcionan con aislamiento, muestran variantes/existencias e historia, y no prometen editar stock existente.
7. **PASS/FAIL** — Dialogos cumplen nombre accesible, labels, foco inicial, Tab/Shift+Tab, Escape, retorno de foco, alertas y controles tactiles de 44px.
8. **PASS/FAIL** — Viewports 1440x900, 768x1024 y 390x844 cumplen la comparacion visual documentada, sin overflow horizontal ni scroll anidado no previsto.
9. **PASS/FAIL** — E2E DEV-03 termina PASS contra DB aislada, o queda BLOCKED con la razon exacta y sin fallback; cleanup elimina solo sus recursos.
10. **PASS/FAIL** — Lint, typecheck, tests, build y `git diff --check` terminan en cero; el diff no borra ni reescribe SPEC DEV-SEC-01.

## DEV-03B — Refinamiento visual y calidad de Productos

### Scope

**Incluye**

- Refinar exclusivamente la UI de `/productos`, sus componentes, utilidades y estilos existentes, sin cambiar el contrato de los endpoints.
- Unificar el placeholder de imagen con el lenguaje visual de productos: bloque de proporción estable, icono/texto accesible, fondo y borde de los tokens existentes, y fallback seguro para imagen ausente o no cargable sin romper la tarjeta.
- Fijar una altura/proporción consistente para imágenes y una altura mínima razonable para tarjetas; conservar una grilla estable en desktop y tarjetas compactas en mobile. Evitar que nombres, SKU, ubicación, precios o badges desplacen de forma impredecible las acciones.
- Aplicar truncamiento visual controlado a nombre, SKU, ubicación y textos largos, con `title` o nombre accesible completo cuando el texto visible se recorte. No ocultar datos obligatorios del detalle.
- Reordenar y agrupar los filtros en mobile para que búsqueda, categoría, estado, disponibilidad y limpieza sean operables a 390x844, con controles de al menos 44px y sin overflow horizontal. La limpieza debe resetear todos los filtros visibles.
- Refinar detalle, carga, error, vacío y archivado: jerarquía de metadata, variantes, existencias, historial, feedback de archivado y estado `archived` cuando el contrato lo devuelva. No presentar un archivado como borrado físico ni dejar una tarjeta activa engañosa tras la acción.
- Mostrar stock y disponibilidad sólo conforme al contrato: `stock` respalda existencias físicas y `available` equivale a stock disponible en este flujo; declarar que no se reportan apartados/reservas si se muestra esa distinción. No inventar kardex ni afirmar lectura independiente del movimiento `INITIAL`.
- Añadir validación inline asociada a cada campo cuando sea posible y un resumen/alerta accesible para errores generales. Cubrir obligatorios, números no negativos, variante mínima, motivo de cambios comerciales y la regla cliente informativa de promoción sin convertirla en garantía server-side.
- Detectar en cliente SKU duplicados dentro del draft y barcode duplicados dentro del draft si se decide exigir esa coherencia visual; normalizar la comparación y señalar los campos implicados. El SKU duplicado contra datos existentes debe mostrar el `409` real del backend. No afirmar unicidad server-side de barcode si el backend no la respalda ni crear una validación remota nueva.
- Proteger el submit contra doble clic y carreras de estado: deshabilitar acciones durante guardado/subida, conservar nombre accesible de loading, impedir requests mutantes duplicados y no cerrar ni limpiar el draft antes de una respuesta exitosa. Mantener los errores recuperables en el formulario.
- Mantener stock de variantes existentes como readonly, claramente etiquetado y fuera del payload `PUT`; sólo una variante nueva puede llevar stock inicial. No permitir que el modo visual sugiera ajuste de inventario.
- Conservar y reforzar accesibilidad: nombre de dialogo, labels asociados, foco inicial y retorno al disparador, Escape, ciclo Tab/Shift+Tab, alertas/`aria-live`, foco visible, contraste y objetivos tactiles de 44px. Respetar `prefers-reduced-motion`.

### Fuera de alcance y prohibiciones

- No modificar APIs, handlers, servicios server, Prisma, migraciones, auth, permisos, reglas de negocio, contratos, `diseno/`, archivos fuera de productos ni la suite legacy.
- No crear endpoints para disponibilidad, stock, kardex, validación remota, auto-SKU, barcode, archivado o imágenes; no cambiar payloads o respuestas existentes para obtener un resultado visual.
- No implementar mutaciones de stock desde alta/edición, no editar stock existente, no convertir `available` en reservas, y no inventar movimientos o estados respaldados por datos que el API no devuelve.
- No imponer unicidad de barcode en backend ni presentar como server-side una regla que sólo exista en cliente; no bloquear por una regla de promoción que el backend no valida.
- No introducir una pantalla Stitch inexistente como referencia exacta ni exigir pixel-fidelity para catálogo, detalle, edición, archivado o errores sin PNG/HTML final dedicado.

### Flujos y verificación

1. En catálogo autenticado, capturar tarjeta con y sin imagen, nombres/SKU/ubicaciones largos, los tres estados de stock y producto archivado; comprobar proporción, truncamiento, texto accesible y ausencia de overflow.
2. En 1440x900 y 390x844, usar búsqueda, categoría, estado, disponibilidad y limpiar filtros; comprobar que los controles siguen visibles, tienen objetivo tactil minimo de 44px y que la página no adquiere scroll horizontal.
3. Abrir detalle y comprobar variantes, stock físico, disponibilidad, precio aplicado, historial y estado archivado conforme a respuestas reales; comprobar que cerrar, Escape y acción de edición devuelven el foco al disparador correcto.
4. En alta y edición, provocar cada validación inline, SKU repetido en el mismo draft, barcode repetido en el mismo draft si se implementa esa comprobación y `409` de SKU del backend; comprobar que el campo queda señalado y el mensaje no depende sólo de color.
5. En alta/edición, hacer doble activación de guardar y resolver una respuesta lenta; comprobar un solo request mutante, estado disabled/loading, draft intacto ante error y cierre sólo después de éxito. En edición, comprobar que stock existente sigue readonly y ausente del `PUT`.
6. Capturar estados loading, error con reintento, vacío y archivado en la suite E2E enfocada. Usar PostgreSQL E2E aislado y contratos existentes; si la infraestructura imprescindible falta, registrar `BLOCKED: E2E PostgreSQL unavailable: ...` sin fallback.
7. Generar capturas reproducibles de catálogo, formulario y detalle a `1440x900` y `390x844`; conservar también la comprobación de `768x1024` existente cuando aplique. Documentar cada captura y toda diferencia con las referencias exactas o cercanas del mapping.
8. Ejecutar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, E2E DEV-03 enfocado con `CI=1` y reporter list, cleanup y `git diff --check`, sin ejecutar suites globales/legacy como evidencia.

### Documentación y criterios de aceptación binarios

- Actualizar sólo la documentación de DEV-03B solicitada en `SPEC.md` y `docs/ui-redesign/DEV-03-DESIGN-MAPPING.md`; no modificar `DEV-03-PRODUCTS.md` como parte de este plan salvo que un ejecutor posterior lo requiera como evidencia separada.
- Todos los criterios son binarios: `PASS` exige aserción reproducible y artefacto; `FAIL` contradice el comportamiento; `BLOCKED` sólo aplica a infraestructura E2E imprescindible y nunca cuenta como `PASS`.

1. **PASS/FAIL** — Placeholder con y sin imagen conserva proporción, accesibilidad y fallback; tarjetas mantienen altura/proporción estable, acciones visibles y truncamiento no destructivo en desktop y mobile.
2. **PASS/FAIL** — Catálogo a 1440x900, 768x1024 y 390x844 no tiene overflow horizontal; filtros mobile son operables, resetean completamente y todos sus controles accionables miden al menos 44px.
3. **PASS/FAIL** — Detalle, loading, error/reintento, vacío y archivado muestran jerarquía coherente, estado textual y datos que coinciden con respuestas reales; no se presenta borrado físico.
4. **PASS/FAIL** — Stock físico, `available`, estados y ausencia de reservas/kardex se explican sólo con el contrato; no se afirma una lectura independiente de `INITIAL` ni una disponibilidad inventada.
5. **PASS/FAIL** — Validaciones inline cubren campos obligatorios, números, variantes, motivo y duplicados client-side; SKU duplicado del backend muestra su `409`, y barcode sólo se declara único donde exista soporte real.
6. **PASS/FAIL** — Guardas de submit producen como máximo un request mutante por activación lógica, muestran loading/disabled, conservan el draft ante error y no cierran antes del éxito.
7. **PASS/FAIL** — Stock de variantes existentes es readonly en UI y no aparece en `PUT`; sólo variantes nuevas pueden incluir stock inicial.
8. **PASS/FAIL** — Dialogos y filtros cumplen labels, nombre accesible, foco inicial/visible/retorno, Tab/Shift+Tab, Escape, `aria-live`/`role=alert`, contraste suficiente, reduced motion y objetivos de 44px.
9. **PASS/FAIL** — E2E enfocado verifica los flujos anteriores y produce capturas de `1440x900` y `390x844` (más tablet cuando corresponda), o queda `BLOCKED` con razón exacta y sin fallback; cleanup sólo elimina recursos DEV-03.
10. **PASS/FAIL** — Lint, typecheck, tests, build y `git diff --check` terminan en cero; el diff queda limitado a UI/documentación de productos y no toca APIs, Prisma, auth, permisos, `diseno/` ni cambios preexistentes.

## DEV-04 — Inventario y kardex

### Scope

- Reemplazar el placeholder de `/inventario` con inventario real, detalle por variante y movimientos paginados, limitado al negocio activo.
- Mantener `ProductVariant.stock` como disponible operacional. Derivar `reserved` de la suma de reservas `ACTIVE` y `physical` como disponible más reservado, sin Prisma ni migraciones.
- Extender `GET /api/inventory` de forma aditiva con `physical`, `reserved` y `available` serializados como strings; agregar GET de movimientos con filtros `variantId`, `q`, `type`, `from`, `to`, paginación, usuario e identidad de producto/variante.
- Mantener POST atómico, roles ADMIN/INVENTORY_MANAGER, motivo requerido, cantidades positivas y conflicto `409` para salida sin saldo; responder `movementId` y balances.
- Mantener POS, Apartados, auth/session y módulos no relacionados fuera de alcance. No modificar `diseno/`.

### Flujos y verificación

1. Inventario muestra loading, error/reintento, vacío, búsqueda y tabla de variantes con físico, apartado y disponible reales.
2. Detalle y kardex usan API real; movimientos soportan filtros de servidor y paginación.
3. Compra y ajustes usan diálogo accesible con Escape, retorno de foco, Tab/Shift+Tab, motivo obligatorio y controles mínimos de 44px; SELLER es solo lectura.
4. Tras éxito o conflicto se vuelve a consultar el inventario; no se fabrican reservas ni movimientos en frontend.
5. `e2e/dev-04/` y `playwright.inventory.config.ts` son la suite aislada; si falta PostgreSQL E2E se documenta BLOCKED sin fallback ni suites legacy.
6. Ejecutar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, E2E DEV-04 enfocado y `git diff --check`.

### Criterios binarios DEV-04

1. **PASS/FAIL** — `/inventario` usa datos reales del negocio activo y muestra variante, SKU, ubicación, físico, apartado, disponible y estados disponible/bajo/agotado, con búsqueda y estados loading/empty/error/retry.
2. **PASS/FAIL** — `physical = available + reserved`, donde `reserved` sólo suma reservas `ACTIVE`; la UI no recalcula ni inventa movimientos o reservas como autoridad.
3. **PASS/FAIL** — El detalle por variante y el Kardex muestran identidad, balances, fecha, tipo, cantidad con signo, usuario, motivo, referencia y filtros/paginación del endpoint existente; no permiten editar históricos.
4. **PASS/FAIL** — Entrada y ajustes requieren cantidad positiva, máximo dos decimales y motivo; el submit único registra un movimiento atómico, devuelve balances confirmados y actualiza la vista.
5. **PASS/FAIL** — Una salida que no puede preservar el saldo disponible frente a reservas activas devuelve `409`, no deja movimiento parcial y la UI solicita datos actualizados.
6. **PASS/FAIL** — ADMIN e INVENTORY_MANAGER pueden mutar, SELLER sólo lee; las APIs preservan `401`, `403`, aislamiento por negocio y no aceptan IDs cross-business.
7. **PASS/FAIL** — Dialogos cumplen labels, foco inicial/retorno, Escape, Tab/Shift+Tab, alertas, loading/disabled y objetivos táctiles mínimos de 44px a 1440x900, 768x1024 y 390x844.
8. **PASS/FAIL** — La suite E2E aislada cubre consulta, búsqueda, detalle, entrada, ajustes, reservas, conflicto, Kardex, permisos, aislamiento, doble submit y capturas reales; cleanup deja `0|0` y elimina sólo sus recursos.
9. **PASS/FAIL** — Lint, typecheck, unit tests, build y `git diff --check` terminan con código 0; el diff no toca `diseno/`, migraciones, POS, Apartados, auth/session ni cambios preexistentes.

## DEV-05 — POS y ticket

### Criterios binarios

1. **PASS/FAIL** — `/pos` reemplaza el placeholder y consulta por negocio con búsqueda y categoría; puede mostrar variantes agotadas para bloquearlas explícitamente, agrupa productos sin perder `variantId` y no muestra físico/reservado.
2. **PASS/FAIL** — El carrito aplica `promoPrice ?? price`, limita cantidades al stock operacional, conserva líneas en errores y soporta CASH, CARD y TRANSFER sin IVA, descuentos, clientes, crédito, terminal u offline queue.
3. **PASS/FAIL** — CASH bloquea efectivo insuficiente; checkout deshabilita doble submit, usa una idempotency key estable, no auto-reintenta red incierta y conserva el carrito ante 400/409.
4. **PASS/FAIL** — POST 201 navega al ticket persistido; el ticket mantiene auth y business scope y muestra folio, fecha, vendedor, SKU, líneas, precios, total, pago, recibido, cambio, imprimir y nueva venta.
5. **PASS/FAIL** — POS cumple diálogos accesibles, targets de 44px, rail sticky desktop 1440x900, tablet 768 y resumen/checkout fijo mobile 390 sin overflow.
6. **PASS/FAIL** — Unit tests cubren cart/price, agrupación, payload e idempotencia; E2E DEV-05 usa setup/database real, screenshots `fullPage:false` bajo `test-results/dev-05`, o queda BLOCKED sin fallback.
7. **PASS/FAIL** — Lint, typecheck, tests, build y diff check pasan; no se modifican Prisma, migraciones, `diseno/`, Apartados, Devoluciones, Inventario, auth/session, docs protegidos ni suites legacy.

### Scope y contratos DEV-05

- Reutilizar `GET /api/products`, `POST /api/sales`, `GET /api/sales/:id`, `/tickets/:id` y `src/lib/pos-cart.ts`; no crear motor de ventas, endpoint de pago, proveedor externo ni cola offline.
- `stock` de Productos es la disponibilidad operativa para POS. No mostrar `physical`/`reserved` ni convertir apartados durante una venta ordinaria.
- La clave de idempotencia se conserva durante un intento y cualquier reintento explícito con respuesta incierta debe repetir exactamente el mismo payload; React no puede declarar éxito sin respuesta persistida.
- E2E debe usar PostgreSQL aislado, login real y cleanup seguro; no usar `DATABASE_URL`, cookies fabricadas, mocks permanentes ni suites legacy como evidencia.

## DEV-07 — Devoluciones y reembolsos

- `GET /api/returns` y `GET /api/sales` se limitan al negocio activo; ADMIN, INVENTORY_MANAGER y SELLER consultan. Crear devoluciones requiere ADMIN o INVENTORY_MANAGER.
- Una devolución sólo puede vincularse a una venta confirmada del negocio activo y a sus `SaleLine` existentes. La cantidad solicitada más lo previamente devuelto no puede exceder la cantidad vendida.
- `refundAmount` debe ser finito, no negativo y coincidir exactamente con el importe de las líneas seleccionadas a precio histórico. El sistema registra el reembolso; no ejecuta pagos externos.
- Cada línea devuelta incrementa stock una vez y crea un movimiento `RETURN` con referencia `Return`. La operación usa transacción serializable.
- `idempotencyKey` persistida en `Return` permite repetir el mismo payload sin crear otra devolución, movimiento o auditoría; reutilizarla con otro payload devuelve `409`.
- La UI permite localizar ventas, revisar pendientes, seleccionar devolución parcial o total, capturar motivo, confirmar importe y consultar historial. SELLER conserva lectura sin controles de mutación.

## DEV-07B — Auditoría atómica de devoluciones

- La auditoría `CREATE Return` debe ejecutarse con el `Prisma.TransactionClient` dentro de la misma transacción que crea `Return`/`ReturnLine`, reintegra stock y escribe `RETURN`.
- Si la auditoría falla, el endpoint responde `500` y no persiste devolución, líneas, stock, Kardex ni idempotency key. Un reintento posterior con el mismo payload puede crear una única operación completa.
- La inyección `x-lucem-e2e-fail-audit` sólo está disponible fuera de producción para pruebas E2E controladas; nunca se acepta como mecanismo de negocio.

## DEV-06 — Apartados y cumplimiento

- `GET /api/reservations` se limita al negocio activo; ADMIN, INVENTORY_MANAGER y SELLER consultan. Crear, liberar, vencer y completar requieren ADMIN o INVENTORY_MANAGER.
- Crear una reserva decrementa `ProductVariant.stock` y registra `RESERVATION -quantity`; liberar o vencer incrementa stock y registra `RELEASE +quantity`.
- Completar exige método de pago y crea una venta persistida en la misma transacción. Libera y vuelve a descontar la cantidad reservada, registra `RELEASE +quantity` y `SALE -quantity`, y conserva disponible neto mientras reduce físico y reservado.
- `Reservation.saleId` es opcional y único para que repetir completar sea idempotente y no cree una segunda venta ni movimientos duplicados. Conversiones antiguas sin venta se reportan como conflicto de integridad.
- DEV-06 no agrega anticipos, pagos parciales, deuda, clientes obligatorios ni vencimiento automático desde la interfaz.
- La suite aislada `test:e2e:reservations` verifica saldos persistidos, sobre-reserva, concurrencia, doble liberación/completado, Kardex, permisos, aislamiento y capturas responsive.

## DEV-12 — Refinamiento MVP de Apartados, anticipos bloqueados y auditoría visual

### Objetivo

Completar un refinamiento acotado del MVP de Apartados y sus superficies relacionadas, corrigiendo UX P0/P1 respaldada por los contratos actuales, validando el recorrido comercial y comparando la UI runtime con las referencias Stitch. Evitar que la interfaz o API afirmen que un anticipo fue recibido cuando no existe un modelo ni un ledger que lo respalde. Toda decisión de política monetaria de anticipos queda pendiente de aprobación; por ello, el soporte monetario de anticipos es BLOCKED y no aprobado para el MVP.

### Scope

**Incluye**

- Corregir la captura de Apartados para impedir introducir o afirmar anticipos recibidos sin backend y política aprobados. La UI no ofrece captura de monto, método, efectivo recibido, cambio ni saldo de anticipo. La API rechaza explícitamente nuevas solicitudes con `deposit` distinto de cero, en lugar de persistir una obligación monetaria aparente; compatibilidad de solicitudes sin anticipo debe conservar los contratos de DEV-06.
- Tratar registros históricos con `deposit > 0` como obligación monetaria no resuelta: bloquear release, expire y conversion si pueden borrar, duplicar o alterar esa obligación; mostrar un mensaje de revisión manual. No reembolsar, retener, aplicar a venta ni transformar el depósito automáticamente. Sólo se admite otro comportamiento si el Generator comprueba un mecanismo seguro ya cubierto por decisiones aprobadas; no inventar política.
- Resolver creación de apartados multi-producto para que fallos parciales o de red no dependan de rollback compensatorio inseguro. El comportamiento debe ser atómico y conservar aislamiento, saldo y trazabilidad conforme a contratos existentes; cualquier extensión de API/esquema requiere justificación y no puede crear modelo de pagos sin política aprobada.
- Refinar la UX P1 del modal conservando la composición de Stitch. El CTA de conversión debe decir “Completar apartado y registrar venta”. Corregir detalles visuales y de coherencia necesarios en Apartados, Productos, Inventario y POS, sin rediseñar ni reconstruir módulos.
- Validar regresiones del ciclo de reservas DEV-06 y DEV-09, incluida persistencia, concurrencia, replay/idempotencia, balances, permisos, aislamiento y adaptabilidad responsive.
- Producir `docs/quality/DEV-12-MVP-REFINEMENT.md`, `docs/quality/DEV-12-ADVANCE-PAYMENTS.md`, `docs/quality/DEV-12-VISUAL-AUDIT.md` y evidencia runtime real, sanitizada, en `docs/quality/dev-12-visual-evidence/`. Registrar las decisiones de anticipos como pendientes y el bloqueo del MVP por ausencia de política. No fabricar capturas ni inferir PASS de que una ruta cargue.
- Antes de cualquier acción de ejecución Git, volver a validar rama, HEAD, estado, remoto y base. El estado inspeccionado es rama `feature/lucem-ui-redesign-v1`, HEAD `bcdc25d73b6d058ff0d2b3603e88ccbbb2bd3fdc`, remoto `origin` en `git@github.com:jasanhdz/lucem-retail.git`, con sólo `.DS_Store` y `diseno/.DS_Store` untracked. Preservar esos archivos y cualquier cambio ajeno; `diseno/` nunca se modifica. Sólo crear los commits específicos solicitados por el prompt DEV-12 y hacer push a `origin/feature/lucem-ui-redesign-v1` si la base/remoto siguen siendo los esperados, sin force ni merge.

**Fuera de alcance y prohibiciones**

- No reconstruir ni reinventar Apartados, Productos, Inventario, POS u otros módulos; no agregar módulos o rediseñar las pantallas. Limitar el cambio a defectos reproducibles y a los ajustes P0/P1 indicados.
- No modificar `diseno/`, sus HTML/PNG originales, ni reescribir `FINDINGS.md` o `docs/ui-redesign/DEV-01C-RUNTIME-AUDIT.md`; DEV-01C es auditoría histórica. Preservar íntegramente toda sección histórica de este SPEC.
- No presentar `Reservation.deposit` como pago recibido ni como saldo disponible: el campo Decimal existente no representa pago, método, efectivo recibido/cambio ni ledger. No agregar métodos de pago, movimientos monetarios, reembolsos, retenciones, aplicación a ventas o políticas de expiración/liberación sin decisión aprobada.
- No liberar, vencer ni convertir automáticamente una reserva histórica con depósito positivo si la operación puede borrar o duplicar la obligación; requiere revisión manual salvo comportamiento seguro ya aprobado y demostrado.
- No usar rollback compensatorio de operaciones independientes como garantía de atomicidad monetaria; no duplicar ventas o movimientos ante reintentos o fallos de red.
- No usar mocks como evidencia de integración, no usar `DATABASE_URL` como fallback, no conectar suites a bases de desarrollo/producción/compartidas, no exponer secretos y no modificar ni reutilizar credenciales productivas.
- No considerar `localhost:3000` obsoleto ni detener/reiniciar su proceso sin revalidar listener, padre, cwd y contenido; el listener observado (PID 26224, `next-server v15.5.28`, cwd del repo) agotó timeout en `curl -I` y su contenido servido no fue verificado.

### User flows

1. **Preflight y aislamiento** — Registrar branch, HEAD y `git status --short` sin secretos; verificar remoto/base antes de cualquier Git mutante. Revalidar el listener de `localhost:3000` antes de actuar sobre él. `E2E_DATABASE_URL` debe existir y validar loopback, namespace `lucem_retail_e2e`, puerto `55432`, usuario `lucem_e2e` y credenciales DEV-TEST. Si falta o falla una guarda, declarar `BLOCKED: E2E PostgreSQL unavailable: ...`; nunca recurrir a `DATABASE_URL`.
2. **Creación sin anticipo** — Como rol autorizado, crear apartado conforme a DEV-06 y comprobar reserva de stock, Kardex, auditoría y persistencia. UI no presenta controles que afirmen recepción monetaria. API acepta el contrato sin anticipo; solicitud nueva con `deposit` positivo (o cualquier valor no cero) se rechaza sin crear apartado, reserva ni movimiento.
3. **Creación multi-producto y fallo** — Crear apartado con varias líneas/productos; comprobar atomicidad de resultado. Provocar fallo controlado entre operaciones y una respuesta de red incierta: no debe quedar apartado parcial, saldo/Kardex inconsistente ni duplicación al reintentar según la estrategia aprobada.
4. **Operaciones ordinarias** — Liberar, vencer y completar una reserva sin anticipo positivo. Comprobar permisos, aislamiento, idempotencia, stock/Kardex y que la conversión crea venta por el saldo comercial íntegro conforme a DEV-06; la interfaz usa CTA “Completar apartado y registrar venta”.
5. **Registro histórico con anticipo** — En fixture real E2E, intentar release, expire y convert de reserva con `deposit > 0`. Cada operación potencialmente destructiva queda bloqueada y comunica revisión manual; se preservan registro y valor, no aparece reembolso ni aplicación automática a venta y no se crean movimientos/ventas duplicados.
6. **Revisión visual responsive** — Comparar runtime autenticado con referencias `diseno/desktop_nuevo_apartado_con_anticipo`, `desktop_nuevo_apartado_sin_anticipo` y `mobile_web_nuevo_apartado_con_anticipo`, además de referencias pertinentes de Productos, Inventario y POS. Registrar diferencias y capturas reales a 1440x900, 768x1024 y 390x844; comprobar sin overflow horizontal, interacción usable y coherencia de navegación/modal. Los diseños son autoridad visual, sólo lectura.
7. **Regresión y cierre** — Ejecutar lint, typecheck, `npm test`, `prisma validate`, build, suites E2E dirigidas y DEV-09, además de `git diff --check`. Ejecutar preparación/cleanup exclusivamente sobre DB E2E validada. Si falta `E2E_DATABASE_URL`, Docker/PostgreSQL o autenticación/dataset real, marcar las suites E2E y evaluación visual autenticada `BLOCKED` con causa exacta; no presentar mocks, capturas estáticas o simple carga de ruta como PASS. Sanitizar artefactos y salidas.

### Modelo de datos

- El modelo actual `Reservation.deposit Decimal?` (precision 12,2) almacena un valor, pero no existe entidad de pago/anticipo, método, importe en efectivo recibido, cambio, estado de liquidación ni ledger. El campo aislado no prueba que se haya recibido dinero.
- POST `/api/reservations` actualmente admite `deposit` sin validar monto y persiste reserva/movimiento en una transacción. La UI muestra monto, método, recibido, cambio y saldo, aunque sólo envía el depósito real y representa método como texto libre en notes. El plan requiere bloquear nuevas cantidades no cero tanto en presentación como en API.
- La creación multi-producto actual hace varios POST independientes y usa compensación liberando reservas ante fallo; esto no garantiza atomicidad frente a fallos de red u operaciones monetarias. La corrección debe asegurar resultado atómico o documentar BLOCKED si la arquitectura segura requiere una decisión no aprobada.
- La conversión actual crea venta por el total completo e ignora `deposit`; release/expire no procesan depósitos y Return sólo vincula reembolso a venta, no a depósitos. No inferir una relación monetaria inexistente ni usar `Return` para liquidar anticipos.
- Datos históricos con `deposit > 0` mantienen valor y registro sin automatización. Se bloquean transiciones que borren o dupliquen la obligación y se solicita revisión manual. Reembolso, retención, aplicación, caducidad de obligación y reconciliación son decisiones pendientes, no defaults del sistema.
- MXN se expresa con dos decimales; venta cash requiere efectivo recibido al menos igual al total y reembolsos de DEV-07 corresponden a líneas. Estas reglas no definen una política de anticipos y no deben extrapolarse.

### Stack y decisiones técnicas

- Conservar Next.js, React, TypeScript, Prisma y PostgreSQL existentes, así como los contratos de DEV-06/DEV-09 salvo cambios estrictamente necesarios para rechazar depósitos nuevos no cero y para garantizar atomicidad. No agregar dependencias ni un proveedor de pagos.
- Las referencias de `diseno/` son fuente visual de sólo lectura. Mantener composición del modal Stitch y hacer sólo refinamiento P1; respetar roles, shell, componentes y estilos actuales. La etiqueta de conversión exacta es “Completar apartado y registrar venta”.
- La ausencia de modelo/ledger y de política aprobada significa que anticipos monetarios quedan BLOCKED y no aprobados para el MVP. Registrar esa decisión en el entregable de anticipos; ningún estado visual puede sugerir cobro confirmado.
- La guarda Playwright exige exclusivamente `E2E_DATABASE_URL` loopback, namespace `lucem_retail_e2e`, puerto 55432, usuario `lucem_e2e` y secretos DEV-TEST. La variable está actualmente ausente; `docker version` confirma server 29.5.2, lo cual por sí solo no habilita E2E. Nunca hacer fallback a `DATABASE_URL`.
- Los checks incluyen lint, typecheck, npm test, `prisma validate`, build, E2E dirigidos de Apartados y áreas afectadas, DEV-09 y `git diff --check`. E2E y evaluación visual autenticada sólo se consideran PASS con DB y dataset reales aislados. Bloqueo de infraestructura se registra como `BLOCKED`, jamás como PASS ni FAIL de producto.
- Entregables: `docs/quality/DEV-12-MVP-REFINEMENT.md`, `docs/quality/DEV-12-ADVANCE-PAYMENTS.md`, `docs/quality/DEV-12-VISUAL-AUDIT.md` y capturas/evidencia runtime sanitizada real en `docs/quality/dev-12-visual-evidence/`. No incluir secretos, datos personales reales ni capturas inventadas.
- La instrucción de commits/push del prompt sólo se ejecuta tras comprobar remoto, base, commits incluidos y estado de worktree; preservar untracked ajenos, no stagear `.DS_Store`, no hacer force ni merge y no exponer secretos.

### Assumptions

- DEV-06 y DEV-09 son contratos de regresión vigentes para reservas, liberación, expiración, conversión, concurrencia, replay, balances, permisos, aislamiento y responsive.
- No existe política comercial aprobada para reembolsar o retener un anticipo al liberar/expirar, ni para aplicarlo a una conversión. Por tanto, soporte monetario de anticipos queda pendiente y el MVP no se aprueba como flujo con anticipos.
- Cualquier registro con depósito histórico positivo requiere revisión manual antes de una transición que pueda alterar su obligación. No se supone que sea pago recibido, deuda válida, crédito de cliente o importe reembolsable.
- La meta visual es preservar composición Stitch y corregir P0/P1 puntuales; la revisión no autoriza rediseñar módulos, inventar estados ni ampliar funcionalidades comerciales.
- El worktree observado tenía sólo `.DS_Store` y `diseno/.DS_Store` untracked. Son potenciales cambios ajenos y deben preservarse, nunca añadirse a commits.
- `localhost:3000` tiene un proceso `next dev` en cwd del repo, pero el contenido servido no pudo verificarse por timeout; no asumir que es obsoleto ni usar su disponibilidad como evidencia de implementación.
- La ausencia observada de `E2E_DATABASE_URL` implica bloqueo hasta que se habilite una DB E2E válida; Docker Engine disponible no sustituye configuración, preparación, autenticación y dataset comprobables.

### Rubric de evaluación

Todos los criterios son binarios y reproducibles. `PASS` exige evidencia del comportamiento/artefacto indicado. `FAIL` significa que la comprobación pudo ejecutarse y contradijo el requisito. `BLOCKED` se permite sólo cuando falta infraestructura, autenticación o dataset real imprescindible; no cuenta como PASS y debe incluir causa y comando/validación sanitizados. Los anticipos no aprobados impiden declarar el MVP completo/aprobado aunque los demás criterios pasen.

1. **P0 — Anticipos nuevos deshabilitados** — UI no permite capturar ni afirmar anticipo; POST rechaza todo `deposit` nuevo no cero y no persiste reserva, movimiento ni efecto parcial. PASS exige prueba reproducible de UI/API contra contrato; cualquier aceptación o afirmación de cobro es FAIL.
2. **P0 — Históricos protegidos** — En dataset E2E con `deposit > 0`, release, expire y convert no borran ni duplican la obligación ni producen reembolso, aplicación o venta automáticos; muestran revisión manual y preservan datos. Sin dataset E2E real, BLOCKED, nunca inferido por mocks.
3. **P0 — Política y aprobación** — `DEV-12-ADVANCE-PAYMENTS.md` identifica decisiones pendientes (reembolso/retención, aplicación a venta y tratamiento al liberar/expirar) y declara anticipos BLOCKED/no aprobados para MVP. Cualquier política inventada o afirmación de MVP aprobado es FAIL.
4. **Atomicidad multi-producto** — Éxito y fallos controlados/red incierta no dejan apartados parciales, reservas o movimientos inconsistentes ni duplican operaciones; evidencia E2E real y balances/Kardex persistidos. Si infraestructura no está disponible, BLOCKED; compensación no demostrada como atómica es FAIL.
5. **Regresión comercial** — DEV-06 y DEV-09 dirigidas verifican reserva, release, expire, conversión sin anticipo, concurrencia/replay, idempotencia, permisos, aislamiento y balances sin duplicación. Cada suite debe reportar PASS real o BLOCKED explícito por infraestructura.
6. **UX y referencia Stitch** — Modal conserva composición de referencia, CTA de conversión tiene texto exacto y cambios P1 en Apartados/Productos/Inventario/POS se limitan a diferencias documentadas. Auditoría usa runtime autenticado y referencias originales sin modificar `diseno/`; ruta que sólo carga no es evidencia.
7. **Responsive y regresión visual** — Evidencia real cubre 1440x900, 768x1024 y 390x844, sin overflow horizontal y con interacciones legibles/usables. Evaluación autenticada queda BLOCKED si no hay DB/dataset E2E real; no se aceptan screenshots inventadas, estáticas o sin contexto runtime.
8. **Artefactos auditables** — Existen los tres documentos de calidad requeridos y evidencia sanitizada en `docs/quality/dev-12-visual-evidence/`; resultados distinguen PASS/FAIL/BLOCKED, informan cobertura y diferencias, no contienen secretos y no declaran PASS por mera carga de ruta. Falta de cualquier entregable es FAIL.
9. **Checks de código** — Lint, typecheck, `npm test`, `prisma validate`, build y `git diff --check` terminan con código cero. E2E dirigido y DEV-09 terminan PASS real o BLOCKED con causa reproducible; mocks/fallback invalidan evidencia y son FAIL.
10. **Límites, Git y MVP** — Diff no modifica `diseno/` ni reescribe secciones históricas, FINDINGS.md o DEV-01C; conserva untracked ajenos, no stagea `.DS_Store`, no expone secretos y cualquier commit/push pedido respeta remoto/base validados, rama destino, ausencia de force/merge. El dictamen final declara MVP de anticipos no aprobado mientras no exista política y soporte seguro aprobado.
