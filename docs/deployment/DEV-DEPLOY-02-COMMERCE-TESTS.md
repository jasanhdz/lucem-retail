# DEV-DEPLOY-02 — Pruebas comerciales PostgreSQL

## Aislamiento y ejecución

Todas las pruebas con escritura se ejecutaron sólo contra `lucem_retail_e2e`, rol `lucem_e2e`, PostgreSQL 16.10 en el contenedor efímero `lucem-retail-dev-deploy-02-db`, publicado exclusivamente en `127.0.0.1:55432`. La imagen oficial declara un volumen anónimo efímero para datos; fue inspeccionado y eliminado por ID exacto al terminar. No se montó ni compartió ningún volumen persistente con staging. La guarda de `scripts/e2e/database.ts` exige protocolo PostgreSQL, host loopback, nombre de DB, rol y puerto exactos; no existe fallback hacia `DATABASE_URL` de staging. La fixture usa usuarios/negocios/variantes DEV-TEST-01 y DEV-09. Cada suite se ejecutó serialmente con `e2e:cleanup`/`e2e:prepare`; al final `e2e:cleanup` verificó cero registros en las 18 tablas de aplicación.

## Resultado reproducible

Suites Playwright ejecutadas contra PostgreSQL real y aislado:

| Suite | Resultado | Cobertura principal |
| --- | --- | --- |
| `npm run test:e2e:security` | 9/9 PASS | `/api/audit`, proyección sin campos sensibles, auth, roles, aislamiento por negocio/imágenes, CSRF/origen, cabeceras y throttling |
| `npm run test:e2e:inventory` | 6/6 PASS | entrada, ajuste, kardex, stock reservado, conflictos, roles y negocios |
| `npm run test:e2e:pos` | 7/7 PASS | CASH/cambio/ticket, CARD, TRANSFER, stock exactamente una vez, idempotencia/replay, concurrencia, roles, aislamiento y viewports |
| `npm run test:e2e:reservations` | 9/9 PASS | creación por lote/idempotencia, disponibilidad/físico/reservado, liberación, expiración, conversión a venta, concurrencia y aislamiento |
| `npm run test:e2e:returns` | 7/7 PASS | parcial/completa, importe exacto conforme al backend, validación, idempotencia, kardex, rollback por fallo de auditoría, roles y aislamiento |
| `npm run test:e2e:dev-09` | 1/1 PASS | viaje API de onboarding→producto simple/variantes→entrada→venta en efectivo→apartado/conversión→devolución→balances persistidos |

Total: **39 pruebas E2E enfocadas PASS**. Las suites E2E hacen las escrituras, concurrencia y lecturas Prisma; no se inventaron cobros bancarios, transferencias reales ni reembolsos externos. CARD/TRANSFER indican sólo el método registrado por Lucem.

La suite `npm run test:e2e:dev-10` pasó **4/4**, validando renovación de sesión sólo por Route Handler, revocación/logout, rollback de venta al fallar auditoría y rollback de inventario/apartados con reintento.

E2E adicional de imagen autenticada: upload PNG desde negocio Centro (201), lectura en Centro (200 `image/png`) y lectura de la misma ruta desde negocio Norte (404); se eliminó el archivo exacto de prueba. El handler ahora incluye el negocio dueño en el nombre UUID nuevo y valida negocio activo. Imágenes legacy mantienen lectura autenticada sólo si un Product del negocio las referencia en `photoPath`.

Los montos y el cambio de efectivo usan el contrato monetario existente. No se modificó la definición de reembolso ni se agregaron reglas financieras.

## Anticipos de apartados

El backend actual no habilita anticipos nuevos: rechaza depósitos positivos, no crea ledger de cobros ni persiste saldo/abonos y la UI no presenta un flujo habilitado de anticipo. Los casos con `Reservation.deposit` histórico positivo se preservan y bloquean conversión/liberación/expiración automática para revisión manual. E2E confirmó que estos registros no cambian stock/status ni generan ventas/movimientos. Por tanto **no se declara soporte para cobrar, aplicar, reembolsar o retener anticipos**; queda pendiente de reglas de producto/finanzas explícitas.

## Limpieza y efectos

Después de todas las suites, `npm run e2e:cleanup` y una consulta Prisma de las 18 tablas de aplicación devolvieron suma de conteos **0**. También se retiró el contenedor E2E exacto, su volumen anónimo efímero y `.env.e2e`; puerto 55432 quedó libre. Las capturas preexistentes de DEV-09 se restauraron sin cambios. No hubo mutaciones en `lucem_staging`.

## Comandos

```bash
# Sólo tras crear variables .env.e2e privadas con el destino E2E exacto.
set -a; . ./.env.e2e; set +a
export DATABASE_URL="$E2E_DATABASE_URL"
npm run e2e:cleanup
npm run e2e:prepare
CI=1 npm run test:e2e:pos -- --reporter=list
npm run e2e:cleanup
```

Ejecute una sola suite por vez: cada setup vuelve a preparar el namespace E2E. Nunca ejecute esos comandos con URL de staging. Al terminar, verifique los conteos, retire sólo el contenedor E2E y su volumen anónimo efímero identificado, y elimine las variables temporales; no reutilice volúmenes persistentes ni `docker compose down -v`.
