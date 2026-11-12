# QA-01D — Bootstrap aislado de PostgreSQL QA

## Objetivo
Preparar una base local persistente `lucem_qa` sin capacidad de operar sobre staging u otros recursos Docker.

## Scope
Sólo se provisiona PostgreSQL para QA. Next QA, migraciones, fixtures, auditoría y ZIP quedan para después de confirmar que el servicio está listo. No se modifica `SPEC.md`, código comercial, staging, Cloudflare, n8n, volúmenes protegidos ni volúmenes anónimos.

## User flows
1. El operador ejecuta `prepare`; se crean una sola vez credenciales sintéticas seguras en `.qa-private/`, ignorada por Git y con permisos `0700/0600`; secretos nunca se imprimen.
2. El operador ejecuta `check`; se valida rama `feature/lucem-ui-redesign-v1`, Compose resuelto y exacto, proyecto/servicio, base/usuario, puerto loopback `127.0.0.1:55433`, volumen nombrado exclusivo y disponibilidad del puerto. No contacta Docker Engine ni requiere privilegios.
3. El operador ejecuta `up`; se repiten las guardas, se rechazan contenedor/volumen con identidad inesperada y se invoca sólo `sudo docker compose ... up -d postgres`. Sudo solicita autenticación interactiva.
4. Si el contenedor QA ya existe pero su `NetworkSettings.Ports` no refleja el puerto, `reconcile` verifica etiquetas de proyecto/servicio, única montura al volumen QA nombrado e identidad SQL; luego fuerza sólo la recreación del contenedor mediante Compose, conserva y reusa el volumen, y valida `docker port` y conexión TCP loopback. Cualquier diferencia bloquea antes de recrear.
5. No existen subcomandos down, prune, remove, migrate o cleanup. El evaluador inspecciona archivos/configuración y ejecuta validaciones sin invocar operaciones privilegiadas; no afirma DB lista antes de una posterior comprobación del operador.

## Modelo de datos
No hay cambios de esquema. Compose crea sólo el servicio PostgreSQL `lucem_qa` con usuario dedicado y volumen persistente de nombre fijo QA-01D.

## Stack y decisiones técnicas
Compose existente, sólo servicio `postgres`; binding host explícito loopback; volumen Docker explícitamente nombrado `lucem-qa-01d-postgres-data`. PostgreSQL se une a una única red bridge dedicada `lucem-qa-01d-private` con `enable_ip_masquerade=false`, lo que permite Docker port-publishing sin habilitar masquerading de salida. No se añade una red `internal`: el diagnóstico de ejecución confirmó que Docker guardaba `HostConfig.PortBindings` pero no materializaba `NetworkSettings.Ports` al conectar el servicio sólo a esa red. La ausencia de masquerading y el binding host `127.0.0.1` limitan la exposición; se valida el listener TCP local tras reconciliar. Credenciales aleatorias hex, para URL-safe PostgreSQL. Runtime secrets contienen URL QA y contraseñas sintéticas E2E para su uso posterior, siempre locales y no versionadas. El bootstrap es `scripts/qa/provision-db.sh` con operaciones `prepare`, `check`, `up` y `reconcile` restringidas.

## Assumptions
- El diagnóstico del propietario indica que no existe contenedor QA y que staging, n8n y volúmenes anónimos están activos/protegidos.
- Los comandos privilegiados se ejecutan manualmente por el propietario; la sesión del agente no invoca sudo ni Docker Engine.
- Un volumen QA existente sin etiquetas exactas de proyecto/volumen se considera ajeno y bloquea el arranque.

## Rubric de evaluación
1. `prepare` es idempotente, genera secretos seguros, no los imprime, no cambia los existentes y crea archivos sólo bajo `.qa-private/` con permisos privados.
2. Compose define sólo PostgreSQL QA, base/usuario exactos `lucem_qa`, bind `127.0.0.1:55433`, bridge QA dedicada con masquerading desactivado y volumen persistente cuyo nombre no coincide con staging ni con nombres anónimos.
3. `check` valida el Compose renderizado y puerto local sin usar Docker Engine/sudo; cualquier configuración inesperada o puerto ocupado falla no-cero antes de privilegios.
4. `up` exige rama y ruta del repositorio exactas, revalida base/usuario/host/puerto/proyecto/volumen, usa únicamente `sudo docker compose up -d postgres` para el proyecto QA dedicado y nunca borra/recrea volúmenes.
5. `reconcile` sólo opera si el contenedor existente y sus etiquetas/montura/identidad son exactas; Compose recrea el contenedor QA y preserva el volumen, después se comprueba el binding real y el acceso loopback TCP.
6. Pruebas/dry-run prueban configuraciones incorrectas y que ningún comando puede referir staging, n8n, volúmenes protegidos/anónimos, `down`, `prune` o `rm`.
