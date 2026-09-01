#!/usr/bin/env bash
# Installs the MCP Bridge CEP panel into After Effects on macOS and enables
# CEP's debug mode so an unsigned, unpackaged extension is allowed to load.
#
# Run this on the machine that has After Effects installed (this script does
# nothing useful in a container/CI environment without AE).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_SRC="$SCRIPT_DIR/../cep-extension"
EXT_DEST_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
EXT_DEST="$EXT_DEST_DIR/com.after-effects-mcp.bridge"

mkdir -p "$EXT_DEST_DIR"

if [ -e "$EXT_DEST" ] || [ -L "$EXT_DEST" ]; then
  echo "Removing existing extension at $EXT_DEST"
  rm -rf "$EXT_DEST"
fi

echo "Linking $EXT_SRC -> $EXT_DEST"
ln -s "$EXT_SRC" "$EXT_DEST"

echo "Enabling CEP debug mode (allows loading unsigned/unpackaged extensions) for known CSXS versions..."
for v in 6 7 8 9 10 11 12; do
  defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1 2>/dev/null || true
done

cat <<'EOF'

Done. Next steps:
  1. Fully quit and restart After Effects.
  2. Open Window > Extensions > MCP Bridge.
  3. It should show "Running on port 39843" - leave the panel open.
  4. In another terminal, from after-effects-mcp/: npm install && npm run build && npm start
     (or point your MCP client at "node <path-to>/after-effects-mcp/dist/index.js")
EOF
