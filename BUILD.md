# Build Instructions

PaperArxiv now uses `electron-builder` for modern, efficient building and packaging.

## Prerequisites

Make sure you have Node.js 18+ installed and run:

```bash
npm install
```

## Development

```bash
# Run in development mode
npm start
# or
npm run dev
```

## Building

### Build for current platform
```bash
npm run build
```

### Build for specific platforms
```bash
# macOS (All architectures - creates Universal, ARM64, and x64 builds)
npm run build:mac

# macOS (Universal - Intel + Apple Silicon combined)
npm run build:mac-universal

# macOS (Apple Silicon only)
npm run build:mac-arm64

# macOS (Intel only)
npm run build:mac-x64

# Windows
npm run build:win

# Linux
npm run build:linux

# All platforms
npm run build:all
```

### Package without installer
```bash
# Creates unpacked app in dist/
npm run pack
```

## Output

Built applications will be in the `dist/` directory:

- **macOS**: 
  - `PaperArxiv-x.x.x-universal.dmg` / `.zip` (Universal - Intel + ARM)
  - `PaperArxiv-x.x.x-arm64.dmg` / `.zip` (Apple Silicon only)
  - `PaperArxiv-x.x.x-x64.dmg` / `.zip` (Intel only)
- **Windows**: `PaperArxiv Setup x.x.x.exe` and `PaperArxiv x.x.x.exe` (portable)
- **Linux**: `PaperArxiv-x.x.x.AppImage`, `.deb`, and `.rpm` packages

## Troubleshooting

### DMG Creation Issues on Apple Silicon

If you encounter `hdiutil` errors during DMG creation, try these solutions:

1. **Use the automated clean script**:
   ```bash
   npm run clean
   npm run build:mac-arm64
   ```
   
2. **Or use rebuild (clean + build)**:
   ```bash
   npm run rebuild
   ```

3. **Check disk space**: Ensure you have sufficient free space (at least 2GB)
4. **Reset hdiutil**:
   ```bash
   pkill -f hdiutil
   hdiutil detach /Volumes/PaperArxiv* 2>/dev/null || true
   ```
5. **Check system info**:
   ```bash
   npm run debug:hdiutil
   npm run debug:system
   ```
6. **Alternative: Build only ZIP** (if DMG continues to fail):
   ```bash
   # Temporarily disable DMG and build ZIP only
   npm run build:mac-arm64 -- --config.mac.target.0.target=zip
   ```

### Permissions Issues

If you get permission errors, try:
```bash
xattr -cr dist/
chmod -R 755 dist/
```

## Features

- Universal macOS builds (Intel + Apple Silicon)
- Windows NSIS installer with user preferences
- Linux AppImage, deb, and rpm packages
- Automatic dependency handling
- Code signing ready (configure certificates as needed)
- Optimized bundle size with file exclusions

## Migration from old scripts

Old electron-packager commands are replaced:
- `npm run buildmac` → `npm run build:mac`
- `npm run buildwin` → `npm run build:win`
- `npm run buildlinux` → `npm run build:linux`
- `npm run buildall` → `npm run build:all`