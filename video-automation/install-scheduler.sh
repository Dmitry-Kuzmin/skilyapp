#!/bin/bash
# install-scheduler.sh
# One-time setup for the Skily morning auto-publisher.
# Run this once: bash install-scheduler.sh

export PATH="/Users/dimka/.nvm/versions/node/v24.11.0/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")"

PLIST="$HOME/Library/LaunchAgents/com.skily.morning-pipeline.plist"
PROFILE_DIR="$(pwd)/chrome-profile"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║       Skily Morning Pipeline — Setup             ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Check Node
if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install via nvm first."
  exit 1
fi
echo "✅ Node.js: $(node --version)"

# 2. Check playwright-core
if ! node -e "require('playwright-core')" 2>/dev/null; then
  echo "📦 Installing playwright-core..."
  npm install playwright-core --save
fi
echo "✅ playwright-core: OK"

# 3. Load LaunchAgent
if launchctl list | grep -q "com.skily.morning-pipeline"; then
  echo "🔄 Reloading LaunchAgent..."
  launchctl unload "$PLIST" 2>/dev/null
fi
launchctl load "$PLIST"
echo "✅ LaunchAgent loaded — runs daily at 09:00"

# 4. First-time Chrome profile login — two profiles
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ONE-TIME STEP: Log in to your social accounts  ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  У тебя 2 набора аккаунтов:                     ║"
echo "║  • ES профиль — аккаунты для испанцев           ║"
echo "║  • RU профиль — аккаунты для экспатов           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── ES profile ────────────────────────────────────────
echo "▶  ШАГ 1 из 2: ES профиль (аккаунты для испанцев)"
echo ""
echo "Chrome откроется. Войди в:"
echo "  1. TikTok ES  → https://www.tiktok.com"
echo "  2. YouTube ES → https://www.youtube.com"
echo "  3. Instagram ES → https://www.instagram.com"
echo "Потом ЗАКРОЙ Chrome."
echo ""
read -p "Нажми ENTER чтобы открыть Chrome (ES профиль)..." _

mkdir -p "$(pwd)/chrome-profile-es"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/chrome-profile-es" \
  --no-first-run \
  --disable-sync \
  "https://www.tiktok.com" &
CHROME_PID=$!
echo ""
echo "✅ Chrome (ES) открыт. Логинься в ES аккаунты, потом закрой Chrome."
wait $CHROME_PID 2>/dev/null || true
echo "✅ ES профиль сохранён."
echo ""

# ── RU profile ────────────────────────────────────────
echo "▶  ШАГ 2 из 2: RU профиль (аккаунты для экспатов)"
echo ""
echo "Chrome откроется снова. Войди в:"
echo "  1. TikTok RU  → https://www.tiktok.com"
echo "  2. YouTube RU → https://www.youtube.com"
echo "  3. Instagram RU → https://www.instagram.com"
echo "Потом ЗАКРОЙ Chrome."
echo ""
read -p "Нажми ENTER чтобы открыть Chrome (RU профиль)..." _

mkdir -p "$(pwd)/chrome-profile-ru"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$(pwd)/chrome-profile-ru" \
  --no-first-run \
  --disable-sync \
  "https://www.tiktok.com" &
CHROME_PID=$!
echo ""
echo "✅ Chrome (RU) открыт. Логинься в RU аккаунты, потом закрой Chrome."
wait $CHROME_PID 2>/dev/null || true
echo "✅ RU профиль сохранён."

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              ✅ Setup complete!                  ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  Morning pipeline runs every day at 09:00        ║"
echo "║  Logs: video-automation/morning-pipeline.log     ║"
echo "║                                                  ║"
echo "║  To test now:                                    ║"
echo "║    node scripts/morning-pipeline.js              ║"
echo "║                                                  ║"
echo "║  To disable scheduler:                           ║"
echo "║    launchctl unload ~/Library/LaunchAgents/      ║"
echo "║      com.skily.morning-pipeline.plist            ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
