# QA-01D — Bootstrap aislado de PostgreSQL QA

## Objetivo
Preparar una base local persistente `lucem_qa` sin capacidad de operar sobre staging u otros recursos Docker.

## Scope
Sólo se provisiona PostgreSQL para QA. Next QA, migraciones, fixtures, auditoría y ZIP quedan para después de confirmar que el servicio está listo. No se modifica `SPEC.md`, código comercial, staging, Cloudflare, n8n, volúmenes protegidos ni volúmenes anónimos.

## User flows
1. El operador ejecuta `prepare`; se crean una sola vez credenciales sintéticas seguras en `.qa-private/`, ignorada por Git y con permisos `0700/0600`; secretos nunca se imprimen.
2. El operador ejecuta `check`; se valida rama `feature/lucem-ui-redesign-v1`, Compose resuelto y exacto, proyecto/servicio, base/usuario, puerto loopback `127.0.0.1:55433`, volumen nombrado exclusivo y disponibilidad del puerto. No contacta Docker Engine ni requiere privilegios.
3. El operador ejecuta `up`; se repiten las guardas, se rechazan contenedor/volumen con identidad inesperada y se invoca sólo `sudo docker compose ... up -d postgres`. Sudo solicita autenticación interactiva. No existe subcomando down, prune, remove, migrate o cleanup.
4. El evaluador inspecciona archivos/configuración y ejecuta validaciones sin invocar operaciones privilegiadas; no afirma DB lista antes de una posterior comprobación del operador.

## Modelo de datos
No hay cambios de esquema. Compose crea sólo el servicio PostgreSQL `lucem_qa` con usuario dedicado y volumen persistente de nombre fijo QA-01D.

## Stack y decisiones técnicas
Compose existente, sólo servicio `postgres`; binding host explícito loopback; red Compose privada y volumen Docker explícitamente nombrado `lucem-qa-01d-postgres-data`. Credenciales aleatorias hex, para URL-safe PostgreSQL. Runtime secrets contienen URL QA y contraseñas sintéticas E2E para su uso posterior, siempre locales y no versionadas. El bootstrap es `scripts/qa/provision-db.sh` con operaciones `prepare`, `check` y `up` restringidas.

## Assumptions
- El diagnóstico del propietario indica que no existe contenedor QA y que staging, n8n y volúmenes anónimos están activos/protegidos.
- Los comandos privilegiados se ejecutan manualmente por el propietario; la sesión del agente no invoca sudo ni Docker Engine.
- Un volumen QA existente sin etiquetas exactas de proyecto/volumen se considera ajeno y bloquea el arranque.

## Rubric de evaluación
1. `prepare` es idempotente, genera secretos seguros, no los imprime, no cambia los existentes y crea archivos sólo bajo `.qa-private/` con permisos privados.
2. Compose define sólo PostgreSQL QA, base/usuario exactos `lucem_qa`, bind `127.0.0.1:55433`, red privada y volumen persistente cuyo nombre no coincide con staging ni con nombres anónimos.
3. `check` valida el Compose renderizado y puerto local sin usar Docker Engine/sudo; cualquier configuración inesperada o puerto ocupado falla no-cero antes de privilegios.
4. `up` exige rama y ruta del repositorio exactas, revalida base/usuario/host/puerto/proyecto/volumen, usa únicamente `sudo docker compose up -d postgres` para el proyecto QA dedicado y nunca borra/recrea volúmenes.
5. Pruebas/dry-run prueban configuraciones incorrectas y que ningún comando puede referir staging, n8n, volúmenes protegidos/anónimos, `down`, `prune` o `rm`.
