# DEV-01B — Experiencia de acceso y shell operativo responsive

## Objetivo
Implementar login, selector real de negocio y shell responsive para las rutas existentes con fidelidad verificable a las referencias Stitch y sin alterar backend, autenticación ni dominio.

## Scope

**Incluye**
- Reemplazar la UI de `/login` y `/negocios` y el shell compartido de `/dashboard`, `/pos`, `/productos`, `/inventario`, `/apartados`, `/devoluciones`, `/reportes` y `/auditoria`, respetando el contenido placeholder existente de cada módulo.
- Tomar `diseno/retail_operational_clarity/DESIGN.md` y `diseno/retail_pos_inventory_system/DESIGN.md` como fuentes de referencia documentadas, y mantener ambas intactas. La referencia específica PNG/HTML de cada pantalla prevalece sobre tokens genéricos cuando difieran; no imponer la composición genérica sobre el mock específico.
- Login y selector: composición de tarjeta centrada, clara, mint/neutra, según sus referencias específicas. Shell desktop: sidebar persistente de aproximadamente 300px, header con switcher de negocio, CTA de operación y menú de usuario, navegación agrupada. En móvil: referencia con barra inferior fija de cinco opciones (Inicio/POS/Productos/Inventario/Más), respetando safe-area; no reproducir como marca válida el logo roto que aparece en la referencia móvil.
- No hay asset público oficial de marca. Recrear como SVG el mark preciso de capas apiladas observado inline en la referencia A; no sustituir por icono genérico tipo Store.
- Conectar login a `signIn` del servicio existente, selector a `getBusinesses` y `selectBusiness`; el switcher del shell debe seleccionar realmente mediante `selectBusiness`, no limitarse a cambiar texto. Si se incluye logout UI, usar POST `/api/auth/logout` mediante integración existente.
- Derivar visibilidad de navegación del rol/permisos de la membresía activa real y las rutas ya existentes. `GET /api/businesses` devuelve rol por membresía. Prisma `Role` contiene `ADMIN`, `SELLER`, `INVENTORY_MANAGER`; GET de auditoría solo está autorizado para ADMIN. Las demás rutas GET relevantes requieren autenticación y los guards del servidor siguen siendo autoridad. No inventar rutas, roles, permisos ni datos falsos en runtime.
- Entregar documento editable de mapeo de tokens y componentes, capturas desktop y móvil antes/después para login, selector y shell dentro de evidencia de auditoría bajo `docs/`, documentos comparativos de auditoría con caveat explícito de que la fidelidad no es exacta/pixel-perfect, y actualización de findings. Las capturas antes registran la base existente; después registran la implementación.
- Pruebas Playwright de flujos/UI y smoke, más lint, typecheck, tests y build definidos por el proyecto.

**Fuera de alcance y límites**
- DEV-02: no implementar funcionalidad POS, productos, inventario, apartados, devoluciones, reportes, auditoría ni dashboard; conservar placeholders y operaciones actuales.
- No cambiar backend, auth/session, APIs/contratos, guards, Prisma, migraciones, dependencias, versiones ni infraestructura. Servicios existentes y autorización del servidor permanecen intactos.
- No declarar producción lista. Preservar y documentar el warning conocido de que `GET /api/audit` expone `passwordHash`; este incremento no lo corrige ni elimina de la documentación.
- No escribir fuera de las superficies UI/documentación/evidencia/pruebas necesarias para DEV-01B. Ninguna modificación bajo `diseno/`.

## User flows

1. **Login `/login`**: usuario introduce email y contraseña; validación local accesible y envío mediante `signIn` existente. Mostrar loading, error recuperable y éxito/redirect conforme al contrato actual. No credenciales de demostración, secretos, autofill sembrado ni contraseña de referencia en UI, fixtures o capturas.
2. **Selector `/negocios`**: cargar mediante `getBusinesses`; mostrar loading, error reintentable, vacío sin acción de alta o negocios reales con el rol devuelto por membership. Usuario elige negocio y confirma; invocar `selectBusiness` con su identificador real, informar progreso/error y respetar redirect existente.
3. **Switcher del shell**: con sesión y negocios disponibles, abrir selector accesible, cargar/mostrar negocios reales y rol por membresía; cambiar de negocio llama a `selectBusiness` con el ID escogido. Error conserva contexto y permite reintentar. No simular cambio visual sin operación.
4. **Shell desktop**: sesión autenticada abre ruta existente. Sidebar persistente (~300px) agrupa solo destinos reales cuya visibilidad corresponde al rol/acceso de la membresía activa; header muestra switcher, CTA a operación con destino existente y menú de usuario. Navegación conserva URL/guard del servidor; auditoría se ofrece solo con acceso ADMIN y servidor sigue protegiendo el GET.
5. **Shell móvil**: en viewport móvil mostrar barra fija inferior Inicio/POS/Productos/Inventario/Más, accesible por teclado/táctil y elevada sobre safe-area. “Más” expone destinos adicionales existentes permitidos, incluidos los que correspondan según rol. No generar enlaces nuevos ni overflow horizontal.
6. **Menú de usuario/logout**: mostrar información de sesión real disponible; si hay acción de logout, emitir POST `/api/auth/logout` con el servicio/flujo existente y seguir su redirect. No crear mecanismo de sesión alternativo.
7. **Verificación visual**: capturar antes/después de login, selector y shell a viewport desktop y móvil; registrar entorno, viewport y limitaciones en auditoría. Fixture visual sin sesión real se identifica inequívocamente como no-auth integration; verificación del selector con sesión real válida queda pendiente si no existe sesión autorizada disponible. Nunca incluir credenciales en imágenes.

## Modelo de datos

- Sin cambios de tablas, columnas, tipos, relaciones, enums, migraciones, seeds ni persistencia.
- Consumir contratos existentes de `signIn`, `getBusinesses` y `selectBusiness`, así como endpoint existente POST `/api/auth/logout` solo si se implementa logout UI. No introducir payloads/campos nuevos.
- Rol se deriva de la membresía devuelta por `GET /api/businesses`; solo enumera roles reales `ADMIN`, `SELLER`, `INVENTORY_MANAGER`. El estado UI de selección es efímero y usa IDs de respuesta real.
- Ningún dato ficticio de rol, membresía, negocio o permiso en runtime. Los guards/autorización server-side conservan la decisión final; GET audit es ADMIN-only y las demás rutas GET relevantes autenticadas.
- Se conserva en findings/auditoría el warning documentado sobre exposición de `passwordHash` en `GET /api/audit`; no declarar producción lista.

## Stack y decisiones técnicas

- Mantener framework, versiones, dependencias, servicios y patrones ya instalados. Reutilizar rutas y componentes presentes; no añadir paquetes ni editar manifests/lockfiles.
- Inspeccionar antes de implementar todas las fuentes requeridas: `DESIGN.md` de ambas propuestas, HTML y PNG específicos de login, selector, desktop shell y mobile shell (las cuatro carpetas Stitch indicadas en el inventario del proyecto), código de referencia A, rutas, servicios, guards y tipos reales. Registrar el mapeo exacto en documento editable bajo `docs/`.
- Preferir tokens/componentes semánticos reutilizables con estados focus, loading, vacío y error; HTML accesible, teclado, contraste adecuado, targets táctiles y safe-area. El logo debe ser SVG trazado como mark inline de capas apiladas de referencia A.
- Guardar evidencia de auditoría bajo `docs/` con capturas antes/después desktop/móvil para login, selector y shell, y auditorías comparativas que expliquen desviaciones y caveat de fidelidad no exacta. No alterar los cuatro directorios de diseño.
- Ejecutar los scripts existentes equivalentes a Playwright, smoke, lint, typecheck, tests y build; identificar en la auditoría el comando ejecutado y resultado. E2E no debe mutar base de datos ni usar credenciales reales en screenshots. Los fixtures visuales sin sesión son exclusivamente no-auth integration y deben etiquetarse así; si falta sesión válida, declarar pendiente la comprobación real del selector.
- Verificar al final `git diff -- diseno/` vacío y que rutas/API/auth/session/Prisma/migraciones/dependencias/infraestructura están intactas.

## Assumptions

- El proyecto objetivo es `lucem-retail`; esta entrega reemplaza la especificación previa por DEV-01B. No existe `PLAN.md` en la raíz al momento de planificar.
- Las cuatro carpetas Stitch de login, selector, shell desktop y shell móvil, incluidos PNG y HTML suministrados, son las fuentes visuales concretas inspeccionadas; PNG/HTML específico prevalece sobre el lenguaje genérico de DESIGN.md en caso de conflicto.
- La referencia móvil muestra un asset de logo roto: es un defecto del mock, no una instrucción de reproducirlo. El mark SVG preciso se toma de la implementación inline del código de referencia A; no existe asset oficial público.
- Las rutas/servicios del repositorio son la fuente de verdad. La barra inferior tiene cinco destinos/acciones nominales de referencia, pero “Más” agrupa destinos existentes sin inventar rutas; la navegación permitida se calcula a partir de membership/acceso real.
- Es posible que el entorno no disponga de sesión autorizada real ni acceso a base de datos. En tal caso, capturas con fixture son válidas únicamente como visuales no-auth integration, deben etiquetarse y no equivalen a validación autenticada; selector con sesión válida queda pendiente, sin autenticar ni modificar DB para fabricarla.
- “Antes/después” significa evidencia comparativa registrada a ambos lados de la implementación; las capturas nuevas no se presentan como comparación exacta pixel-perfect. No se incluyen contraseñas, tokens ni secretos en ninguna captura.
- El aviso preexistente de exposición de `passwordHash` en GET `/api/audit` se preserva literalmente en la auditoría/findings aplicables; el resultado no es una declaración de production readiness.

## Rubric de evaluación

Cada criterio es binario: PASS solo con todas las evidencias exigidas; en otro caso FAIL, salvo limitación externa de sesión autorizada, que se registra explícitamente como pendiente/BLOCKED y nunca como PASS. Hallazgos incluyen comando/URL, entorno, viewport, fecha, ruta de evidencia y limitación. Ejecutar sin alterar infraestructura ni usar una DB para generar sesión.

1. **Estructura y alcance** — `SPEC.md` contiene exactamente las siete secciones de Planner, una vez y en orden; `git diff --check -- SPEC.md` retorna 0. Implementación limitada a login, selector, shell compartido y documentación/evidencia/tests DEV-01B; no funcionalidad DEV-02.
2. **Fuentes y mapeo** — documento editable bajo `docs/` enlaza ambos DESIGN.md y cada HTML/PNG de las cuatro carpetas específicas, registra tokens/componentes/rutas y resuelve conflictos dando prioridad al mock específico. `git diff -- diseno/` está vacío.
3. **Login visual e interacción** — Playwright verifica desktop y móvil, composición centrada clara mint/neutra conforme a PNG/HTML específico, labels, validación, loading/error recuperable y éxito mediante `signIn` real; no credenciales prellenadas ni endpoint alterno.
4. **Selector visual y estados** — Playwright verifica diseño específico desktop/móvil, estados loading/vacío/error/retry y negocios/rol provenientes de `getBusinesses`; selección confirma mediante `selectBusiness` real con ID elegido, no solo cambio textual. Sin sesión autorizada real, marcar el recorrido de negocio como fixture no-auth y selector integrado como BLOCKED/pending.
5. **Shell desktop** — Playwright autenticado o fixture explícitamente identificado verifica a 1440×900 sidebar persistente de 280–320px, header con switcher real, CTA a ruta existente, menú usuario, grupos coherentes, ruta activa y navegación sin enlaces inventados.
6. **Shell móvil** — Playwright a 390×844 verifica barra fija con exactamente Inicio/POS/Productos/Inventario/Más, safe-area inferior, targets operables y ausencia de overflow horizontal. “Más” solo contiene rutas existentes autorizadas.
7. **Marca** — inspección SVG/UI confirma mark de capas apiladas fiel al inline de referencia A; no se usa Store genérico ni se replica el asset roto de la muestra móvil. No se incorpora una imagen oficial inexistente.
8. **Acceso según membership** — pruebas con datos controlados de cada rol real `ADMIN`, `SELLER`, `INVENTORY_MANAGER` prueban que navegación se deriva de permisos/rutas existentes y membership activa, sin roles/negocios ficticios en runtime. Auditoría no aparece para no-ADMIN; el guard servidor sigue siendo autoridad.
9. **Switch y logout** — Playwright/contrato de servicio demuestra que el switcher invoca `selectBusiness` con ID seleccionado; si logout UI está presente, demuestra POST `/api/auth/logout` por flujo existente. Si logout no existe en UI, reportar N/A sin modificar el endpoint.
10. **Rutas, APIs y protección** — diff de rutas/API/servicios de auth y negocios/guards confirma contratos y destinos existentes sin alteración; inspección y smoke verifican sesión no válida sigue protegida, GET audit ADMIN-only y otros GET relevantes autenticados. Sin rutas nuevas.
11. **Sin cambios protegidos** — `git diff -- diseno/ app/api src/lib/auth.ts src/services/auth.ts src/services/businesses.ts prisma/schema.prisma prisma/migrations package.json package-lock.json` está vacío (adaptar solo rutas de archivos efectivamente presentes); no hay cambios de API, auth/session, Prisma, migración, dependencia o infraestructura. Capturar resultado de verificación.
12. **DEV-02 preservado** — diff/inspección confirma páginas y operaciones de dashboard/POS/productos/inventario/apartados/devoluciones/reportes/auditoría siguen placeholders o contenido funcional preexistente, sin implementaciones nuevas propias de DEV-02.
13. **Evidencia comparativa** — bajo `docs/` existen capturas antes y después para login, selector y shell, cada una en desktop y móvil, con nombres/rutas legibles y viewport/entorno registrado; documentos de auditoría comparan referencias y resultado e incluyen caveat explícito de fidelidad no exacta. Fixtures sin sesión se identifican visiblemente como no-auth integration.
14. **Privacidad y findings** — revisión de todas las capturas confirma cero credenciales/contraseñas/tokens; findings actualizado incluye estado/evidencia por criterio, limitación de sesión si aplica y warning preservado de exposición de `passwordHash` en GET `/api/audit`; no declara producción lista.
15. **Validación de proyecto** — comandos existentes de Playwright, smoke, lint, typecheck, tests y build terminan con código 0, registrados con salida/evidencia. E2E no escribe DB; no se fabrica sesión real mediante cambios de datos.
