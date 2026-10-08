(() => {
  const root = document.getElementById('rose-os');
  const fab = document.getElementById('ros-fab');
  const card = document.getElementById('ros-card');
  const closeBtn = document.getElementById('ros-close');
  const appList = document.getElementById('ros-apps');
  const apps = [];

  const isOpen = () => root.dataset.open === 'true';
  function set(open) {
    root.dataset.open = String(open);
    fab.setAttribute('aria-expanded', String(open));
    fab.setAttribute('aria-label', open ? 'Close RoseOS' : 'Open RoseOS');
    card.setAttribute('aria-hidden', String(!open));
    closeBtn.tabIndex = open ? 0 : -1;
    if (!open) return;
    // keep focus on the button; Tab moves into the card naturally
  }

  fab.addEventListener('click', () => set(!isOpen()));
  closeBtn.addEventListener('click', () => { set(false); fab.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { set(false); fab.focus(); } });
  document.addEventListener('pointerdown', e => { if (isOpen() && !root.contains(e.target)) set(false); });

  // Extension point for the OS: RoseOS.registerApp({ id, label, open() })
  function render() {
    appList.innerHTML = '';
    apps.forEach(a => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = a.label;
      b.addEventListener('click', () => a.open && a.open());
      li.appendChild(b); appList.appendChild(li);
    });
  }
  window.RoseOS = {
    open: () => set(true), close: () => set(false), toggle: () => set(!isOpen()),
    registerApp(app) { apps.push(app); render(); },
    card
  };

  ['ReadMe', 'Library', 'Artindex', 'Compressor', 'iPod', 'QuoteClub'].forEach(label =>
    window.RoseOS.registerApp({ id: label.toLowerCase(), label }));
})();
