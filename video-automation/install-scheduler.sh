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

# 4. First-time Chrome profile login
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ONE-TIME STEP: Log in to your social accounts  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "A special Chrome window will open now."
echo "Please log in to:"
echo "  1. TikTok  → https://www.tiktok.com"
echo "  2. YouTube → https://www.youtube.com"
echo "  3. Instagram → https://www.instagram.com"
echo ""
echo "After logging in to all three — close the Chrome window."
echo ""
read -p "Press ENTER to open Chrome for login setup..." _

mkdir -p "$PROFILE_DIR"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --disable-sync \
  "https://www.tiktok.com" &

CHROME_PID=$!
echo ""
echo "✅ Chrome opened with automation profile."
echo "   Log in to TikTok, YouTube, and Instagram."
echo "   Then close Chrome and come back here."
echo ""
wait $CHROME_PID 2>/dev/null || true

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
