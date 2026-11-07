# DEV-12 — Refinamiento MVP

## Estado

Parcial; no es release-ready. La API rechaza nuevos `deposit` no cero y añade creación multiproducto transaccional mediante `items[]`; el POST individual se conserva. Release/convert bloquean depósitos positivos y el vencimiento automático los excluye. La suite E2E y la UI todavía requieren validación y ajuste antes de aprobar el rubric completo.

## Atomicidad

La API de lote ejecuta decrementos de stock, Reservation, movimiento y auditoría en una transacción serializable. Un error revierte el lote. La compatibilidad del contrato de POST individual permanece. Idempotencia del lote frente a respuesta de red incierta no está implementada: el modelo no tiene clave de idempotencia para agrupaciones y no se añadió una migración sin definir contrato/persistencia segura. Por ello, el criterio completo de creación multiproducto queda BLOCKED hasta resolver replay durable. La interfaz existente aún envía POST individuales y compensación; no se considera corregida por esta API aditiva.

## Verificaciones

`E2E_DATABASE_URL` ausente: E2E DEV-06, DEV-09, suites afectadas y runtime autenticado BLOCKED. No se usó `DATABASE_URL`.
