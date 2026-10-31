# Lucem Retail - Decisiones tecnicas

Este documento contiene decisiones de arquitectura, programacion, datos, seguridad, pruebas y operacion. Las reglas funcionales para el Product Owner estan en `reglas-de-negocio.md`.

## 1. Estructura del proyecto

- El proyecto se llamara `lucem-retail` y vivira en `/Users/jasanhernandez/Develop/lucem-retail`.
- La aplicacion se construira con Next.js en su version estable actual, TypeScript y App Router.
- Frontend y API viviran en el mismo proyecto para reducir complejidad inicial.
- El codigo de aplicacion se organizara por dominios: autenticacion, negocios, productos, inventario, ventas, apartados, devoluciones, reportes y auditoria.
- La carpeta `diseno/` contiene la referencia visual original y no debe modificarse sin una razon de implementacion documentada.

## 2. Interfaz y experiencia

- Se usara Tailwind CSS.
- Se conservara el lenguaje visual de `diseno/`: retail tactil moderno, paleta slate/emerald/amber/rose, tarjetas redondeadas, sombras suaves, chips de estado y layouts responsive mobile-first.
- Las tipografias visuales de referencia son Inter para texto operativo y Plus Jakarta Sans para titulares.
- Se implementaran vistas para dashboard, catalogo/alta de productos, inventario, punto de venta y reportes.
- El catalogo de productos se presentara como una grilla responsive de tarjetas con hasta cuatro columnas en escritorio y una o dos en movil, priorizando una imagen consistente y lectura inmediata de nombre, SKU, categoria, precio, existencias y estado.
- Alta y edicion de productos usaran un dialogo accesible; el detalle se mostrara en un dialogo/drawer adaptable con variantes e historial. Los dialogos tendran nombre accesible, gestion y retorno de foco, cierre por Escape y control visible de cierre; en movil ocuparan el viewport con scroll interno.
- La interfaz del catalogo, sus filtros, grilla, modales y vista de detalle son decisiones de presentacion/experiencia y no agregan ni alteran reglas de negocio.
- En alta/edicion, «Agregar variante» se mantiene en el legend de la primera variante; la acción está en el encabezado de sección y agrega un conjunto de campos editable. El footer del diálogo queda fijo y el body solo desplaza cuando el contenido excede el espacio disponible.
- En escritorio el sidebar es sticky a `top: 0`, ocupa `100dvh` y mantiene logo/negocio y logout visibles; el nav es su única región desplazable si el alto no alcanza. El documento desplaza el contenido principal independientemente del sidebar. En móvil el sidebar vuelve al flujo normal, muestra sus ocho rutas en dos columnas de controles táctiles y logout en flujo, sin sticky ni overflow horizontal.
- El POS usa layout split escritorio con panel de carrito sticky, líneas en scroll propio y controles de cobro accesibles. En móvil la grilla de catálogo deja espacio inferior para resumen fijo; un bottom-sheet de hasta 85dvh presenta header, líneas desplazables, pago y footer sticky. El diálogo nativo bloquea scroll de fondo, cierra con Escape o botón y no añade backdrop visible. Resumen, sheet y panel usan el mismo estado de carrito; el precio aplicado usa `promoPrice` cuando existe.
- La interfaz debe funcionar en celulares, tabletas y escritorio.
- Los estados de carga, vacio, error, agotado y confirmacion deben ser visibles.
- Los componentes de negocio deben ser reutilizables y accesibles por teclado cuando sea posible.

## 3. Estado y datos del servidor

- Zustand se usara para estado global de interfaz, usuario autenticado, negocio activo y carrito de venta cuando corresponda.
- Los datos persistentes se consultaran mediante la API y no se duplicaran innecesariamente en Zustand.
- Las operaciones de escritura deben invalidar o actualizar los datos visibles para evitar informacion obsoleta.

## 4. Base de datos

- Se usara PostgreSQL ejecutado localmente con Docker Compose.
- Se usara Prisma o un ORM tipado equivalente con migraciones versionadas.
- Todas las entidades de negocio tendran `businessId` y cada consulta protegida debe filtrar por el negocio activo.
- Se usaran tipos Decimal para importes y cantidades, evitando errores de punto flotante.
- Las cantidades se limitaran a dos posiciones decimales.
- Se usaran identificadores estables, marcas de tiempo y relaciones con restricciones de integridad.
- Los codigos de variante tendran una restriccion de unicidad compuesta por negocio y codigo.
- Los folios de venta tendran unicidad por negocio.
- El costo y precio historico de cada linea de venta se almacenaran en la propia linea de venta.

## 5. Transacciones y consistencia

- Confirmar una venta ejecutara en una transaccion la validacion de existencia, creacion de venta, lineas, folio y movimientos de inventario.
- La validacion de stock sera atomica para impedir que dos solicitudes vendan la misma ultima existencia.
- Cancelar una venta ejecutara en una transaccion el cambio de estado y los movimientos de restitucion.
- Devolver productos ejecutara en una transaccion la validacion de cantidades, registro de devolucion y reintegro de inventario.
- Los movimientos de inventario y registros de auditoria seran de solo insercion desde la aplicacion.
- Se usaran claves de idempotencia para que reintentos de red no dupliquen ventas o movimientos.

## 6. Autenticacion y autorizacion

- Se implementara inicio de sesion con credenciales y contrasenas almacenadas con hash seguro.
- La autorizacion se comprobara en el servidor en cada endpoint, usando usuario, negocio activo y rol.
- Las reglas de permisos se centralizaran para que la interfaz no sea la unica barrera.
- La recuperacion de contrasena no se implementara en esta version, pero el modelo debe permitir agregarla.
- Se implementara cierre de sesion por inactividad despues de 30 minutos.
- Las operaciones sensibles tendran confirmacion de interfaz y validacion adicional en API.

## 7. Archivos e imagenes

- Las fotos de productos se guardaran localmente en esta version.
- La base de datos guardara una ruta relativa, nunca el binario de la imagen.
- Se validara tipo MIME, extension y tamano antes de almacenar un archivo.
- La capa de almacenamiento se aislara para permitir migrar despues a S3, Cloudinary u otro servicio.
- Los archivos subidos y datos locales no se incluiran en Git.

## 8. API y validacion

- La API se separara por recursos y acciones de dominio.
- Los datos de entrada se validaran en servidor con esquemas tipados, preferentemente Zod.
- Las respuestas de error tendran formato consistente y no expondran secretos.
- Los endpoints protegidos nunca confiaran en un `businessId` recibido sin verificar que el usuario tenga acceso.
- Las exportaciones se generaran en servidor con los mismos filtros usados en pantalla.

## 9. Offline y red local

- La primera version priorizara operacion conectada a PostgreSQL en la red local.
- Se podra agregar cache de recursos y lectura de datos recientes, pero no se confirmaran ventas offline sin validar existencia en servidor.
- La sincronizacion offline completa entre varios dispositivos queda fuera de esta version por el riesgo de conflictos de inventario.
- Docker Compose proporcionara PostgreSQL y el entorno local de desarrollo.

## 10. Fechas, moneda y exportaciones

- Las fechas se almacenaran en UTC.
- La zona horaria inicial de presentacion sera `America/Mexico_City`.
- La moneda inicial sera MXN.
- Los importes se presentaran y exportaran con dos decimales.
- CSV y Excel se generaran con codificacion compatible con hojas de calculo y encabezados claros.

## 11. Pruebas y calidad

- TypeScript se configurara en modo estricto.
- Se probaran calculos de totales, cambio, utilidad, limites de stock, cancelaciones, devoluciones y permisos.
- Se probaran con integracion las ventas atomicas, idempotencia y aislamiento por negocio.
- Se verificaran build, lint, typecheck, migraciones y arranque real.
- Se usara Playwright para flujos visuales cuando este disponible y `curl` para endpoints.
- No se declarara una prueba aprobada sin ejecutar el comando correspondiente.

## 12. Entrega y operacion

- El repositorio incluira `README.md`, `.env.example`, `docker-compose.yml`, esquema/migraciones y comandos de desarrollo.
- Los secretos se mantendran en variables de entorno y no se incluiran en Git.
- Se inicializara Git y se realizaran commits pequenos por fase o cambio verificable.
- Los respaldos administrables desde la interfaz no se implementaran en esta version.
- La documentacion de negocio y decisiones tecnicas no debe editarse como parte de cambios automaticos del generador sin revision.

## 13. Evolucion prevista

- Recuperacion de contrasena.
- Sincronizacion offline multi-dispositivo con resolucion de conflictos.
- Almacenamiento externo de imagenes.
- Respaldos y restauracion desde la interfaz.
- Facturacion fiscal, contabilidad, integraciones bancarias y aplicaciones moviles nativas.
