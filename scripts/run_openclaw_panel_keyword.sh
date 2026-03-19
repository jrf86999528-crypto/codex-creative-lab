#!/bin/zsh
set -euo pipefail

ENV_FILE="${HOME}/.openclaw/integrations/model-roundtable.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

TASK="${*:-}"
ROUNDS="${PANEL_DEFAULT_ROUNDS:-2}"

if [[ "${1:-}" == "--rounds" ]]; then
  ROUNDS="${2:-2}"
  shift 2
  TASK="${*:-}"
fi

if [[ -z "$TASK" ]]; then
  echo "用法: /panel <任务> 或 /panel2 <任务> 或 /panel3 <任务>"
  exit 1
fi

exec /usr/local/bin/python3.11 /Users/a123/Documents/codex/scripts/model_roundtable.py --rounds "$ROUNDS" --task "$TASK"
