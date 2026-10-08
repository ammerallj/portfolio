#!/usr/bin/env node
/* Build the JennaOS knowledge file from the plain-text brain.
 *
 *   node scripts/build-brain.js [path/to/jennaos-brain.txt]
 *
 * jennaos-brain.txt is the source of truth. Edit that, run this, and it
 * regenerates js/jennaos-knowledge.js (which the site loads). Then run
 * `node scripts/test-brain.js` to make sure nothing started answering wrongly.
 *
 * The txt format is described at the top of the txt itself. A block with no
 * TOPIC or no ID (like the NEW TOPIC template) is skipped.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = process.argv[2] || path.join(root, 'jennaos-brain.txt');
const dest = path.join(root, 'js/jennaos-knowledge.js');

const raw = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
const blocks = raw.split(/^={10,}\s*$/m);

const list = s => (s || '').split(',').map(x => x.trim()).filter(Boolean);
const pipe = s => (s || '').split('|').map(x => x.trim()).filter(Boolean);

const entries = [];
const problems = [];
for (const block of blocks) {
  if (!/^TOPIC:/m.test(block)) continue;
  const answerAt = block.search(/^ANSWER:[ \t]*$/m);
  if (answerAt < 0) { problems.push('No ANSWER: line in block starting ' + block.trim().slice(0, 40)); continue; }
  const head = block.slice(0, answerAt);
  const text = block.slice(answerAt).replace(/^ANSWER:[ \t]*\n/, '').trim();

  const field = name => {
    const m = head.match(new RegExp('^' + name + ':[ \\t]*(.*)$', 'm'));
    return m ? m[1].trim() : '';
  };
  const title = field('TOPIC');
  const id = field('ID');
  if (!title || !id) continue; // the blank template

  const links = [...head.matchAll(/^LINK:[ \t]*(.+)$/gm)]
    .map(m => m[1].split(/\s\|\s/))
    .filter(p => p.length === 2 && p[0].trim() && p[1].trim())
    .map(([label, href]) => ({ label: label.trim(), href: href.trim() }));

  const e = { id, title, tags: list(field('TAGS')), questions: pipe(field('ASKED AS')) };
  const anchors = list(field('NAME IT'));
  if (anchors.length) e.anchors = anchors;
  e.text = text;
  if (links.length) e.links = links;
  const app = field('OPEN');
  if (app) e.app = app;

  if (!text) problems.push('Empty ANSWER for "' + title + '"');
  if (!e.questions.length) problems.push('No ASKED AS questions for "' + title + '"');
  entries.push(e);
}

const ids = new Set();
for (const e of entries) {
  if (ids.has(e.id)) problems.push('Duplicate ID: ' + e.id);
  ids.add(e.id);
}
if (problems.length) {
  console.error('Not built. Fix these first:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

const header = `/* JennaOS knowledge: everything the chat can say.
 *
 * GENERATED from jennaos-brain.txt by scripts/build-brain.js. Don't edit this
 * file by hand; edit the txt and rebuild, or your changes will be overwritten.
 *
 * Each entry is one topic. Fields: id, title, tags, questions (example
 * questions), anchors (names that jump straight to the topic), text (the
 * answer), links, app (a pill to offer).
 */
`;
fs.writeFileSync(dest, header + 'window.JennaOSKnowledge = ' + JSON.stringify(entries, null, 2) + ';\n');
console.log('Built ' + entries.length + ' topics -> ' + path.relative(root, dest));
