# DEV-DEPLOY-03 — Quick Tunnel beta pública

Este procedimiento publica sólo la app de Lucem Retail con un Cloudflare Quick Tunnel temporal. No configura cuenta Cloudflare, token, Access, correo permitido, dominio, DNS ni router. La URL es pública y cambia cuando se crea otro túnel.

## Recomendación de hardening posterior

El estado UFW reportado para esta fase mantiene SSH/22 y RDP/3389 permitidos desde cualquier origen; estas reglas no se cambian aquí. En una ventana administrativa separada, se recomienda restringirlos a los CIDR/IP de administración aprobados. Para evitar perder acceso, conserva una sesión administrativa activa o consola local, añade y verifica primero la regla restringida, prueba una segunda sesión desde el origen permitido y sólo entonces retira la regla amplia. Define una vía de recuperación/rollback antes de aplicar el cambio y no hagas cambios remotos sin confirmar que el nuevo acceso funciona.

## Requisitos de inicio

No instalar ni iniciar el servicio hasta confirmar todos estos puntos:

1. El despliegue está en la rama y SHA aprobados; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npx prisma validate` y las suites E2E relevantes pasan usando exclusivamente `lucem_retail_e2e` en `127.0.0.1:55432`.
2. Existe un backup reciente de `lucem_staging` y de `public/uploads/products`, con checksum válido, `pg_restore --list` válido y restore ensayado en PostgreSQL temporal sin red.
3. Se confirmó que el puerto de origen sólo está publicado en la IP LAN prevista; PostgreSQL sigue privado y `n8n_server`/5678 permanece intacto. Una verificación independiente desde WAN confirma que el origen no es alcanzable directamente. Si no puede demostrarse esta frontera, detener el procedimiento.
4. Los límites persistentes de registro, login, uploads, almacenamiento, negocio/producto y escrituras comerciales están activos y probados. Cuando la app no distingue una solicitud recibida por Cloudflare, no se debe confiar en cabeceras `CF-*` suministradas por el cliente.
5. Se verificó espacio libre superior al piso configurado, CSRF same-origin sobre HTTPS, aislamiento por negocio y autenticación/cookies seguras.

El script `scripts/deploy-staging.sh` exige un árbol Git limpio; no omitir esa condición ni reemplazar el preflight. La migración `0006` sólo se aplica a staging después del backup y de migraciones E2E exitosas. Ningún seed/cleanup E2E puede apuntar a staging.

## Instalar `cloudflared` desde APT oficial

Primero compruebe la distribución y que los archivos/repositorio de Cloudflare no existan ya. Use el codename real de Ubuntu en el repositorio y siga las instrucciones vigentes del [repositorio oficial de Cloudflare](https://pkg.cloudflare.com/):

```bash
sudo install -d -m 0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update
sudo apt-get install cloudflared
cloudflared --version
```

No instale una segunda definición si ya hay un repositorio/key equivalente. Use sólo el canal estable.

## Validar una ejecución manual

La interfaz de app debe estar saludable en el origen LAN autorizado (actualmente `http://192.168.1.117:3000`). Después de aprobar los requisitos anteriores y antes del primer request público, establezca `CLOUDFLARE_QUICK_TUNNEL_ENABLED=true` en la configuración protegida y recree sólo la app para habilitar el manejo de origen HTTPS/headers Cloudflare. El registro responde con límites persistentes, anti-enumeración y sin sesión automática; si cualquiera de esos controles deja de funcionar, detenga el túnel. En una consola de diagnóstico, ejecute únicamente:

```bash
cloudflared tunnel --no-autoupdate --url http://192.168.1.117:3000
```

Obtenga la URL `https://….trycloudflare.com` impresa en el arranque actual y compruebe HTTPS desde un cliente externo independiente. Verifique `/login` y `/registro` con HTTP 200, una API protegida anónima con 401, cookie `Secure; HttpOnly; SameSite=Lax` tras login, CSRF, aislamiento de dos negocios y acceso privado a imágenes. Confirme desde WAN que la IP/puerto de origen no responden directamente.

No inicie el túnel hasta haber demostrado que el edge añade/sobrescribe las cabeceras de frontera esperadas y que clientes LAN/directos no pueden suplantar ese contexto. Si una prueba falla o la identidad de proxy no es verificable, interrumpa sólo `cloudflared` con Ctrl-C; no inicie el unit persistente.

### Registro de prueba manual — 2026-11-10

Cloudflared `2026.10.7`, proceso manual PID `87365`, creó la URL temporal `https://scholarship-middle-springer-lite.trycloudflare.com` el `2026-11-10T22:38:23Z`. `curl` desde el servidor verificó TLS (`ssl_verify_result=0`), login/registro 200, API e imagen privada anónimas 401, same-origin POST 401 sin sesión y cross-origin POST 403. Una solicitud HTTP independiente vía WebFetch alcanzó `/login` y `/registro`; las APIs de negocio e imagen respondieron 401. En pruebas de sesión a través de HTTPS se creó un usuario y dos negocios sintéticos; login devolvió 200 con cookie `Secure; HttpOnly; SameSite=Lax`, selección same-origin funcionó, las categorías quedaron aisladas por negocio, la imagen cruzada devolvió 404, la mutación cross-origin devolvió 403 y logout devolvió 200. Usuario, sesiones, auditorías, negocios y categorías se eliminaron y su ausencia se verificó. La verificación externa cubrió páginas públicas y rechazo anónimo de APIs, pero no se probó desde un dispositivo móvil independiente ni se envió un registro público válido a staging. El proceso es manual, no systemd; la URL sólo es vigente mientras el PID actual siga activo y responda, y puede cambiar tras reinicio.

### Estado del servicio systemd — 2026-11-10

El unit `lucem-retail-quick-tunnel.service` está enabled/active desde `2026-11-10T23:02:19Z`, PID `97758`, ejecutando `cloudflared 2026.10.7` como usuario dinámico y sin acceso al socket Docker. La URL actual del journal de este arranque es `https://mark-str-international-easter.trycloudflare.com`. Curl verificó TLS, login/registro 200 y APIs privadas anónimas 401; WebFetch externo alcanzó las páginas y recibió 401 de las APIs. La sesión HTTPS con fixtures sintéticos (login/cookie segura/tenant/CSRF/logout) también pasó y los fixtures se limpiaron.

El unit ya instalado aún corresponde a la definición anterior sin espera explícita de la app. La versión vigente en el repositorio incorpora `ExecStartPre` que espera hasta 60 segundos a que `/login` responda 200; `systemd-analyze verify` pasa. Para aplicar esa mejora al servicio instalado, un administrador debe ejecutar `sudo install -o root -g root -m 0644 deploy/systemd/lucem-retail-quick-tunnel.service /etc/systemd/system/lucem-retail-quick-tunnel.service`, `sudo systemctl daemon-reload` y `sudo systemctl restart lucem-retail-quick-tunnel.service`. El reinicio generará o recuperará una URL nueva; consultar siempre el journal del arranque actual. No se verificó desde un dispositivo móvil independiente ni se probó un reinicio real del servidor.

## Unit dedicado

El archivo versionado [`../../deploy/systemd/lucem-retail-quick-tunnel.service`](../../deploy/systemd/lucem-retail-quick-tunnel.service) apunta sólo al origen web de Lucem. Instálelo y habilítelo únicamente después de que el Evaluator haya aprobado todos los bloqueos y la verificación HTTPS independiente haya pasado:

```bash
sudo install -o root -g root -m 0644 deploy/systemd/lucem-retail-quick-tunnel.service /etc/systemd/system/lucem-retail-quick-tunnel.service
sudo systemctl daemon-reload
sudo systemctl enable --now lucem-retail-quick-tunnel.service
sudo systemctl is-active lucem-retail-quick-tunnel.service
sudo journalctl -u lucem-retail-quick-tunnel.service -b --no-pager
```

La URL sólo es vigente si el unit está activo y una prueba HTTPS externa independiente termina con éxito. Recupérela del journal del arranque actual; no reutilice una URL de un arranque previo. No copie cookies, tokens, secretos ni datos comerciales a reportes.

Para apagar/revertir la exposición pública, detenga únicamente el unit:

```bash
sudo systemctl disable --now lucem-retail-quick-tunnel.service
sudo systemctl is-active lucem-retail-quick-tunnel.service || true
```

Verifique que la URL deje de responder y que la app LAN, PostgreSQL, uploads y `n8n_server` continúen igual. No detenga Compose ni cambie firewall, puertos o volúmenes como parte de esta reversión.

## Documentación oficial

- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)
- [Cloudflare APT packages](https://pkg.cloudflare.com/)
