#!/usr/bin/env bash
set -Eeuo pipefail

readonly ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)"
readonly ENV_FILE="$ROOT/.env.e2e"
readonly STATE_FILE="$ROOT/.e2e-provisioned"
readonly COMPOSE_FILE="$ROOT/compose.e2e.yml"
readonly CONTAINER='lucem-retail-e2e-postgres'
readonly VOLUME='lucem-retail-e2e-postgres-v1'
readonly PROJECT='lucem-retail-e2e'
readonly STATE_CONTENT=$'format=lucem-e2e-owner-v1\nproject=lucem-retail-e2e\ncontainer=lucem-retail-e2e-postgres\nvolume=lucem-retail-e2e-postgres-v1'
action="${1:-up}"

fail() { printf 'BLOCKED: %s\n' "$1" >&2; exit 1; }
matches_e2e_name() {
  local value="${1,,}"
  [[ "$value" == *e2e* || "$value" == *dev-test-01b* || "$value" == *dev-03* || "$value" == *dev-08b* || "$value" == *dev-09* || "$value" == *dev-deploy-02* ]]
}

[[ "$(git -C "$ROOT" branch --show-current)" == 'feature/lucem-ui-redesign-v1' ]] || fail 'Expected branch feature/lucem-ui-redesign-v1.'
[[ -f "$COMPOSE_FILE" && ! -L "$COMPOSE_FILE" ]] || fail 'Dedicated E2E Compose file is missing or unsafe.'
[[ -f "$ENV_FILE" && ! -L "$ENV_FILE" ]] || fail 'Run npm run e2e:env:init before provisioning.'
node "$ROOT/scripts/e2e/env.cjs" check

managed=0
managed_container=0
if [[ -e "$STATE_FILE" || -L "$STATE_FILE" ]]; then
  [[ -f "$STATE_FILE" && ! -L "$STATE_FILE" ]] || fail 'E2E ownership marker is not a regular file.'
  [[ "$(stat -c '%u' "$STATE_FILE")" == "$(id -u)" && "$(stat -c '%a' "$STATE_FILE")" == '600' ]] || fail 'E2E ownership marker must be user-owned with mode 0600.'
  [[ "$(<"$STATE_FILE")" == "$STATE_CONTENT" ]] || fail 'E2E ownership marker does not match this Compose target.'
  managed=1
fi

if [[ "$action" == 'restart-check' ]]; then
  [[ "$managed" == '1' ]] || fail 'E2E restart check requires the protected ownership marker.'
  sudo -v
  detail="$(sudo docker inspect "$CONTAINER" | python3 "$ROOT/scripts/e2e/inspect-container.py")" || fail 'Could not inspect the managed E2E container.'
  IFS='|' read -r name image database user bindings mounts project service container_state container_health <<< "$detail"
  [[ "$name" == "$CONTAINER" && "$image" == 'postgres:16-alpine' && "$database" == 'postgres' && "$user" == 'lucem_e2e_admin' && "$bindings" == *'127.0.0.1:55432->5432/tcp'* && "$mounts" == "$VOLUME" && "$project" == "$PROJECT" && "$service" == 'postgres' && "$container_state" == 'running' && "$container_health" == 'healthy' ]] || fail 'Container metadata does not match the owned E2E instance.'
  volume_detail="$(sudo docker volume inspect --format '{{.Name}}|{{index .Labels "com.docker.compose.project"}}' "$VOLUME")" || fail 'Could not inspect the owned E2E volume.'
  [[ "$volume_detail" == "$VOLUME|$PROJECT" ]] || fail 'Volume metadata does not match the owned E2E project.'
  state="$(sudo docker inspect --format '{{.State.Status}}|{{.State.Health.Status}}' "$CONTAINER")" || fail 'Could not inspect E2E health status.'
  [[ "$state" == 'running|healthy' ]] || fail 'E2E must be running and healthy before its persistence check.'
  node "$ROOT/scripts/e2e/env.cjs" run verify
  before="$(node "$ROOT/scripts/e2e/env.cjs" run diagnose-dashboard)" || fail 'Could not snapshot isolated E2E fixtures before restart.'
  sudo docker restart "$CONTAINER" >/dev/null
  healthy=0
  for _ in {1..40}; do
    state="$(sudo docker inspect --format '{{.State.Status}}|{{.State.Health.Status}}' "$CONTAINER")" || fail 'Could not poll E2E health status.'
    if [[ "$state" == 'running|healthy' ]]; then healthy=1; break; fi
    if [[ "$state" == 'exited|'* || "$state" == 'running|unhealthy' ]]; then fail "E2E container did not recover: $state"; fi
    sleep 3
  done
  [[ "$healthy" == '1' ]] || fail 'E2E container did not become healthy within 120 seconds.'
  node "$ROOT/scripts/e2e/env.cjs" run verify
  after="$(node "$ROOT/scripts/e2e/env.cjs" run diagnose-dashboard)" || fail 'Could not snapshot isolated E2E fixtures after restart.'
  [[ "$before" == "$after" ]] || fail 'E2E fixture snapshot changed across container restart.'
  printf 'E2E restart/persistence check PASS: container=%s, volume=%s, fixtures unchanged.\n' "$CONTAINER" "$VOLUME"
  exit 0
fi
[[ "$action" == 'up' ]] || fail 'Usage: provision-db.sh {up|restart-check}'

# Docker visibility is deliberately privileged and interactive; no group or ACL changes are made.
sudo -v
containers="$(sudo docker ps --all --quiet)" || fail 'Could not inspect Docker containers; no E2E resources were created.'
while IFS= read -r id; do
  [[ -n "$id" ]] || continue
  detail="$(sudo docker inspect "$id" | python3 "$ROOT/scripts/e2e/inspect-container.py")" || fail 'Docker container inspection failed; no E2E resources were created.'
  IFS='|' read -r name image database user bindings mounts project service container_state container_health <<< "$detail"
  lname="${name,,}"
  if [[ "$database" == 'lucem_retail_e2e' || "$user" == 'lucem_e2e' || "$bindings" == *55432* ]] || matches_e2e_name "$lname" || matches_e2e_name "$mounts"; then
    if [[ "$managed" == '1' && "$name" == "$CONTAINER" && "$image" == 'postgres:16-alpine' && "$database" == 'postgres' && "$user" == 'lucem_e2e_admin' && "$bindings" == *'127.0.0.1:55432->5432/tcp'* && "$mounts" == "$VOLUME" && "$project" == "$PROJECT" && "$service" == 'postgres' ]]; then
      managed_container=1
      continue
    fi
    printf 'Existing E2E-like container detected: %s (%s), database=%s, user=%s, ports=%s, volumes=%s\n' "$name" "$image" "$database" "$user" "$bindings" "$mounts" >&2
    fail 'Review the existing container and its volume manually; no unowned resource was stopped, changed or reused.'
  fi
  if [[ "$image" == postgres:* ]]; then
    if [[ "$project" == 'lucem-retail-staging' && "$service" == 'db' && -z "$bindings" ]]; then
      continue
    fi
    case "$database/$user" in
      lucem_qa/lucem_qa)
        [[ "$name" == 'lucem-qa-01d-postgres' && "$bindings" == *55433* ]] || fail 'Unrecognized lucem_qa container identity/port; no E2E resources were created.'
        ;;
      lucem_retail/lucem)
        [[ "$service" == 'db' && "$bindings" == *5432* ]] || fail 'Unrecognized development database identity/port; no E2E resources were created.'
        ;;
      *)
        printf 'Unclassified PostgreSQL container detected: %s (%s), database=%s, user=%s, ports=%s, volumes=%s\n' "$name" "$image" "$database" "$user" "$bindings" "$mounts" >&2
        fail 'Confirm this database is unrelated to E2E before provisioning; no resources were modified.'
        ;;
    esac
  fi
done <<< "$containers"

volumes="$(sudo docker volume ls --quiet)" || fail 'Could not inspect Docker volumes; no E2E resources were created.'
while IFS= read -r volume; do
  [[ -n "$volume" ]] || continue
  if matches_e2e_name "$volume" || [[ "$volume" == "$VOLUME" ]]; then
    if [[ "$managed" == '1' && "$volume" == "$VOLUME" ]]; then continue; fi
    printf 'Existing E2E-like volume detected: %s\n' "$volume" >&2
    fail 'Do not reuse or delete an existing E2E volume; review it manually before proceeding.'
  fi
done <<< "$volumes"

if [[ "$managed_container" != '1' ]]; then
python3 - <<'PY' || fail '127.0.0.1:55432 is occupied; no E2E resources were created.'
import socket
s = socket.socket()
try:
    s.bind(("127.0.0.1", 55432))
except OSError:
    raise SystemExit(1)
finally:
    s.close()
print("E2E port 127.0.0.1:55432 is free.")
PY
fi

sudo docker compose --project-name "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up --detach --wait --wait-timeout 120
if [[ "$managed" != '1' ]]; then
  (umask 077; set -o noclobber; printf '%s\n' "$STATE_CONTENT" > "$STATE_FILE") || fail 'E2E ownership marker could not be recorded safely; container/volume were left intact.'
  chmod 600 "$STATE_FILE"
fi
node "$ROOT/scripts/e2e/env.cjs" run verify
printf 'Permanent E2E PostgreSQL is healthy: container=%s volume=%s; bound only to 127.0.0.1:55432.\n' "$CONTAINER" "$VOLUME"
