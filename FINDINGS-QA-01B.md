# Findings — QA-01B evaluation pass 1

## Resumen

0/23 criterios del rubric pasan completamente en esta evaluación. La auditoría `full` ejecutó sin conexión a base: el preflight bloqueó operaciones autenticadas al faltar `QA_DATABASE_URL`; no hizo fallback a `DATABASE_URL`. La observación pública local pasó 5/5 pruebas y generó 11 capturas desktop/tablet/mobile, axe con 0 violaciones, 0 hallazgos responsive y 15 muestras de navegación (p50 807 ms, p95 897 ms; umbral 2500 ms). El resultado integral queda `BLOCKED`, no PASS.

Evidencia final: `qa/reports/2026-11-12T02-09-05-364Z-822536/`; ZIP `qa/reports/lucem-audit-20261112-020943.zip`, SHA-256 `14a0740010cb1cacbd7fec21a1638163120dd3a81c8e945ad8d194aff1ec9c11`, 9,073,357 bytes. `unzip -t` pasó. El manifiesto excluye una traza Playwright y marca los reportes de texto como sanitizados; capturas contienen pantallas públicas y datos sintéticos, sin sesión autenticada.

Docker está `active (running)`, Compose 2.40.3 está instalado y 55433/3113 estaban libres en la inspección de sockets. El socket es `root:docker` modo 0660; `jasan` no pertenece a `docker`; `docker ps -a` falla por permisos y `sudo -n` pide contraseña. No se pudo inspeccionar contenedores/volúmenes ni provisionar DB. No se ejecutaron migraciones, setup, limpieza, login autenticado o flujos comerciales. No se contactó ni modificó staging; la observación Playwright usó exclusivamente `127.0.0.1:3113` y build separado `.next-qa-readonly`.

## Abiertos

- [ ] F-01 · major · criterio #1 — No fue posible inspeccionar contenedores existentes ni validar estado real de PostgreSQL porque el usuario no tiene acceso al socket y sudo requiere autenticación interactiva. La configuración declarativa liga 55433 a loopback y la auditoría rechazó la URL ausente sin fallback.
- [ ] F-02 · major · criterio #2 — El servidor de observación pública usó puerto 3113 y `.next-qa-readonly`; la separación operativa de instancia autenticada, build, uploads y sesiones no se verificó.
- [ ] F-03 · major · criterio #3 — Sin identidad conectada `lucem_qa`, migraciones o fixtures. No se afirma provisioning PASS.
- [ ] F-04 · major · criterio #4 — No se ejecutó setup/cleanup ni prueba de identidad cambiada contra una DB provisionada.
- [ ] F-05 · major · criterio #5 — Hay asociaciones de archivos de test; faltan IDs/títulos/assertions observables completos por caso en el registro.
- [ ] F-06 · major · criterio #6 — Inventario nuevo mostró 48 rutas, 24 capacidades y 78 estados; 76 estados siguen `UNCOVERED`. No se verificó toda la matriz de estados en una ejecución funcional.
- [ ] F-07 · major · criterio #7 — `/login`, `/api/auth/login` y `/api/auth/register` figuran `auth=public` y mapeados a sus capacidades; falta ejecución de casos y casos declarativos con IDs/assertions verificables.
- [ ] F-08 · critical · criterio #8 — Login válido/inválido de fixture y autorización por rol no se ejecutaron.
- [ ] F-09 · major · criterio #9 — Productos/upload y persistencia no se ejecutaron.
- [ ] F-10 · major · criterio #10 — Inventario/Kardex y conciliación contra movimientos no se ejecutaron.
- [ ] F-11 · critical · criterio #11 — Checkout/idempotencia/stock no se ejecutaron.
- [ ] F-12 · major · criterio #12 — Apartados y conversión no se ejecutaron.
- [ ] F-13 · major · criterio #13 — Cancelaciones y devoluciones no se ejecutaron.
- [ ] F-14 · critical · criterio #14 — Aislamiento entre tenants no se ejecutó ni comprobó en base.
- [ ] F-15 · major · criterio #15 — Matriz responsive capturada sólo para páginas públicas; no hay sesión para roles autenticados.
- [ ] F-16 · major · criterio #16 — No existen baselines visuales aprobados; visual continúa `NOT_EXECUTED`.
- [ ] F-17 · major · criterio #17 — Axe público reportó 0 violaciones; falta escaneo autenticado por roles.
- [ ] F-18 · major · criterio #18 — Navegación pública medida; páginas/APIs autenticadas no se midieron.
- [ ] F-19 · major · criterio #19 — La deduplicación consolidó controles y ubicaciones en el inventario; no hay asociaciones a casos ejecutados con assertion.
- [ ] F-20 · major · criterio #20 — ZIP íntegro y manifiesto checksummed; queda pendiente inspección de canarios y prueba de aborto ante fallo de sanitización.
- [ ] F-21 · major · criterio #21 — No se ejecutó el workflow de GitHub en esta evaluación ni se inspeccionaron sus permisos/artefactos.
- [ ] F-22 · major · criterio #22 — No se accedió a staging, producción ni Cloudflare durante esta evaluación; la verificación instrumentada de cero conexiones prohibidas no se ejecutó.
- [ ] F-23 · major · criterio #23 — Bloqueo honesto comprobado por ausencia de QA_DATABASE_URL; el provisioning local autorizado sigue pendiente y no se reintentó con otro destino.

## Resueltos (verificados este pass)

- [x] QA-RUN-01 · verificación parcial — `npm run qa:full` terminó en estado `BLOCKED` al faltar `QA_DATABASE_URL`; el CLI no arrancó Playwright autenticado ni migró/escribió/limpió una base alternativa.
- [x] QA-OBS-01 · observación pública — 5/5 pruebas Playwright read-only, 11 capturas en tres viewports, axe público con 0 violaciones, overflow público con 0 hallazgos y 15 muestras de navegación.
- [x] QA-EVIDENCE-01 · exportación — ZIP comprobado con `unzip -t`, SHA-256 y manifiesto de inclusión/omisión.
- [x] QA-COVERAGE-01 · estado de rutas — 48 rutas inventariadas; `/login` se clasifica pública; rutas y capacidades autenticadas quedan BLOCKED y los estados ausentes permanecen no-PASS.
- [x] QA-ROUTE-01 · clasificación — `/`, `/login`, `/registro`, `/api/auth/login` y `/api/auth/register` ahora se clasifican públicamente; test unitario confirma el mapeo de los endpoints de autenticación.
