#!/usr/bin/env python3
"""Stamp the footer's "Updated on <date>" in index.html with today's date.

Run by scripts/ship.sh just before the live push, so the date on the live site is the day it
actually shipped. Safe to run by hand:  python3 scripts/stamp-updated.py [YYYY-MM-DD]
Rewrites only the <time class="footer-updated-date"> element.
"""
import datetime, pathlib, re, sys

day = datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today()
human = day.strftime("%B ") + str(day.day) + day.strftime(", %Y")   # October 29, 2026 (no zero-padding)
p = pathlib.Path(__file__).resolve().parent.parent / "index.html"
s = p.read_text()
new, n = re.subn(r'<time class="footer-updated-date" datetime="[^"]*">[^<]*</time>',
                 '<time class="footer-updated-date" datetime="%s">%s</time>' % (day.isoformat(), human), s)
if n != 1:
    sys.exit("footer-updated-date element not found in index.html")
if new != s:
    p.write_text(new)
print("stamped:", human)
