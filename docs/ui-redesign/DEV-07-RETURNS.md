# DEV-07 - Devoluciones

## Alcance

`/devoluciones` reemplaza el placeholder por un flujo real para localizar ventas, revisar cantidades pendientes, registrar devoluciones parciales o completas y consultar el historial. Reutiliza shell, tokens, tabla, controles y patrones responsive de POS, Inventario y Apartados. No se modificó `diseno/`.

La interfaz no ejecuta pagos externos: `refundAmount` representa el importe registrado en Lucem Retail. No se agregan pasarelas, notas fiscales, pagos divididos ni crédito.

## Contrato y matriz

| Acción | ADMIN | INVENTORY_MANAGER | SELLER | Efecto |
|---|---:|---:|---:|---|
| Consultar ventas/devoluciones | Sí | Sí | Sí | Sólo negocio activo |
| Crear devolución | Sí | Sí | No | Return, ReturnLine, stock y Kardex |
| Venta inexistente/cancelada | 404 | 404 | 404 | Sin cambios |
| Cantidad sobre pendiente | 400 | 400 | 400 | Sin cambios |
| Replay mismo payload | 200 | 200 | 200 | Misma devolución, sin efectos nuevos |

La búsqueda de ventas acepta folio o ID; el historial acepta folio o motivo. Cada línea muestra vendido, devuelto y pendiente. El importe máximo se calcula con el precio histórico de la venta.

## Integridad

El endpoint exige `confirmation`, venta real, motivo, líneas únicas y cantidades positivas. `refundAmount` debe coincidir exactamente, a centavos, con las líneas seleccionadas. La transacción serializable recalcula cantidades devueltas y realiza cada reintegro junto con un movimiento `RETURN` referenciado al `Return` creado.

Se añadieron `Return.idempotencyKey` y `Return.requestHash` con índice único por negocio mediante la migración `0003_return_idempotency`. Esto cubre doble clic, timeout y replay explícito; una misma clave con contenido distinto devuelve `409`.

Las ventas convertidas desde Apartados son ventas ordinarias con `SaleLine`, por lo que el flujo las devuelve normalmente. La reserva conserva `CONVERTED`; la devolución sólo genera su propio movimiento `RETURN`.

## Evidencia

- `CI=1 npm run test:e2e:returns -- --reporter=list`: PASS, 6/6, suite aislada PostgreSQL, login real y namespace DEV-TEST-01.
- Cobertura: listado, búsqueda, parcial, resto, sobredevolución, reembolso negativo/mayor/menor, motivo, línea duplicada, idempotencia, concurrencia, Kardex, stock, Apartados convertido, roles, 401, 403, aislamiento y responsive.
- Capturas sanitizadas publicadas en `docs/ui-redesign/dev-07-visual-evidence/`, a 1440x900, 768x1024 y 390x844.
- Evidencia visual: [desktop](./dev-07-visual-evidence/returns-desktop.png), [tablet](./dev-07-visual-evidence/returns-tablet.png) y [mobile](./dev-07-visual-evidence/returns-mobile.png). Sólo contiene fixtures DEV-TEST-01; no incluye cookies ni `storageState`.

## Riesgos y límites

- Los reembolsos registrados no prueban que el dinero haya sido entregado al cliente.
- No existe estado separado de reembolso; `Return` representa la operación registrada e irreversible desde esta UI.
- El precio histórico pertenece a `SaleLine`; no se recalcula con el precio actual del producto.
