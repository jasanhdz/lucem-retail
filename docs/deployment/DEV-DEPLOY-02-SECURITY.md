# DEV-DEPLOY-02 — Controles de seguridad

## Alcance y modelo de amenazas

Las cookies de sesión pueden ser enviadas automáticamente por el navegador. En métodos mutantes de `/api/*`, el middleware rechaza `Sec-Fetch-Site: cross-site` y un `Origin` no permitido. Sin configuración explícita, `Origin` debe coincidir exactamente con el protocolo y Host directos de la petición; una futura ruta tras proxy TLS debe configurar `LUCEM_ALLOWED_ORIGINS` con los orígenes exactos HTTP LAN y HTTPS público aprobados. No se confía en `X-Forwarded-*` para decidir el origen. Requests no navegador sin Origin conservan compatibilidad; los navegadores se protegen con Fetch Metadata y `SameSite=Lax`.

La cookie `lucem_session` mantiene `HttpOnly`, `SameSite=Lax`, `Path=/` y ventana idle de 30 minutos; en producción (`NODE_ENV=production`) se añade `Secure`. El único override sin `Secure` es `E2E_HTTP_LOOPBACK=true`, inyectado sólo por la configuración Playwright de seguridad ligada a loopback; nunca definirlo en despliegues. La prueba unitaria bajo `NODE_ENV=production` confirma `Secure`, y E2E loopback confirma el override aislado.

Los login fallidos se limitan por email normalizado: cinco fallos en una ventana de 15 minutos. Las contraseñas de usuarios inexistentes se comparan con un hash ficticio para reducir diferencias de tiempo; el status/cuerpo genérico `401 Credenciales invalidas` coincide para email ausente, contraseña errónea e intentos limitados. El mapa tiene máximo 4096 claves y elimina claves expiradas/antiguas. Esta es protección básica por proceso: el estado se pierde al reiniciar/no se replica y cinco fallos pueden bloquear esa cuenta hasta expirar la ventana. Antes de publicar se requieren Cloudflare Access y reglas de rate limiting/WAF aprobadas; no es limitación distribuida.

## Cabeceras

Todas las respuestas incluyen `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` y CSP `frame-ancestors 'none'`. Esta CSP sólo proporciona protección anti-frame, no una política completa de ejecución de scripts. HSTS/TLS del hostname público aún no está configurado; Cloudflare no se habilita sin Access/dominio aprobados.

## Inventario de endpoints y autorización

`401` = falta sesión/negocio activo; `403` = rol/pertenencia no autorizado; `404` = recurso no existe o no pertenece al negocio activo. Todos los métodos no seguros `/api/*` pasan por middleware CSRF Origin/Fetch Metadata. Todo GET de negocio requiere sesión y limita el query a `auth.business.id` salvo `GET /api/businesses`, que lista sólo memberships del propio usuario.

| Ruta y método | Acceso esperado |
| --- | --- |
| `/api/auth/register` POST | Público; valida campos; no serializa hash |
| `/api/auth/login` POST | Público; mensaje 401 genérico, limitador por email |
| `/api/auth/logout` POST | Sesión opcional; revoca sesión propia; idempotente |
| `/api/businesses` GET | Sesión; sólo memberships del usuario |
| `/api/businesses` POST | Sesión; crea negocio propio + membresía ADMIN; idempotencia |
| `/api/businesses/select` POST | Sesión; businessId debe pertenecer a membership propia (403 si no) |
| `/api/categories` GET | Sesión + negocio activo; sólo categorías del negocio |
| `/api/products` GET, `/api/products/[id]` GET, `/api/products/[id]/history` GET | Sesión + negocio activo; recurso ajeno no visible (404/vacío) |
| `/api/products` POST; `/api/products/[id]` PUT/DELETE | ADMIN o INVENTORY_MANAGER; categorías/IDs del negocio; delete archiva |
| `/api/products/image` POST | ADMIN o INVENTORY_MANAGER; upload asociado a business id |
| `/api/products/image/[filename]` GET | Sesión + negocio activo; filename nuevo exige mismo business; UUID legacy requiere referencia en Product.photoPath del negocio |
| `/api/inventory` GET, `/api/inventory/movements` GET | Sesión + negocio activo; movimiento filtrado por businessId |
| `/api/inventory` POST, `/api/inventory/movements` POST | ADMIN o INVENTORY_MANAGER; variant debe pertenecer al negocio; operación transaccional |
| `/api/sales` GET/POST, `/api/sales/[id]` GET | Sesión + negocio activo; checkout según contrato actual, sale ajena 404 |
| `/api/sales/[id]/cancel` POST | ADMIN o membership `canCancelSales`; confirmación y motivo obligatorios; sale ajena 404 |
| `/api/reservations` GET | Sesión + negocio activo |
| `/api/reservations` POST, `/api/reservations/[id]` POST/PATCH, `/api/reservations/expire` POST | ADMIN o INVENTORY_MANAGER; recurso/variant del negocio; depósito positivo nuevo rechazado; históricos requieren revisión |
| `/api/returns` GET | Sesión + negocio activo |
| `/api/returns` POST | ADMIN o INVENTORY_MANAGER; venta/líneas del negocio; importe validado contra líneas; transacción serializable |
| `/api/dashboard`, `/api/reports/sales`, `/api/reports/export.csv`, `/api/reports/export.xlsx` GET | Sesión + negocio activo; salida y filtros acotados al negocio |
| `/api/audit` GET | Sólo ADMIN con negocio activo; query limitada a ese negocio y campos allowlist |

Pantallas `/login`, `/registro` y shell de selección/creación de negocio son parte del onboarding autenticado según contrato; `/dashboard`, `/productos`, `/inventario`, `/pos`, `/apartados`, `/devoluciones`, `/reportes`, `/auditoria`, perfil y tickets dependen de sesión/negocio activo en layout/handlers. Los estados y permisos de navegación no sustituyen la autorización server-side de la matriz anterior.

## Auditoría, sesiones, roles y API

La alerta histórica `GET /api/audit exposes passwordHash` se investigó contra el HEAD actual. El fix `eae053c` ya está presente: Prisma proyecta explícitamente campos de AuditLog y del actor (`id`, `name`, `email`, `active`) y excluye `passwordHash`, `tokenHash`, tokens, cookies y relaciones de sesión. El E2E real ejecutó `/api/audit` sin sesión (401), como SELLER/INVENTORY_MANAGER (403) y ADMIN (200), y recorrió la respuesta JSON recursivamente para detectar campos sensibles; confirmó aislamiento Centro/Norte. Por tanto el hallazgo histórico está corregido, no es una vulnerabilidad actual.

Se detectó y corrigió una falla adicional de autorización en imágenes: el GET autenticaba usuarios pero no restringía el archivo al negocio activo. Las nuevas cargas incorporan el ID del negocio activo al filename (`businessId_UUID.ext`) y el GET compara el ID con la sesión antes de leerlo; las rutas UUID legacy sólo responden si un `Product` del negocio activo las referencia en `photoPath`. El E2E comprobó lectura 200 desde Centro y 404 desde Norte para la misma imagen; el archivo temporal se eliminó.

La sesión persiste el hash SHA-256 del token aleatorio; el valor plano sólo se entrega en cookie. Las rutas comerciales conservan las comprobaciones existentes de sesión, rol, membresía y `businessId`. No se alteraron reglas de venta/devolución ni la semántica de anticipos.

## Verificaciones

- `npm run lint`, `npm run typecheck`, `npm test` (32 tests), `npm run build`, `npx prisma validate` y `git diff --check`: PASS.
- PostgreSQL E2E loopback: seguridad 10/10, inventario 6/6, POS 7/7, reservas 9/9, devoluciones 7/7, journey comercial 1/1 y DEV-10 lifecycle/atomicity 5/5; **45 E2E PASS**.
- Limpieza final de E2E: suma de filas en 18 tablas de aplicación igual a cero.
- Cloudflare Tunnel/Access permanece BLOCKED; no se creó hostname, DNS ni ruta pública.

## Riesgo residual

El limitador de login es por email en memoria de una instancia, no por IP ni distribuido. No debe considerarse suficiente para una publicación abierta; el hostname remoto permanece bloqueado hasta Access deny-by-default, allow-list individual y protección WAF/rate-limit en Cloudflare. No exponer el origen directamente ni aceptar encabezados `X-Forwarded-*` arbitrarios.
