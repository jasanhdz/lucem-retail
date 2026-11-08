# Backup y restore de staging

Ejecute desde la raíz del repositorio. Los backups quedan fuera de los volúmenes principales y del repositorio; restrinja el directorio (0700) y los artefactos (0600). Los comandos operan sólo sobre el proyecto `lucem-retail-staging`.

## Backup

```bash
set -a
source .staging/config
set +a
umask 077
backup_dir="$HOME/lucem-staging-backups"
install -d -m 0700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
compose=(sudo docker compose -p lucem-retail-staging -f compose.staging.yml)
"${compose[@]}" exec -T db pg_dump -U lucem_staging -d lucem_staging -Fc > "$backup_dir/lucem_staging-$stamp.dump"
"${compose[@]}" exec -T app tar -C /app/public/uploads -czf - products > "$backup_dir/uploads-$stamp.tar.gz"
chmod 0600 "$backup_dir/lucem_staging-$stamp.dump" "$backup_dir/uploads-$stamp.tar.gz"
(cd "$backup_dir" && sha256sum "lucem_staging-$stamp.dump" "uploads-$stamp.tar.gz" > "SHA256SUMS-$stamp")
chmod 0600 "$backup_dir/SHA256SUMS-$stamp"
(cd "$backup_dir" && sha256sum -c "SHA256SUMS-$stamp")
"${compose[@]}" exec -T db pg_restore --list -U lucem_staging < "$backup_dir/lucem_staging-$stamp.dump" >/dev/null
tar -tzf "$backup_dir/uploads-$stamp.tar.gz" >/dev/null
```

Retenga copias cifradas externas al servidor según política local (por ejemplo, diarios 14 días y mensuales 6 meses). No incluya `.staging/config`, `.staging/db_password` ni `.staging` en el backup. `pg_dump` y los archivos de imagen son respaldos; un volumen Docker por sí solo no lo es.

## Restore aislado de verificación

Nunca restaure la prueba sobre staging. El siguiente ejemplo restaura en un PostgreSQL desechable sin red, puertos publicados ni volúmenes; `trust` se limita a ese contenedor aislado y temporal. La imagen debe coincidir con la major/minor usada en staging.

```bash
backup_dir="$HOME/lucem-staging-backups"
dump="$backup_dir/lucem_staging-<timestamp>.dump"
uploads="$backup_dir/uploads-<timestamp>.tar.gz"
restore="lucem-retail-restore-$(date -u +%Y%m%dT%H%M%SZ)"
sudo docker run -d --name "$restore" --network none \
  -e POSTGRES_DB=lucem_restore -e POSTGRES_USER=lucem_restore \
  -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16.10-bookworm
until sudo docker exec "$restore" pg_isready -U lucem_restore -d lucem_restore; do sleep 1; done
sudo docker exec -i "$restore" pg_restore --clean --if-exists --no-owner \
  -U lucem_restore -d lucem_restore < "$dump"
sudo docker exec "$restore" psql -U lucem_restore -d lucem_restore \
  -Atc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;'
sudo docker run --rm --network "container:$restore" \
  -e DATABASE_URL='postgresql://lucem_restore@127.0.0.1:5432/lucem_restore?schema=public' \
  lucem-retail-staging-app:local npx prisma migrate status
images_dir="$(mktemp -d "$HOME/lucem-uploads-restore.XXXXXX")"
tar -xzf "$uploads" -C "$images_dir"
test -d "$images_dir/products"
rm -rf -- "$images_dir"
sudo docker rm -f "$restore"
```

Confirme que el estado de migraciones está al día, que el restore temporal contiene las tablas esperadas y que el checksum de origen pasó. Registre el nombre exacto del contenedor temporal antes de operar; elimine sólo ese contenedor y el directorio generado por `mktemp`. No use volúmenes de producción/staging ni `docker compose down -v`.

## Recuperación en staging

Antes de restaurar datos sobre staging, detenga únicamente la app y obtenga autorización operativa. Haga otro backup del estado actual. Restaure a una base temporal primero; planifique la recuperación del volumen usando un procedimiento revisado y una ventana de mantenimiento. La actualización normal de imágenes/migraciones no reinicializa ni borra la base. Copias externas cifradas al servidor son obligatorias para resiliencia ante pérdida del host.
