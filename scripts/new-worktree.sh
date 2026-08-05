#!/usr/bin/env bash
#
# new-worktree.sh — give a chat its own isolated checkout.
#
# The clean cross-chat workflow: ONE chat per worktree. Each worktree is a
# separate working directory on its own branch, sharing this repo's history.
# Two chats can then edit in parallel without stomping each other's files, and
# any genuine overlap surfaces as a git merge conflict you can see — instead of
# one chat's edits silently landing under the other mid-task.
#
# Usage (from the repo root):
#   ./scripts/new-worktree.sh mobile-header
#
# creates ../portfolio-mobile-header/ on a new branch `mobile-header`, branched
# from the current HEAD. Point a fresh chat at that folder. When the work is
# done and merged, remove it:
#   git worktree remove ../portfolio-mobile-header
#
set -euo pipefail
cd "$(dirname "$0")/.."

name="${1:-}"
if [ -z "$name" ]; then
  echo "usage: $0 <branch-name>   (e.g. $0 mobile-header)" >&2
  exit 1
fi

dir="../portfolio-$name"
git worktree add "$dir" -b "$name"
echo
echo "worktree ready:  $dir   (branch: $name)"
echo "open a new chat with that folder as its working directory."
