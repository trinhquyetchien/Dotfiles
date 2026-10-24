#!/bin/bash
set -e

UUID="reminder_alarm_clock@trifonovkv.gmail.com"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "Compiling schemas..."
glib-compile-schemas schemas/

echo "Installing to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
rsync -a --exclude='*.zip' --exclude='.git' --exclude='install.sh' . "$INSTALL_DIR/"

echo "Done. Restart GNOME Shell or log out/in to apply changes."
