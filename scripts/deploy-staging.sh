#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { printf '%s\n' 'ERROR: run from inside the Git repository.' >&2; exit 1; }
cd "$ROOT"
PROJECT=lucem-retail-staging
COMPOSE=(docker compose -p "$PROJECT" -f compose.staging.yml)
fail() { printf 'BLOCKED: %s\n' "$1" >&2; exit 1; }

[[ "$(uname -s)" == Linux ]] || fail 'deployment requires Linux/Ubuntu.'
[[ -r /etc/os-release ]] && . /etc/os-release
[[ "${ID:-}" == ubuntu ]] || fail 'deployment requires Ubuntu.'
docker info >/dev/null 2>&1 || fail 'Docker Engine is unavailable or user lacks permission.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is unavailable.'
[[ "$(git branch --show-current)" == feature/lucem-ui-redesign-v1 ]] || fail 'current branch must be feature/lucem-ui-redesign-v1.'
[[ -z "$(git status --porcelain --untracked-files=all)" ]] || fail 'Git worktree must be clean; preserve and commit or stash existing changes first.'
[[ -f .staging/config ]] || fail 'create .staging/config per docs/deployment/LINUX-STAGING.md.'
[[ -f .staging/db_password ]] || fail 'create .staging/db_password per docs/deployment/LINUX-STAGING.md.'
[[ "$(stat -c '%a' .staging)" == 700 ]] || fail '.staging directory must have mode 0700.'
[[ "$(stat -c '%a' .staging/config)" == 600 && "$(stat -c '%a' .staging/db_password)" == 600 ]] || fail 'staging config and password must have mode 0600.'
[[ "$(git check-ignore .staging/config .staging/db_password | wc -l)" -eq 2 ]] || fail 'local staging secrets are not ignored by Git.'
# shellcheck disable=SC1091
set -a
source .staging/config
set +a
[[ "${STAGING_DB_PASSWORD:-}" =~ ^[A-Za-z0-9_-]{32,}$ ]] || fail 'STAGING_DB_PASSWORD must contain at least 32 URL-safe characters.'
[[ "${SESSION_SECRET:-}" =~ ^[A-Za-z0-9_-]{32,}$ ]] || fail 'SESSION_SECRET must contain at least 32 URL-safe characters.'
db_password="$(<.staging/db_password)"
[[ "$STAGING_DB_PASSWORD" == "$db_password" ]] || fail 'protected config and PostgreSQL secret file must contain the same password.'
unset db_password
[[ "${STAGING_LAN_IP:-}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || fail 'STAGING_LAN_IP must be an IPv4 address assigned to this host.'
ip -o -4 addr show | awk '{ split($4,a,"/"); print a[1] }' | grep -Fxq "$STAGING_LAN_IP" || fail 'STAGING_LAN_IP is not assigned to a local interface.'
command -v ufw >/dev/null || fail 'UFW is required to verify LAN-only ingress.'
ufw status | grep -q '^Status: active$' || fail 'UFW is not active; refusing to publish.'
ufw status numbered | grep -Fq "$STAGING_LAN_IP 3000/tcp" || fail 'add a reviewed UFW allow rule limited to the intended LAN CIDR and this address/port; no LAN ACL was verified.'
ip route get 1.1.1.1 >/dev/null 2>&1 || fail 'cannot inspect default route; WAN isolation is unverified.'
if ss -H -ltn '( sport = :3000 )' | grep -q .; then
  app_id="$("${COMPOSE[@]}" ps -q app)"
  [[ -n "$app_id" ]] || fail 'host port 3000 is occupied by a service outside this Compose project.'
  app_binding="$(docker inspect --format '{{range (index .NetworkSettings.Ports "3000/tcp")}}{{.HostIp}}:{{.HostPort}}{{end}}' "$app_id")"
  [[ "$app_binding" == "${STAGING_LAN_IP}:3000" ]] || fail 'host port 3000 is not owned by this app on the configured LAN IP.'
fi
if docker inspect n8n_server >/dev/null 2>&1; then
  n8n_before="$(docker inspect --format '{{.Id}} {{.State.Status}} {{.State.Running}}' n8n_server)"
  [[ "$(docker inspect --format '{{.State.Running}}' n8n_server)" == true ]] || fail 'n8n_server is not running; refusing to proceed.'
else
  n8n_before=absent
fi
printf 'Preflight passed: branch=%s HEAD=%s; port 3000 free; n8n_server=%s\n' "$(git branch --show-current)" "$(git rev-parse --short HEAD)" "$n8n_before"
"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" build app migrate
"${COMPOSE[@]}" up -d db
"${COMPOSE[@]}" exec -T db pg_isready -U lucem_staging -d lucem_staging
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" run --rm migrate npx prisma migrate status
"${COMPOSE[@]}" up -d app
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --output /dev/null --write-out 'HTTP %{http_code}\n' "http://${STAGING_LAN_IP}:3000/login"; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then fail 'Next.js did not respond successfully within 30 seconds.'; fi
  sleep 1
done
[[ "$(ss -H -ltn '( sport = :3000 )' | wc -l)" -eq 1 ]] || fail 'expected exactly one listener on port 3000.'
if [[ "$n8n_before" != absent ]]; then
  n8n_after="$(docker inspect --format '{{.Id}} {{.State.Status}} {{.State.Running}}' n8n_server)"
  [[ "$n8n_after" == "$n8n_before" ]] || fail 'n8n_server identity/state changed; investigate immediately.'
  printf 'n8n_server unchanged: %s\n' "$n8n_after"
fi
printf 'Staging is running at http://%s:3000/login (confirm LAN-only reachability from an authorized LAN client).\n' "$STAGING_LAN_IP"
