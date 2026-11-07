# Backup y restore de staging

Ejecute desde la raíz y mantenga el destino dentro de un directorio privado (0700); archivos con modo 0600. Los comandos usan sólo el proyecto y volumen nombrados, no hacen `down -v` y no imprimen la URL ni la contraseña.

## Backup

```bash
umask 077
backup_dir="$HOME/lucem-staging-backups"
install -d -m 0700 "$backup_dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
docker compose -p lucem-retail-staging -f compose.staging.yml exec -T db pg_dump -U lucem_staging -d lucem_staging -Fc > "$backup_dir/lucem_staging-$stamp.dump"
docker compose -p lucem-retail-staging -f compose.staging.yml exec -T app tar -C /app/public/uploads -czf - products > "$backup_dir/uploads-$stamp.tar.gz"
chmod 0600 "$backup_dir/lucem_staging-$stamp.dump" "$backup_dir/uploads-$stamp.tar.gz"
(cd "$backup_dir" && sha256sum "lucem_staging-$stamp.dump" "uploads-$stamp.tar.gz" > "SHA256SUMS-$stamp")
chmod 0600 "$backup_dir/SHA256SUMS-$stamp"
pg_restore --list "$backup_dir/lucem_staging-$stamp.dump" >/dev/null
tar -tzf "$backup_dir/uploads-$stamp.tar.gz" >/dev/null
```

Verifique checksums con `sha256sum -c "$backup_dir/SHA256SUMS-$stamp"`. Retenga copias cifradas fuera del host según política local, limite acceso y establezca retención aprobada (por ejemplo, diarios 14 días y mensuales 6 meses). No almacene artefactos en el repositorio.

## Restore aislado

Haga una copia del archivo Compose en un directorio temporal de operador y cambie **todos** los nombres de proyecto, red y volúmenes con sufijo temporal único; asigne un puerto LAN libre con el mismo control de firewall, y configure una base de prueba separada. En dicho stack aislado, arranque sólo su PostgreSQL temporal, cree una DB temporal, cargue el dump con `pg_restore --clean --if-exists --no-owner --dbname ...`, extraiga las imágenes a un directorio temporal y valide los checksums. Ejecute `prisma migrate status` apuntando únicamente a esa base temporal y realice lecturas/listados no mutantes. Compare los archivos restaurados con el archivo original. Registre los nombres temporales antes de operar y elimine únicamente los contenedores/red/volúmenes temporales identificados, preservando los backups y el stack activo. Nunca restaure sobre staging activo ni reutilice/elimine volúmenes existentes; nunca ejecute `down -v`.
