#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Uso: forge-run.sh [--backend auto|codex|opencode] [--max-passes N] [prompt]' \
    'Variables: FORGE_CODEX_BIN, FORGE_OPENCODE_BIN' \
    'El comando se ejecuta desde la carpeta actual del proyecto.'
}

backend=auto
max_passes=3
prompt=''

while [ "$#" -gt 0 ]; do
  case "$1" in
    --backend)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      backend="$2"
      shift 2
      ;;
    --max-passes)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      max_passes="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    --)
      shift
      prompt="$*"
      break
      ;;
    *)
      prompt="${prompt:+$prompt }$1"
      shift
      ;;
  esac
done

root="$PWD"
codex_bin="${FORGE_CODEX_BIN:-codex}"
opencode_bin="${FORGE_OPENCODE_BIN:-opencode}"

case "$max_passes" in
  ''|*[!0-9]*)
    printf 'max-passes debe ser un entero positivo.\n' >&2
    exit 2
    ;;
esac
[ "$max_passes" -gt 0 ] || { printf 'max-passes debe ser mayor que cero.\n' >&2; exit 2; }

if [ -z "$prompt" ]; then
  prompt='Continúa el build existente usando SPEC.md y FINDINGS.md.'
fi

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

if [ "$backend" = auto ]; then
  if command_exists "$codex_bin"; then
    backend=codex
  elif command_exists "$opencode_bin"; then
    backend=opencode
  else
    printf 'No encontré codex ni opencode en PATH.\n' >&2
    exit 1
  fi
fi

case "$backend" in
  codex)
    command_exists "$codex_bin" || { printf 'No encontré: %s\n' "$codex_bin" >&2; exit 1; }
    ;;
  opencode)
    command_exists "$opencode_bin" || { printf 'No encontré: %s\n' "$opencode_bin" >&2; exit 1; }
    ;;
  *)
    printf 'Backend inválido: %s\n' "$backend" >&2
    usage >&2
    exit 2
    ;;
esac

run_agent_once() {
  local role="$1"
  local instruction="$2"
  printf '\n== %s (%s) ==\n' "$role" "$backend"
  if [ "$backend" = codex ]; then
    "$codex_bin" exec "$instruction"
  else
    "$opencode_bin" run "$instruction"
  fi
}

run_agent() {
  local role="$1"
  local instruction="$2"
  local attempt=1
  while [ "$attempt" -le 2 ]; do
    if run_agent_once "$role" "$instruction"; then
      return 0
    fi
    printf '%s falló; reintentando (%s/2).\n' "$role" "$attempt" >&2
    attempt=$((attempt + 1))
  done
  printf '%s falló dos veces; se detiene Forge.\n' "$role" >&2
  return 1
}

  run_agent 'Planner' "Trabaja en $root. Actúa como Planner. Lee .agents/skills/forge/references/planner.md y sigue sus instrucciones. Prompt del usuario: $prompt"

if [ ! -f SPEC.md ]; then
  printf 'Planner no creó SPEC.md.\n' >&2
  exit 1
fi

if [ -d .git ]; then
  git add SPEC.md
  if ! git diff --cached --quiet; then
    git commit -m 'docs: add forge specification'
  fi
fi

pass=1
while [ "$pass" -le "$max_passes" ]; do
  if [ -f FINDINGS.md ] && grep -Eq '^- \[ \]' FINDINGS.md; then
    mode='fix'
  else
    mode='build'
  fi

  run_agent 'Generator' "Trabaja en $root. Actúa como Generator en modo $mode. Lee .agents/skills/forge/references/generator.md, SPEC.md y, si existe, FINDINGS.md. Cumple estrictamente sus instrucciones. No edites SPEC.md ni FINDINGS.md."
  run_agent 'Evaluator' "Trabaja en $root. Actúa como Evaluator para la pasada $pass. Lee .agents/skills/forge/references/evaluator.md y SPEC.md. Verifica la aplicación realmente y escribe FINDINGS.md. No arregles código."

  if [ ! -f FINDINGS.md ]; then
    run_agent 'Evaluator recovery' "La evaluación anterior no creó FINDINGS.md. Reintenta ahora como Evaluator. No instales dependencias ni navegadores. Usa curl y shell si Playwright no está disponible. Debes escribir FINDINGS.md aunque no puedas verificar la UI, indicando exactamente qué no se pudo probar."
  fi

  if [ ! -f FINDINGS.md ]; then
    printf 'Evaluator no creó FINDINGS.md después del reintento.\n' >&2
    exit 1
  fi

  if ! grep -Eq '^- \[ \].*(critical|major)' FINDINGS.md; then
    printf '\nForge terminado después de %s pasada(s).\n' "$pass"
    exit 0
  fi
  pass=$((pass + 1))
done

printf '\nForge detenido: se alcanzó el máximo de %s pasadas. Revisa FINDINGS.md.\n' "$max_passes"
