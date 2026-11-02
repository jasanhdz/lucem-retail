# DEV-07 - Design Mapping

## Referencias

No existe una pantalla Stitch final específica para Devoluciones. Se reutilizaron los patrones documentados en `DEV-03-DESIGN-MAPPING.md`, `DEV-04-DESIGN-MAPPING.md`, `DEV-05-DESIGN-MAPPING.md`, `retail_operational_clarity/DESIGN.md` y `retail_pos_inventory_system/DESIGN.md`. No se declara pixel-fidelity.

| Patrón aprobado | Implementación DEV-07 |
|---|---|
| Shell y navegación | `WorkspaceShell`, ruta existente `/devoluciones`, navegación móvil |
| Jerarquía operativa | Eyebrow Gestión de inventario, título Devoluciones, paneles de operación y trazabilidad |
| POS/ticket | Búsqueda por folio/ID, venta seleccionada, líneas históricas y importe |
| Inventario/Kardex | Cantidad vendida/devuelta/pendiente y referencia de devolución en backend |
| Estados de datos | Loading, vacío, error con reintento, resultados y confirmación persistida |
| Responsive | Paneles apilados, líneas táctiles y tabla histórica con scroll interno a 1440, 768 y 390 px |

La ausencia de referencia visual específica es una desviación documentada, no una afirmación de fidelidad pixel-perfect.
