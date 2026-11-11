# Lucem Retail

Primera version de un sistema de retail para American Outfit. Requiere Node 20+ y PostgreSQL 16.

## Inicio

```bash
cp .env.example .env
docker-compose up -d db
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Credenciales demo: `admin@americanoutfit.local` / `Demo123!`, `vendedor@americanoutfit.local` / `Demo123!`, `inventario@americanoutfit.local` / `Demo123!`.

La semilla crea 61 productos demo con más de 120 variantes, inventario variado y fotos de catálogo servidas desde Unsplash para visualizar el catálogo y el POS. Estas imágenes requieren conexión a internet. La cámara se simula buscando `AO-0001`. Los pagos con tarjeta y transferencia son registros confirmados simulados; no hay proveedor externo. El ticket es una vista imprimible del navegador. Las fotos locales son opcionales y no se incluyen en Git.

Comandos de calidad: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## Catálogo de selección

`GET /api/products?page=1&limit=48` pagina por grupo de producto (máximo 100 productos); el sobre contiene `items`, `page`, `limit`, `total` y `hasMore`. Una respuesta incluye todas las variantes de los grupos seleccionados. El Catálogo, POS y selección para Apartados usan explícitamente esta respuesta. Las integraciones antiguas sin `page`/`limit` conservan el formato array, acotado a los primeros 48 grupos.

## Seed de demostración staging

El seed dedicado es `prisma/seed-demo.ts` (`npm run db:seed:demo`); no sustituye el seed legado. Instala el comando local con `npm run db:seed:demo:install`. `lucem-seed-demo --dry-run` y `lucem-seed-demo --verify` son lecturas. El modo por defecto requiere sudo interactivo y genera backups PostgreSQL/uploads verificados antes de invocar el seed sin privilegios. Consulta [`docs/development/DEV-DATA-01-DEMO-SEED.md`](docs/development/DEV-DATA-01-DEMO-SEED.md) para guardas, backups, credenciales y limitaciones; no usar `prisma migrate deploy` para este procedimiento.
