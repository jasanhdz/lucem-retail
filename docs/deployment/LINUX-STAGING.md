# Lucem Retail — staging LAN en Ubuntu

Este despliegue es un stack independiente `lucem-retail-staging`; no modifica ni administra otros proyectos. Requiere Ubuntu, Docker Engine/Compose v2, Git limpio en `feature/lucem-ui-redesign-v1`, IPv4 LAN local, puerto host 3000 libre y UFW activo con una regla revisada que permita 3000 únicamente desde la CIDR LAN de confianza. Si esas condiciones no se pueden demostrar, no desplegar.

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
```

Ponga la misma contraseña aleatoria en ambos archivos (config y `db_password`). No imprima ni copie el contenido a logs/tickets. Reemplace la dirección de ejemplo por la IPv4 asignada a la interfaz LAN de este host. Compruebe con `stat -c '%a %n' .staging .staging/config .staging/db_password` los modos `700`, `600`, `600` y `git check-ignore .staging/config .staging/db_password`.

Antes de desplegar, configure UFW conforme a la política de red local, por ejemplo restringiendo el origen al CIDR LAN aprobado. No use una regla global `allow 3000/tcp`. Confirme desde un cliente externo a la LAN que no hay ruta de acceso; el script bloquea si UFW está inactivo, pero la revisión de la política WAN/LAN es responsabilidad del operador de red.

## Preflight y arranque

```bash
scripts/deploy-staging.sh
```

El script falla cerrado ante rama/árbol no válidos, configuración inválida, permisos incorrectos, Docker no disponible, puerto ocupado, IP no local o firewall no verificado. No mata procesos, no selecciona otro puerto y no ejecuta operaciones globales. Compose usa siempre `-p lucem-retail-staging -f compose.staging.yml`. La base `lucem_staging` queda en volumen dedicado; PostgreSQL no publica puertos. Migraciones usan exclusivamente `prisma migrate deploy` y `prisma migrate status`.

La app se publica en `STAGING_LAN_IP:3000` y las imágenes persisten en el volumen dedicado montado en `public/uploads/products`. El handler limita cargas a 5 MiB y JPEG, PNG, WebP o GIF. El GET de imagen requiere autenticación y nombre UUID.

Inspecciones no destructivas:

```bash
docker compose -p lucem-retail-staging -f compose.staging.yml ps
docker compose -p lucem-retail-staging -f compose.staging.yml exec -T db pg_isready -U lucem_staging -d lucem_staging
docker compose -p lucem-retail-staging -f compose.staging.yml run --rm migrate npx prisma migrate status
curl --fail --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' "http://$STAGING_LAN_IP:3000/login"
```

No publique PostgreSQL, no use `docker compose down -v` ni ejecute comandos Docker globales. Para detener sólo la app: `docker compose -p lucem-retail-staging -f compose.staging.yml stop app`. Preservar DB, uploads y backups. `n8n_server` en 5678 está fuera del proyecto.
