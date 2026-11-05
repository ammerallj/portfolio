#!/usr/bin/env python3
"""Stamp the footer's "Updated on <date>" on every page with today's date.

Run by scripts/ship.sh just before the live push, so the date on the live site is the day it
actually shipped. Safe to run by hand:  python3 scripts/stamp-updated.py [YYYY-MM-DD]
Rewrites only the <time class="footer-updated-date"> element, on index.html, 404.html and
every work/*.html. Every one of those pages must carry exactly one such element.
"""
import datetime, pathlib, re, sys

day = datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today()
human = day.strftime("%B ") + str(day.day) + day.strftime(", %Y")   # October 29, 2026 (no zero-padding)
root = pathlib.Path(__file__).resolve().parent.parent
pages = [root / "index.html", root / "404.html"] + sorted((root / "work").glob("*.html"))
pat = re.compile(r'<time class="footer-updated-date" datetime="[^"]*">[^<]*</time>')
repl = '<time class="footer-updated-date" datetime="%s">%s</time>' % (day.isoformat(), human)
for p in pages:
    s = p.read_text()
    new, n = pat.subn(repl, s)
    if n != 1:
        sys.exit("footer-updated-date element not found exactly once in %s" % p.name)
    if new != s:
        p.write_text(new)
print("stamped:", human, "on", len(pages), "pages")
