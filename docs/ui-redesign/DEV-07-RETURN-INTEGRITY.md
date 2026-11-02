# DEV-07 - Integridad de devoluciones

## Reglas persistidas

1. Una devolución sólo referencia una venta confirmada del negocio activo.
2. Cada `SaleLine` mantiene `quantity` vendida y sus `ReturnLine.quantity` acumuladas.
3. `pendiente = vendido - sumado devuelto`; no puede ser negativo.
4. `importe = round2(unitPrice histórico × cantidad devuelta)` y `refundAmount` debe ser exactamente ese importe.
5. Cada devolución incrementa `ProductVariant.stock` y crea un movimiento `RETURN` positivo con `referenceType=Return` y `referenceId=Return.id`.
6. El idempotency key es único por negocio; el mismo payload devuelve el registro existente y no repite inventario, Kardex ni auditoría.

## Concurrencia

`POST /api/returns` usa `Serializable`. Las lecturas de venta y devoluciones, validación de saldo, creación de `Return`/`ReturnLine`, incremento de stock y movimientos ocurren en una única transacción. Una colisión serializable o de clave única responde `409`; no se presenta como éxito ni deja efectos parciales.

La auditoría `CREATE Return` se ejecuta con el mismo `Prisma.TransactionClient` antes de cerrar la transacción. Si la auditoría falla, la operación completa revierte: no queda `Return`, `ReturnLine`, aumento de stock, movimiento `RETURN` ni clave de idempotencia. El header `x-lucem-e2e-fail-audit` sólo provoca el fallo controlado fuera de producción y existe exclusivamente para probar este rollback.

## Matriz de resultados

| Caso | HTTP | Stock | Kardex |
|---|---:|---|---|
| Parcial dentro de pendiente | 201 | `+q` una vez | Un `RETURN +q` |
| Resto pendiente | 201 | `+q` restante | Un movimiento adicional |
| Sobredevolución | 400 | Sin cambio | Sin movimiento |
| Reembolso negativo/mayor/menor | 400 | Sin cambio | Sin movimiento |
| Replay mismo key/payload | 200 | Sin cambio adicional | Sin movimiento adicional |
| Key con payload diferente | 409 | Sin cambio | Sin movimiento |
| Solicitudes concurrentes | 201/409 o 201/200 replay | Una sola aplicación lógica | Un solo movimiento lógico |

## Apartados

Una reserva convertida genera una venta ordinaria con `SaleLine`. DEV-07 devuelve esa línea mediante el mismo contrato; no modifica `Reservation.status`, no vuelve a liberar la reserva y registra un `RETURN` independiente.
