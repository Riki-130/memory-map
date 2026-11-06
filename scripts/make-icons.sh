#!/bin/sh
# Generate PWA / home-screen icons from a square source image (macOS sips).
# Usage: scripts/make-icons.sh [source.png]   (default: assets/source/app-icon.png)
set -eu
SRC="${1:-assets/source/app-icon.png}"
OUT="public/icons"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

W=$(sips -g pixelWidth "$SRC" | awk '/pixelWidth/ {print $2}')
H=$(sips -g pixelHeight "$SRC" | awk '/pixelHeight/ {print $2}')
SIDE=$(( W > H ? W : H ))
# Pad non-square sources onto the theme's Soft Butter background.
sips -s format png -p "$SIDE" "$SIDE" --padColor F1EBCB "$SRC" --out "$TMP/square.png" >/dev/null

sips -z 180 180 "$TMP/square.png" --out "$OUT/apple-touch-icon.png" >/dev/null
sips -z 192 192 "$TMP/square.png" --out "$OUT/icon-192.png" >/dev/null
sips -z 512 512 "$TMP/square.png" --out "$OUT/icon-512.png" >/dev/null
sips -z 64 64 "$TMP/square.png" --out "$OUT/favicon-64.png" >/dev/null
ls -l "$OUT"
