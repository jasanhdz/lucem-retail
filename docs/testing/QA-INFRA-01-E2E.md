# QA-INFRA-01 — PostgreSQL E2E local persistente

El entorno E2E es independiente de PostgreSQL de desarrollo (`5432`), QA (`lucem_qa`, `55433`) y staging. Usa PostgreSQL 16, base `lucem_retail_e2e`, rol de aplicación `lucem_e2e`, puerto host `127.0.0.1:55432`, contenedor `lucem-retail-e2e-postgres` y volumen persistente `lucem-retail-e2e-postgres-v1`. El host sólo publica loopback; la bridge exclusiva desactiva IP masquerading para impedir egreso público sin impedir el port-forward loopback.

## Primera instalación

1. Genera `.env.e2e` desde la plantilla y conserva el archivo privado:

   ```bash
   npm run e2e:env:init
   npm run e2e:env:check
   ```

   El generador produce contraseñas aleatorias, comprueba propietario/permisos `0600` y que Git ignore el archivo. No imprime secretos. Nunca uses `.qa-private/runtime.env` para E2E.

2. Provisiona en una terminal interactiva. El script pide sudo para inspeccionar todos los contenedores/volúmenes PostgreSQL, detectar nombres E2E anteriores y revisar el puerto `55432`; si encuentra una colisión, se detiene sin cambiar recursos. Si no encuentra recursos anteriores, crea el servicio y espera su healthcheck:

   ```bash
   npm run e2e:db:up
   ```

   No se agregan permisos al grupo Docker ni ACL del socket. No ejecutes `down -v`, `volume prune` ni borres volúmenes existentes.

3. Verifica la identidad conectada, luego migra y carga fixtures sólo en E2E:

   ```bash
npm run e2e:verify
npm run e2e:prepare
npm run e2e:verify
npm run e2e:db:restart-check
```

`e2e:prepare` valida base/rol/version/puerto de servidor antes de `prisma migrate deploy`, y vuelve a validar antes del seed. Cleanup y tests también comprueban identidad antes de mutar. Un E2E comando no usa un `DATABASE_URL` heredado distinto ni acepta `QA_DATABASE_URL` como fallback.

`e2e:db:restart-check` reinicia únicamente el contenedor E2E marcado como propio, espera el healthcheck, vuelve a validar identidad y compara conteos, saldos, movimientos, ventas y alertas de fixtures antes/después. No reinicia QA ni staging y no elimina volúmenes.

## Ejecuciones

Los scripts npm E2E cargan `.env.e2e` automáticamente sólo para el proceso correspondiente; no hace falta `source` y no se contamina el entorno de comandos ordinarios.

```bash
npm run test:e2e:products:ordering
npm run test:e2e:products
npm run e2e:build:security
npm run test:e2e:security -- e2e/dev-sec-01/product-pagination.spec.ts
npm run test:e2e:dev-11r-products
```

`test:e2e:products:ordering` ejecuta cinco procesos Playwright independientes y detiene con código no-cero si falla cualquiera. Para limpiar únicamente el namespace de fixtures E2E:

```bash
npm run e2e:cleanup
```

La DB E2E es persistente y `restart: unless-stopped`; limpieza de fixtures no elimina el contenedor ni el volumen. QA full es separado: `npm run qa:full` carga la configuración controlada del QA Lab y opera sólo sobre `lucem_qa` tras su preflight/lock.
