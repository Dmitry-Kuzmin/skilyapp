#!/bin/bash
# startup-check.sh — запускает пайплайн если сегодня ещё не запускался.
# Вызывается по расписанию LaunchAgent (9:00–11:00, 15:00, 19:00).

export PATH="/usr/sbin:/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/Users/dimka/.nvm/versions/node/v24.11.0/bin"

LOG="/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation/morning-pipeline.log"
LOCKFILE="/tmp/skily-pipeline.lock"
NODE="/Users/dimka/.nvm/versions/node/v24.11.0/bin/node"
PIPELINE="/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation/scripts/morning-pipeline.js"
TODAY=$(date +%Y-%m-%d)

# Уже запущен?
if [ -f "$LOCKFILE" ]; then
  PID=$(cat "$LOCKFILE" 2>/dev/null)
  if kill -0 "$PID" 2>/dev/null; then
    exit 0
  fi
  rm -f "$LOCKFILE"
fi

# Уже запускался сегодня?
if grep -q "$TODAY" "$LOG" 2>/dev/null && grep -q "Morning pipeline started" "$LOG" 2>/dev/null; then
  exit 0
fi

# Убиваем зависшие процессы от прошлых запусков
pkill -f "chrome-headless-shell" 2>/dev/null
pkill -f "remotion render" 2>/dev/null
sleep 3

# Запускаем
echo $$ > "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

cd "/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation"
"$NODE" "$PIPELINE"

# Всегда выходим с 0 — launchd не должен видеть код 78
exit 0
