#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
PID_FILE="$RUNTIME_DIR/pulsedeck.pid"
LOG_FILE="$RUNTIME_DIR/pulsedeck.log"
ROOT_URL="http://127.0.0.1:4173"
APP_URL="$ROOT_URL/stock"
HEALTH_URL="$ROOT_URL/api/stock/health"
MODE="${1:-start}"
LABEL="com.codex.pulsedeck"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$LAUNCH_AGENT_DIR/$LABEL.plist"
GUI_DOMAIN="gui/$(id -u)"
PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || echo /usr/bin/python3)}"
SCREEN_SESSION="pulsedeck"

mkdir -p "$RUNTIME_DIR"

write_launch_agent() {
  mkdir -p "$LAUNCH_AGENT_DIR"
  cat >"$PLIST_FILE" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON_BIN</string>
    <string>$ROOT_DIR/server.py</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_FILE</string>
  <key>StandardErrorPath</key>
  <string>$LOG_FILE</string>
</dict>
</plist>
EOF
}

launchd_is_loaded() {
  launchctl print "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1
}

launchd_pid() {
  launchctl print "$GUI_DOMAIN/$LABEL" 2>/dev/null | awk -F'= ' '/pid = / {gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2; exit}'
}

wait_for_health() {
  local attempt
  for attempt in {1..20}; do
    if curl --silent --fail --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  return 1
}

port_pid() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:4173 -sTCP:LISTEN 2>/dev/null | head -n 1 || true
  fi
}

stop_port_process() {
  local running_port_pid
  running_port_pid="$(port_pid)"
  if [[ -n "$running_port_pid" ]] && kill -0 "$running_port_pid" 2>/dev/null; then
    kill "$running_port_pid" 2>/dev/null || true
    sleep 1
  fi
}

screen_is_running() {
  command -v screen >/dev/null 2>&1 && screen -list | grep -q "[[:digit:]]\\.${SCREEN_SESSION}[[:space:]]"
}

start_with_screen() {
  launchctl bootout "$GUI_DOMAIN" "$PLIST_FILE" >/dev/null 2>&1 || true

  case "$MODE" in
    stop)
      if screen_is_running; then
        screen -S "$SCREEN_SESSION" -X quit >/dev/null 2>&1 || true
      fi
      rm -f "$PID_FILE"
      stop_port_process
      echo "PulseDeck 已停止"
      exit 0
      ;;
    restart)
      if screen_is_running; then
        screen -S "$SCREEN_SESSION" -X quit >/dev/null 2>&1 || true
        sleep 1
      fi
      stop_port_process
      ;;
    status)
      if screen_is_running && wait_for_health; then
        local running_port_pid
        running_port_pid="$(port_pid)"
        [[ -n "$running_port_pid" ]] && echo "$running_port_pid" >"$PID_FILE"
        echo "PulseDeck 运行中: $APP_URL${running_port_pid:+ (PID $running_port_pid)}"
        exit 0
      fi
      echo "PulseDeck 未运行"
      exit 1
      ;;
  esac

  if screen_is_running && wait_for_health; then
    local running_port_pid
    running_port_pid="$(port_pid)"
    [[ -n "$running_port_pid" ]] && echo "$running_port_pid" >"$PID_FILE"
    echo "PulseDeck 已在后台运行: $APP_URL${running_port_pid:+ (PID $running_port_pid)}"
    exit 0
  fi

  mkdir -p "$RUNTIME_DIR"
  screen -dmS "$SCREEN_SESSION" zsh -lc "cd '$ROOT_DIR' && exec '$PYTHON_BIN' server.py >>'$LOG_FILE' 2>&1"

  if wait_for_health; then
    local running_port_pid
    running_port_pid="$(port_pid)"
    [[ -n "$running_port_pid" ]] && echo "$running_port_pid" >"$PID_FILE"
    echo "PulseDeck 已启动: $APP_URL${running_port_pid:+ (PID $running_port_pid)}"
    echo "日志: $LOG_FILE"
    if command -v open >/dev/null 2>&1; then
      open "$APP_URL" >/dev/null 2>&1 || true
    fi
    exit 0
  fi

  rm -f "$PID_FILE"
  echo "PulseDeck 启动失败，查看日志: $LOG_FILE" >&2
  exit 1
}

start_with_launchd() {
  write_launch_agent

  case "$MODE" in
    stop)
      launchctl bootout "$GUI_DOMAIN" "$PLIST_FILE" >/dev/null 2>&1 || true
      rm -f "$PID_FILE"
      stop_port_process
      echo "PulseDeck 已停止"
      exit 0
      ;;
    restart)
      launchctl bootout "$GUI_DOMAIN" "$PLIST_FILE" >/dev/null 2>&1 || true
      stop_port_process
      ;;
    status)
      if launchd_is_loaded && wait_for_health; then
        local running_pid
        running_pid="$(launchd_pid)"
        [[ -n "$running_pid" ]] && echo "$running_pid" >"$PID_FILE"
        echo "PulseDeck 运行中: $APP_URL${running_pid:+ (PID $running_pid)}"
        exit 0
      fi
      echo "PulseDeck 未运行"
      exit 1
      ;;
  esac

  if launchd_is_loaded; then
    launchctl kickstart -k "$GUI_DOMAIN/$LABEL" >/dev/null 2>&1 || true
  else
    launchctl bootstrap "$GUI_DOMAIN" "$PLIST_FILE" >/dev/null 2>&1
  fi

  if wait_for_health; then
    local running_pid
    running_pid="$(launchd_pid)"
    [[ -n "$running_pid" ]] && echo "$running_pid" >"$PID_FILE"
    echo "PulseDeck 已启动: $APP_URL${running_pid:+ (PID $running_pid)}"
    echo "日志: $LOG_FILE"
    if command -v open >/dev/null 2>&1; then
      open "$APP_URL" >/dev/null 2>&1 || true
    fi
    exit 0
  fi
  rm -f "$PID_FILE"
  echo "PulseDeck 启动失败，查看日志: $LOG_FILE" >&2
  exit 1
}

if command -v screen >/dev/null 2>&1; then
  start_with_screen
fi

if [[ "$(uname -s)" == "Darwin" ]] && command -v launchctl >/dev/null 2>&1; then
  start_with_launchd
fi

PORT_PID=""
PORT_PID="$(port_pid)"

if [[ "$MODE" == "status" ]]; then
  if [[ -n "$PORT_PID" ]] && curl --silent --fail --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "PulseDeck 运行中: $APP_URL (PID $PORT_PID)"
    exit 0
  fi
  echo "PulseDeck 未运行"
  exit 1
fi

if [[ "$MODE" == "stop" ]]; then
  rm -f "$PID_FILE"
  stop_port_process
  echo "PulseDeck 已停止"
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  EXISTING_PID="$(cat "$PID_FILE")"
  if [[ "$MODE" == "restart" ]] && [[ -n "$EXISTING_PID" ]] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    kill "$EXISTING_PID" 2>/dev/null || true
    sleep 1
  elif [[ -n "$EXISTING_PID" ]] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "PulseDeck 已在后台运行: $APP_URL (PID $EXISTING_PID)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

if [[ "$MODE" == "restart" ]] && [[ -n "$PORT_PID" ]] && kill -0 "$PORT_PID" 2>/dev/null; then
  kill "$PORT_PID" 2>/dev/null || true
  sleep 1
  PORT_PID=""
fi

if [[ -n "$PORT_PID" ]] && kill -0 "$PORT_PID" 2>/dev/null; then
  echo "$PORT_PID" >"$PID_FILE"
  echo "PulseDeck 已在后台运行: $APP_URL (PID $PORT_PID)"
  exit 0
fi

cd "$ROOT_DIR"
nohup python3 server.py >>"$LOG_FILE" 2>&1 </dev/null &
NEW_PID=$!
echo "$NEW_PID" >"$PID_FILE"

sleep 1

if kill -0 "$NEW_PID" 2>/dev/null && curl --silent --fail --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
  echo "PulseDeck 已启动: $APP_URL (PID $NEW_PID)"
  echo "日志: $LOG_FILE"
  if command -v open >/dev/null 2>&1; then
    open "$APP_URL" >/dev/null 2>&1 || true
  fi
else
  rm -f "$PID_FILE"
  echo "PulseDeck 启动失败，查看日志: $LOG_FILE" >&2
  exit 1
fi
