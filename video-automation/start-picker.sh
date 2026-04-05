#!/bin/bash
export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

# Останавливаем старый процесс если висит
OLD_PID=$(lsof -ti :3334 2>/dev/null)
if [ -n "$OLD_PID" ]; then
  echo "Останавливаем старый процесс (PID $OLD_PID)..."
  kill "$OLD_PID"
  sleep 1
fi

echo "Запускаем Video Maker..."
node picker-server.js &
sleep 2

echo "✓ Готово! Открываем браузер..."
open "http://localhost:3334"
