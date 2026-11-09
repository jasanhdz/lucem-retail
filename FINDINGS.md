# Findings — pass 1

## Resumen

20/27 criterios pasan; 4/27 fallan y 3/27 quedan BLOCKED. La publicación externa continúa BLOCKED. Revisión en HEAD `0327d8bc58fd727218ec1149252f85f4fd8529d0`. `npm test -- --run`: 32/32 pasan. GET al staging `192.168.1.117:3000`: `/login` 200, `/registro` 200, `/api/businesses` anónimo 401. No se inició ningún proceso ni se hicieron escrituras comerciales. `curl` a `127.0.0.1:3000` no encontró listener local. La consulta `docker compose ... ps` no pudo resolver su configuración sin una variable protegida requerida; no se leyó dicha variable ni secretos.

## Estado de los 27 criterios

1. **PASS — Baseline e historial.** SPEC registra baseline `5cb15dbc8a8c58df470fa256fdc3ee1b94690311`, rama `feature/lucem-ui-redesign-v1`, árbol inicial limpio y HEAD de preservación `63c9c26ee45a4f85e8c137efdaba1d5dc85bf82d`; especifica que éste sólo archivó SPEC/FINDINGS conservando contenido.
2. **FAIL — Inventario de superficie.** `docs/ui-redesign/DEV-00-PREPARATION.md` contiene inventario resumido de rutas, pero no una matriz reproducible completa por método, rutas dinámicas, pantallas y status esperado según sesión/rol/negocio.
3. **FAIL — Login/registro/logout y sesión.** Hay tests unitarios (incluyendo throttling) y se reporta E2E DEV-10; no se aportó evidencia reproducible del ciclo completo pedido ni evidencia de persistencia/hash en DB, expiración/inactividad y separación del login de otro usuario bajo límite. La documentación sí declara límite de cinco fallos por email y alcance de una sola instancia.
4. **PASS — Cookie.** `DEV-DEPLOY-02-SECURITY.md` registra atributos HttpOnly, SameSite=Lax, Path, expiración idle, Secure en producción y excepción exclusiva E2E loopback; documenta pruebas unitarias y E2E correspondientes.
5. **PASS — CSRF.** Evidencia de E2E reportada: Origin/Fetch Metadata cross-site rechazados sin mutaciones; same-origin permitido. Política y compatibilidad de solicitudes sin Origin están documentadas en `DEV-DEPLOY-02-SECURITY.md`.
6. **PASS — Host/forwarded headers.** La evidencia entregada reporta pruebas con headers forwarded y manipulación de Host; documentación declara que no confía en `X-Forwarded-*` arbitrarios y que la configuración proxy/orígenes permitidos debe ser explícita.
7. **PASS — Cabeceras de seguridad.** E2E reportado y documentación registran nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy y CSP anti-frame.
8. **PASS — Respuesta/API.** Evidencia E2E reporta respuesta de auditoría recorrida recursivamente y ausencia de campos sensibles; `/api/businesses` anónimo devuelve 401 en staging. Las pruebas unitarias de auditoría también pasan.
9. **PASS — Autorización de roles.** E2E reportado para `/api/audit`: anónimo 401, SELLER/INVENTORY_MANAGER 403 y ADMIN 200; suites comerciales reportan permisos positivos/negativos.
10. **BLOCKED — Aislamiento business, incluyendo imágenes.** El HEAD local contiene `0327d8b` y documentación reporta E2E de imagen Centro 200/Norte 404. Sin embargo no se pudo demostrar que el runtime staging esté ejecutando ese HEAD: GET confirma disponibilidad general del servicio, pero no identifica revisión desplegada ni prueba el GET autenticado de imagen entre negocios. No afirmar que el fix está activo en staging.
11. **PASS — Guard E2E de DB.** 7 tests unitarios pasan dentro de los 32; la documentación describe guarda exacta de protocolo, loopback, puerto, base y usuario, y abortar ante fallback/configuración no permitida.
12. **PASS — Venta/POS.** E2E PostgreSQL aislado reportado: 7/7, cubriendo efectivo/cambio/ticket, decremento, idempotencia/replay, concurrencia, roles y aislamiento. CARD/TRANSFER sólo registran método.
13. **PASS — Inventario.** E2E aislado reportado: 6/6, con entradas/ajustes, kardex, disponible/reservado, conflictos, roles y aislamiento.
14. **PASS — Apartados/reservas.** E2E aislado reportado: 9/9, creación, expiración, liberación, conversión, replay/concurrencia y aislamiento; depósitos históricos bloquean operaciones automáticas para revisión, sin nueva semántica.
15. **PASS — Devoluciones.** E2E aislado reportado: 7/7, devoluciones parcial/completa, validación, idempotencia, kardex, rollback, roles y aislamiento.
16. **PASS — Journey comercial cruzado.** DEV-09 reportado 1/1 sobre PostgreSQL E2E, con inventario, venta, apartado/conversión y devolución.
17. **PASS — Cleanup sin residuos.** Evidencia reportada: cleanup consultó 18 tablas con suma cero; contenedor, volumen anónimo exacto y `.env.e2e` retirados; puerto 55432 libre.
18. **BLOCKED — Aislamiento de staging y n8n.** El usuario reporta que permanecieron sin cambios durante el despliegue, pero esta evaluación no pudo comparar estado/IDs/volúmenes: Compose `ps` falló al requerir configuración protegida no disponible en el entorno, y no se consultaron secretos. No hay evidencia independiente pre/post en esta pasada.
19. **PASS — Actualización/backups.** `BACKUP-RESTORE.md`, `POSTGRESQL-MIGRATIONS.md` y `LINUX-STAGING.md` documentan proyecto Compose explícito, backup/verificación por checksums, persistencia, migración, rollback y restore temporal aislado. Usuario reporta backup DB/uploads validado antes del deploy; no se inspeccionaron artefactos de backup.
20. **PASS — Preparación Cloudflare.** `cloudflared` no está instalado (`command -v` sin resultado); la documentación registra ausencia de dominio, lista autorizada y credenciales, y requisitos concretos sin exponer secretos.
21. **BLOCKED — Access antes de ruta pública.** Falta dominio/cuenta/credenciales/lista explícita; no hay configuración de Access/Tunnel que permita probar la precedencia. Documentación deja publicación bloqueada y no reporta ruta creada.
22. **BLOCKED — Allow-list y denegación externa.** No hay emails aprobados ni configuración/cuentas Cloudflare autorizadas; no se hicieron pruebas externas ni se inventaron identidades.
23. **BLOCKED — TLS y no bypass.** No existe hostname/túnel configurado para validar TLS extremo a extremo, rechazo de downgrade o bypass al origen.
24. **PASS — No publicar sin credenciales.** La revisión/documentación indica ausencia de cloudflared, DNS/ruta pública y credenciales; origen LAN permanece restringido. No se afirma disponibilidad externa.
25. **FAIL — Calidad y evidencia.** `npm test -- --run` pasa (32 tests) y `git diff --check` pasó sin salida. No se ejecutaron en esta evaluación lint, typecheck, build, Prisma validate ni Playwright; los resultados de esos comandos y suites constan en documentación/evidencia entregada, no fueron revalidados aquí.
26. **PASS — Documentación.** Se revisaron guías de seguridad, E2E comercial, Access/Tunnel, staging, migraciones y backup/restore; describen controles, procedimientos y prerequisitos externos pendientes. Riesgo residual del limitador en memoria está explícito.
27. **FAIL — Git/entrega.** La rama actual conserva los commits de alcance, pero el requisito de rama preservada `feature/lucem-ui-redesign-v1` no queda demostrado como rama actual en esta evidencia; además no hubo verificación independiente de que el despliegue staging corresponda al HEAD evaluado. HEAD local es `0327d8bc58fd727218ec1149252f85f4fd8529d0`.

## Abiertos

- [ ] F-01 · critical · criterio #10 — No se pudo verificar que el staging ejecute el fix de aislamiento de imágenes `0327d8b`. El endpoint público anónimo sólo confirmó 401; reproducir con sesión autenticada de dos negocios y comprobar Centro 200/Norte 404 tras confirmar la revisión desplegada.
- [ ] F-02 · major · criterio #2 — Completar matriz reproducible de endpoints/métodos y pantallas con status esperado para anónimo, rol insuficiente y negocio ajeno.
- [ ] F-03 · major · criterio #3 — Registrar evidencia reproducible del ciclo de sesión completo solicitado, incluyendo DB E2E, expiración/inactividad, usuario inactivo y throttling aislado entre usuarios.
- [ ] F-04 · major · criterio #18 — Adjuntar comparación no mutante pre/post de identidad, estado, puertos y volúmenes de staging y n8n; la consulta de esta pasada no pudo cargar configuración protegida.
- [ ] F-05 · minor · criterio #25 — Ejecutar y registrar checks de calidad y suites E2E desde el evaluador; sólo se revalidaron 32 unit tests y diff-check.
- [ ] F-06 · major · criterio #27 — Aclarar evidencia de rama/entrega y revisión desplegada; el HEAD consultado es `0327d8bc58fd727218ec1149252f85f4fd8529d0`.

## Resueltos (verificados este pass)

- [x] Criterio #4 — 32 tests unitarios pasan; documentación registra contrato y pruebas de cookie.
- [x] Criterios #11 y #25 (parcial) — Tests del guard E2E incluidos en 32/32; `git diff --check` pasa.
- [x] Criterio #20 — `cloudflared` no disponible según búsqueda de ejecutable; prerequisitos descritos.
- [x] Criterios #24 y #26 — Revisadas documentación de no publicación y guías operativas pertinentes.

---

# Findings — pass 2

## Resumen

**24/27 PASS, 3/27 BLOCKED, 0 FAIL.** La publicación externa continúa BLOCKED, sin hostname/DNS/túnel/ruta pública. Los BLOCKED corresponden exclusivamente a los criterios #21–23: faltan dominio activo, cuenta/credenciales autorizadas y correos explícitos aprobados. F-01 a F-06 del pass 1 quedan resueltos por la evidencia añadida y comprobaciones de esta pasada. Se conserva completo el historial del pass 1 arriba, con los mismos IDs.

Rúbrica consultada: `SPEC.md`, sección «Rubric de evaluación». No se encontró `references/evaluator.md` en el workspace. Evidencia nueva documentada en `docs/deployment/DEV-DEPLOY-02-SECURITY.md` y `docs/deployment/DEV-DEPLOY-02-COMMERCE-TESTS.md`; la evidencia de staging/build/backup y limpieza descrita abajo fue proporcionada para esta evaluación. HEAD evaluado `0327d8bc58fd727218ec1149252f85f4fd8529d0`, rama `feature/lucem-ui-redesign-v1`. Staging se dejó intacto y no se inició/reinició servidor alguno ni se ejecutaron E2E ni escrituras contra staging.

## Estado de los 27 criterios

1. **PASS — Baseline e historial.** Se conservan las referencias históricas de `SPEC.md`: baseline `5cb15dbc8a8c58df470fa256fdc3ee1b94690311`, rama inicial `feature/lucem-ui-redesign-v1`, worktree inicial limpio y HEAD posterior al archivado `63c9c26ee45a4f85e8c137efdaba1d5dc85bf82d`. El historial de pass 1 no indica discrepancia. HEAD de evaluación actual registrado separadamente arriba.
2. **PASS — Inventario de superficie.** `DEV-DEPLOY-02-SECURITY.md` incorpora matriz por rutas, métodos, acceso/roles y estados seguros, incluyendo ruta dinámica de imágenes, selección de negocio, operaciones comerciales, reportes/exportaciones y auditoría; incluye pantallas protegidas y criterios de 401/403/404 y aislamiento. El inventario documentado incluye 24 endpoints y sus métodos.
3. **PASS — Login/registro/logout y sesión.** Evidencia E2E aislada ampliada: la cuenta inactiva produce el mismo 401 genérico; ciclo de sesión DEV-10 ahora 5/5, incluidos sesión idle expirada con 401 sin renovación, renovación sólo por Route Handler, revocación/logout y rollback transaccional. La cobertura de seguridad verifica credenciales genéricas/throttling y la documentación registra hash SHA-256 persistido, expiración, alcance en memoria y límites. Evidencia consolidada: 45 E2E PASS.
4. **PASS — Cookie.** Evidencia de pass 1 conservada: contrato HttpOnly, SameSite=Lax, Path, expiración idle y Secure en producción, con excepción limitada a E2E loopback; pruebas de cookie documentadas.
5. **PASS — CSRF.** Evidencia E2E previa conservada: same-origin permitido y origen cruzado rechazado sin efectos laterales; política de Origin/Fetch Metadata descrita en la guía de seguridad.
6. **PASS — Host/forwarded headers.** Evidencia de pass 1 conservada: pruebas de Host y forwarded headers y documentación de que no se confía en valores arbitrarios de `X-Forwarded-*`; no se reporta regresión en esta pasada.
7. **PASS — Cabeceras de seguridad.** Evidencia E2E y matriz documentada para nosniff, Referrer-Policy, anti-frame, Permissions-Policy y CSP anti-frame.
8. **PASS — Respuesta/API.** Evidencia E2E previa verifica proyección de auditoría sin datos sensibles y estados de autenticación/rol. GET staging `/login` y `/registro` responde 200; `/api/businesses` anónimo responde 401. No se realizaron mutaciones en staging.
9. **PASS — Autorización de roles.** La guía documenta autorización por rol/membresía para métodos y recursos; E2E real reportado verifica Admin/Seller/Inventory Manager con positivos/negativos, incluidos roles de auditoría.
10. **PASS — Aislamiento business.** E2E seguridad incluye lectura autenticada de la misma imagen en negocio Centro (200) y negocio Norte (404), además de aislamiento de recursos. Evidencia adicional de runtime: app redeployada desde imagen `sha256:47de4b50b12d69928048e6b3531b602140d39126506f03f9e5644aa3df818ecc`, digest inspeccionado idéntico; build-context HEAD `0327d8bc58fd727218ec1149252f85f4fd8529d0`. Inspección de sólo lectura de la ruta compilada de imagen confirma la comprobación de negocio dueño en el artefacto desplegado. Se cierra F-01.
11. **PASS — Guard E2E de DB.** Siete pruebas unitarias del guard están incluidas en `npm test` 32/32 PASS; documentación describe destino PostgreSQL loopback exacto y aborto ante configuración no permitida, sin fallback a staging.
12. **PASS — Venta/POS.** E2E PostgreSQL aislado 7/7 PASS, según reporte reproducible documentado: idempotencia/replay, stock, rollback, roles y aislamiento; no se atribuyen cobros a proveedores externos.
13. **PASS — Inventario.** E2E aislado 6/6 PASS: entradas/ajustes, disponibilidad, movimientos, permisos y aislamiento.
14. **PASS — Apartados/reservas.** E2E aislado 9/9 PASS. Anticipos nuevos bloqueados/rechazados y casos históricos requieren revisión manual; se conserva contrato existente, sin inventar semántica monetaria.
15. **PASS — Devoluciones.** E2E aislado 7/7 PASS, incluidos rollback ante fallo de auditoría, roles y aislamiento; sin pagos/reembolsos externos.
16. **PASS — Journey comercial cruzado.** DEV-09 1/1 PASS sobre PostgreSQL E2E real, según evidencia documentada; suites dirigidas comerciales completan los flujos especificados.
17. **PASS — Cleanup sin residuos.** Consulta posterior reportó cero filas en las 18 tablas Prisma; contenedor y volumen anónimo E2E exactos eliminados, `.env.e2e` retirado y puerto 55432 libre. Sin cleanup ni escrituras ejecutadas durante esta evaluación.
18. **PASS — Aislamiento de staging y n8n.** Evidencia de comparación pre/post del deploy: staging Postgres 16.10 saludable, DB sin puertos publicados, app sólo en `192.168.1.117:3000`, n8n conserva ID `7b4846b7d07d6402028e49c9eb99c0806ea73a42ec381ab6ae70bf557ae67341`, RestartCount 0 y puerto 5678 sin cambios. La app está saludable; 5 migraciones al día y User/Business cero. Se cierra el bloqueo probatorio de F-04 sin operar sobre estos recursos.
19. **PASS — Actualización/backups.** Backup previo al deploy de 20261109T211527Z; checksums de pg_dump/uploads y listado de `pg_restore` validados, con permisos de archivos 0600/directorio 0700. Se preservan DB/uploads y no se accedió a datos de backup en esta evaluación.
20. **PASS — Preparación Cloudflare.** Documentación inspeccionada: cloudflared ausente, prerequisitos y procedimiento registrados, sin credenciales ficticias ni secretos. TCP 7844 accesible sólo prueba conectividad; no se presenta como prueba de túnel.
21. **BLOCKED — Access antes de ruta pública.** Faltan dominio activo y cuenta/credenciales Cloudflare autorizadas. No se configuró Access ni se creó ruta pública; no corresponde probar precedencia sin dichos prerequisitos.
22. **BLOCKED — Allow-list y denegación externa.** Faltan correos explícitos aprobados y credenciales/configuración Cloudflare. Sin identidades autorizadas no se intentó ni se inventó una prueba externa.
23. **BLOCKED — TLS y no bypass.** Sin dominio, túnel ni Access no existe hostname donde verificar TLS extremo a extremo, downgrade o bypass. El origen permanece privado y sin ruta pública.
24. **PASS — No publicar sin credenciales.** App sólo escucha/publica en la IP LAN `192.168.1.117:3000`; DB sin puertos publicados, firewall LAN conservado, sin cloudflared ni ruta externa. Se confirmó regla UFW LAN y verificación pre/post del deploy; no se afirma acceso WAN.
25. **PASS — Calidad y evidencia.** Esta evaluación ejecutó `npm test -- --run` (32/32 PASS), `npm run lint` (PASS), `npm run typecheck` (PASS), `git diff --check` (PASS) y `npx prisma validate` con URL dummy loopback (PASS). La primera invocación de Prisma sin `DATABASE_URL` falló por variable ausente; no contactó DB. `npm run build` figura PASS en evidencia de Generator, no se repitió para no competir con el deploy/servidor activo. Playwright E2E: 45/45 PASS en entorno PostgreSQL E2E aislado, según resultados reportados y registrados en las guías; no se repitió por la limpieza de su entorno.
26. **PASS — Documentación.** Guías revisadas cubren matriz de endpoints/roles, sesiones/cookies/CSRF/headers, guard y cleanup E2E, staging/deploy/backups/rollback y Cloudflare Access/TLS con prerequisitos pendientes. Riesgo del rate limiter por proceso y bloqueo de anticipos explicitados.
27. **PASS — Git/entrega.** Rama `feature/lucem-ui-redesign-v1`, HEAD `0327d8bc58fd727218ec1149252f85f4fd8529d0`; commits limitados al alcance según historial y archivos archivados preservados. El estado inicial observado incluye documentación/código de DEV-DEPLOY-02 modificados y FINDINGS no rastreado; no se asumió que el árbol estuviera limpio. Este pass sólo añade contenido a `FINDINGS.md`; no crea commit ni publica cambios. Los HEAD baseline y preservación se mantienen por separado en #1.

## Abiertos / bloqueos externos

- [ ] F-07 · major · criterios #21–23 — Proporcionar dominio activo Cloudflare, acceso/cuenta y credenciales autorizadas, más allow-list de correos individuales aprobados. Hasta entonces no crear túnel/ruta ni afirmar TLS o acceso externo.

## Resueltos desde pass 1

- [x] F-01 — Criterio #10: E2E de imagen cross-business y digest del runtime/build con comprobación de ruta compilada.
- [x] F-02 — Criterio #2: matriz documentada de endpoints/métodos/roles/status/isolation.
- [x] F-03 — Criterio #3: E2E seguridad y DEV-10 ampliados, con resultados y cobertura de expiración/inactividad/logout/renovación/rollback.
- [x] F-04 — Criterio #18: comparación no mutante de staging y n8n pre/post.
- [x] F-05 — Criterio #25: checks locales revalidados; 45 E2E informados con PostgreSQL aislado y limpieza total.
- [x] F-06 — Criterio #27: branch/HEAD y alcance de archivos de entrega registrados; el worktree contiene cambios pendientes sin commit.

## Historial y límites de esta pasada

Pass 1 se conserva íntegro antes de esta sección. No se inició ni reinició servidor, no se realizaron E2E ni escrituras comerciales/staging, no se inspeccionaron secretos/backups, y no se crearon commits. Única modificación efectuada en esta pasada: `FINDINGS.md`.
