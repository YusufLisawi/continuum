#!/bin/bash
# Continuum plugin setup. Runs once on plugin install (Setup hook).
# - Installs npm deps so src/bin.ts can run.
# - Symlinks the `continuum` CLI into a directory that's on PATH for most
#   shells (~/.bun/bin if it exists, else ~/.local/bin, else ~/bin).
# - Preserves an existing developer symlink that points outside the plugin
#   cache so `bun link` / live-linked dev setups aren't clobbered.
#
# Idempotent: safe to re-run. Honors CONTINUUM_BIN env var to override
# the chosen bin directory.

set -e

ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
WRAPPER="$ROOT/scripts/continuum-cli"

if [ ! -f "$WRAPPER" ]; then
  echo "continuum: setup skipped — wrapper missing at $WRAPPER" >&2
  exit 0
fi

chmod +x "$WRAPPER" 2>/dev/null || true

# Install deps so `bun src/bin.ts` works at runtime.
if command -v bun >/dev/null 2>&1; then
  ( cd "$ROOT" && bun install --silent ) >/dev/null 2>&1 || true
else
  echo "continuum: bun not found on PATH — runtime will fail. Install bun: https://bun.sh" >&2
fi

choose_bin_dir() {
  if [ -n "$CONTINUUM_BIN" ]; then
    echo "$CONTINUUM_BIN"
    return
  fi
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
mkdir -p "$BIN_DIR"
TARGET="$BIN_DIR/continuum"

# Preserve dev symlinks. If $TARGET already points outside the plugin cache
# AND outside this plugin root, assume it's a dev/local install and leave
# it alone (so `bun link` or live-link setups survive plugin updates).
if [ -L "$TARGET" ]; then
  EXISTING="$(readlink "$TARGET" 2>/dev/null || true)"
  case "$EXISTING" in
    *"/.claude/plugins/cache/"*|"$ROOT"/*)
      # plugin-installed link, fine to overwrite
      rm -f "$TARGET"
      ;;
    "")
      rm -f "$TARGET"
      ;;
    *)
      echo "continuum: leaving existing CLI symlink at $TARGET" >&2
      echo "           it points to $EXISTING (looks like a dev/local install)." >&2
      echo "           To replace with the plugin copy: rm $TARGET && /plugin install continuum@continuum" >&2
      exit 0
      ;;
  esac
elif [ -e "$TARGET" ]; then
  # A regular file at the target — don't clobber unknown user files.
  echo "continuum: a non-symlink already exists at $TARGET; not overwriting." >&2
  exit 0
fi

ln -sf "$WRAPPER" "$TARGET"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo "continuum: installed CLI at $TARGET, but $BIN_DIR is not on your PATH." >&2
    echo "  Add this to your shell rc to enable the \`continuum\` command:" >&2
    echo "    export PATH=\"$BIN_DIR:\$PATH\"" >&2
    ;;
esac

echo "continuum: CLI ready at $TARGET"
