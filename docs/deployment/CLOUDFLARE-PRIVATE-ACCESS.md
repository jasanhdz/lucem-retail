# Cloudflare Tunnel + Access — publicación privada

## Estado actual

**BLOCKED — no existe publicación externa.** `cloudflared` no está instalado, no hay directorios/servicios `cloudflared`, no hay variables de credencial Cloudflare disponibles, no se proporcionó un dominio activo en Cloudflare ni lista explícita de correos de socios autorizados. Se confirmó salida DNS y conectividad TCP saliente a `region1.v2.argotunnel.com:7844`, que sólo demuestra conectividad de red; no acredita túnel, cuenta, dominio, Access, URL pública ni autenticación externa. No se instaló cloudflared, no se crearon DNS/túneles/rutas/reglas Access, no se abrieron puertos y no se inventó hostname.

## Orden requerido al habilitar

La documentación oficial indica que una aplicación self-hosted pública requiere un dominio activo en Cloudflare. Access debe crearse antes de la ruta del túnel: una ruta publicada sin Access queda disponible desde Internet. El orden es:

1. Propietario de cuenta confirma el dominio/zone activo y entrega los correos exactos de los socios, uno por uno. No autorizar un dominio de correo completo ni reglas Bypass.
2. En Zero Trust, crear Access Application tipo Self-hosted, añadir hostname autorizado, política Allow sólo para cada email explícito y asegurar denegación por defecto (las aplicaciones Access deniegan si no hay política Allow). Elegir IdP/código por correo y duración de sesión razonable; MFA si el IdP lo permite.
3. Habilitar Protect with Access / validación de token en el túnel/origin para rechazar solicitudes que intenten evadir Access. Conservar además el login Lucem y RBAC/membership.
4. Instalar cloudflared desde el repositorio oficial del sistema cuando el propietario apruebe; preferir túnel remoto administrado con token entregado al host por archivo/secrets de permisos restringidos, nunca por argumentos persistentes, chat, Git o logs. Configurar systemd con restart y token protegido.
5. Crear la ruta DNS sólo después de confirmar que Access está activo y la allow-list revisada; enrutar únicamente al listener web `http://192.168.1.117:3000` (o a la URL privada que resulte validada desde cloudflared). Mantener PostgreSQL sin publish y no compartir el túnel con SSH, n8n o puertos ajenos.
6. Establecer `LUCEM_ALLOWED_ORIGINS` con los orígenes exactos aprobados, incluyendo `https://<hostname-aprobado>` y, si se conserva acceso LAN, `http://192.168.1.117:3000`. No confiar en `X-Forwarded-*` del usuario; Cloudflare debe suministrar los valores de proxy. HSTS debe configurarse en el borde Cloudflare cuando el hostname/TLS quede activo.
7. Probar desde navegador y cliente externo: anónimo, email no listado y acceso directo al origin rechazados; email aprobado pasa Access y después el login Lucem; logout, cookies Secure/HttpOnly/SameSite, API, imágenes y aislamiento cross-business funcionan. Certificado HTTPS válido; postgres 5432 inaccesible; LAN local sigue disponible; `n8n_server` y listener 5678 conservan identidad/estado.

Cloudflare documenta una alternativa Quick Tunnel `trycloudflare.com` con uno o más `--allowed-mail` para OTP sin dominio/cuenta; la describe como temporal y para testing/desarrollo, URL cambia/revoca al parar y cualquier persona con URL empieza el challenge por email. No se eligió ni inició porque el objetivo seleccionado aquí es un dominio propio persistente con Access, `cloudflared` no está instalado y aún no se han suministrado emails. No abrir esa alternativa como sustituto silencioso de la configuración aprobada.

No crear una ruta o Quick Tunnel temporal pública para sustituir Access. Quick Tunnels están orientados a desarrollo y no resuelven el requisito persistente de hostname/domino y política de acceso para socios. Sin cuenta, dominio y lista autorizada, mantener todo bloqueado.

## Credenciales y DNS

El token/API credentials y tunnel token no se almacenan en `compose.staging.yml`, `.env.e2e`, documentos o Git. Provisionar el token en `/etc/cloudflared/` o secreto equivalente bajo directorio 0700/archivo 0600, propiedad del servicio que lo usa; evitar imprimirlo o inspeccionar Environment del proceso. No reutilizar credenciales de otros túneles/proyectos. No cambiar DNS de otros hostnames.

## Referencias oficiales

- [Cloudflare Tunnel — Get started](https://developers.cloudflare.com/tunnel/get-started/): prerequisitos de cuenta/dominio, crear túnel, crear ruta y comprobar servicio.
- [Cloudflare Access — Publish a self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/): Access application, deny by default, políticas, sesiones y Access antes de conectar el origen.
- La guía de Access recomienda validar token Access en el origin/Tunnel (Protect with Access) para impedir bypass por una ruta directa.

## Actualizaciones/rollback

El túnel sólo se configura en el host como servicio independiente y no cambia la publicación del PostgreSQL. Para actualizar Lucem, seguir `scripts/deploy-staging.sh`, hacer backup antes de migraciones, comprobar health y mantener los volúmenes PostgreSQL/uploads. Para rollback, recuperar la imagen anterior compatible con el esquema sin borrar ni reinicializar DB; confirmar que Access y túnel siguen en estado esperado. Nunca usar `docker system prune`, `down -v` o comandos que afecten n8n.
