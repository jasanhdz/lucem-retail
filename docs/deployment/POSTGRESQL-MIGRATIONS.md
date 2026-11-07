# Migraciones PostgreSQL de staging

Compose fija `postgres:16.10-bookworm`, crea exclusivamente `lucem_staging` y conecta `db`, `migrate` y `app` a una red privada dedicada. No existe publicación del puerto 5432. La contraseña de bootstrap se guarda en `.staging/db_password` (modo 0600); `DATABASE_URL` sólo usa `db:5432/lucem_staging` dentro de Compose.

El servicio `migrate` espera el healthcheck de PostgreSQL y ejecuta `npx prisma migrate deploy`. La app espera su salida exitosa. La comprobación permitida es:

Las cinco migraciones aplicadas en el staging inicial son `0001_init`, `0002_reservation_sale`, `0003_return_idempotency`, `0004_onboarding_business` y `0005_reservation_batch_idempotency`. La consulta a `public._prisma_migrations` y `prisma migrate status` confirmó las cinco como aplicadas y ninguna pendiente.

```bash
docker compose -p lucem-retail-staging -f compose.staging.yml run --rm migrate npx prisma migrate status
```

No usar `migrate dev`, `migrate reset`, `db push`, seeds ni URLs de host/E2E/producción. No apuntar Prisma desde el host. Revise el estado de migraciones antes y después de un despliegue y conserve la salida sanitizada sin credenciales. Un rollback de software no revierte automáticamente el esquema; ante fallo, detener sólo el servicio `app`, conservar volúmenes y restaurar siguiendo el procedimiento aislado de backup.
