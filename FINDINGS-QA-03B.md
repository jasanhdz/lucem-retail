# Findings — QA-03B pass 1

## Resumen

9/13 criterios pasan con evidencia ejecutable. El full run `2026-11-13T16-25-33-493Z-3294700` terminó `FAIL` (107/107 Playwright PASS, sin suite bloqueada ni pruebas fallidas), no PASS global: observó 25 errores de hidratación y 2 solicitudes `net::ERR_ABORTED`, ambos aún sin causa confirmada; además quedan 69/78 estados `UNCOVERED`, 308/317 controles `NOT_REGISTERED` y referencias visuales sin baseline aprobado. Los hallazgos de cobertura/visuales no se han convertido en defectos de aplicación.

### Rúbrica QA-03B

1. **PASS — Carga persistente:** `npm run qa:full` cargó el runtime desde la ruta autorizada; el cargador se comparte con el ejecutable QA y bloquea runtime ausente/inválido. No requiere exportar variables manualmente.
2. **PASS — Secreto y ruta protegidos:** `.qa-private` modo 0700 y `runtime.env` modo 0600, ambos del usuario actual; loader rechaza symlinks, owner/mode incorrectos, claves desconocidas y duplicados. ZIP escaneado contra valores runtime: cero coincidencias; no incluye storage state.
3. **PASS — Identidad PostgreSQL:** consulta directa devolvió `database=lucem_qa`, `user=lucem_qa`; preparación confirma loopback `127.0.0.1:55433`, seis migraciones al día. `DATABASE_URL` y `E2E_DATABASE_URL` del archivo no se importan como fuentes.
4. **PASS — Full autenticado y fixtures:** preparación, funcionales, observación pública/autenticada y cleanup pasaron; 107 pruebas PASS. Fixtures sintéticos QA se prepararon bajo lock y la limpieza verificada usó el namespace propietario. Sin reinicio de PostgreSQL ni acceso a staging/Cloudflare/n8n.
5. **PASS — Evidencia de cobertura ejecutada:** 9 estados y 9 controles se enlazan a archivo/título Playwright, aserciones del cuerpo de prueba y resultado real. Los casos mapeados pasaron en este run.
6. **PASS — Estados distintos:** el informe separa `PASS`, `FAIL`, `NOT_EXECUTED`, `NOT_MAPPED`, `UNCOVERED`, `BLOCKED` y los estados de evidencia `NOT_REGISTERED`, `REGISTERED_UNTESTED`, `VERIFIED`; static coverage conserva lo no ejecutado sin elevarlo a verificado.
7. **PASS — Reconciliación comparable:** ambos reportes contienen las mismas 78 claves estado-feature y 317 claves de control; intersecciones 78/78 y 317/317. Baseline: estados 2 PASS + 76 UNCOVERED; controles 6 PASS + 311 UNCOVERED. Actual full: estados 9 PASS + 69 UNCOVERED; controles 9 VERIFIED + 308 NOT_REGISTERED. Siete estados antes uncovered pasan ahora por aserción ejecutada. Cinco controles previos PASS (login) quedaron verificados y cuatro controles de catálogo se verificaron; el link `/registro` que antes heredaba un PASS de feature sin aserción específica queda correctamente NOT_REGISTERED. Por tanto, 76→69 sí es comparable por clave; 311→308 no equivale a tres controles adicionales sin cobertura: refleja la distinción de evidencia y una asociación previamente amplia.
8. **BLOCKED — Conciliación histórica de hidratación:** el artefacto histórico contiene 19 mensajes (15 `style={{}}`, 4 `style={{caret-color:"transparent"}}`; 18 del test de páginas registradas y 1 de login). El full actual observa 25 (24 `style={{}}`, 1 caret-color) en ocho rutas de workspace más login. El probe QA autenticado repitió 45 visitas de página (15 rutas × 3 viewports) y una visita anónima a login, pero obtuvo cero warnings, cero atributos `style` en SSR/DOM y cero mutaciones. No se pudieron enlazar los 19 históricos a deltas exactos por ocurrencia.
9. **BLOCKED — Atribución de hidratación/abort:** warnings observados se conservan como `UNDETERMINED`, no resueltos. Chromium Playwright 156.0.8078.4; el proyecto no configura extensiones; la búsqueda literal de `style={{}}`/`caretColor` en componentes no encontró origen. La probe no reprodujo la diferencia. Los dos abortos actuales son `GET` de recurso `fetch`, `isNavigationRequest=false` (`/negocios/crear` → recurso `/negocios/giro` y `/login` → recurso `/negocios`), por lo que no se marcaron como esperados. Sin causa raíz demostrada; no se modificó código comercial.
10. **PASS — Reporte/ZIP:** informe estructurado, capturas, probe, eventos, fixtures, cleanup y checks bajo `qa/reports/2026-11-13T16-25-33-493Z-3294700/`. ZIP `qa/reports/lucem-audit-20261113-163532.zip`, SHA-256 `5b976866085d4e270325120002ea1e5815c8df8d627c2a1b960767826edddc2d`, 13,439,342 bytes; `unzip -t` sin errores; 202 entradas; cero valores runtime y ningún storage state.
11. **PASS — Checks:** `npm test` 78/78, `npm run typecheck`, `npm run lint`, `git diff --check` PASS. Las suites autenticadas no registraron FAIL/BLOCKED; el check visual de baselines queda `NOT_EXECUTED` al no existir baselines aprobados.
12. **BLOCKED — Cierre sin hallazgos abiertos:** no se puede aprobar QA-03B mientras continúen los avisos React sin atribución, los dos abortos sin explicación, los gaps de cobertura y la comparación visual sin baselines aprobados. Resultado global full es FAIL, aunque los flujos funcionales pasan.
13. **PENDING — Publicación:** quedan por verificar commit(s) QA-only, destino de rama y fast-forward push. No se incluirán cambios locales DEV-DATA-01, `SPEC.md`, seed demo, `next-env.d.ts` ni el diff preexistente de `e2e/dev-sec-01/product-pagination.spec.ts`.

## Abiertos

- [ ] F-QA03B-08 · major · criterio #8 — Recuperar/conciliar payload completo de cada una de las 19 ocurrencias históricas y sus atributos SSR/cliente exactos; probe autenticada actual no las reproduce.
- [ ] F-QA03B-09 · major · criterio #9 — Investigar origen de los 25 warnings del observer visual y correlación/initiator de los dos abortos fetch; clasificación pendiente, no corregido.
- [ ] F-QA03B-12 · major · criterio #12 — 69 estados y 308 controles siguen sin evidencia funcional; 59 referencias visuales no tienen baseline aprobado.
- [ ] F-QA03B-13 · major · criterio #13 — Registrar y publicar exclusivamente commits QA-03B mediante fast-forward a la rama feature indicada.

## Resueltos (verificados este pass)

- [x] F-QA03B-01 — Carga automática desde `.qa-private/runtime.env` con permisos/path/owner validados.
- [x] F-QA03B-02 — Secretos sanitizados y ausentes del ZIP escaneado.
- [x] F-QA03B-03 — Identidad conectada comprobada exactamente como `lucem_qa` / `lucem_qa`.
- [x] F-QA03B-04 — Suite autenticada, namespace sintético y limpieza propietaria pasaron.
- [x] F-QA03B-05 — 9 asociaciones de estado/control ligadas a assertions y pruebas Playwright PASS.
- [x] F-QA03B-06 — Estados QA Lab y evidencia registrados de forma distinta.
- [x] F-QA03B-07 — Comparación baseline/full por claves y denominadores completada.
- [x] F-QA03B-10 — Reporte/ZIP generado, checksum calculado e integridad comprobada.
- [x] F-QA03B-11 — Pruebas unitarias, typecheck y lint pasan.
