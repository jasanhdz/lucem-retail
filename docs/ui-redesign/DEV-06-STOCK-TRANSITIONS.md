# DEV-06 - Transiciones de inventario

## Modelo

El contrato existente guarda disponibilidad operativa en `ProductVariant.stock`. Inventario deriva `reserved` como suma de reservas `ACTIVE` y `physical = available + reserved`.

## Tabla de transiciones

| Estado | Acción | Disponible | Reservado | Físico | Movimientos |
|---|---|---:|---:|---:|---|
| `ACTIVE` | Crear `q` | `-q` | `+q` | sin cambio | `RESERVATION -q` |
| `ACTIVE` | Liberar | `+q` | `-q` | sin cambio | `RELEASE +q` |
| `ACTIVE` | Vencer | `+q` | `-q` | sin cambio | `RELEASE +q` |
| `ACTIVE` | Completar | neto sin cambio | `-q` | `-q` | `RELEASE +q`, `SALE -q` |
| Terminal | Repetir acción | sin cambio | sin cambio | sin cambio | ninguno |

## Ejemplo solicitado

Partiendo de físico 76, reservado 2 y disponible 74, crear una reserva de 2 produce físico 76, reservado 4 y disponible 72. Liberarla produce físico 76, reservado 2 y disponible 74. Completarla produce físico 74, reservado 2 y disponible 72. La conversión no llama al flujo ordinario de POS ni vuelve a descontar las unidades reservadas sin liberar.

## Integridad

La conversión usa una transacción serializable y `Reservation.saleId` único. Primero pasa la reserva a `CONVERTED`, crea la venta, registra la liberación, aplica el descuento físico de venta y registra el `SALE`. Si falla el pago, stock, folio o concurrencia, toda la transacción revierte. Una conversión repetida devuelve la venta existente; una reserva histórica convertida sin venta devuelve conflicto y no inventa trazabilidad.

## Evidencia

La suite `e2e/dev-06/reservations.spec.ts` valida los tres balances directamente mediante `GET /api/inventory`, movimientos persistidos por `referenceId`, sobre-reserva, dos solicitudes concurrentes, replay, `401`, `403` y aislamiento de negocio.
