#!/usr/bin/env bash
#
# preview.sh — publish `staging` to the hosted preview.
#
#   <experiment>  ──stage.sh──▶  staging  ──ship.sh──▶  main (= the live site)
#                                   │
#                                preview.sh ──▶ https://ammerallj.github.io/portfolio-staging/
#
# stage.sh runs this for you after every merge. Run it by hand after committing
# straight on staging. It never touches the live site.
#
# The preview is a SEPARATE public repo (ammerallj/portfolio-staging) because
# GitHub Pages serves one site per repo. Its build is
# .github/workflows/staging-preview.yml: same Jekyll build as the live site, minus
# the custom domain, and hidden from search engines. Anyone with the URL can
# still see it.
#
set -euo pipefail
cd "$(dirname "$0")/.."

url="https://ammerallj.github.io/portfolio-staging/"
remote_url="https://github.com/ammerallj/portfolio-staging.git"

# The remote is per-clone config, so add it on first use.
git remote get-url preview >/dev/null 2>&1 || git remote add preview "$remote_url"

git push --force preview staging:main
git push origin staging --quiet 2>/dev/null || true

echo
echo "preview publishing — live in ~1 min at:"
echo "  $url"
echo "(hard-reload; watch the build with: gh run list -R ammerallj/portfolio-staging -L 1)"
