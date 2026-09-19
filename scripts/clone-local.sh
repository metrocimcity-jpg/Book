#!/usr/bin/env bash
# Clone Book (and optionally other Metropolitan CIM repos) onto this machine.
set -euo pipefail

OWNER="metrocimcity-jpg"
ROOT="${ROOT:-$HOME/@LIB}"
ALL=0
EXTRA=()

usage() {
  cat <<'EOF'
Clone Book onto this machine.

Usage:
  ./scripts/clone-local.sh [--root DIR] [--all] [extra-repo ...]

Defaults:
  --root  $HOME/@LIB   (override with ROOT=... or --root)
  --all   also clone the other public Metropolitan CIM repositories
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --root)
      ROOT="${2:?--root needs a directory}"
      shift 2
      ;;
    --all)
      ALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      EXTRA+=("$@")
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      EXTRA+=("$1")
      shift
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "git is not on PATH." >&2
  exit 1
fi

SIBLINGS=(
  MetroCIM
  MetroBI
  Web
  City
  PyroBIM
  Alita
  Atlas
  CircoBIM
  PowerBIM
  Graph
  COBieAutomation
  RevitAddins
)

NAMES=(Book)
if [[ "$ALL" -eq 1 ]]; then
  NAMES+=("${SIBLINGS[@]}")
fi
if [[ ${#EXTRA[@]} -gt 0 ]]; then
  NAMES+=("${EXTRA[@]}")
fi

mkdir -p "$ROOT"
ROOT="$(cd "$ROOT" && pwd)"

cloned=""
already_listed() {
  case " $cloned " in
    *" $1 "*) return 0 ;;
    *) return 1 ;;
  esac
}

for name in "${NAMES[@]}"; do
  [[ -n "$name" ]] || continue
  already_listed "$name" && continue
  cloned="$cloned $name"

  dest="$ROOT/$name"
  url="https://github.com/$OWNER/$name.git"

  if [[ -d "$dest/.git" ]]; then
    echo "Updating $name in $dest"
    git -C "$dest" pull --ff-only
    continue
  fi

  if [[ -e "$dest" ]]; then
    echo "Refusing to clone $name: $dest exists and is not a git repo." >&2
    exit 1
  fi

  echo "Cloning $url -> $dest"
  git clone "$url" "$dest"
done

echo "Local clones are under $ROOT"
echo "Book: $ROOT/Book"
