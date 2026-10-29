#!/usr/bin/env python3
"""Refresh the GitHub contributions graph in index.html (the Contact panel).

Uses the `gh` CLI (already logged in) to read the public contribution calendar for
ammerallj, and rewrites the markup between the COMMITS:START / COMMITS:END markers.
Contribution COUNTS per day only — no repository names. Run it, review the diff,
commit:   python3 scripts/update-github-commits.py
"""
import json, re, subprocess, sys, pathlib

USER = "ammerallj"
Q = ('query { user(login:"%s") { contributionsCollection { contributionCalendar '
     '{ totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } } } }' % USER)
LEVEL = {"NONE": 0, "FIRST_QUARTILE": 1, "SECOND_QUARTILE": 2, "THIRD_QUARTILE": 3, "FOURTH_QUARTILE": 4}

out = subprocess.run(["gh", "api", "graphql", "-f", "query=" + Q], capture_output=True, text=True)
if out.returncode:
    sys.exit(out.stderr)
cal = json.loads(out.stdout)["data"]["user"]["contributionsCollection"]["contributionCalendar"]
total = cal["totalContributions"]

cells = []
for w in cal["weeks"]:
    for d in w["contributionDays"]:
        n = d["contributionCount"]
        lvl = LEVEL[d["contributionLevel"]]
        cells.append('<i class="c%d" data-d="%s" data-n="%d"></i>' % (lvl, d["date"], n))  # data-* feed the hover tooltip

markup = (
    '<!-- COMMITS:START (scripts/update-github-commits.py) -->\n'
    '        <figure class="contact-commits" data-reveal>\n'
    '          <figcaption class="visually-hidden">%s contributions on GitHub in the last year</figcaption>\n'
    '          <div class="commit-grid" role="img" aria-label="GitHub contribution graph: %s contributions in the last year">\n'
    '            %s\n'
    '          </div>\n'
    '        </figure>\n'
    '        <!-- COMMITS:END -->'
) % (format(total, ","), format(total, ","), "".join(cells))

p = pathlib.Path(__file__).resolve().parent.parent / "index.html"
s = p.read_text()
new, n = re.subn(r"<!-- COMMITS:START.*?<!-- COMMITS:END -->", lambda m: markup, s, flags=re.S)
if n != 1:
    sys.exit("markers not found in index.html")
p.write_text(new)
print("updated:", total, "contributions,", len(cells), "days")
