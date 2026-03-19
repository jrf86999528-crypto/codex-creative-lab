#!/bin/zsh
set -euo pipefail

RAW_COMMAND="${1:-help}"
export CLAWD_URL="${CLAWD_URL:-http://127.0.0.1:18789}"
export CLAWD_TOKEN="${CLAWD_TOKEN:-}"

if [[ -z "$CLAWD_TOKEN" ]]; then
  echo "CLAWD_TOKEN is required. Export it before running this script." >&2
  exit 1
fi

ARGS_JSON="$(
  /usr/local/opt/node@22/bin/node -e 'process.stdout.write(JSON.stringify({ raw: process.argv[1] }))' "$RAW_COMMAND"
)"

exec /usr/local/bin/lobster run --mode tool \
  --file /Users/a123/Documents/codex/playbooks/lobster/openclaw-feishu-keyword-dispatch.lobster \
  --args-json "$ARGS_JSON"
