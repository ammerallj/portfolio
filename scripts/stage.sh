#!/usr/bin/env bash
#
# stage.sh — merge a finished experiment into `staging` for testing.
#
#   <experiment>  ──stage.sh──▶  staging  ──ship.sh──▶  main (= the live site)
#
# Run from the folder that has `staging` checked out (the repo's main folder).
#
# Usage:
#   ./scripts/stage.sh mobile-header
#
# Nothing here touches the live site. After merging it publishes staging to the
# hosted preview (scripts/preview.sh) and prints local URLs too; check it, then
# ship it with ./scripts/ship.sh.
#
# ?v= CONFLICTS ARE EXPECTED when two branches both edited CSS or js/main.js —
# each stamped its own content hash. Resolve by keeping either side, then
# re-stamp from the merged content:
#   ./scripts/bump-cache.sh && git add index.html style.css work/*.html
#   git commit --no-edit
#
set -euo pipefail
cd "$(dirname "$0")/.."

branch="${1:-}"
if [ -z "$branch" ]; then
  echo "usage: $0 <branch-to-stage>" >&2
  exit 1
fi

current=$(git branch --show-current)
if [ "$current" != "staging" ]; then
  echo "stage.sh: this folder is on '$current', not 'staging'." >&2
  echo "Run it from the folder where staging is checked out (git worktree list)." >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "stage.sh: staging has uncommitted changes — commit or stash them first:" >&2
  git status --short >&2
  exit 1
fi

git merge --no-ff "$branch" -m "Stage $branch"

echo
echo "staged '$branch'."
./scripts/preview.sh

port=3456
lan=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)
echo
echo "or locally (python3 -m http.server $port, or the 'portfolio' preview):"
echo "  desktop:  http://localhost:$port"
[ -n "$lan" ] && echo "  phone:    http://$lan:$port   (same Wi-Fi)"
echo "happy with it?  ./scripts/ship.sh"
