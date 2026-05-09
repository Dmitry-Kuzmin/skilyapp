#!/bin/bash
# Обёртка для LaunchAgent — запускает morning-pipeline.js и нормализует код выхода.
# Launchd навсегда отключает задачу если процесс вернул код 78 (EX_CONFIG).
# Эта обёртка гарантирует что launchd никогда не увидит код 78.

export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export HOME="/Users/dimka"

cd "/Users/dimka/Desktop/Skily/sdadim-dgt-prep/video-automation"

"/Users/dimka/.nvm/versions/node/v24.11.0/bin/node" scripts/morning-pipeline.js
EC=$?

[ $EC -eq 78 ] && exit 1 || exit $EC
