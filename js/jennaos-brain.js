/* JennaOS brain: answers a question from js/jennaos-knowledge.js.
 *
 * It's retrieval, not generation: it finds the entry that best matches the
 * question (BM25-style scoring over title, tags, example questions and text)
 * and returns that entry as written. It never makes anything up, and it says
 * so plainly when nothing is close. It runs entirely in the browser: no
 * network, no API key, no tracking.
 *
 *   const reply = JennaOSBrain.ask('who is maeve');
 *   // { found: true, entry, text, links, app }  or  { found: false, text, suggestions }
 */
(() => {
  const STOP = new Set(('a an and are as at be but by can could did do does for from had has have how i if in into is it its ' +
    'me my of on or so than that the their them then there these they this to us was we were what when where which who whom ' +
    'why will with would you your yours tell about please just really actually thing things know like help want get got make made exactly lately through walk anywhere').split(' '));

  // Words that mean the same thing for matching purposes.
  const SYNONYMS = {
    job: 'experience', employer: 'experience', career: 'experience', cv: 'resume', resume: 'experience',
    fb: 'facebook', ms: 'microsoft', m365: 'microsoft', a11y: 'accessibility', accessible: 'accessibility',
    puppy: 'dog', doxie: 'dachshund', pup: 'dog',
    clothes: 'fashion', clothing: 'fashion', outfit: 'fashion', style: 'fashion',
    hobby: 'interest', hobbies: 'interest', passion: 'interest',
    reach: 'contact', hire: 'contact', hiring: 'contact', email: 'contact', linkedin: 'contact'
  };

  const stem = w => {
    w = w.toLowerCase().replace(/[’']s$/, '');
    if (SYNONYMS[w]) w = SYNONYMS[w];
    if (w.length > 4) {
      if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
      if (w.endsWith('ing')) return w.slice(0, -3);
      if (w.endsWith('ed')) return w.slice(0, -2);
      if (w.endsWith('es')) return w.slice(0, -2);
      if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    }
    return w;
  };
  const tokens = text => (text.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]*/g) || [])
    .filter(w => !STOP.has(w)).map(stem);

  let index = null;
  function build() {
    const entries = window.JennaOSKnowledge || [];
    // Weight fields by repeating them: title and tags count most.
    const docs = entries.map(e => {
      const fields = [
        [e.title, 3], [(e.tags || []).join(' '), 3], [(e.questions || []).join(' '), 2], [e.text, 1]
      ];
      const toks = [];
      fields.forEach(([t, weight]) => { const ts = tokens(t || ''); for (let i = 0; i < weight; i++) toks.push(...ts); });
      return { entry: e, toks, anchors: new Set(tokens((e.anchors || []).join(' '))),
        tf: toks.reduce((m, t) => (m[t] = (m[t] || 0) + 1, m), {}) };
    });
    const df = {};
    docs.forEach(d => Object.keys(d.tf).forEach(t => (df[t] = (df[t] || 0) + 1)));
    const N = docs.length || 1;
    const avgLen = docs.reduce((s, d) => s + d.toks.length, 0) / N || 1;
    index = { docs, df, N, avgLen };
  }

  function score(qToks) {
    const { docs, df, N, avgLen } = index;
    const k1 = 1.2, b = 0.3; // low b: long answers aren't punished for being thorough
    return docs.map(d => {
      let s = 0, hits = 0;
      new Set(qToks).forEach(t => {
        const f = d.tf[t];
        if (!f) return;
        hits++;
        const idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
        s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.toks.length / avgLen));
      });
      // Naming a topic outright ("Loop", "Maeve") beats any generic word.
      new Set(qToks).forEach(t => { if (d.anchors.has(t)) { s += 5; hits++; } });
      return { entry: d.entry, score: s, hits };
    }).sort((a, b2) => b2.score - a.score);
  }

  // Whole-sentence matching comes first. It catches questions that are all
  // common words ("who are you", "what do you do") which token scoring can't see.
  const norm = t => (t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function phraseMatch(question) {
    const q = norm(question);
    if (!q) return null;
    const entries = window.JennaOSKnowledge || [];
    let best = null, bestLen = 0;
    for (const e of entries) {
      for (const ex of e.questions || []) {
        const n = norm(ex);
        if (q === n) return e;
        // A longer example wins, so "what do you do for fun" beats "what do you do".
        if (n.split(' ').length >= 3 && q.includes(n) && q.length - n.length <= 12 && n.length > bestLen) { best = e; bestLen = n.length; }
      }
    }
    return best;
  }

  function ask(question) {
    if (!index) build();
    const exact = phraseMatch(question);
    if (exact) return { found: true, entry: exact, text: exact.text, links: exact.links || [], app: exact.app || null };
    const qToks = tokens(question || '');
    const ranked = qToks.length ? score(qToks) : [];
    const top = ranked[0];
    // Confident enough: a real match, not a stray common word.
    if (top && top.hits >= 1 && top.score >= 1.6) {
      const e = top.entry;
      return { found: true, entry: e, text: e.text, links: e.links || [], app: e.app || null };
    }
    return {
      found: false,
      text: 'I don’t have an answer to that yet. I can tell you about my work, how I think about design, or what I’m into. If it’s something else, email me and I’ll get back to you.',
      links: [{ label: 'ammerallj@gmail.com', href: 'mailto:ammerallj@gmail.com' }],
      suggestions: ['What do you do?', 'How do you think about design?', 'Who is Maeve?']
    };
  }

  window.JennaOSBrain = { ask, _rebuild: () => { index = null; } };
})();
