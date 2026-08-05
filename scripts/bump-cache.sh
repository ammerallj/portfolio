#!/usr/bin/env bash
#
# bump-cache.sh — stamp every cache-buster (?v=…) from CONTENT, not by hand.
#
# Why this exists: the ?v= number used to be a hand-incremented counter kept in
# sync across ~10 places. Two chats editing the site in parallel would both bump
# it and collide. This derives the version from a hash of the actual CSS / JS,
# so:
#   • identical content → identical version   (no spurious refetches)
#   • any content change → new version         (never stale)
#   • two chats with different content → different versions, and the ?v= line
#     shows up as a real git merge conflict instead of a silent overwrite.
#
# CSS and JS keep SEPARATE versions (as before): a CSS-only edit must not force
# a refetch of main.js, and vice-versa.
#
# Run it from the repo root as the last step before committing a CSS/JS change:
#   ./scripts/bump-cache.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

# CSS version = hash of every component stylesheet (the files that actually
# change). style.css itself is excluded: it only holds the @import list whose
# ?v= we are about to rewrite, so hashing it would fold the version into its own
# input.
CSSV=$(cat css/components/*.css | shasum -a 1 | cut -c1-8)

# JS version = hash of the one script file.
JSV=$(shasum -a 1 js/main.js | cut -c1-8)

# Stamp CSS refs (the <link> in every HTML page + every @import in style.css).
sed -i '' "s|\.css?v=[0-9a-f]*|.css?v=$CSSV|g" index.html style.css work/*.html

# Stamp the js/main.js <script> ref in every HTML page.
sed -i '' "s|main\.js?v=[0-9a-f]*|main.js?v=$JSV|g" index.html work/*.html

echo "cache-busters stamped:  css=$CSSV  js=$JSV"
