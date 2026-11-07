# DEV-12 — Anticipos

**BLOCKED / no aprobado para MVP.** `Reservation.deposit` no acredita recepción: no existe ledger, método de cobro persistido ni estado de liquidación. La API rechaza valores nuevos no nulos/vacíos distintos de cero antes de escribir. No se agrega mecanismo de pago.

Las reservas históricas positivas requieren revisión manual. Release y conversión devuelven conflicto con mensaje de revisión; la expiración automática las excluye. Ningún valor se reembolsa, retiene o aplica a ventas. Quedan pendientes decisiones explícitas sobre reembolso/retención, aplicación a venta y tratamiento al liberar o vencer. No se declara aprobado ningún flujo monetario.

La UI de creación actual se detectó ofreciendo anticipo, método, recibido y cambio; su retirada y prueba runtime no quedaron verificadas en esta implementación. Por tanto, el criterio P0 UI permanece FAIL/pendiente de corrección.
