(() => {
  const root = document.getElementById('jenna-os');
  const fab = document.getElementById('jos-fab');
  const card = document.getElementById('jos-card');
  const titleEl = document.getElementById('jos-title');
  const bodyEl = document.getElementById('jos-body');
  const appList = document.getElementById('jos-apps');
  const apps = [];
  let activeId = null;

  const isOpen = () => root.dataset.open === 'true';
  function set(open) {
    root.dataset.open = String(open);
    fab.setAttribute('aria-expanded', String(open));
    fab.setAttribute('aria-label', open ? 'Close JennaOS' : 'Open JennaOS');
    card.setAttribute('aria-hidden', String(!open));
    // The OS always lands on an app: the first one (ReadMe) until the visitor picks another.
    if (open && !activeId && apps.length) openApp(apps[0].id);
    // keep focus on the button; Tab moves into the card naturally
  }

  fab.addEventListener('click', () => set(!isOpen()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { set(false); fab.focus(); } });
  document.addEventListener('pointerdown', e => { if (isOpen() && !root.contains(e.target)) set(false); });

  // An app is { id, label, heading, subheading, render(bodyEl) }.
  function openApp(id) {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    activeId = id;
    titleEl.innerHTML = '';
    titleEl.append(app.heading + ' ');
    const sub = document.createElement('span');
    sub.textContent = app.subheading || '';
    titleEl.appendChild(sub);
    bodyEl.innerHTML = '';
    app.render(bodyEl);
    appList.querySelectorAll('button').forEach(b =>
      b.setAttribute('aria-current', String(b.dataset.app === id)));
  }

  function renderPills() {
    appList.innerHTML = '';
    apps.filter(a => !a.hidden).forEach(a => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = a.label; b.dataset.app = a.id;
      b.setAttribute('aria-current', String(a.id === activeId));
      b.addEventListener('click', () => openApp(a.id));
      li.appendChild(b); appList.appendChild(li);
    });
  }

  window.JennaOS = {
    open: () => set(true), close: () => set(false), toggle: () => set(!isOpen()),
    openApp,
    // `first: true` pins an app to the front (ReadMe) and makes it the landing app.
    registerApp(app) { app.first ? apps.unshift(app) : apps.push(app); renderPills(); },
    card
  };

  // ---- Photos: add { src, alt } entries here (files live in images/maeve/ and
  // images/fashion/). An empty list shows a "coming soon" note. ----
  const PHOTOS = {
    maeve: [],
    fashion: [
      { src: 'images/fashion/purple-leather-tote.jpg', alt: 'A soft plum leather tote with a folded flap and slim double handles, on a wooden dresser' },
      { src: 'images/fashion/beige-layers.jpg', alt: 'An oversized beige blazer over a tiered, raw-edged sheer skirt, with a striped scarf, on a leaf-covered street' },
      { src: 'images/fashion/sheer-red-skirt.jpg', alt: 'Close-up of a sheer red organza skirt with a split hem, under a blush silk top, on a runway' },
      { src: 'images/fashion/black-leather-bomber.jpg', alt: 'A black leather bomber with a high collar and ruched cuffs, carrying a small black bag' },
      { src: 'images/fashion/red-strappy-sandals.jpg', alt: 'Red leather sandals with thin knotted straps that tie around the ankle, on brown paper' },
      { src: 'images/fashion/desk-loafers.jpg', alt: 'Black loafers with beige knit socks and wide-leg jeans, feet up on a steel desk next to a laptop of saved looks' },
      { src: 'images/fashion/embroidered-organza-skirt.jpg', alt: 'A mauve-grey organza skirt embroidered with a trellis of leafy vines, with a ribbed cropped top, on a runway' },
      { src: 'images/fashion/grey-zip-long-skirt.jpg', alt: 'Back view of an oversized grey zip sweatshirt with a long charcoal skirt, black kitten-heel mules and a black tote' },
      { src: 'images/fashion/plaid-shirt-slip-skirt.jpg', alt: 'A burgundy and grey plaid oversized shirt over a pink slip skirt with a lace hem, with grey clogs, standing on sand' }
    ]
  };
  window.JennaOS.photos = PHOTOS;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  // A grid of thumbnails; tapping one enlarges it inside the card, with a back
  // button and prev/next. Tiles are laid out as a scattered stack of cards.
  function renderGallery(body, photos, { empty }) {
    if (!photos.length) { body.appendChild(el('p', 'jos-empty', empty)); return; }

    const grid = el('div', 'jos-scatter');
    photos.forEach((p, i) => {
      const b = el('button', 'jos-tile');
      b.type = 'button';
      b.setAttribute('aria-label', 'Enlarge photo ' + (i + 1) + ' of ' + photos.length + (p.alt ? ': ' + p.alt : ''));
      const img = el('img');
      img.src = p.src; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      b.appendChild(img);
      b.addEventListener('click', () => show(i));
      grid.appendChild(b);
    });
    body.appendChild(grid);

    function show(i) {
      const n = photos.length;
      i = (i + n) % n;
      body.innerHTML = '';
      const view = el('div', 'jos-viewer');
      const img = el('img');
      img.src = photos[i].src; img.alt = photos[i].alt || '';
      view.appendChild(img);
      const bar = el('div', 'jos-viewer-bar');
      const back = el('button', 'jos-viewer-btn', 'All photos');
      back.type = 'button';
      back.addEventListener('click', () => { body.innerHTML = ''; renderGallery(body, photos, { empty }); });
      const nav = el('div', 'jos-viewer-nav');
      const prev = el('button', 'jos-viewer-btn', 'Prev'); prev.type = 'button';
      const next = el('button', 'jos-viewer-btn', 'Next'); next.type = 'button';
      prev.addEventListener('click', () => show(i - 1));
      next.addEventListener('click', () => show(i + 1));
      nav.append(prev, el('span', 'jos-viewer-count', (i + 1) + ' / ' + n), next);
      bar.append(back, nav);
      body.append(view, bar);
      back.focus();
    }
  }

  window.JennaOS.registerApp({
    id: 'maeve',
    label: 'Maeve',
    heading: 'Maeve.',
    subheading: 'My dachshund.',
    render: body => renderGallery(body, PHOTOS.maeve, { empty: 'Photos of Maeve are on the way.' })
  });

  window.JennaOS.registerApp({
    id: 'fashion',
    label: 'Fashion',
    heading: 'Fashion.',
    subheading: 'What I’m saving lately.',
    render: body => renderGallery(body, PHOTOS.fashion, { empty: 'The moodboard is on the way.' })
  });


  // ---- Chat: the brain. Questions are answered by js/jennaos-brain.js from
  // js/jennaos-knowledge.js (retrieval, no model, no network). Both files load
  // the first time someone asks, so the page doesn't pay for them up front. ----
  const chat = document.getElementById('jos-chat');
  const input = document.getElementById('jos-input');
  const send = document.getElementById('jos-send');
  const status = document.getElementById('jos-status');
  const thread = [];
  let threadEl = null;

  const SELF = document.currentScript && document.currentScript.src;
  let brainReady = null;
  function loadBrain() {
    if (window.JennaOSBrain && window.JennaOSKnowledge) return Promise.resolve();
    if (brainReady) return brainReady;
    const base = SELF ? SELF.replace(/[^/?]*(\?.*)?$/, '') : 'js/';
    const query = SELF && SELF.includes('?') ? SELF.slice(SELF.indexOf('?')) : '';
    const add = name => new Promise((res, rej) => {
      const t = document.createElement('script');
      t.src = base + name + query; t.onload = res; t.onerror = rej;
      document.head.appendChild(t);
    });
    brainReady = add('jennaos-knowledge.js').then(() => add('jennaos-brain.js'))
      .catch(err => { brainReady = null; throw err; });
    return brainReady;
  }

  function messageEl(m) {
    const wrap = el('div', 'jos-msg ' + (m.role === 'user' ? 'is-user' : 'is-brain'));
    if (m.role === 'user') { wrap.textContent = m.text; return wrap; }
    m.text.split('\n\n').forEach(par => wrap.appendChild(el('p', '', par)));
    const chips = el('div', 'jos-chips');
    (m.links || []).forEach(l => {
      const a = el('a', 'jos-chip', l.label);
      a.href = l.href;
      if (/^https?:/.test(l.href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      chips.appendChild(a);
    });
    if (m.app) {
      const target = apps.find(x => x.id === m.app);
      if (target) {
        const b = el('button', 'jos-chip', m.app === 'start' ? 'Back to start' : 'Open ' + target.label);
        b.type = 'button';
        b.addEventListener('click', () => openApp(m.app));
        chips.appendChild(b);
      }
    }
    (m.suggestions || []).forEach(q => {
      const b = el('button', 'jos-chip', q);
      b.type = 'button';
      b.addEventListener('click', () => ask(q));
      chips.appendChild(b);
    });
    if (chips.childNodes.length) wrap.appendChild(chips);
    return wrap;
  }

  function push(m) {
    thread.push(m);
    if (activeId !== 'chat') { openApp('chat'); return; }
    threadEl.appendChild(messageEl(m));
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  async function ask(question) {
    const q = question.trim();
    if (!q) return;
    input.value = ''; send.hidden = true; status.textContent = '';
    push({ role: 'user', text: q });
    try {
      await loadBrain();
      const r = window.JennaOSBrain.ask(q);
      push({ role: 'brain', text: r.text, links: r.links, app: r.app, suggestions: r.suggestions });
    } catch (err) {
      push({ role: 'brain', text: 'My brain didn’t load just now. Try again in a moment, or email me.',
        links: [{ label: 'ammerallj@gmail.com', href: 'mailto:ammerallj@gmail.com' }] });
    }
  }

  input.addEventListener('input', () => { send.hidden = !input.value.trim(); });
  chat.addEventListener('submit', e => { e.preventDefault(); ask(input.value); });

  // The conversation is a view, not a pill: it opens when you ask, and Start
  // takes you back.
  window.JennaOS.registerApp({
    id: 'chat',
    hidden: true,
    heading: 'JennaOS.',
    subheading: 'Ask me anything.',
    render(body) {
      threadEl = el('div', 'jos-thread');
      threadEl.setAttribute('role', 'log');
      threadEl.setAttribute('aria-live', 'polite');
      thread.forEach(m => threadEl.appendChild(messageEl(m)));
      body.appendChild(threadEl);
      body.scrollTop = body.scrollHeight;
    }
  });

  // ---- Start: the first app and the one the OS opens into. It says what
  // JennaOS is (a map of how Jenna thinks) rather than how to operate it. ----
  window.JennaOS.registerApp({
    id: 'start',
    first: true,
    label: 'Start',
    heading: 'JennaOS.',
    subheading: 'My brain, as an operating system.',
    render(body) {
      const intro = el('p', 'jos-intro',
        'A look inside how I think. Poke around to learn about me, what I’m into, and how I approach design.');
      body.append(intro);
    }
  });
})();
