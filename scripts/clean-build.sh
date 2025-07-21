#!/bin/bash

echo "🧹 Cleaning build environment..."

# Clean dist directory
rm -rf dist/

# Clean temporary files that don't require sudo
rm -rf /tmp/electron-builder-* 2>/dev/null || true

# Kill any hanging hdiutil processes (user processes only, no sudo needed)
pkill -f hdiutil 2>/dev/null || true

# Detach any mounted volumes
hdiutil detach /Volumes/PaperArxiv* 2>/dev/null || true

# Clean node_modules/.cache if it exists
rm -rf node_modules/.cache/ 2>/dev/null || true

# Clean electron-builder cache
rm -rf ~/Library/Caches/electron-builder/ 2>/dev/null || true

# Clean npm cache
npm cache clean --force 2>/dev/null || true

echo "✅ Build environment cleaned!"
echo "💡 Now try: npm run build:mac-arm64"