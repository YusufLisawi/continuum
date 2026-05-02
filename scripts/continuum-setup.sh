#!/bin/bash
# Continuum plugin setup. Runs once on plugin install (Setup hook).
# - Installs npm deps so src/bin.ts can run.
# - Symlinks the `continuum` CLI into a directory that's on PATH for most
#   shells (~/.bun/bin if it exists, else ~/.local/bin).
# Idempotent: safe to re-run.

set -e

ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
WRAPPER="$ROOT/scripts/continuum-cli"

if [ ! -f "$WRAPPER" ]; then
  echo "continuum: setup skipped — wrapper missing at $WRAPPER" >&2
  exit 0
fi

chmod +x "$WRAPPER" 2>/dev/null || true

# 1. Install deps so `bun src/bin.ts` works.
if command -v bun >/dev/null 2>&1; then
  ( cd "$ROOT" && bun install --silent ) >/dev/null 2>&1 || true
else
  echo "continuum: bun not found on PATH — skipping deps install. Install bun then rerun /plugin install continuum@continuum." >&2
fi

# 2. Pick a bin dir on the user's PATH.
choose_bin_dir() {
  for d in "$HOME/.bun/bin" "$HOME/.local/bin" "$HOME/bin"; do
    if [ -d "$d" ]; then
      echo "$d"
      return
    fi
  done
  mkdir -p "$HOME/.local/bin"
  echo "$HOME/.local/bin"
}

BIN_DIR="$(choose_bin_dir)"
TARGET="$BIN_DIR/continuum"

if [ -e "$TARGET" ] || [ -L "$TARGET" ]; then
  rm -f "$TARGET"
fi
ln -sf "$WRAPPER" "$TARGET"

# 3. Friendly nudge if the chosen dir isn't on PATH.
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo "continuum: installed CLI at $TARGET, but $BIN_DIR is not on your PATH." >&2
    echo "  Add this to your shell rc to enable the \`continuum\` command:" >&2
    echo "    export PATH=\"$BIN_DIR:\$PATH\"" >&2
    ;;
esac

echo "continuum: CLI ready at $TARGET"
