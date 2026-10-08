(() => {
  const root = document.getElementById('jenna-os');
  const fab = document.getElementById('jos-fab');
  const card = document.getElementById('jos-card');
  const closeBtn = document.getElementById('jos-close');
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
    closeBtn.tabIndex = open ? 0 : -1;
    // The OS always lands on an app: the first one (ReadMe) until the visitor picks another.
    if (open && !activeId && apps.length) openApp(apps[0].id);
    // keep focus on the button; Tab moves into the card naturally
  }

  fab.addEventListener('click', () => set(!isOpen()));
  closeBtn.addEventListener('click', () => { set(false); fab.focus(); });
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
    apps.forEach(a => {
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
    fashion: []
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


  // ---- Chat input: no model behind it yet. It routes to an app by name or
  // keyword, and otherwise says so plainly. ----
  const chat = document.getElementById('jos-chat');
  const input = document.getElementById('jos-input');
  const send = document.getElementById('jos-send');
  const status = document.getElementById('jos-status');
  const KEYWORDS = {
    maeve: ['dog', 'dachshund', 'puppy', 'pet'],
    fashion: ['style', 'outfit', 'trend', 'clothes', 'pinterest', 'moodboard'],
    start: ['help']
  };
  input.addEventListener('input', () => { send.hidden = !input.value.trim(); status.textContent = ''; });
  chat.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    const hit = apps.find(a => q.includes(a.id) || q.includes(a.label.toLowerCase())) ||
      apps.find(a => (KEYWORDS[a.id] || []).some(k => q.includes(k)));
    if (hit) {
      openApp(hit.id);
      input.value = ''; send.hidden = true; status.textContent = '';
    } else {
      status.textContent = 'I can’t chat yet, but I can show you around. Try “' +
        apps.slice(1).map(a => a.label).join('” or “') + '.”';
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
      const list = el('ul', 'jos-start');

      const row = (lead, ...parts) => {
        const li = el('li');
        li.appendChild(el('b', '', lead));
        li.append(' ');
        parts.forEach(p => li.append(p));
        list.appendChild(li);
      };
      const link = (label, id) => {
        const b = el('button', 'jos-link', label);
        b.type = 'button';
        b.addEventListener('click', () => openApp(id));
        return b;
      };

      row('About.', 'Product and interaction designer in Seattle. Nine years across Microsoft and Meta.');
      row('Interests.', 'Music, art exhibitions, fashion, and a dachshund named ', link('Maeve', 'maeve'),
        '. See what I’m saving in ', link('Fashion', 'fashion'), '.');
      row('Design thinking.', 'I’m drawn to the seams: the shared patterns that help products fit together, without losing the details that give each one its character.');

      body.append(intro, list);
    }
  });
})();
