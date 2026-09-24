#!/usr/bin/env bash
#
# ship.sh — publish `staging` to the live site.
#
#   <experiment>  ──stage.sh──▶  staging  ──ship.sh──▶  main (= the live site)
#
# GitHub Pages deploys `main` to ammerallj.design, so this is the ONLY step that
# changes what visitors see. It fast-forwards main to exactly the commit you
# tested on staging — no new merge commit, so what ships is byte-for-byte what
# you previewed.
#
# Usage:
#   ./scripts/ship.sh          # shows what will go live, asks to confirm
#   ./scripts/ship.sh --yes    # skip the prompt
#
# After it runs, give Pages a minute, then HARD-RELOAD before judging anything
# (CLAUDE.md: index.html has no cache-buster of its own).
#
set -euo pipefail
cd "$(dirname "$0")/.."

# Uncommitted edits were in the preview you tested but won't be in what ships.
if [ "$(git branch --show-current)" = "staging" ] && ! git diff --quiet HEAD; then
  echo "ship.sh: staging has uncommitted changes — you previewed them, but they would NOT ship." >&2
  echo "Commit or stash first:" >&2
  git status --short >&2
  exit 1
fi

git fetch origin --quiet

if ! git merge-base --is-ancestor origin/main staging; then
  echo "ship.sh: origin/main has commits staging doesn't. Bring them in first:" >&2
  echo "  git merge origin/main    # on staging, then re-test" >&2
  exit 1
fi

pending=$(git log --oneline origin/main..staging)
if [ -z "$pending" ]; then
  echo "ship.sh: nothing to ship — main is already at staging."
  exit 0
fi

echo "going live on ammerallj.design:"
echo "$pending" | sed 's/^/  /'
echo

if [ "${1:-}" != "--yes" ]; then
  read -r -p "ship it? [y/N] " answer
  case "$answer" in y|Y|yes) ;; *) echo "not shipped."; exit 1 ;; esac
fi

git push origin staging staging:main
# Keep the local main ref in step (skipped if main is checked out somewhere).
git branch -f main staging 2>/dev/null || true

echo
echo "shipped. Pages rebuilds in ~1 min — hard-reload before checking."
