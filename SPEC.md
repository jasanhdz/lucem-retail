# DEV-01 — Design System, Application Shell, Login y selección de negocio

## Objetivo

Implementar el design system de Lucem Retail y una experiencia responsive para el shell autenticado, login y selección de negocio conforme a las nuevas referencias Google Stitch, manteniendo intactos los servicios, rutas y dominio existentes.

## Scope

**Incluye**
- Sustituir el placeholder DEV-00 por UI real únicamente en la página pública `/`, `/login`, `/negocios` y shell compartido de las rutas workspace existentes: `/dashboard`, `/pos`, `/productos`, `/inventario`, `/apartados`, `/devoluciones`, `/reportes` y `/auditoria`. El shell debe poder presentar el estado activo de navegación y el contenido actual/placeholder de cada módulo, sin implementar ni rediseñar los módulos funcionales que son DEV-02.
- Crear tokens y componentes base coherentes con `diseno/retail_operational_clarity/DESIGN.md`: Plus Jakarta Sans, superficies blancas y neutrales, primario oscuro, acento verde, bordes sutiles, radios y espaciado definidos allí; estados de foco y objetivos táctiles de al menos 44px cuando aplique.
- Usar esa referencia como autoridad visual para diseño system, shell, login y selección. Documentar en el resultado de implementación las diferencias frente a `diseno/retail_pos_inventory_system/DESIGN.md`: esa segunda propuesta está centrada en POS/inventario y presenta una composición alterna con base mint y tipografía Inter para texto denso; solo podrá aportar patrones puntuales compatibles (p. ej. controles accesibles), sin reemplazar paleta, tipografía ni composición primaria. No editar ninguna referencia, imagen, HTML o archivo bajo `diseno/`.
- Shell de escritorio con navegación lateral estructurada por las secciones existentes, marca, contexto de negocio y área de usuario; adaptar a tablet/móvil con navegación compacta/drawer o equivalente utilizable, sin overflow horizontal. No agregar destinos que no tengan ruta existente.
- Login visual conectado a `src/services/auth.ts` y al endpoint existente; campos etiquetados, mostrar/ocultar contraseña, validación, envío, indicador de carga, errores recuperables y feedback de autenticación. Usar solo la autenticación real existente; no crear credenciales funcionales, valores por defecto, secretos, ni sembrar/usar la cadena de contraseña de referencia como credencial, fixture o configuración.
- Selección de negocio conectada a `src/services/businesses.ts`: cargar negocios mediante el servicio existente, renderizar estados de carga, vacío y error, seleccionar un negocio existente y confirmar usando la operación existente. Mostrar error recuperable; no ofrecer creación/alta de negocio.
- Mantener rutas, guardas de sesión y dominio actuales. La ruta `/tickets/[id]` conserva su comportamiento DEV-00, fuera del alcance visual de este incremento.
- Añadir pruebas realistas para los flujos cubiertos: unitarias/componentes para estados y contratos de interacción usando el stack actual, y Playwright para viewport desktop/móvil, login/errores y selección con respuestas controladas o fixture ya existente que no escriba en la base real. Ejecutar validaciones del proyecto.

**Fuera de alcance**
- Signup/registro, completar perfil, recuperación de contraseña, creación de negocio, invitaciones/usuarios y configuración no existentes en el flujo actual.
- Implementar o rediseñar POS, inventario, productos, apartados, devoluciones, reportes, auditoría o dashboard funcionales; pantallas y operaciones de esos módulos son DEV-02. El shell solo proporciona marco, navegación a rutas ya existentes y contenido presente sin ampliar su comportamiento.
- Cambios a APIs/endpoints, contratos, autorización/sesión, reglas de negocio, modelo/schema/migraciones/seed, persistencia o aislamiento multiempresa; cambios a rutas existentes o creación de rutas nuevas.
- Dependencias nuevas, cambios de versión, reescritura de servicios de auth/business, cambios a `src/lib/auth.ts`, u otros cambios backend.
- Repetir DEV-00 (placeholder común, refactor de servicios/carrito o informe de preparación) como objetivo de implementación. Los servicios y rutas actuales se consumen tal como existen.

## User flows

1. **Visita a `/`**: el usuario no autenticado ve una página de entrada coherente con la identidad operativa y una acción visible que lleva a `/login`. Sin autenticación no aparecen datos privados ni se inicia una sesión automáticamente.
2. **Login en `/login`**: el usuario introduce correo y contraseña en campos etiquetados. Vacíos/formato inválido generan validación legible sin request; envío válido deshabilita temporalmente el botón y muestra progreso. El cliente usa exclusivamente `src/services/auth.ts` y su endpoint/payload existente. Respuesta de error (incluidas credenciales inválidas o error de red) produce mensaje accesible y permite corregir/reintentar. Éxito respeta la respuesta/redirect existente: entrar al workspace si corresponde o ir a `/negocios` cuando la sesión requiere selección. No exponer detalles secretos ni rellenar credenciales de demostración.
3. **Selección en `/negocios`**: solicitar lista mediante `src/services/businesses.ts`; mientras carga se presenta estado visible anunciado apropiadamente. Con negocios, mostrar nombre y datos ya devueltos por el servicio en tarjetas/lista accesibles. Elegir y confirmar invoca la operación existente con el id seleccionado, muestra progreso y evita envíos duplicados. Éxito sigue el destino que ya usa la aplicación; error de red/servidor conserva contexto y habilita reintento. Lista vacía explica que no hay negocios disponibles y no incluye CTA para crearlos.
4. **Workspace protegido**: con sesión válida, visitar cualquiera de las ocho rutas enumeradas muestra el shell, navegación con selección actual, cabecera/contexto y el contenido ya existente de esa ruta. Activar cada enlace navega a su ruta real. Sin sesión, el `getAuth` del layout existente conserva el redirect a `/login`; no se sustituye ni debilita la protección.
5. **Responsive y teclado**: en desktop la navegación lateral queda disponible junto al contenido; en tablet/móvil la adaptación permite abrir, cerrar y recorrer navegación con teclado/táctil, el contenido se refluye y no se requiere scroll horizontal. Foco visible, orden lógico, nombres accesibles y Escape/cierre cuando haya drawer/modal.

## Modelo de datos

- No se modifica ni amplía Prisma/PostgreSQL: tablas, campos, tipos, relaciones, índices, migraciones y seed permanecen sin cambios.
- Login conserva el contrato ya existente en `src/services/auth.ts` y `POST /api/auth/login`; la pantalla solo gestiona en memoria los valores introducidos y el estado de petición. No persistir contraseña en storage, URL o logs.
- Selector conserva el tipo, respuesta y contrato existente de `src/services/businesses.ts`, `GET /api/businesses` y `POST /api/businesses/select`; el id seleccionado y el estado de UI son efímeros. No crear campos, negocios ni mutaciones distintas.
- Datos de usuario/negocio que se muestren provienen únicamente de respuestas/estado ya existentes; no inventar propiedades ni cambiar la sesión.

## Stack y decisiones técnicas

- Mantener el stack y versiones instalados: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Lucide React, Vitest 3 y Playwright 1.51 según `package.json`; no añadir dependencias ni editar lockfile/config para introducir herramientas.
- Respetar App Router y las ubicaciones actuales: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/negocios/page.tsx`, `app/(workspace)/layout.tsx` y sus ocho `page.tsx`; reutilizar/crear componentes visuales en `src/components/` y tokens en CSS global o estructura existente apropiada. Los servicios están en `src/services/auth.ts` y `src/services/businesses.ts`.
- Usar fuentes ya instaladas/locales; la familia principal será Plus Jakarta Sans según la referencia primaria. Inter solo se admite donde un detalle utilitario existente lo justifique, no como composición tipográfica global alternativa.
- Mantener navegación limitada a las rutas reales y labels en español. Evitar links a signup/crear negocio o módulos no implementados. Preservar los contenidos actuales de las páginas workspace sin implementar funcionalidades DEV-02.
- Preferir elementos HTML semánticos, `label` asociado a cada campo, `button`/`a` nativos, `aria-live` para mensajes de petición y errores, indicador de foco perceptible, contraste WCAG AA y soporte de teclado/reduced motion. No depender solo de color para estados.
- Mantener pruebas y comandos existentes: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`; Playwright debe ser no destructivo y no llamar APIs que escriban datos reales. No ejecutar seed/migraciones.
- Secuencia de trabajo Forge: el Planner registra primero el reemplazo de `SPEC.md` en un commit SPEC Planner; únicamente después Generator implementa y registra sus cambios en commit(s) Generator. El commit Planner debe preceder al primero de Generator en el historial.

## Assumptions

- DEV-01 reemplaza el estado visual de preparación de DEV-00, pero no reabre el alcance de placeholder ni repite los servicios ya extraídos.
- La lista exhaustiva de rutas workspace es la registrada hoy bajo `app/(workspace)/`; grupos de rutas entre paréntesis no forman parte de la URL. La página de ticket no se convierte en parte del shell ni cambia su scoping.
- La referencia primaria contiene la composición, paleta, espaciado y jerarquía de la experiencia pedida. No se copian las composiciones POS ni signup aunque existan otras pantallas Stitch en `diseno/`.
- El sistema actual determina redirects al autenticar/seleccionar negocio; la UI los conserva y no inventa destinos ni reglas de roles.
- Si la API de negocios devuelve una colección vacía, no se infiere permiso para crear un negocio. Se presenta solo un estado vacío informativo.
- Las pruebas E2E usan mocks de red, sesión de prueba o fixture aislada ya disponible; no autentican contra ni mutan una base local/compartida con credenciales reales.
- Si una pantalla workspace actual sigue siendo el placeholder DEV-00, el shell la envuelve y mantiene ese contenido temporal; su implementación funcional y rediseño individual esperan DEV-02.

## Rubric de evaluación

Cada criterio es binario: PASS únicamente si la evidencia/comando indicado cumple íntegramente; si falla, registrar FAIL con criterio y evidencia observada. Evaluar en orden y no declarar PASS global con algún FAIL.

1. **SPEC y secuencia Forge** — `git diff --check -- SPEC.md` retorna 0 y `SPEC.md` contiene exactamente estas siete secciones, una vez cada una y en este orden: Objetivo, Scope, User flows, Modelo de datos, Stack y decisiones técnicas, Assumptions, Rubric de evaluación. `git log --oneline` demuestra que el commit que registra el SPEC Planner precede al primer commit Generator.
2. **Rutas y alcance** — `app` registra UI para `/`, `/login`, `/negocios` y las ocho rutas workspace listadas en Scope; build exitoso. `/tickets/[id]` mantiene su ruta y protección/comportamiento preexistente. No se agrega signup, crear negocio, ni nueva ruta.
3. **Sistema visual primario** — inspección de tokens/componentes confirma Plus Jakarta Sans como tipografía principal, paleta/superficies y lenguaje visual derivados de `diseno/retail_operational_clarity/DESIGN.md`. `diseno/retail_pos_inventory_system/DESIGN.md` figura en la documentación de implementación como referencia POS/inventario suplementaria con sus diferencias mint/Inter/composición descritas. `git diff -- diseno/` está vacío.
4. **Shell desktop** — Playwright a 1440×900 abre una ruta workspace autenticada con fixture/mocking de sesión, encuentra navegación accesible con enlaces a las ocho rutas reales, identifica la sección activa según URL y ve cabecera/contexto y contenido; cada enlace navega a la ruta correspondiente sin 404.
5. **Adaptación responsive** — Playwright en 768×1024 y 390×844 verifica shell y login/negocios sin `document.documentElement.scrollWidth > window.innerWidth`; navegación permanece operable y contenido visible/refluido. No hay elementos esenciales inaccesibles por recorte horizontal.
6. **Login interacción** — Playwright verifica labels accesibles, validación local de campos vacíos/formato inválido sin request, alternancia de visibilidad de contraseña con nombre accesible y control de envío; mock de request demuestra que usa el endpoint/payload existente una vez, presenta estado de carga y evita doble envío.
7. **Login respuesta y seguridad** — Playwright con mocks verifica respuesta de autenticación fallida y error de red con mensaje accesible/reintento, y respuesta exitosa con destino conforme al contrato existente. En código/bundle no hay contraseña predeterminada ni secreta en UI, fixture o storage; ningún valor de contraseña de referencia se usa funcionalmente.
8. **Selector de negocio** — Playwright con mocks de servicio verifica estados loading, vacío sin CTA de alta, error recuperable, lista con negocios existentes y selección/confirmación que envía exactamente el id elegido por el método/payload existente; durante envío hay progreso y no se permite doble submit; éxito sigue redirect existente.
9. **Auth y dominio preservados** — `git diff -- app/api src/lib/auth.ts src/services/auth.ts src/services/businesses.ts prisma/schema.prisma prisma/migrations package.json package-lock.json` no contiene cambios; inspección confirma el layout sigue usando `getAuth` y redirect sin sesión, y los servicios conservan rutas, métodos y payloads previos.
10. **Sin módulos DEV-02** — diff de implementación no altera páginas funcionales/API/reglas de POS, inventario, productos, apartados, devoluciones, reportes, auditoría o dashboard; en las ocho rutas el shell envuelve el contenido existente y ningún control nuevo afirma ejecutar operaciones de esos módulos.
11. **Accesibilidad y estados** — pruebas de componente/E2E confirman navegación por teclado, foco visible, activación de links/botones, labels, nombre de controles, mensajes anunciados de error/carga, contraste WCAG AA de colores de texto y objetivos táctiles de al menos 44×44px para acciones primarias/interactivas táctiles.
12. **Errores de carga** — prueba de UI del servicio de negocios y login falla de forma controlada con red rechazada y status de error: no hay crash, contenido engañoso ni pérdida irreversible de navegación/entrada; recuperación/reintento vuelve a estado operable.
13. **Pruebas** — `npm test` y `npm run test:e2e` terminan en código 0; los E2E son deterministas, aislados por fixture/mock y no escriben ni dependen de cambios en base de datos.
14. **Checks de proyecto** — `npm run lint`, `npm run typecheck` y `npm run build` terminan todos en código 0.
15. **Sin cambios de infraestructura** — `git diff -- package.json package-lock.json prisma/schema.prisma prisma/migrations app/api src/lib/auth.ts src/lib/db.ts src/lib/audit.ts src/lib/money.ts diseno/` está vacío; no aparecen dependencias, endpoints, tablas, migraciones, archivos de diseño alterados ni secretos/credenciales de demostración incorporados.
