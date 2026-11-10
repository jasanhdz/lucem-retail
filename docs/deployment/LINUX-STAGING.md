# Lucem Retail — staging LAN en Ubuntu

Este despliegue es un stack independiente `lucem-retail-staging`; no modifica ni administra otros proyectos. Requiere Ubuntu, Docker Engine/Compose v2, Git limpio en `feature/lucem-ui-redesign-v1`, IPv4 LAN local, puerto host 3000 libre y UFW activo con una regla revisada que permita 3000 únicamente desde la CIDR LAN de confianza. Si esas condiciones no se pueden demostrar, no desplegar.

## Forge

Forge está instalado en `.agents/skills/forge/` y `.opencode/skills/forge/` en la raíz del repositorio. Se versionan las dos copias del skill y el runner para que Planner/Generator/Evaluator sean reproducibles en Codex y OpenCode; las referencias previas `SPEC.md` y `FINDINGS.md` se conservan en el historial bajo la tarea anterior (`FINDINGS.pre-DEV-DEPLOY-01.md` preserva la evidencia). OpenCode carga skills al iniciar: abrir/reiniciar la sesión desde este directorio permite descubrir `/forge`. Ejecución CLI: `.agents/skills/forge/scripts/forge-run.sh --backend opencode "prompt"`.

## Preparación privada

Desde la raíz del repositorio, cree el directorio privado y los dos archivos ignorados:

```bash
install -d -m 0700 .staging
umask 077
editor .staging/config
openssl rand -hex 32 > .staging/db_password
chmod 0600 .staging/config .staging/db_password
```

`.staging/config` contiene únicamente valores locales, nunca se comparte:

```bash
STAGING_LAN_IP=192.168.1.20
STAGING_DB_PASSWORD=REEMPLAZAR_POR_64_CARACTERES_HEX
SESSION_SECRET=REEMPLAZAR_POR_64_CARACTERES_HEX
```

Ponga la misma contraseña aleatoria en `STAGING_DB_PASSWORD` y `db_password`; genere `SESSION_SECRET` aleatoriamente y no lo reutilice en otros entornos. La implementación actual de sesión crea tokens aleatorios y guarda sus hashes; `SESSION_SECRET` queda configurado para el contrato de entorno y no sustituye esa implementación. No imprima ni copie secretos a logs/tickets. Reemplace la dirección de ejemplo por la IPv4 asignada a la interfaz LAN de este host. Compruebe con `stat -c '%a %n' .staging .staging/config .staging/db_password` los modos `700`, `600`, `600` y `git check-ignore .staging/config .staging/db_password`.

Los límites persistentes se pueden ajustar con variables numéricas opcionales en `.staging/config`; Compose las pasa a la aplicación y valores inválidos fallan cerrados. Defaults por ventana fija: `LUCEM_RATE_LIMIT_LOGIN_IP=10`, `LUCEM_RATE_LIMIT_LOGIN_EMAIL=5`, `LUCEM_RATE_LIMIT_REGISTER_IP=5`, `LUCEM_RATE_LIMIT_REGISTER_EMAIL=3`, `LUCEM_RATE_LIMIT_REGISTER_GLOBAL=20`, `LUCEM_RATE_LIMIT_UPLOAD_IP=20`, `LUCEM_RATE_LIMIT_UPLOAD_BUSINESS=60`, `LUCEM_RATE_LIMIT_UPLOAD_GLOBAL=200`, `LUCEM_RATE_LIMIT_BUSINESS_CREATE_USER=5`, `LUCEM_RATE_LIMIT_BUSINESS_CREATE_GLOBAL=100`, `LUCEM_RATE_LIMIT_PRODUCT_CREATE_BUSINESS=200`, `LUCEM_RATE_LIMIT_PRODUCT_CREATE_GLOBAL=1000`, `LUCEM_RATE_LIMIT_BUSINESS_WRITE_IP=1000`, `LUCEM_RATE_LIMIT_BUSINESS_WRITE_BUSINESS=500`, `LUCEM_RATE_LIMIT_BUSINESS_WRITE_GLOBAL=5000`, `LUCEM_RATE_LIMIT_INVENTORY_WRITE=1000`, `LUCEM_RATE_LIMIT_COMMERCIAL_WRITE=500` y `LUCEM_RATE_LIMIT_COMMERCIAL_READ=5000`. No almacenar límites en `.staging/db_password` ni usar variables de test fuera del runner E2E aislado.

Antes de desplegar, configure UFW con una regla limitada al CIDR LAN aprobado, por ejemplo `sudo ufw allow in proto tcp from 192.168.1.0/24 to 192.168.1.117 port 3000 comment 'Lucem Retail staging LAN'`. Ajuste ambos valores a la red/IP reales. No use una regla global `allow 3000/tcp`. La app se enlaza sólo a la IPv4 privada; no configure redirección de puerto en el router ni túneles públicos durante staging.

## Preflight y arranque

```bash
sudo scripts/deploy-staging.sh
```

Ejecute como root mediante `sudo` para leer UFW y operar Docker; el script marca el repositorio actual como seguro sólo para las consultas Git necesarias y no cambia la configuración Git global. El script falla cerrado ante rama/árbol no válidos, configuración inválida, permisos incorrectos, Docker no disponible, puerto ocupado por otro servicio, IP no local o firewall no verificado. No mata procesos, no selecciona otro puerto y no ejecuta operaciones globales. Compose usa siempre `-p lucem-retail-staging -f compose.staging.yml`. La base `lucem_staging` queda en volumen dedicado; PostgreSQL no publica puertos. Migraciones usan exclusivamente `prisma migrate deploy` y `prisma migrate status`.

La app se publica en `STAGING_LAN_IP:3000` y las imágenes persisten en el volumen dedicado montado en `public/uploads/products`. El handler limita cargas a 5 MiB y JPEG, PNG, WebP o GIF. El GET de imagen requiere autenticación y nombre UUID.

Inspecciones no destructivas:

```bash
set -a
source .staging/config
set +a
sudo docker compose -p lucem-retail-staging -f compose.staging.yml ps
sudo docker compose -p lucem-retail-staging -f compose.staging.yml exec -T db pg_isready -U lucem_staging -d lucem_staging
sudo docker compose -p lucem-retail-staging -f compose.staging.yml run --rm migrate npx prisma migrate status
curl --fail --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' "http://$STAGING_LAN_IP:3000/login"
```

No publique PostgreSQL, no use `docker compose down -v` ni ejecute comandos Docker globales. Para detener sólo la app: `sudo docker compose -p lucem-retail-staging -f compose.staging.yml stop app`. Preservar DB, uploads y backups. `n8n_server` en 5678 está fuera del proyecto.
