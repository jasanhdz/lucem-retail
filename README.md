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
