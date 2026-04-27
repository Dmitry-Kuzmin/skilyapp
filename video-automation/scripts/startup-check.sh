#!/bin/bash
# startup-check.sh
# Runs at Mac login. If today's pipeline hasn't run yet — runs it.
# Handles the case when Mac was off at 09:00.

export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

LOG="/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation/morning-pipeline.log"
PIPELINE="/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation/scripts/morning-pipeline.js"
NODE="/Users/dimka/.nvm/versions/node/v24.11.0/bin/node"

TODAY=$(date +%Y-%m-%d)

# Check if pipeline already ran today
if grep -q "$TODAY" "$LOG" 2>/dev/null; then
  echo "[$TODAY] startup-check: pipeline already ran today, skipping." >> "$LOG"
  exit 0
fi

# Check time: only run between 07:00 and 22:00 to avoid midnight surprises
HOUR=$(date +%H)
if [ "$HOUR" -lt 7 ] || [ "$HOUR" -gt 22 ]; then
  echo "[$TODAY] startup-check: outside active hours ($HOUR:xx), skipping." >> "$LOG"
  exit 0
fi

echo "[$TODAY] startup-check: pipeline not run today, starting now..." >> "$LOG"
cd "/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation"
exec "$NODE" "$PIPELINE"
