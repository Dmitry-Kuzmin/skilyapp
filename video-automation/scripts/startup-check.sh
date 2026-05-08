#!/bin/bash
# startup-check.sh
# Fires at login + 9:00/9:30/10:00/10:30/11:00.
# If today's pipeline hasn't run yet — runs it.

export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

LOG="/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation/morning-pipeline.log"
PIPELINE="/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation/scripts/morning-pipeline.js"
NODE="/Users/dimka/.nvm/versions/node/v24.11.0/bin/node"
LOCKFILE="/tmp/skily-pipeline.lock"
TODAY=$(date +%Y-%m-%d)

# Ждём 90 сек при запуске — только при загрузке системы (uptime < 300 сек)
UPTIME_SEC=$(sysctl -n kern.boottime | awk '{print $4}' | tr -d ',')
NOW=$(date +%s)
UPTIME=$((NOW - UPTIME_SEC))
if [ "$UPTIME" -lt 300 ]; then
  sleep 90
fi

# Только в рабочие часы (07:00–22:00)
HOUR=$(date +%H)
if [ "$HOUR" -lt 7 ] || [ "$HOUR" -gt 22 ]; then
  exit 0
fi

# Lockfile: не запускать два экземпляра одновременно
if [ -f "$LOCKFILE" ]; then
  PID=$(cat "$LOCKFILE" 2>/dev/null)
  if kill -0 "$PID" 2>/dev/null; then
    echo "[$TODAY $(date +%H:%M)] startup-check: pipeline уже запущен (pid $PID), пропускаю." >> "$LOG"
    exit 0
  fi
  rm -f "$LOCKFILE"
fi

# Проверяем — был ли пайплайн уже запущен сегодня
if grep -q "Morning pipeline started" "$LOG" 2>/dev/null && grep -q "$TODAY" "$LOG" 2>/dev/null; then
  exit 0
fi

echo "[$TODAY $(date +%H:%M)] startup-check: запускаю пайплайн..." >> "$LOG"
echo $$ > "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

cd "/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation"
"$NODE" "$PIPELINE"
EC=$?

# Никогда не возвращаем 78 — launchd его воспринимает как «отключить навсегда»
[ $EC -eq 78 ] && exit 1 || exit 0
