# DEV-09 Integrity Matrix

| Área | Antes | Operación | Después | Verificación |
|---|---:|---|---:|---|
| Producto simple | 10 físico | Entrada `PURCHASE +2` | 12 disponible/físico | API + PostgreSQL |
| Producto simple | 12 disponible | Venta cash `-2` | 10 disponible | Sale, ticket y `SALE` |
| Variante A | 5 físico | Apartado `2` | 3 disponible, 2 reservado, 5 físico | API inventory |
| Variante A | 3 disponible, 2 reservado | Conversión | 3 disponible, 0 reservado, 3 físico | Sale + RELEASE + SALE |
| Producto simple | 10 disponible | Devolución parcial `+1` | 11 disponible | Return + único `RETURN` |
| Variante B | 3 disponible | Dos ajustes concurrentes `-2` | Una operación `200`, otra `409` | PostgreSQL/API |

## Integridad adicional

- Replay de venta: una creación efectiva y respuesta replay sin venta duplicada.
- Replay de apartado convertido: mismo `saleId`, sin doble descuento.
- Replay/concurrencia de devolución: una devolución efectiva y un único movimiento `RETURN`.
- Cantidad insuficiente: `409`, sin saldo negativo.
- Propietario: una membresía `ADMIN` en el negocio creado.
- Aislamiento: las suites existentes verifican Centro/Norte, roles y cross-business IDs.
- Auditoría de devolución: rollback ante fallo inyectado y reintento único verificado por DEV-07B.
