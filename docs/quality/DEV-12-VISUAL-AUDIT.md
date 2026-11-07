# DEV-12 — Auditoría visual

## Inspección de source

La inspección del source en esta revisión confirma que el alta no tiene selector/campos de anticipo ni copy que afirme cobro; el total figura pendiente hasta completar la venta y el CTA de alta es «Crear apartado sin anticipo». Las acciones de conversión indican «Completar apartado y registrar venta». La UI conserva modal, flujo de selección, cliente, teléfono, notas y vencimiento dentro de la composición existente. Los registros con depósito histórico positivo muestran advertencia manual y no ofrecen acciones release/convert.

## Runtime autenticado

**BLOCKED**, no PASS: `E2E_DATABASE_URL` está ausente. La suite E2E autenticada no se ejecutó contra base válida. El `curl -I` a `localhost:3000` agotó el timeout documentado; no se detuvo ni alteró ese proceso. No hay capturas nuevas, no se crearon PNGs y no se verificaron 1440x900, 768x1024 ni 390x844 en runtime. No se atribuye evidencia visual autenticada ni responsive a la inspección estática.
