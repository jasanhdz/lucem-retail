# DEV-12 — Refinamiento MVP

## Revisión actual

Seguimiento del primer Generator commit `08fadee` (`fix(DEV-12): block unsupported reservation advances`). Esta revisión corrige las brechas P0 encontradas en ese commit: captura UI de anticipos aún visible, POST multiproducto independiente y ausencia de idempotencia durable en el endpoint batch.

La creación UI usa un único POST `items[]`, una `Idempotency-Key` estable para el intento y exige HTTP 200/201 con `reservations[]` completos antes de mostrar éxito. Si hay respuesta incierta conserva payload y key para repetir/reconsultar el mismo intento; no ejecuta liberación compensatoria. El servidor registra clave, hash canónico e IDs junto con reservas, decrementos de stock, movimientos y auditorías en la misma transacción serializable. Replay idéntico retorna filas existentes, mismo key/diferente hash devuelve 409. El POST individual de DEV-06 mantiene su contrato.

Se agregó migración `0005_reservation_batch_idempotency` y el cleanup E2E elimina los registros de clave antes de reservas/negocios. La migración requiere aplicación en el entorno desplegado antes de usar batch.

Anticipos nuevos siguen deshabilitados; no se crea política de devolución/retención. Los registros históricos positivos se bloquean para release/conversión, la expiración automática los omite y la UI etiqueta/bloquea acciones destructivas. La UI no presenta anticipos como recibidos ni como crédito.

## Verificación

- `npx prisma generate`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 11 archivos / 28 tests.
- `npx prisma validate`: PASS.
- `npm run build`: PASS; build Next 15.5.28 reportó el warning existente de plugin Next.js no detectado por ESLint.
- `git diff --check`: PASS.
- `e2e/dev-06/reservations.spec.ts` añade integración API/Prisma real para lote, rechazo de depósito, rollback por falta de stock, replay/concurrencia/conflicto de key y preservación del depósito histórico. También actualiza expectativa UI que antes buscaba captura de anticipo.
- `CI=1 npm run test:e2e:reservations -- --reporter=list`: BLOCKED antes de ejecutar tests; la guarda termina con `E2E_DATABASE_URL is required; DATABASE_URL fallback is forbidden.`
- `CI=1 npm run test:e2e:dev-09 -- --reporter=list`: BLOCKED por la misma guarda.
- E2E DEV-06/DEV-09 y evidencia visual autenticada permanecen BLOCKED mientras falte `E2E_DATABASE_URL`. No se usa `DATABASE_URL` de fallback y no se afirman PASS runtime ni responsive.
