## Objetivo
Entregar un despliegue de staging de Lucem Retail exclusivamente accesible en la LAN, operable en Ubuntu mediante Docker Compose con PostgreSQL de major 16 fijada y Prisma, sin reconstruir ni alterar el producto.

## Scope
**Incluye**
- Compose dedicado `compose.staging.yml` con servicios `db`, `migrate` y `app`; PostgreSQL 16 fijado a una versión concreta, healthcheck, red interna y almacenamiento persistente.
- Imagen de producción Next.js compatible con Prisma 6.7 y Next 15, generación del cliente y ejecución segura de `prisma migrate deploy` como servicio previo a app.
- Publicación de la app sólo en el puerto LAN 3000, exclusivamente si está libre; no publicar PostgreSQL, no habilitar exposición a internet y no detener, reiniciar ni modificar servicios ajenos al stack, en particular `n8n_server` en 5678.
- Configuración y secretos locales de staging ignorados por Git, con permisos `0600`; validaciones previas y posteriores en `scripts/deploy-staging.sh`.
- Volumen persistente para `public/uploads/products`, compatible con POST `/api/products/image` y GET `/api/products/image/[filename]`.
- Procedimientos de backup y restore verificados y documentación `docs/deployment/LINUX-STAGING.md`, `POSTGRESQL-MIGRATIONS.md` y `BACKUP-RESTORE.md`.
- Evidencia reproducible, evaluación independiente y un `FINDINGS.md` nuevo para DEV-DEPLOY-01, sin sobrescribir `FINDINGS.pre-DEV-DEPLOY-01.md`.

**Fuera de alcance y prohibiciones**
- No reconstruir el producto, cambiar diseño, pantallas, funciones comerciales, API, schema Prisma ni migraciones existentes.
- No usar ni interpretar el SPEC anterior de DEV-SEC como especificación de despliegue. Reemplazar el contenido de trabajo `SPEC.md` con este plan conserva automáticamente el SPEC previo en Git/history; el historial no se reescribe.
- No tocar, parar, reiniciar, reemplazar, recrear ni desconectar servicios, contenedores, redes o volúmenes ajenos; no ejecutar un `docker compose down` global ni comandos que puedan afectar n8n en 5678.
- No publicar PostgreSQL ni puertos adicionales; no enlazar la app a una interfaz pública. Sin firewall/ACL LAN demostrables, bloquear publicación hasta resolverlo. No exponer a internet.
- Ninguna migración contra otra DB: destino único `lucem_staging` dentro del PostgreSQL privado del compose. Usar únicamente `prisma migrate deploy` y `prisma migrate status`. Prohibidos `migrate reset`, `db push`, seed, suites E2E mutantes en staging y `down -v`.
- No imprimir, registrar, guardar en artefactos ni incluir en Git secretos, contraseñas o URLs con credenciales. Ningún secreto de staging se versiona.
- No cambiar la rama actual `feature/lucem-ui-redesign-v1`, no hacer merge ni force push. Preservar cualquier cambio preexistente; no incluirlo en commits del despliegue.

## User flows
1. **Preflight Ubuntu** — `scripts/deploy-staging.sh` valida Ubuntu/Linux, Docker Engine y Compose v2, rama `feature/lucem-ui-redesign-v1`, estado Git, espacio/recursos y configuración local. Registra branch/HEAD y resultados sin valores sensibles. Falla antes de tocar contenedores si alguna guarda no se satisface.
2. **Aislamiento de recursos** — Enumerar y confirmar que los nombres de proyecto, servicios, volúmenes y red son exclusivos de Lucem staging. Detectar propietario/listener del puerto 3000; si está ocupado, no matarlo, no usar otro puerto y reportar bloqueo. Confirmar que 5678 y el contenedor `n8n_server` quedan fuera de toda operación.
3. **Configuración privada** — Crear instrucciones para archivo local de variables de staging no versionado, validar presencia/formato y permisos `0600` sin mostrar valores. La contraseña PostgreSQL se carga como secreto local protegido; DATABASE_URL interna identifica exactamente base `lucem_staging` y sólo es accesible desde servicios de Compose.
4. **Construir y migrar** — Construir la imagen de producción. Levantar sólo `db` del proyecto dedicado, esperar healthcheck; ejecutar el servicio one-shot `migrate` con `prisma migrate deploy`, revisar `prisma migrate status` contra la misma DB y terminar con éxito. Migraciones de `prisma/migrations` nunca se aplican a una DB externa o del host.
5. **Arranque** — Tras migración satisfactoria, iniciar `app` como usuario no root con bind sólo en interfaz LAN seleccionada y puerto host 3000. `db` no publica puertos; red Compose interna restringe conexión DB a app/migrate. Si no es posible restringir el bind a LAN o el firewall local no impide WAN, no publicar y declarar BLOCKED.
6. **Prueba funcional segura** — `curl` al health/documented route real de Next y rutas GET no mutantes; demostrar respuesta HTTP, dirección/puerto LAN y pertenencia de servicios al proyecto. Verificar con Docker que no existe publish DB ni publicación 5678, y que n8n conserva estado, ID y listener. Crear/subir una imagen de prueba sólo si se puede eliminar únicamente el archivo exacto después; comprobar persistencia tras recrear sólo `app`. No ejecutar flujos comerciales que escriban datos.
7. **Operación de imágenes y datos** — Confirmar volumen `public/uploads/products` compartido con la ruta `process.cwd()/public/uploads/products`; GET de archivo válido requiere auth y nombre UUID conforme al handler. Documentar límites actuales de subida (5 MiB; JPEG, PNG, WebP, GIF), sin cambiar handler.
8. **Backup y restore** — Producir backup PostgreSQL consistente del nombre de DB aislado y archivos de imágenes, con timestamps, permisos privados, checksums y retención documentada; validar integridad/listado sin imprimir credenciales. Restaurar en entorno temporal aislado con otro nombre de recursos/DB y verificar migraciones/status y acceso a datos/archivos. No restaurar sobre staging activo como prueba ni tocar otra base.
9. **Cierre y rollback** — Ejecutar checks no mutantes y registrar resultados y bloqueos en evidencia/FINDINGS. Parada/rollback sólo puede afectar el proyecto nombrado explícitamente por Compose, nunca servicios ajenos; preservar volúmenes y backups. No ejecutar `down -v`. Commits específicos y auditables, sin merge/force push.

## Modelo de datos
- Se conserva exactamente `prisma/schema.prisma`; no se añade ni altera ningún modelo o relación para el despliegue.
- La app usa los modelos Prisma existentes (entre otros `User`, `Business`, `Membership`, `Session`, `Category`, `Product`, `ProductVariant`, `InventoryMovement`, `Reservation`, `Sale`, `Return` y `AuditLog`) exclusivamente en `lucem_staging`.
- `DATABASE_URL` de runtime y migración apunta a PostgreSQL interno del servicio `db`, base `lucem_staging`; credencial de mínimo alcance apropiado para la aplicación y nunca una URL del host, E2E o producción. La app no recibe credencial administrativa de bootstrap si puede evitarse.
- Volumen persistente de archivos montado en `/app/public/uploads/products` (o ruta equivalente demostrada con `process.cwd()` del runtime). No se almacenan uploads en la capa efímera del contenedor.
- La DB usa volumen propio, distinto de uploads y sin reutilizar volúmenes existentes; snapshots/archivos de backup son artefactos operativos protegidos, no datos de schema nuevos.

## Stack y decisiones técnicas
- Ubuntu, Docker Engine y Docker Compose v2. Compose se invoca explícitamente como `docker compose -p lucem-retail-staging -f compose.staging.yml`; todo comando destructivo, si fuera autorizado, debe limitarse a este proyecto y volúmenes nunca se borran.
- PostgreSQL versión concreta de major 16 fijada en compose (sin `latest` ni tag flotante); preferir digest de imagen reproducible. Red del proyecto `internal: true` para DB y migraciones; egress de la aplicación no se habilita por defecto. El deployment es sólo staging LAN.
- Aplicación: versiones ya fijadas por lockfile/package (`next` 15.x, React 19, TypeScript, Prisma y `@prisma/client` 6.7.x, Node LTS compatible). Dockerfile multi-stage, dependencias reproducibles desde lockfile, `prisma generate`, runtime mínimo y usuario no root; `output: standalone` sólo si compatible con configuración verificada.
- Compose separa `db`, `migrate` y `app`; migrate depende de healthcheck de db y app depende de éxito de migrate. `migrate` usa el binario Prisma instalado en imagen de producción y nunca seed.
- Archivos solicitados: `compose.staging.yml`, `Dockerfile` de producción (o Dockerfile dedicado documentado), `.dockerignore`, reglas `.gitignore` para secretos locales, `scripts/deploy-staging.sh`, `docs/deployment/LINUX-STAGING.md`, `docs/deployment/POSTGRESQL-MIGRATIONS.md`, `docs/deployment/BACKUP-RESTORE.md`, evidencia y `FINDINGS.md` nuevo.
- Comandos de verificación admitidos: `docker compose ... config --quiet`; inspección de estado/logs sin exponer entorno; `docker compose ... exec db pg_isready`; `docker compose ... run --rm migrate npx prisma migrate status`; `curl` a app; `docker inspect`/`ss` para binds y puertos; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx prisma validate`, `git diff --check`. No ejecutar E2E mutante contra staging.
- El compose se limita por nombre de proyecto y archivos explícitos; nunca se usa `docker compose` sin `-p`/`-f` para operación destructiva ni se invoca `docker system prune`.

## Assumptions
- El usuario solicita ejecución real del despliegue en Ubuntu LAN, no sólo documentación. Si el entorno actual no es el Ubuntu destino o no tiene Docker/Compose, red LAN/firewall, privilegios o puerto libre, realizar lo verificable sin inventar resultados y documentar `BLOCKED` con comando y causa exacta; no simular despliegue.
- Major PostgreSQL 16 debe quedar reproducible con versión minor concreta y preferentemente digest verificado al generar. Las migraciones son las cinco existentes bajo `prisma/migrations`; la evidencia registra su estado real y no asume base vacía.
- Base de datos staging dedicada se llama exactamente `lucem_staging`. El nombre del servicio compose es `db`; host local de la red Compose es `db`; el puerto 5432 existe sólo dentro de esa red.
- Si el producto no tiene endpoint health dedicado, seleccionar una ruta GET existente (por ejemplo `/login`) como prueba HTTP; no añadir endpoints ni cambios de producto. Respuesta HTTP debe ser interpretable según el contrato real.
- La interfaz LAN se determina en Ubuntu y no se supone IP. Publicación sólo en puerto 3000; si Docker bind de IP LAN y controles firewall no aseguran ausencia de exposición WAN, despliegue queda detenido antes de publicar.
- Secretos se crean fuera de Git bajo directorio de operación del usuario, permisos 0600 y directorios 0700; el shell no usa `set -x`, no imprime contenido ni exporta secretos a evidencia. El repositorio puede describir nombres/plantillas sin credenciales.
- No se cambia producto para mejorar health checks, storage, conexión ni gestión de secretos. Los ajustes de deployment quedan acotados a contenedores, scripts, configuración y documentación.
- El cambio staged `FINDINGS.md -> FINDINGS.pre-DEV-DEPLOY-01.md` observado al iniciar pertenece al estado del usuario y debe conservarse intacto. El `FINDINGS.md` nuevo corresponde sólo a DEV-DEPLOY-01; commits deben evitar capturar el rename preexistente.
- Las verificaciones reales no mutantes son necesarias en staging; integraciones autenticadas comerciales y suites mutantes quedan fuera de staging. Evidencia redactada sanitizada nunca incluye URL con contraseña, env, secretos o logs indiscriminados.

## Rubric de evaluación
Todos los criterios son binarios y requieren comandos/artefactos reproducibles. `BLOCKED` se usa sólo ante prerequisito externo faltante y debe indicar evidencia exacta; no cuenta como PASS.

1. **SPEC/historial** — `SPEC.md` contiene exactamente estas siete secciones; historial Git conserva el SPEC previo DEV-SEC y evidencia que éste no se usó como spec de despliegue.
2. **Producto inalterado** — Diff no modifica diseño, funcionalidades comerciales, handlers/API, `prisma/schema.prisma`, SQL de migraciones ni contratos existentes.
3. **Compose aislado** — `docker compose -p lucem-retail-staging -f compose.staging.yml config --quiet` pasa y define exactamente servicios de despliegue `db`, `migrate`, `app`, red/volúmenes con nombres exclusivos; ninguna operación afecta recursos ajenos.
4. **PostgreSQL fijado** — Compose fija una versión exacta verificada PostgreSQL 16 (no `latest`/major flotante); contenedor reporta versión mayor 16 y `pg_isready` saludable.
5. **DB privada y exacta** — `docker inspect` demuestra DB sin ports publicados, conectada sólo a red interna y con DB `lucem_staging`; búsqueda de configuración confirma que DATABASE_URL sólo apunta al host `db`/DB `lucem_staging`, sin fallback host/E2E/producción.
6. **Prisma migrate controlado** — `migrate` espera healthcheck y ejecuta sólo `prisma migrate deploy`; status posterior de `prisma migrate status` pasa contra DB interna; no hay `reset`, `db push`, seed o E2E mutante en logs/comandos/evidencia.
7. **Imagen de producción** — Build de Docker instala desde lockfile, genera Prisma Client compatible, compila Next producción y arranca sin dev server; runtime es no-root y la prueba de build/arranque es reproducible.
8. **Puertos y no interferencia** — App está publicada sólo como puerto LAN 3000 si estaba libre; no publica DB ni 5678 ni otros puertos. Antes/después se documentan listener/estado/ID de `n8n_server` sin cambio; cualquier puerto 3000 ocupado produce bloqueo sin matar proceso ni elegir otro puerto.
9. **LAN sin Internet** — Inspección de bind y firewall/rutas demuestra acceso permitido desde LAN y no desde WAN/Internet; cualquier imposibilidad de verificar aislamiento produce BLOCKED y no se expone app.
10. **Secretos** — Archivos reales locales permanecen fuera de Git, modos `0600` (`stat`), directorios privados, compose no imprime secretos, scanner Git/tracked no los encuentra y los comandos de evidencia/logs están sanitizados.
11. **Persistencia PostgreSQL** — Datos de estado/versiones y el volumen DB sobreviven recreación limitada del servicio/contenedor app/db según procedimiento sin `down -v`; inspección confirma volumen dedicado y que ningún volumen preexistente fue reutilizado.
12. **Persistencia de imágenes** — Documentación y montaje resuelven la ruta efectiva del handler a `public/uploads/products`; prueba inocua de archivo imagen aprobado/GET autenticado y recreación sólo app demuestran persistencia; archivo de prueba se elimina exactamente y sólo si fue creado por prueba.
13. **HTTP seguro** — `curl` a URL LAN/puerto 3000 y ruta GET real obtiene código y respuesta esperados; no se ejecutan requests mutantes de negocio ni E2E mutantes contra staging.
14. **Backup verificable** — Procedimiento genera backup PostgreSQL y archivo de uploads, checksum, permisos privados, timestamps y retención, sin secretos; integridad de ambos artefactos se verifica reproduciblemente.
15. **Restore aislado** — Restore probado en DB/recursos temporales con nombre distinto no afecta staging ni servicios existentes; `migrate status`, lectura no mutante y archivo de prueba restaurado confirman integridad; artefactos temporales propios quedan limpiados preservando backups.
16. **Scripts seguros** — `scripts/deploy-staging.sh` valida precondiciones, branch/estado, disponibilidad 3000, pertenencia al proyecto y no ejecuta comandos globales/destructivos; fallo de cualquier guarda termina antes de publicación y comunica causa sin secretos.
17. **Documentación operativa** — Las tres guías cubren Ubuntu/Compose LAN, migraciones sólo `deploy`/`status`, backups/restores y recuperación, comandos exactos, seguridad, permisos, restricciones de puerto, rollback preservando volúmenes y ninguna operación sobre n8n.
18. **Findings y checks** — Nuevo `FINDINGS.md` enumera cada criterio PASS/FAIL/BLOCKED con evidencia y hallazgos honestos; lint, typecheck, tests, build, Prisma validate, compose config y `git diff --check` pasan o indican fallo exacto. No se reporta evidencia que no se ejecutó.
19. **Git/commits** — Rama sigue `feature/lucem-ui-redesign-v1`, no hay merge/force push y commits específicos sólo incluyen archivos DEV-DEPLOY-01; rename staged preexistente queda preservado y fuera de esos commits. Se informan hashes y estado final.
