# DEV-12 — Anticipos

**BLOCKED / no aprobado para MVP.** `Reservation.deposit` histórico no acredita recepción: no existe ledger de pagos ni estado de liquidación. La UI de alta ya no ofrece monto, método, efectivo recibido o cambio; ningún método de venta se guarda dentro de notas. El API rechaza nuevos valores de depósito distintos de cero antes de persistir.

La UI comunica que el total queda pendiente hasta completar la venta. Esto no registra una deuda ni cambia contrato comercial: no se reembolsa, retiene ni aplica ningún depósito. Release y conversión de registros históricos positivos retornan conflicto para revisión manual; el vencimiento automático los omite. Listado/detalle muestran «Anticipo histórico sin conciliar · requiere revisión manual» y ocultan acciones destructivas. El importe no se expone como recibido/reembolso/crédito en UI.

Siguen pendientes decisiones explícitas sobre reembolso/retención, aplicación a venta y tratamiento al liberar o vencer. Ningún flujo monetario de anticipo se considera aprobado o implementado.
