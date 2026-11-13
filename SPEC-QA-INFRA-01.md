# QA-INFRA-01 — Infraestructura E2E PostgreSQL aislada

## Objetivo
Proveer una infraestructura PostgreSQL 16 permanente, aislada y reproducible para pruebas E2E de Lucem Retail. La base E2E usa exclusivamente `lucem_retail_e2e`, el rol `lucem_e2e` y el puerto loopback `55432`; su volumen de datos es exclusivo. Los comandos E2E cargan su configuración de forma segura y verifican la identidad de la base antes de cualquier escritura. Las ejecuciones de QA son reproducibles y sus fallos se clasifican de forma accionable.

## Scope
Incluye definir/configurar un servicio PostgreSQL 16 dedicado a E2E con volumen persistente exclusivo, publicación limitada a loopback en puerto `55432`, healthcheck y política de restart; aprovisionar el rol `lucem_e2e` y base `lucem_retail_e2e`; y proteger `.env.e2e` para que no se incluya en Git ni se expongan credenciales.

Incluye carga automática, controlada y segura del entorno E2E para los comandos E2E documentados, sin modificar el entorno de desarrollo/staging ni permitir fallback a otra base. Preflight descubre instancias/volúmenes/contenedores PostgreSQL antiguos que podrían colisionar y muestra identidad/estado antes de actuar. No elimina ni reemplaza recursos antiguos automáticamente. Antes de migrar, seedear, limpiar o ejecutar cualquier escritura, el proceso comprueba la identidad real del servidor y base conectados; si no coincide exactamente con el target E2E, termina con error sin mutaciones.

Incluye verificar ordenamiento de productos mediante cinco ejecuciones E2E separadas, ejecutar las suites relacionadas, clasificar fallos del dashboard y ofrecer una ejecución QA full que integra las comprobaciones requeridas. Preservar todos los cambios locales no relacionados, incluido `SPEC.md` modificado por DEV-DATA-01.

Fuera de alcance: cambios a lógica de producto no necesarios para habilitar/verificar E2E, tocar datos/servicios de staging o producción, borrar o reutilizar volúmenes/instancias preexistentes, conceder ACL de Docker, guardar credenciales fuera del mecanismo local protegido, o alterar/eliminar cambios locales ajenos a esta tarea.

## User flows
1. Desarrollador configura `.env.e2e` local con credenciales del rol E2E. La plantilla compartible, si existe, contiene únicamente nombres de variables y valores no secretos; el archivo real tiene permisos restrictivos y está excluido de Git.
2. Operador ejecuta el preflight de infraestructura. Éste reporta servicio/puerto/volumen E2E y descubre instancias antiguas relevantes, sin detenerlas, borrarlas ni modificar datos. Una colisión o ambigüedad bloquea el arranque y requiere resolución explícita.
3. Operador inicia/consulta la infraestructura dedicada. El servicio sólo publica `127.0.0.1:55432`, usa PostgreSQL 16, volumen exclusivo, healthcheck y restart configurados. El readiness espera al healthcheck antes de iniciar suites.
4. Desarrollador invoca un comando E2E documentado. El comando carga `.env.e2e` automáticamente sólo para esa ejecución, exige configuración completa y conecta sólo al target configurado; no hereda silenciosamente una URL de desarrollo, staging o producción.
5. Antes de cualquier operación que escriba, incluidos migrate/reset/seed/cleanup y suites E2E, el preflight obtiene identidad del servidor/base y exige coincidencia exacta con `lucem_retail_e2e`, rol `lucem_e2e`, PostgreSQL 16 y puerto esperado. Si falla una condición, sale no-cero antes de la primera escritura.
6. El comando de ordenamiento ejecuta cinco corridas independientes de E2E sobre productos y valida el resultado de cada corrida. El reporte identifica las cinco ejecuciones; una falla individual hace fallar el comando.
7. QA ejecuta las suites relacionadas y luego el flujo QA full. El dashboard de resultados clasifica cada fallo como infraestructura/preflight, setup de DB, aplicación/API, aserción E2E, o timeout/flaky; incluye suite/caso y evidencia diagnóstica no sensible. QA full sólo retorna éxito cuando todos sus pasos requeridos pasan.

## Modelo de datos
PostgreSQL de pruebas dedicado: servidor PostgreSQL major 16; base `lucem_retail_e2e`; rol de conexión `lucem_e2e`; puerto host `127.0.0.1:55432`; almacenamiento persistente en un volumen Docker exclusivo de E2E. El nombre/identidad de volumen no se comparte con desarrollo, staging ni producción. La base contiene el schema de la aplicación y datos desechables de prueba, sin importar datos de entornos reales.

Configuración E2E local mediante `.env.e2e`, con URL/conexión que identifica explícitamente el host loopback, puerto, base y rol E2E. Ningún secreto se versiona. Los datos de prueba pueden recrearse según el flujo E2E existente; cualquier reset es admisible sólo después de validar identidad exacta del target.

## Stack y decisiones técnicas
Usar Docker Compose y el cliente/mecanismos PostgreSQL ya presentes en el proyecto; imagen fijada a PostgreSQL 16 (major exacto), servicio separado de los entornos existentes, volumen nombrado exclusivo, healthcheck verificable y política de reinicio persistente apropiada (`unless-stopped` o equivalente). Publicar el puerto sólo en loopback, nunca en todas las interfaces.

Los comandos E2E cargan `.env.e2e` mediante el mecanismo del proyecto (por ejemplo, `--env-file` del runner o loader explícito acotado a scripts E2E); no cargarlo globalmente para comandos de aplicación ordinarios. `.env.e2e` se excluye en `.gitignore`; cualquier ejemplo es no secreto. Permisos del archivo real son restrictivos para el usuario propietario (modo `0600`, o mecanismo equivalente en la plataforma).

La seguridad no depende de membresía adicional al grupo Docker ni de ACL permanente. Los comandos que requieran privilegios Docker usan el mecanismo interactivo disponible en el host, sin almacenar contraseñas de sudo. Ninguna herramienta debe ejecutar `down -v`, eliminar contenedores/volúmenes antiguos ni aplicar limpieza global como parte automática del preflight.

El preflight usa consultas de identidad de servidor y base sobre la conexión que utilizará la operación, no sólo comparación textual de URL. Los errores y dashboard omiten passwords, URL con credenciales y variables secretas. Los cinco runs de ordering son independientes y el reporte conserva resultado individual y total.

## Assumptions
- El entorno de desarrollo dispone de Docker/Compose y puede ejecutar PostgreSQL 16; no se asume acceso desde hosts remotos.
- El puerto `55432` está reservado para esta infraestructura. Si está ocupado, el preflight falla y reporta el proceso/servicio detectado sin cambiar el puerto automáticamente.
- El rol `lucem_e2e` se limita a privilegios requeridos en `lucem_retail_e2e`; no es superusuario y no tiene permisos sobre bases de datos ajenas.
- Las suites, comandos actuales de test y dashboard se identifican inspeccionando la configuración real del repositorio; no se presume un nombre de script inexistente.
- Las instancias antiguas pueden pertenecer a trabajo local del usuario. Su descubrimiento es sólo informativo y cualquier intervención requiere una acción explícita separada.
- Es válido destruir/recrear datos dentro de `lucem_retail_e2e` únicamente después de la comprobación de identidad en la conexión efectiva.
- Todas las modificaciones de implementación respetan el estado inicial del árbol de trabajo y preservan cada cambio local no relacionado.

## Rubric de evaluación
Cada criterio es binario. PASS requiere evidencia reproducible mediante inspección de configuración, comandos del proyecto, consultas de sólo lectura o ejecución controlada. Cualquier incumplimiento es FAIL. Cualquier operación de escritura sobre un target cuya identidad no se haya validado es FAIL.

1. **PostgreSQL fijado:** la definición del servicio usa PostgreSQL major 16 explícitamente y el servidor arrancado reporta major 16.
2. **Base y rol dedicados:** existe la base exacta `lucem_retail_e2e` y el rol de conexión exacto `lucem_e2e`; el rol no es superusuario y no puede escribir en bases ajenas.
3. **Puerto loopback:** el servicio publica el puerto host `55432` exclusivamente en `127.0.0.1`; no escucha en `0.0.0.0` ni en interfaces externas.
4. **Volumen exclusivo y persistencia:** el servicio usa un volumen nombrado persistente dedicado a E2E, distinto de los volúmenes existentes de desarrollo/staging/producción; reiniciar el contenedor conserva la base.
5. **Healthcheck y restart:** la configuración declara healthcheck PostgreSQL y política de restart; Compose reporta healthy tras iniciar y el servicio se recupera después de reinicio controlado.
6. **Entorno protegido:** `.env.e2e` está excluido por Git, no aparece como archivo trackeado, tiene permisos restrictivos cuando existe localmente y no contiene valores secretos en una plantilla versionada.
7. **Auto-carga acotada:** todos los comandos E2E documentados cargan `.env.e2e` automáticamente; un comando no E2E no lo carga ni reemplaza su configuración ordinaria con ella.
8. **Sin fallback de conexión:** si falta `.env.e2e` o una variable necesaria, el comando E2E falla antes de conectar/escribir y no cae a `DATABASE_URL` de otro entorno.
9. **Descubrimiento de instancias antiguas:** el preflight identifica y reporta instancias/recursos PostgreSQL preexistentes que puedan colisionar; una prueba con recurso antiguo detectado demuestra que no es borrado, detenido ni modificado automáticamente.
10. **Colisión de puerto segura:** al ocupar `55432`, el preflight termina no-cero, identifica la colisión y no cambia configuración ni elimina el recurso que ocupa el puerto.
11. **Identidad antes de escribir:** cada ruta de migración, reset, seed, cleanup o suite que escriba verifica la conexión efectiva, base exacta, rol esperado, PostgreSQL 16 y endpoint esperado antes de la primera mutación; evidencia en target incorrecto confirma cero escrituras.
12. **Privilegios Docker:** no se añaden usuarios a grupos ni ACL permanentes de Docker; inspección de cambios y comandos no encuentra concesión persistente ni almacenamiento de password sudo.
13. **Ordering cinco veces:** el comando de ordering ejecuta exactamente cinco corridas independientes de E2E sobre productos, reporta resultado de cada una y retorna no-cero si cualquiera falla.
14. **Suites relacionadas:** QA full invoca las suites relacionadas declaradas para este flujo y el reporte muestra estado individual de cada suite; suite omitida o fallo ignorado implica FAIL.
15. **Clasificación del dashboard:** un fallo de cada clase soportada se presenta como infraestructura/preflight, setup DB, aplicación/API, aserción E2E o timeout/flaky, con suite/caso y diagnóstico útil; ninguna salida expone secretos.
16. **Resultado QA full:** QA full termina con código cero sólo cuando preflight, disponibilidad DB, cinco ordering runs y todas las suites relacionadas pasan; cualquier fallo produce código no-cero y queda visible en el reporte.
17. **Preservación del trabajo local:** el diff de la tarea contiene sólo cambios necesarios para QA-INFRA-01 y un diff previo/posterior demuestra que `SPEC.md` y todo cambio local no relacionado permanecen intactos.
