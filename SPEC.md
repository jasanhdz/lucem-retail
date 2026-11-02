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
