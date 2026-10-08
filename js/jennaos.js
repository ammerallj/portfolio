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
    registerApp(app) { apps.push(app); renderPills(); },
    card
  };

  // ---- ReadMe: the first app, and the one the OS opens into ----
  window.JennaOS.registerApp({
    id: 'readme',
    label: 'ReadMe',
    heading: 'ReadMe.',
    subheading: 'How to get around.',
    render(el) {
      const ul = document.createElement('ul');
      ul.className = 'jos-readme';
      [
        ['Pick an app.', 'The pills below are apps. Tap one and it opens right here.'],
        ['Come back any time.', 'ReadMe is always the first pill.'],
        ['Close it.', 'Tap the dot again, hit Esc, or click anywhere outside.'],
        ['Keyboard.', 'Tab moves between pills. Enter opens one.']
      ].forEach(([lead, rest]) => {
        const li = document.createElement('li');
        const b = document.createElement('b');
        b.textContent = lead;
        li.append(b, ' ' + rest);
        ul.appendChild(li);
      });
      el.appendChild(ul);
    }
  });
})();
