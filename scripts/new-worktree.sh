#!/usr/bin/env bash
#
# new-worktree.sh — start an experiment in its own isolated checkout.
#
# Branch flow (CLAUDE.md "Branch workflow"):
#   <experiment>  ──stage.sh──▶  staging  ──ship.sh──▶  main (= the live site)
#
# ONE chat per worktree. Each worktree is a separate folder on its own branch,
# sharing this repo's history, so parallel chats can't stomp each other's files
# and any genuine overlap surfaces as a merge conflict instead of a silent
# overwrite.
#
# Usage (from the repo root):
#   ./scripts/new-worktree.sh mobile-header            # branches from staging
#   ./scripts/new-worktree.sh mobile-header main       # or from another base
#
# creates ../portfolio-mobile-header/ on a new branch `mobile-header`. Point a
# fresh chat at that folder. When it's staged and shipped, remove it:
#   git worktree remove ../portfolio-mobile-header && git branch -d mobile-header
#
set -euo pipefail
cd "$(dirname "$0")/.."

name="${1:-}"
base="${2:-staging}"
if [ -z "$name" ]; then
  echo "usage: $0 <branch-name> [base]   (e.g. $0 mobile-header)" >&2
  exit 1
fi

dir="../portfolio-$name"
git worktree add "$dir" -b "$name" "$base"
echo
echo "worktree ready:  $dir   (branch: $name, from $base)"
echo "open a new chat with that folder as its working directory."
echo "when it's ready to test:  ./scripts/stage.sh $name   (run from the main folder)"
