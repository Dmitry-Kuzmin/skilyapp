#!/bin/bash

# ==========================================
# SDADIM SYSTEM OPTIMIZER (8GB RAM Edition)
# ==========================================

echo "🚀 Starting system optimization..."

# 1. Kill stale node processes (clean start)
echo "🧹 Killing rogue Node.js processes..."
pkill -9 node || true

# 2. Clear Vite & TS Caches
echo "📂 Clearing build caches..."
rm -rf node_modules/.vite
rm -rf .tsbuildinfo
rm -rf dist

# 3. Clean project local storage/temp if any
rm -rf .antigravity/cache

# 4. Memory Flush (macOS specific)
# Note: ‘purge’ requires sudo usually, but let's try or just skip
# echo "🧼 Flushing system disk cache..."
# purge || true

echo "✅ Project cleanup done."
echo "-----------------------------------"
echo "💡 RECOMMENDATIONS FOR 8GB RAM:"
echo "1. Close 'OmniDiskSweeper' (it eats 300MB+ for nothing now)."
echo "2. Close 'About This Mac > Storage' or Activity Monitor if not needed."
echo "3. Keep Chrome tabs < 5."
echo "4. Use 'Stats' in menu bar to watch SWAP (keep it < 1GB)."
echo "-----------------------------------"
