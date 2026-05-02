#!/usr/bin/env bash
# Continuum installer — clone, install deps, symlink the CLI.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/YusufLisawi/continuum/main/install.sh | bash
#
# Env overrides (optional):
#   CONTINUUM_DIR — where to clone (default: ~/.local/share/continuum)
#   CONTINUUM_BIN — where to symlink (default: ~/.bun/bin or ~/.local/bin)
#   CONTINUUM_REPO — git URL to clone (default: https://github.com/YusufLisawi/continuum.git)

set -e

REPO="${CONTINUUM_REPO:-https://github.com/YusufLisawi/continuum.git}"
CONTINUUM_DIR="${CONTINUUM_DIR:-$HOME/.local/share/continuum}"
CONTINUUM_BIN="${CONTINUUM_BIN:-}"

if ! command -v bun >/dev/null 2>&1; then
  echo "continuum: bun is required. Install it from https://bun.sh, then rerun." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "continuum: git is required." >&2
  exit 1
fi

choose_bin_dir() {
  for d in "$HOME/.bun/bin" "$HOME/.local/bin" "$HOME/bin"; do
    if [ -d "$d" ]; then echo "$d"; return; fi
  done
  mkdir -p "$HOME/.local/bin"
  echo "$HOME/.local/bin"
}

[ -z "$CONTINUUM_BIN" ] && CONTINUUM_BIN="$(choose_bin_dir)"

echo "continuum: installing into $CONTINUUM_DIR"

if [ -d "$CONTINUUM_DIR/.git" ]; then
  ( cd "$CONTINUUM_DIR" && git pull --ff-only --quiet ) || \
    echo "continuum: pull failed, using existing checkout." >&2
else
  mkdir -p "$(dirname "$CONTINUUM_DIR")"
  git clone --quiet "$REPO" "$CONTINUUM_DIR"
fi

( cd "$CONTINUUM_DIR" && bun install --silent )

mkdir -p "$CONTINUUM_BIN"
chmod +x "$CONTINUUM_DIR/scripts/continuum-cli" 2>/dev/null || true
TARGET="$CONTINUUM_BIN/continuum"
ln -sf "$CONTINUUM_DIR/scripts/continuum-cli" "$TARGET"

echo "continuum: linked $TARGET → $CONTINUUM_DIR/scripts/continuum-cli"

case ":$PATH:" in
  *":$CONTINUUM_BIN:"*) ;;
  *)
    echo
    echo "  $CONTINUUM_BIN is not on your PATH. Add this to your shell rc:"
    echo
    echo "    export PATH=\"$CONTINUUM_BIN:\$PATH\""
    echo
    ;;
esac

echo
echo "continuum: ready. Try:"
echo "  continuum init"
echo "  continuum --help"
