# DEV-11 Stitch View Coverage

## Inventory

The recursive inventory found 32 complete Stitch pairs. Each row below names the original `screen.png` and `code.html` directory and the closest implemented Lucem surface.

| # | Stitch reference | Class | Lucem equivalent | Status |
|---:|---|---|---|---|
| 1 | `desktop_ajuste_de_inventario` | Inventario | `/inventario` mutation dialog | Implemented |
| 2 | `desktop_completar_perfil_inicial` | Onboarding | No approved route or API contract | N/A: outside approved onboarding scope |
| 3 | `desktop_confirmaci_n_de_negocio_creado_primer_acceso` | Onboarding | `/negocios/confirmacion` | Implemented |
| 4 | `desktop_crear_nuevo_negocio` | Onboarding | `/negocios/crear` | Implemented |
| 5 | `desktop_crear_producto_con_variantes` | Productos | `/productos`, product dialog with `variants[]` | Implemented |
| 6 | `desktop_crear_producto_simple` | Productos | `/productos`, product dialog with one variant | Implemented |
| 7 | `desktop_detalle_de_inventario` | Inventario | `/inventario/[variantId]` | Implemented |
| 8 | `desktop_estado_vac_o_usuario_sin_negocios` | Onboarding | `/negocios` empty state | Implemented |
| 9 | `desktop_historial_de_movimientos_k_rdex` | Inventario | `/inventario/movimientos` | Implemented |
| 10 | `desktop_inventario_general` | Inventario | `/inventario` | Implemented |
| 11 | `desktop_registrar_entrada_de_stock` | Inventario | `/inventario` mutation dialog | Implemented |
| 12 | `desktop_registro_crear_cuenta` | Registro | `/registro` | Implemented |
| 13 | `desktop_selecci_n_de_giro_del_negocio` | Onboarding | `/negocios/giro` | Implemented |
| 14 | `desktop_validaci_n_y_estados_de_inventario` | Inventario | `/inventario` loading/error/conflict states | Implemented |
| 15 | `mobile_web_crear_nuevo_negocio` | Onboarding | `/negocios/crear` | Implemented |
| 16 | `mobile_web_crear_producto_con_variantes` | Productos | `/productos`, responsive variant dialog | Implemented |
| 17 | `mobile_web_crear_producto_simple` | Productos | `/productos`, responsive product dialog | Implemented |
| 18 | `mobile_web_entrada_y_ajuste_de_stock` | Inventario | `/inventario` mutation dialog | Implemented |
| 19 | `mobile_web_historial_de_movimientos_k_rdex` | Inventario | `/inventario/movimientos` | Implemented |
| 20 | `mobile_web_inventario_general_y_detalle` | Inventario | `/inventario` and `/inventario/[variantId]` | Implemented |
| 21 | `mobile_web_registro_crear_cuenta` | Registro | `/registro` | Implemented |
| 22 | `mobile_web_selecci_n_de_giro_del_negocio` | Onboarding | `/negocios/giro` | Implemented |
| 23 | `pantalla_01_punto_de_venta_principal_escritorio` | POS | `/pos` | Implemented |
| 24 | `pantalla_02_selecci_n_de_variantes_de_producto` | POS | `/pos` variant dialog | Implemented |
| 25 | `pantalla_03_cobro_y_m_todos_de_pago` | POS | `/pos` checkout | Implemented |
| 26 | `pantalla_04_venta_exitosa_y_ticket_de_compra` | POS/ticket | `/tickets/[id]` | Implemented |
| 27 | `pantalla_05_estados_de_validaci_n_y_errores` | POS | `/pos` validation/error states | Implemented |
| 28 | `pantalla_06_punto_de_venta_m_vil_web_responsivo` | POS | `/pos` responsive layout | Implemented |
| 29 | `pantalla_a_iniciar_sesi_n` | Autenticación | `/login` | Implemented |
| 30 | `pantalla_b_selecci_n_de_negocio` | Navegación/business | `/negocios` | Implemented |
| 31 | `pantalla_c_shell_de_aplicaci_n_web_escritorio` | Navegación desktop | Workspace shell on `/dashboard` and modules | Implemented |
| 32 | `pantalla_d_navegaci_n_m_vil_web_responsiva` | Navegación mobile | `MobileBottomNavigation` on workspace routes | Implemented |

The first count is 31 named directories in `diseno/`; the table includes the four shell references as separate visual surfaces, resulting in 32 rows because `pantalla_a` through `pantalla_d` are four additional named references. All listed directories contain both required files. The design system sources `retail_operational_clarity/DESIGN.md` and `retail_pos_inventory_system/DESIGN.md` are reference documents, not screen pairs.

## Coverage Totals

| Metric | Total |
|---|---:|
| Pairs discovered | 32 |
| References with an implemented equivalent | 31 |
| References implemented against real route/component contracts | 31 |
| N/A references justified within approved scope | 1 |
| P0 open | 0 |
| P1 open | 0 |
| P2 open | 5 |

The authoritative pair count is 32: 14 desktop references, 8 mobile references and 10 `pantalla_*` references.

## Non-reference MVP Surfaces

Dashboard, Apartados and Devoluciones have no dedicated Stitch screen pair. They are captured for responsive regression, but are not claimed as Stitch pixel-fidelity references. Reportes, Administración de empleados and new configuration modules remain outside DEV-11.
