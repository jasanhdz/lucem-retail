# Validación de reglas de negocio — Lucem Retail

**Fecha:** 30 de octubre de 2026  
**Resultado:** cumplimiento parcial; el sistema todavía no cumple todas las reglas documentadas.  
**Método:** revisión independiente por áreas de productos/inventario, ventas/reportes y acceso/auditoría, además de comprobaciones HTTP contra la aplicación local.

## Resumen ejecutivo

Las operaciones principales ya tienen una base funcional: autenticación y selección de negocio, catálogo con variantes, control de stock, ventas con métodos de pago, folios, tickets, cancelación, devoluciones, reportes y auditoría. Se encontraron, sin embargo, brechas que impiden considerar el sistema listo para operar con datos de negocio sin supervisión.

El hallazgo más urgente es que el endpoint de auditoría devuelve el campo `passwordHash` junto con los datos del usuario. También hay discrepancias en cálculos de devoluciones, operaciones que pueden duplicarse bajo concurrencia, funciones prometidas que no tienen una interfaz completa y acciones relevantes que no quedan auditadas.

## Hallazgos que requieren atención prioritaria

### Crítico — Exposición de hashes de contraseñas

- `app/api/audit/route.ts` incluye el usuario completo con `include: { user: true }` y serializa directamente los registros.
- Comprobación realizada: inicio de sesión local respondió `200`; `GET /api/audit` respondió `200` y los objetos `user` incluían la propiedad `passwordHash`.
- El valor del hash no se reproduce en este informe.
- **Impacto:** un administrador que consulta auditoría obtiene material sensible de autenticación innecesario.
- **Corrección esperada:** seleccionar explícitamente solo los campos de usuario permitidos, por ejemplo `id`, `name` y `email`.

### Alto — La devolución no mantiene consistencia entre importe, ventas netas y utilidad

- `app/api/returns/route.ts` permite que `refundAmount` sea menor que el importe de las líneas devueltas.
- `app/api/reports/sales/route.ts` calcula las devoluciones a partir de precios y cantidades; el tablero usa `Return.refundAmount`.
- El tablero (`app/api/dashboard/route.ts`) resta reembolsos a ventas, pero no reduce unidades ni costo de mercancía vendida por lo que se reintegró.
- **Impacto:** ventas netas, unidades, COGS y utilidad pueden diferir entre tablero y reporte después de una devolución.
- **Corrección esperada:** definir una sola regla para reembolso y aplicar las cantidades/precios/costos históricos devueltos de manera consistente en todos los reportes.

### Alto — Riesgo de duplicar restitución al cancelar ventas en paralelo

- `app/api/sales/[id]/cancel/route.ts` lee la venta, comprueba si está cancelada y luego incrementa stock; el cambio no usa una transición condicional de `CONFIRMED` a `CANCELLED` antes de restituir.
- Una repetición secuencial no duplica la restitución, pero dos solicitudes simultáneas pueden pasar la comprobación previa.
- **Corrección esperada:** hacer la transición de estado condicional y restituir stock solo si una solicitud fue la única que cambió el estado.

### Alto — Posible sobredevolución por solicitudes simultáneas

- `app/api/returns/route.ts` calcula lo previamente devuelto y crea nuevas líneas dentro de una transacción sin una protección concurrente que serialice el saldo de la línea.
- Dos solicitudes simultáneas podrían validar contra el mismo saldo pendiente.
- **Corrección esperada:** proteger la cantidad devuelta con aislamiento serializable o una actualización condicional/bloqueo de la línea vendida.

### Alto — Auditoría incompleta y sin inmutabilidad reforzada

- La auditoría de algunas acciones existe, pero no se registran de forma uniforme ajustes de inventario y selección de negocio.
- El esquema `AuditLog` no tiene protección de solo inserción en la base de datos; la ausencia de endpoints de edición/eliminación no constituye por sí sola una garantía de inmutabilidad.
- **Corrección esperada:** auditar todas las mutaciones relevantes y añadir restricciones de solo inserción para las credenciales de aplicación usadas por el sistema.

## Incumplimientos funcionales importantes

### Productos e inventario

- **Fotos cargadas por el usuario:** el modelo permite `photoPath` y las semillas tienen imágenes remotas de Unsplash, pero el formulario/API de productos no permite subir ni guardar una foto local.
- **Precio promocional:** API y formulario no validan que el precio promocional sea menor o igual al precio normal.
- **Historial de precios/costos:** existe almacenamiento de cambios al editar, pero el motivo es opcional y se reemplaza con un motivo genérico; el flujo de alta tampoco crea historial inicial explícito. No se encontró una pantalla para consultar el historial.
- **Agotados y stock bajo:** el POS filtra artículos sin stock y el tablero calcula contadores, pero catálogo/inventario no presentan de forma consistente las etiquetas requeridas de “agotado” y alerta de stock bajo.
- **Kardex:** las rutas generan movimientos, pero la pantalla de inventario no presenta un historial consultable de movimientos.
- **Vencimiento de apartados:** existe una ruta para marcar apartados vencidos, pero no se encontró un proceso programado que la ejecute automáticamente. La acción de vencimiento por identificador tampoco demuestra que siempre valide que la fecha ya haya llegado.

### Ventas

- Los métodos de pago, recibido/cambio en efectivo, guardado de costo/precio histórico, ticket e idempotencia están implementados.
- La cancelación conserva la venta y restitución secuencialmente, pero presenta el riesgo de concurrencia descrito arriba.
- El tablero de ventas recientes incluye ventas canceladas, aunque la regla indica que no deben contarse como ventas del negocio.
- El folio usa el máximo existente más uno y la unicidad de base de datos; no se encontró un contador/reintento que garantice generación consecutiva sin conflicto concurrente.

### Devoluciones y reportes

- La UI de reportes no expone los filtros prometidos por fecha, usuario, categoría, producto y método de pago, aunque parte de los endpoints acepta algunos parámetros.
- Las exportaciones descargan archivos, pero la pantalla no transmite filtros seleccionados y el contenido es más limitado que los indicadores requeridos (por ejemplo, unidades, COGS y utilidad).
- Después de devoluciones, las unidades y el costo devuelto no se descuentan de manera consistente de las métricas.

### Usuarios, permisos y sesiones

- Hay roles, membresías de negocio, selección de negocio, contraseñas con hash y expiración/refresco de sesión de 30 minutos.
- Se comprobó previamente que las consultas se separan al cambiar entre los negocios demo.
- La matriz de permisos no está completamente alineada con la definición de roles: algunas rutas de escritura tienen restricciones, pero no hay una política central aplicada uniformemente; reportes y navegación tampoco expresan claramente la matriz prevista.
- `src/lib/auth.ts` puede recurrir a la primera membresía si el negocio activo de la sesión no coincide con las membresías, lo que puede asociar un negocio activo con permisos de otro membership.

## Reglas comprobadas como implementadas

- SKU único dentro del negocio mediante restricción compuesta `(businessId, sku)`; negocios distintos pueden reutilizarlo.
- Cantidades y costos/precios con representación Decimal en PostgreSQL.
- Entradas y ajustes de inventario requieren motivo en la ruta revisada.
- Apartados registran cantidad, vencimiento, cliente/anticipo/notas opcionales y reducen stock disponible; liberar un apartado activo lo restaura.
- La venta valida stock en servidor, guarda costo/precio histórico, y el código utiliza transacción serializable con decremento condicional.
- Métodos de pago efectivo/tarjeta/transferencia; efectivo valida el monto y calcula cambio.
- Los tickets pueden imprimirse desde el navegador.
- Las rutas principales rechazan acceso sin sesión; el ejemplo `AO-0001` está en la semilla con costo `$35`, precio `$150` y stock inicial `1`.
- La sesión se crea y refresca con límite de inactividad de 30 minutos.

## Evidencia y archivos consultados

La revisión contrastó las reglas de `documentacion/reglas-de-negocio.md` con `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/auth.ts`, `src/lib/audit.ts`, las rutas `app/api/**` de productos, inventario, apartados, ventas, devoluciones, reportes y auditoría, y las pantallas `app/(workspace)/**` correspondientes.

Comprobación dinámica adicional: login demo `200`; lectura autenticada de auditoría `200`; confirmación de que la respuesta contenía la clave `passwordHash` sin imprimir su valor. La evaluación previa registrada en `FINDINGS.md` aporta evidencia de ventas concurrentes, idempotencia, cancelación secuencial, devolución y aislamiento de datos por negocio.

## Recomendación de cierre

Antes de usar la aplicación con información real, corregir primero la exposición de `passwordHash`, la consistencia de devoluciones/reportes y la restitución concurrente por cancelación/devolución. Después completar fotos locales, historial/kardex visible, vencimiento automático, filtros/exportaciones y cobertura de permisos/auditoría.
