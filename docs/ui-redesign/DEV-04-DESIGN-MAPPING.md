# DEV-04 Design Mapping

## Fuentes

Las dos fuentes de sistema son exactamente `diseno/retail_operational_clarity/DESIGN.md` y `diseno/retail_pos_inventory_system/DESIGN.md`. No se modificaron esos archivos. Los directorios Stitch de inventario presentes son exactamente `diseno/desktop_ajuste_de_inventario/`, `diseno/desktop_detalle_de_inventario/`, `diseno/desktop_historial_de_movimientos_k_rdex/`, `diseno/desktop_inventario_general/`, `diseno/desktop_registrar_entrada_de_stock/`, `diseno/desktop_validaci_n_y_estados_de_inventario/`, `diseno/mobile_web_entrada_y_ajuste_de_stock/`, `diseno/mobile_web_historial_de_movimientos_k_rdex/` y `diseno/mobile_web_inventario_general_y_detalle/`. La implementación usa sólo patrones de lista, búsqueda, detalle y controles táctiles respaldados por el contrato real.

## Decisiones

| Área | Aplicación DEV-04 |
| --- | --- |
| Jerarquía | Encabezado operativo, resumen de variantes y balances, después tabla con SKU, ubicación, físico, apartado y disponible. |
| Lenguaje visual | Superficies claras, bosque `#102B2A`, verde `#166B55`, bordes suaves y tipografía Plus Jakarta Sans para títulos e Inter para datos densos. |
| Responsive | Tabla con scroll horizontal controlado en móvil, toolbar apilada, tarjetas de balance y objetivos táctiles de 44px. |
| Datos | Sólo API real del negocio activo; apartados activos y movimientos no se simulan en frontend. |
| Mutaciones | Diálogo único para compra y ajustes, motivo obligatorio, errores de contrato visibles y refetch posterior, incluido conflicto `409`. |

No existe una referencia Stitch autorizada para inventar métricas, gráficos, proveedores o acciones de edición. Por eso se omiten y se preserva la semántica operativa del backend.
