# PaperArxiv v0.2.0 Release Notes

## 🎉 Major Update: AI Integration & Modern Tech Stack

We're excited to announce PaperArxiv v0.2.0, a significant upgrade that brings AI-powered features, modern technology stack, and numerous improvements!

## ✨ What's New

### 🤖 AI-Powered Features
- **Ollama Integration**: Automatically extract paper metadata using local AI models
- **Smart Metadata Extraction**: AI extracts title, authors, affiliations, year, journal, and more
- **Intelligent Categorization**: AI suggests relevant tags and library paths based on paper content
- **Chinese Summary Generation**: Get one-sentence summaries of paper contributions in Chinese
- **Configurable AI Settings**: Customize Ollama host, model, temperature, and other parameters

### 🛠 Technical Improvements
- **Electron 33.4.11**: Upgraded from Electron 13 to the latest version for better performance and security
- **Vue 3.5.13**: Migrated to Vue 3 for improved reactivity and composition API
- **Element Plus**: Modern UI framework replacing deprecated Element UI
- **electron-builder**: Replaced electron-packager with modern build system
- **Universal Binary Support**: Native support for Apple Silicon (M1/M2/M3) Macs

### 🎨 UI/UX Enhancements
- **Window Size**: Increased default window size by 20% (1200x840) for better visibility
- **Fixed Search**: Resolved issues with tag and tree clicking functionality
- **Author Search**: Implemented exact-match search for author names
- **Improved Performance**: Optimized search queries and rendering engine
- **Clean Logs**: Removed unnecessary console logs for cleaner operation

### 🐛 Bug Fixes
- Fixed tag and tree node clicking returning empty results
- Fixed author search to use exact full name matching
- Fixed Element Plus deprecated "mini" size warnings
- Fixed filename generation to properly remove HTML tags from author names
- Fixed @electron/remote module loading issues in packaged apps
- Fixed hdiutil DMG creation issues on macOS

### 📦 Build System
- Modern build configuration with electron-builder
- Support for multiple platforms and architectures:
  - macOS: Universal (Intel + ARM), ARM64, x64
  - Windows: NSIS installer and portable
  - Linux: AppImage, deb, and rpm packages
- Automated dependency handling and native module rebuilding
- Clean build scripts without sudo requirements

## 📥 Downloads

Download the appropriate version for your platform:

### macOS
- **Universal (Intel + Apple Silicon)**: `PaperArxiv-0.2.0-universal.dmg`
- **Apple Silicon only**: `PaperArxiv-0.2.0-arm64.dmg`
- **Intel only**: `PaperArxiv-0.2.0.dmg`

### Windows
- **Installer**: `PaperArxiv Setup 0.2.0.exe`
- **Portable**: `PaperArxiv 0.2.0.exe`

### Linux
- **AppImage**: `PaperArxiv-0.2.0.AppImage`
- **Debian/Ubuntu**: `PaperArxiv_0.2.0_amd64.deb`
- **Fedora/RHEL**: `PaperArxiv-0.2.0.x86_64.rpm`

## 🔧 Installation

### Prerequisites
1. **Poppler** (required for PDF processing)
   ```bash
   # macOS
   brew install poppler
   
   # Windows (Conda)
   conda install -c conda-forge poppler
   
   # Linux
   sudo apt-get install poppler-utils  # Debian/Ubuntu
   sudo dnf install poppler-utils      # Fedora
   ```

2. **Ollama** (optional, for AI features)
   ```bash
   # Install from https://ollama.com
   # Then pull a model:
   ollama pull gemma3n:latest
   ```

## 🙏 Acknowledgments

Thanks to all contributors and users who provided feedback and suggestions!

## 📝 Notes

- This release includes breaking changes in the build system
- Old build scripts (buildmac, buildwin, etc.) are replaced with npm run build:*
- The main branch has been renamed from 'master' to 'main'

---

For more details, see the [full changelog](https://github.com/fuzihaofzh/PaperArxiv/compare/v0.1.2...v0.2.0)