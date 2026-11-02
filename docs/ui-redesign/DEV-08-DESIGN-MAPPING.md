# DEV-08 Design Mapping

| Pantalla | Referencia Stitch | Implementación | Evidencia |
|---|---|---|---|
| Registro | `diseno/desktop_registro_crear_cuenta`, `diseno/mobile_web_registro_crear_cuenta` | `RegistrationScreen` | `registro-desktop.png`, `registro-tablet.png`, `registro-mobile.png` |
| Sin negocios | `diseno/desktop_estado_vac_o_usuario_sin_negocios` | `BusinessesScreen` empty state | Covered by route and API contract |
| Crear negocio | `diseno/desktop_crear_nuevo_negocio`, `diseno/mobile_web_crear_nuevo_negocio` | `BusinessCreateScreen` | `crear-negocio-*` |
| Elegir giro | `diseno/desktop_selecci_n_de_giro_del_negocio`, `diseno/mobile_web_selecci_n_de_giro_del_negocio` | `GiroScreen` | `seleccionar-giro-*` |
| Confirmación | `diseno/desktop_confirmaci_n_de_negocio_creado_primer_acceso` | `ConfirmationScreen` | `confirmacion-*` |

## Decisiones

- Se conserva el lenguaje visual existente de auth: Lucem Retail, fondos verde agua, tarjetas claras, tipografía Inter/Plus Jakarta Sans y CTA verde.
- El grid de giros cambia a una presentación responsive de 3, 2 y 1 columnas para evitar overflow.
- Sólo se persiste en `sessionStorage` el borrador no sensible de nombre/sucursal; nunca contraseña, cookie, token o storageState.
- No se muestran botones OAuth activos porque no existen proveedores configurados.
