# DEV-05 Design Mapping

## Fuentes

Las fuentes DESIGN.md exactas son `diseno/retail_operational_clarity/DESIGN.md` y `diseno/retail_pos_inventory_system/DESIGN.md`; no fueron modificadas. Las seis carpetas Stitch exactas de POS son `diseno/pantalla_01_punto_de_venta_principal_escritorio/`, `diseno/pantalla_02_selecci_n_de_variantes_de_producto/`, `diseno/pantalla_03_cobro_y_m_todos_de_pago/`, `diseno/pantalla_04_venta_exitosa_y_ticket_de_compra/`, `diseno/pantalla_05_estados_de_validaci_n_y_errores/` y `diseno/pantalla_06_punto_de_venta_m_vil_web_responsivo/`.

| Reference | Application | Evidence |
| --- | --- | --- |
| POS principal | Catalog, search, category and sticky cart | `POSCatalog`, `POSCart` |
| Variants | Accessible dialog; variant IDs remain in cart | `POSVariantDialog`, `pos-cart.ts` |
| Cobro | CASH, CARD, TRANSFER, change and single submit | `POSCheckout`, `POSPage` |
| Ticket | Persisted folio, seller, lines, prices and print | `app/tickets/[id]/page.tsx` |
| States/responsive | Loading, errors, 409, desktop/tablet/mobile | POS components and `pos.css` |

IVA, discounts, coupons, customers, credit, terminal, offline queue, physical/reserved stock and auto-retry are intentionally omitted because they are not in the approved API contract. `diseno/` is unchanged.
