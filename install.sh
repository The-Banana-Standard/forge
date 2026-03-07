#!/bin/bash
set -euo pipefail

REPO="The-Banana-Standard/canopy"
APP_NAME="Canopy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

info() { printf "${BOLD}${GREEN}==>${NC} ${BOLD}%s${NC}\n" "$1"; }
warn() { printf "${YELLOW}Warning:${NC} %s\n" "$1"; }
error() { printf "${RED}Error:${NC} %s\n" "$1" >&2; exit 1; }

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) PLATFORM="macos" ;;
  Linux)  PLATFORM="linux" ;;
  *)      error "Unsupported platform: $OS. Use the releases page: https://github.com/$REPO/releases" ;;
esac

case "$ARCH" in
  arm64|aarch64) ARCH_LABEL="aarch64" ;;
  x86_64|amd64)  ARCH_LABEL="x64" ;;
  *)             error "Unsupported architecture: $ARCH" ;;
esac

# Get latest release tag
info "Fetching latest release..."
LATEST_TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
VERSION="${LATEST_TAG#v}"

if [ -z "$VERSION" ]; then
  error "Could not determine latest version. Check https://github.com/$REPO/releases"
fi

info "Installing $APP_NAME v$VERSION for $PLATFORM ($ARCH_LABEL)..."

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

if [ "$PLATFORM" = "macos" ]; then
  DMG_NAME="Canopy_${VERSION}_${ARCH_LABEL}.dmg"
  DMG_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/$DMG_NAME"

  info "Downloading $DMG_NAME..."
  curl -fSL --progress-bar -o "$TMPDIR/$DMG_NAME" "$DMG_URL" || error "Download failed. Check https://github.com/$REPO/releases"

  info "Installing to /Applications..."
  hdiutil attach "$TMPDIR/$DMG_NAME" -quiet -mountpoint "$TMPDIR/mnt"
  if [ -d "/Applications/$APP_NAME.app" ]; then
    rm -rf "/Applications/$APP_NAME.app"
  fi
  cp -R "$TMPDIR/mnt/$APP_NAME.app" /Applications/
  hdiutil detach "$TMPDIR/mnt" -quiet

  info "$APP_NAME v$VERSION installed to /Applications/$APP_NAME.app"
  printf "\n  Open it from your Applications folder or run:\n"
  printf "  ${BOLD}open /Applications/$APP_NAME.app${NC}\n\n"

elif [ "$PLATFORM" = "linux" ]; then
  if command -v dpkg &>/dev/null; then
    DEB_NAME="Canopy_${VERSION}_amd64.deb"
    DEB_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/$DEB_NAME"

    info "Downloading $DEB_NAME..."
    curl -fSL --progress-bar -o "$TMPDIR/$DEB_NAME" "$DEB_URL" || error "Download failed."

    info "Installing (may need sudo)..."
    sudo dpkg -i "$TMPDIR/$DEB_NAME"
    info "$APP_NAME v$VERSION installed. Run 'canopy' to start."
  else
    APPIMAGE_NAME="Canopy_${VERSION}_amd64.AppImage"
    APPIMAGE_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/$APPIMAGE_NAME"

    info "Downloading $APPIMAGE_NAME..."
    curl -fSL --progress-bar -o "$TMPDIR/$APPIMAGE_NAME" "$APPIMAGE_URL" || error "Download failed."

    INSTALL_DIR="${HOME}/.local/bin"
    mkdir -p "$INSTALL_DIR"
    mv "$TMPDIR/$APPIMAGE_NAME" "$INSTALL_DIR/canopy"
    chmod +x "$INSTALL_DIR/canopy"
    info "$APP_NAME v$VERSION installed to $INSTALL_DIR/canopy"
  fi
fi
