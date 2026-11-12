#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly PROJECT='lucem-qa-01d'
readonly SERVICE='postgres'
readonly CONTAINER='lucem-qa-01d-postgres'
readonly VOLUME='lucem-qa-01d-postgres-data'
readonly HOST_PORT='55433'
readonly BRANCH='feature/lucem-ui-redesign-v1'
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd -P)"
readonly COMPOSE_FILE="$ROOT/compose.qa.yml"
readonly PRIVATE_DIR="$ROOT/.qa-private"
readonly RUNTIME_ENV="$PRIVATE_DIR/runtime.env"

fail() { printf 'BLOCKED: %s\n' "$1" >&2; exit 1; }
usage() { printf 'Usage: bash scripts/qa/provision-db.sh {prepare|check|up}\n'; }
container_inspect_indicates_missing() {
  local response="${1,,}"
  [[ "$response" == *'no such container'* || "$response" == *'no such object'* ]]
}
volume_inspect_indicates_missing() {
  local response="${1,,}"
  [[ "$response" == *'no such volume'* ]]
}

require_repo() {
  [[ "$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null)" == "$ROOT" ]] || fail 'Not running inside the Lucem Retail Git worktree.'
  [[ "$(git -C "$ROOT" branch --show-current)" == "$BRANCH" ]] || fail "Expected branch $BRANCH; refusing to provision from another branch."
  [[ -f "$COMPOSE_FILE" && ! -L "$COMPOSE_FILE" ]] || fail 'QA Compose file is missing or a symlink.'
  git -C "$ROOT" check-ignore -q .qa-private/runtime.env || fail '.qa-private/runtime.env must be ignored by Git before secrets are created.'
}

prepare_secrets() {
  require_repo
  if [[ -e "$PRIVATE_DIR" || -L "$PRIVATE_DIR" ]]; then
    [[ -d "$PRIVATE_DIR" && ! -L "$PRIVATE_DIR" ]] || fail '.qa-private must be a real directory, not a symlink.'
    [[ "$(stat -c '%u' "$PRIVATE_DIR")" == "$(id -u)" ]] || fail '.qa-private is not owned by the current user.'
  else
    mkdir -m 700 -- "$PRIVATE_DIR"
  fi
  chmod 700 -- "$PRIVATE_DIR"

  if [[ -e "$RUNTIME_ENV" || -L "$RUNTIME_ENV" ]]; then
    [[ -f "$RUNTIME_ENV" && ! -L "$RUNTIME_ENV" ]] || fail 'Existing QA runtime credentials must be a regular file, not a symlink.'
    validate_secrets
    printf 'QA credential bundle already exists; preserved without displaying values.\n'
    return
  fi

  local admin seller inventory postgres url temp
  postgres="$(openssl rand -hex 32)"
  admin="$(openssl rand -hex 32)"
  seller="$(openssl rand -hex 32)"
  inventory="$(openssl rand -hex 32)"
  url="postgresql://lucem_qa:${postgres}@127.0.0.1:${HOST_PORT}/lucem_qa?schema=public"
  temp="$(mktemp "$PRIVATE_DIR/.runtime.XXXXXXXX")"
  trap 'rm -f -- "${temp:-}"' RETURN
  {
    printf 'QA_POSTGRES_PASSWORD=%s\n' "$postgres"
    printf 'QA_DATABASE_URL=%s\n' "$url"
    printf 'DATABASE_URL=%s\n' "$url"
    printf 'E2E_DATABASE_URL=%s\n' "$url"
    printf 'E2E_DATABASE_USER=lucem_qa\n'
    printf 'E2E_ADMIN_PASSWORD=%s\n' "$admin"
    printf 'E2E_SELLER_PASSWORD=%s\n' "$seller"
    printf 'E2E_INVENTORY_PASSWORD=%s\n' "$inventory"
  } > "$temp"
  chmod 600 -- "$temp"
  if ! ln -- "$temp" "$RUNTIME_ENV"; then
    rm -f -- "$temp"
    fail 'QA runtime credentials appeared concurrently; existing file was preserved.'
  fi
  rm -f -- "$temp"
  trap - RETURN
  validate_secrets
  printf 'Generated isolated QA credentials under .qa-private/ (directory 0700, file 0600); values were not displayed.\n'
}

validate_secrets() {
  [[ -f "$RUNTIME_ENV" && ! -L "$RUNTIME_ENV" ]] || fail 'Run prepare first; QA runtime credentials are absent or unsafe.'
  [[ "$(stat -c '%u' "$RUNTIME_ENV")" == "$(id -u)" ]] || fail 'QA runtime credentials are not owned by the current user.'
  [[ "$(stat -c '%a' "$RUNTIME_ENV")" == '600' ]] || fail 'QA runtime credentials must have mode 0600.'

  local key value count=0
  declare -A values=()
  while IFS='=' read -r key value; do
    [[ -n "$key" && -n "$value" ]] || fail 'QA runtime credentials have an invalid entry.'
    case "$key" in
      QA_POSTGRES_PASSWORD|E2E_ADMIN_PASSWORD|E2E_SELLER_PASSWORD|E2E_INVENTORY_PASSWORD)
        [[ "$value" =~ ^[a-f0-9]{64}$ ]] || fail "Invalid generated value in $key."
        ;;
      QA_DATABASE_URL|DATABASE_URL|E2E_DATABASE_URL)
        ;;
      E2E_DATABASE_USER)
        [[ "$value" == 'lucem_qa' ]] || fail 'E2E_DATABASE_USER must be exactly lucem_qa.'
        ;;
      *) fail 'Unexpected key in QA runtime credentials.' ;;
    esac
    [[ -z "${values[$key]+x}" ]] || fail 'QA runtime credentials contain a duplicate key.'
    values[$key]="$value"
    count=$((count + 1))
  done < "$RUNTIME_ENV"
  [[ "$count" == 8 ]] || fail 'QA runtime credential bundle is incomplete.'
  local expected_url="postgresql://lucem_qa:${values[QA_POSTGRES_PASSWORD]}@127.0.0.1:${HOST_PORT}/lucem_qa?schema=public"
  [[ "${values[QA_DATABASE_URL]}" == "$expected_url" && "${values[DATABASE_URL]}" == "$expected_url" && "${values[E2E_DATABASE_URL]}" == "$expected_url" ]] || fail 'QA database URLs do not all identify the exact loopback lucem_qa target.'
}

check_port_free() {
  python3 - "$HOST_PORT" <<'PY'
import socket, sys
port = int(sys.argv[1])
sock = socket.socket()
try:
    sock.bind(("127.0.0.1", port))
except OSError:
    print(f"BLOCKED: 127.0.0.1:{port} is already occupied.", file=sys.stderr)
    raise SystemExit(1)
finally:
    sock.close()
PY
}

validate_compose() {
  local rendered
  command -v docker >/dev/null || fail 'Docker Compose CLI is unavailable.'
  docker compose version >/dev/null 2>&1 || fail 'Docker Compose plugin is unavailable.'
  rendered="$(docker compose --project-name "$PROJECT" --file "$COMPOSE_FILE" --env-file "$RUNTIME_ENV" config --format json 2>/dev/null)" || fail 'QA Compose configuration did not render cleanly.'
  printf '%s\n' "$rendered" | QA_PROJECT="$PROJECT" QA_CONTAINER="$CONTAINER" QA_VOLUME="$VOLUME" python3 -c '
import json, os, re, sys
try:
    config = json.load(sys.stdin)
    service = config["services"]["postgres"]
    environment = service["environment"]
    ports = service["ports"]
    mounts = service["volumes"]
    volume = config["volumes"]["qa_data"]
    network = config["networks"]["qa_internal"]
    valid = (
        config.get("name") == os.environ["QA_PROJECT"]
        and set(config["services"]) == {"postgres"}
        and service.get("container_name") == os.environ["QA_CONTAINER"]
        and service.get("image") == "postgres:16-alpine"
        and environment.get("POSTGRES_DB") == "lucem_qa"
        and environment.get("POSTGRES_USER") == "lucem_qa"
        and re.fullmatch(r"[a-f0-9]{64}", environment.get("POSTGRES_PASSWORD", "")) is not None
        and len(ports) == 1
        and str(ports[0].get("target")) == "5432"
        and str(ports[0].get("published")) == "55433"
        and ports[0].get("host_ip") == "127.0.0.1"
        and len(mounts) == 1
        and mounts[0].get("type") == "volume"
        and mounts[0].get("source") == "qa_data"
        and mounts[0].get("target") == "/var/lib/postgresql/data"
        and volume.get("name") == os.environ["QA_VOLUME"]
        and network.get("name") == "lucem-qa-01d-internal"
        and network.get("internal") is True
        and service.get("networks") == {"qa_internal": None}
    )
except (KeyError, TypeError, ValueError):
    valid = False
if not valid:
    print("BLOCKED: rendered Compose config violates QA-only project, target, bind, volume, or network invariants.", file=sys.stderr)
    raise SystemExit(1)
print("Compose invariants verified (no environment values displayed).")
' || fail 'Rendered Compose configuration is not the exact isolated QA topology.'
}

check_configuration() {
  require_repo
  validate_secrets
  validate_compose
  check_port_free || fail 'The dedicated QA port is not free; no Docker operation was attempted.'
  printf 'SAFE: project=%s service=%s container=%s database=user=lucem_qa host=127.0.0.1:%s volume=%s network=internal. No Docker Engine operation was performed.\n' \
    "$PROJECT" "$SERVICE" "$CONTAINER" "$HOST_PORT" "$VOLUME"
}

provision() {
  check_configuration
  command -v sudo >/dev/null || fail 'sudo is required for the explicit interactive Docker operation.'
  printf 'Requesting interactive sudo for the QA project only. No removal or cleanup command is available.\n'
  sudo -v

  if sudo docker info >/dev/null 2>&1; then :; else fail 'Privileged Docker Engine is unavailable.'; fi
  local inspect_message
  if inspect_message="$(sudo docker container inspect "$CONTAINER" 2>&1)"; then
    fail "Container name $CONTAINER already exists; refusing to recreate or mutate it."
  elif ! container_inspect_indicates_missing "$inspect_message"; then
    fail 'Could not verify the reserved QA container name; no provisioning operation was attempted.'
  fi
  if inspect_message="$(sudo docker volume inspect "$VOLUME" 2>&1)"; then
    fail "Named volume $VOLUME already exists; refusing to reuse or modify it."
  elif ! volume_inspect_indicates_missing "$inspect_message"; then
    fail 'Could not verify the reserved QA volume name; no provisioning operation was attempted.'
  fi

  sudo docker compose --project-name "$PROJECT" --file "$COMPOSE_FILE" --env-file "$RUNTIME_ENV" \
    up --detach --wait --wait-timeout 90 "$SERVICE"
  local identity
  identity="$(sudo docker compose --project-name "$PROJECT" --file "$COMPOSE_FILE" --env-file "$RUNTIME_ENV" \
    exec -T "$SERVICE" psql -U lucem_qa -d lucem_qa -At -F '|' -c 'SELECT current_database(), current_user' 2>/dev/null)" || fail 'PostgreSQL identity probe failed; service was left intact for inspection.'
  [[ "$identity" == 'lucem_qa|lucem_qa' ]] || fail 'PostgreSQL identity did not match lucem_qa/lucem_qa; service was left intact.'
  printf 'READY: isolated QA PostgreSQL is healthy; verified connected identity is lucem_qa/lucem_qa. No migrations or fixtures were applied.\n'
}

main() {
  local action="${1:-}"
  case "$action" in
    prepare) prepare_secrets ;;
    check) check_configuration ;;
    up) provision ;;
    -h|--help|help|'') usage ;;
    *) usage >&2; fail 'Unknown operation.' ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
