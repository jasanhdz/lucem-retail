# Lucem Retail - Reglas de negocio

Este documento contiene decisiones funcionales y operativas para validacion del Product Owner. No describe tecnologias ni detalles de programacion.

## 1. Objetivo y alcance

Lucem Retail permitira a pequenos comercios administrar productos, controlar existencias, registrar ventas y consultar resultados basicos del negocio.

La primera prueba se realizara con datos de American Outfit mediante captura manual. La primera version sera una aplicacion web adaptable para computadoras, tabletas y celulares.

Quedan para versiones posteriores la facturacion fiscal, contabilidad completa, integracion con bancos, automatizaciones complejas, aplicaciones moviles nativas, recuperacion de contrasena, respaldos desde la interfaz y sincronizacion offline entre varios dispositivos.

## 2. Negocios, usuarios y permisos

- Un usuario puede pertenecer a uno o varios negocios.
- Cada negocio administra sus propios productos, inventario, ventas, apartados, devoluciones y reportes.
- Cuando un usuario tenga varios negocios, debe elegir con cual trabajara.
- Los roles iniciales son administrador, vendedor y encargado de inventario.
- El administrador puede administrar negocios, usuarios, permisos, productos, inventario, ventas, reportes y auditoria.
- El vendedor puede consultar productos y costos, registrar ventas, emitir tickets y consultar la informacion necesaria para vender.
- El vendedor tambien puede cancelar ventas si el negocio le concede ese permiso.
- El encargado de inventario puede crear y editar productos, variantes, precios, costos, existencias, entradas, ajustes, apartados, liberaciones y devoluciones.
- El administrador y el vendedor pueden consultar reportes financieros. El encargado de inventario puede consultar los reportes necesarios para su trabajo.
- Todos los roles pueden ver costos y utilidad en esta version.
- Las operaciones sensibles deben pedir confirmacion antes de completarse.
- La sesion se cierra despues de 30 minutos sin actividad.

## 3. Productos y variantes

- Un producto tiene nombre, foto opcional, categoria y ubicacion.
- La ubicacion se captura como texto libre.
- Un producto puede tener talla, color, ambos o ninguno.
- Cada variante tiene codigo, codigo de barras opcional, talla opcional, color opcional, costo, precio normal, precio promocional opcional y existencia independientes.
- El codigo se captura manualmente.
- El codigo debe ser unico dentro del mismo negocio. Dos negocios distintos pueden usar el mismo codigo.
- El codigo de barras se puede capturar manualmente o leer con la camara del dispositivo.
- Un producto puede existir sin talla, por ejemplo una gorra de talla unica.
- Las existencias pueden ser piezas enteras o cantidades con hasta dos decimales.
- No se permiten existencias negativas.
- El precio promocional es opcional y, cuando exista, no puede ser mayor al precio normal.
- Las categorias iniciales se crean conforme a las necesidades de American Outfit, incluyendo como minimo pantalones, playeras, sudaderas y accesorios.
- Se conserva el historial de cambios de costo y precio indicando quien cambio, cuando, valor anterior, valor nuevo y motivo.
- Cuando una variante llega a cero, se marca como agotada y deja de mostrarse como disponible para venta o catalogo.
- Cada variante puede tener un limite de alerta de existencia baja.

## 4. Inventario

- Toda entrada o salida de existencias debe quedar registrada con fecha, usuario, producto, variante, cantidad y motivo cuando aplique.
- Se permiten entradas, ajustes positivos, ajustes negativos, apartados, liberaciones de apartados, ventas, cancelaciones de ventas, devoluciones y correcciones.
- Todo ajuste requiere un motivo.
- El historial de movimientos no se edita ni se elimina. Para corregir un movimiento se registra otro movimiento que compense el anterior.
- Un apartado reduce la existencia disponible, aunque todavia no sea una venta.
- Un apartado registra producto, variante, cantidad, cliente opcional, fecha de vencimiento, anticipo opcional, notas, usuario y estado.
- Un apartado puede estar activo, liberado, convertido en venta o vencido.
- Liberar o vencer un apartado devuelve la cantidad a la existencia disponible.
- La existencia disponible nunca puede quedar por debajo de cero.
- Si se intenta vender mas de la existencia disponible, se rechaza la venta completa.
- Si dos personas intentan vender la ultima pieza, solo una venta puede confirmarse.
- No se manejaran varias ubicaciones fisicas en la primera version.

## 5. Ventas

- Una venta puede contener varios productos y variantes.
- Se pueden usar efectivo, tarjeta y transferencia.
- En efectivo se registra el monto recibido y se calcula el cambio.
- El monto recibido en efectivo no puede ser menor que el total.
- No se aplican descuentos en la primera version.
- No se agregan impuestos: los precios capturados son precios finales.
- Cada venta confirmada recibe un folio consecutivo, fecha, hora y usuario responsable.
- Registrar una venta descuenta existencias automaticamente una sola vez.
- La venta debe guardar el precio aplicado y el costo vigente de cada linea en el momento de vender.
- Se genera un ticket imprimible y descargable.
- Una venta puede cancelarse con confirmacion y motivo.
- Cancelar una venta devuelve automaticamente sus existencias.
- Una venta cancelada conserva su folio e historial, pero no se considera en ventas netas, unidades vendidas ni utilidad.
- No es necesario asociar una venta con un cliente.

## 6. Devoluciones

- Una devolucion debe relacionarse con la venta original.
- Debe registrar productos, cantidades, motivo, fecha, usuario y reembolso cuando corresponda.
- No se puede devolver una cantidad mayor a la cantidad vendida y no devuelta previamente.
- Una devolucion aceptada reintegra la existencia.
- El importe devuelto reduce las ventas netas y la utilidad del periodo.

## 7. Reportes

- El tablero principal muestra ventas del dia, unidades vendidas, costo de mercancia vendida, utilidad bruta estimada, productos agotados, alertas de existencia baja y ventas recientes.
- Los reportes se pueden consultar por dia, semana, mes y rango personalizado.
- Se pueden filtrar por usuario, categoria, producto y metodo de pago cuando aplique.
- Ventas brutas son las ventas confirmadas antes de devoluciones.
- Ventas netas son ventas brutas menos devoluciones; las ventas canceladas se excluyen.
- La utilidad bruta estimada es precio de venta menos costo por unidad, multiplicado por la cantidad vendida.
- El costo usado es el costo guardado al momento de cada venta, no el costo actual.
- Los reportes se exportan a Excel y CSV.
- La moneda es pesos mexicanos (MXN) con dos decimales.

## 8. Auditoria e historial

- Se registra quien inicio y cerro sesion.
- Se registra toda alta, modificacion y accion relevante sobre usuarios, permisos, negocios, productos, variantes, precios, costos, inventario, apartados, ventas, cancelaciones y devoluciones.
- Cada registro indica usuario, negocio, fecha, accion y elemento afectado.
- El historial de auditoria es inmutable: no se edita ni se elimina.
- Una correccion se realiza mediante una nueva accion que deja evidencia del cambio.

## 9. Operacion inicial y criterios de aceptacion

- La aplicacion debe permitir iniciar sesion, seleccionar negocio, consultar productos, registrar inventario, vender y consultar reportes.
- El flujo de venta debe ser sencillo para una persona sin experiencia tecnica.
- Debe ser posible registrar manualmente el producto de prueba: Pantalon jogger cargo, codigo AO-0001, costo 35 MXN, precio 150 MXN y existencia inicial 1.
- Al vender una unidad de ese producto, la existencia debe quedar en cero y la utilidad bruta estimada debe ser 115 MXN.
- Cuando la existencia quede en cero, el producto debe verse como agotado y no estar disponible para una nueva venta.
- La aplicacion debe evitar ventas duplicadas de la misma existencia.
