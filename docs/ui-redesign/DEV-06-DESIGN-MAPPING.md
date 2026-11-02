# DEV-06 - Design Mapping

## Referencias

Se reutilizaron los patrones aprobados en `DEV-03-DESIGN-MAPPING.md`, `DEV-04-DESIGN-MAPPING.md`, `DEV-05-DESIGN-MAPPING.md`, `retail_operational_clarity/DESIGN.md` y `retail_pos_inventory_system/DESIGN.md`. No existe una pantalla Stitch final específica de Apartados; por eso no se afirma pixel-fidelity.

| Patrón aprobado | Implementación DEV-06 |
|---|---|
| Shell y navegación persistente | `WorkspaceShell`, `/apartados` y navegación móvil existentes |
| Jerarquía operativa | Eyebrow de contexto, título Apartados, resumen Total/Activos/Unidades |
| Tabla de inventario | Tabla responsive con producto, SKU, cantidad, vencimiento, estado y responsable |
| Diálogo accesible | Crear apartado y completar/liberar con `role=dialog`, Escape, retorno de foco y controles de 44px |
| Estados de datos | Loading, vacío, error con reintento, estados Activo/Liberado/Completado/Vencido |
| Responsive | Tabla con scroll controlado, toolbar adaptable y diálogos a 1440, 768 y 390 px |

No se modificó ningún archivo de `diseno/`.
