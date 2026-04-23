#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PUBLIC_DIR="$ROOT_DIR/worker/public"

rm -rf "$PUBLIC_DIR"
mkdir -p "$PUBLIC_DIR"

rsync -a \
  "$ROOT_DIR/admin" \
  "$ROOT_DIR/content" \
  "$ROOT_DIR/images" \
  "$ROOT_DIR/index.html" \
  "$ROOT_DIR/script.js" \
  "$ROOT_DIR/styles.css" \
  "$PUBLIC_DIR"/
