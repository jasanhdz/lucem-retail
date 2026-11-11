# Findings — pass 3

## Resumen
3/18 criterios del rubric pasan por completo: #3, #12 y #13. HEAD evaluado `b6ce3c2854330e7b55b8972e0160bf2829732ed7`; auditoría full `qa/reports/2026-11-11T22-53-39-836Z-724696/` terminó BLOCKED por falta de `QA_DATABASE_URL` y credenciales aisladas. Reporta 48 rutas, 24 capacidades, 78 estados requeridos, 76 estados sin cobertura, 385 controles sin cobertura y cero rutas no descubiertas. Typecheck, lint, 52/52 pruebas unitarias y build con URL QA falsa aislada pasaron. CLI help funciona, opción desconocida devuelve no-cero y test de URL QA remota/staging-like confirma bloqueo antes de webServer. Las pruebas de normalización dinámica y mapeo de cobertura/control confirman cobertura marcada UNCOVERED/NOT_EXECUTED correctamente.

Auditoría pública: 5 Playwright read-only pasan, 11 capturas, axe con cero violaciones en 3 pantallas públicas, responsive cero hallazgos, 15 muestras de navegación (p95 779 ms, umbral 2500 ms). No hay baselines aprobados. ZIP `qa/reports/lucem-audit-20261111-225414.zip` (9,076,191 bytes) verificado con `unzip -t` y SHA sidecar: `6f12e5974b4ef8ce01d805a9cd5879d32c8c324ab77f49261fefad25f2c0ba3d5`; se informan 93 entradas, reportes requeridos y ausencia de trace/HAR/storageState/DB. Segunda exportación también verificada. No se provisionó ni contactó ninguna DB; no se accedió a staging, producción o Cloudflare. No se declara PASS para flujos autenticados ni funcionalidad de negocio.

## Abiertos
- [ ] F-01 · major · criterio #1 — El test de URL remota/staging-like bloqueada antes de webServer verifica un caso, pero falta la matriz controlada para URL ausente/inválida, protocolo, host, puerto, usuario/base incorrectos, staging y producción, ausencia de fallback y no ejecución de cleanup/mutación en todos los casos.
- [ ] F-02 · major · criterio #2 — Sin ejecución instrumentada a `lucem_qa` no se demuestra identidad de cada conexión, comprobación antes de escritura, aislamiento efectivo ni sanitización de logs en flujos reales.
- [ ] F-04 · major · criterio #4 — No se verificaron manifiestos inválidos/duplicados/referencias inexistentes y su rechazo con código no-cero; CLI option desconocida no prueba validación del esquema declarativo.
- [ ] F-05 · major · criterio #5 — Las pruebas de utilidad verifican estados de cobertura, pero faltan comprobaciones de selección CLI por perfil/área/tag, resultado por check y códigos de salida de ejecución ante bloqueos/cobertura requerida. Full audit continúa BLOCKED; 76 estados y 385 controles permanecen sin cobertura.
- [ ] F-06 · major · criterio #6 — Ningún flujo funcional autenticado de las áreas prioritarias se ejecutó; el perfil E2E está bloqueado por precondición de DB/credenciales QA.
- [ ] F-07 · major · criterio #7 — Observación pública read-only no valida precondiciones/resultados UI/API, roles/autorización ni independencia de orden de los flujos funcionales.
- [ ] F-08 · major · criterio #8 — Sin baselines visuales aprobados ni comparación/regresión controlada; la evidencia responsive pública no cubre la matriz autenticada del full.
- [ ] F-09 · major · criterio #9 — Axe público en tres pantallas registró cero violaciones, pero faltan pantallas autenticadas, selectores/severidades del full y prueba de umbral que falle ante violaciones críticas/serias.
- [ ] F-10 · major · criterio #10 — Métricas públicas finitas pasan el umbral, pero no se ejecutaron APIs/páginas autenticadas ni prueba reproducible de fallo por exceso del umbral.
- [ ] F-11 · major · criterio #11 — Exclusión de tipos de archivo inseguros en ZIP no sustituye inspección de secretos, tokens, cookies y datos sintéticos conocidos en todos los artefactos ni prueba de aborto si falla sanitización.
- [ ] F-14 · major · criterio #14 — No se ejecutó/inspeccionó pipeline CI quick contra `lucem_qa`, ni comportamiento de job/artefactos ante fallo de aislamiento o sanitización.
- [ ] F-15 · major · criterio #15 — El audit full quedó BLOCKED; no hay evidencia de pipeline CI full ejecutando suites autenticadas, matrices visual/axe/perf y exportación con cobertura completa correctamente rechazada.
- [ ] F-16 · major · criterio #16 — Tests de normalización y mapeo de cobertura/control no demuestran fixture sintética nueva por factory, spec/tag/manifiesto, limpieza en finally, repetibilidad, IDs aislados ni no alteración de fixtures ajenas.
- [ ] F-17 · major · criterio #17 — No se ejecutó setup/teardown sobre DB QA; propiedad de filas y bloqueo de teardown al cambiar destino siguen sin probarse.
- [ ] F-18 · major · criterio #18 — ZIP y reportes están en el árbol QA con metadatos, pero no se verificó en ejecución que todos los artefactos se escriban exclusivamente al directorio permitido, ni la ausencia de datos sensibles/mezcla de suites.

## Resueltos (verificados este pass)
- [x] F-03 · criterio #3 — CLI de cobertura descubre 48 rutas, normalización `[id]`/optional catch-all verificada por tests, con origen/métodos; cero rutas no registradas. Rutas/estados/controles sin ejecución funcional quedan BLOCKED/UNCOVERED, no PASS.
- [x] F-12 · criterio #12 — ZIP válido comprobado con `unzip -t`, SHA coincide con sidecar y se verificó segunda exportación equivalente; manifiesto de 93 entradas contiene los reportes requeridos y excluye trace/HAR/storageState/DB.
- [x] F-13 · criterio #13 — `lucem-audit --help` funciona; opción desconocida devuelve no-cero; test de guard bloquea URL QA remota/staging-like antes de webServer y CLI de cobertura se ejecutó en modo de lectura.
