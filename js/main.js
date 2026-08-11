// main.js — site interactions: nav scroll-spy, load reveal, hero scroll effects, custom cursors
//
// SHARED BY EVERY PAGE — the homepage and the four project overview pages in
// work/. The project pages have no hero, no #work-section/#about/#contact and
// no work cards, so everything homepage-specific below is guarded. This is not
// defensive padding: the inline <head> script sets `is-motion` pre-paint, which
// hides every [data-reveal] until initMotion() runs, so a single TypeError here
// would leave a project page permanently blank. Keep new page-specific code
// behind a null check.

const navWork = document.getElementById('nav-work');

// Clicking the name/logo smooth-scrolls back to the top (hero). On the project
// pages the name is a real link home (href="../index.html"), so only hijack the
// click when it's the homepage's own in-page "#" anchor.
// Prefer Lenis when it's running so the motion matches the rest of the page.
const siteName = document.getElementById('site-name');
if (siteName && siteName.getAttribute('href') === '#') {
  siteName.addEventListener('click', (e) => {
    e.preventDefault();
    if (window.__lenis) {
      window.__lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  });
}

// Scroll-spy: each nav link and the section it points to. Only the homepage has
// these sections in-page; on project pages the nav links point back to
// index.html, so the list filters down to empty and the spy is a no-op. That's
// why those pages can hard-code `class="is-active"` on the Work link — nothing
// here ever runs to clear it.
const navSections = [
  { link: navWork, el: document.getElementById('work-section') },
  { link: document.querySelector('.site-nav-bar a[href="#footprints"]'), el: document.getElementById('footprints') },
  { link: document.querySelector('.site-nav-bar a[href="#about"]'), el: document.getElementById('about') },
  { link: document.querySelector('.site-nav-bar a[href="#contact"]'), el: document.getElementById('contact') },
].filter(s => s.link && s.el);

// The landing's own bottom bar is the desktop nav — spy it the same way (the
// site-header nav above only exists on ≤480 / project pages).
const introBarSections = [
  { sel: '#work-section', id: 'work-section' },
  { sel: '#footprints', id: 'footprints' },
  { sel: '#about', id: 'about' },
  { sel: '#contact', id: 'contact' },
]
  .map(({ sel, id }) => ({
    link: document.querySelector(`.intro-bar-links a[href="${sel}"], .intro-bar-cta[href="${sel}"]`),
    el: document.getElementById(id),
  }))
  .filter(s => s.link && s.el);
navSections.push(...introBarSections);

const siteHeader = document.querySelector('.site-header');

// Floating in-page section nav. BOTH page types render `.section-pills`: the
// project pages carry the in-page chapter nav (#overview / #approach|#process /
// #impact) and the homepage carries the .section-pills--site-nav variant
// (Work / About). So this is NOT empty on the homepage and the spy genuinely runs
// there — an older comment here claimed otherwise, which would have made any
// "homepage is a no-op" assumption unsafe. Both bars are CSS-hidden above the
// ≤480 tier (project-overview.css §8 + responsive.css); the JS is indifferent to
// that and keeps spying on hidden elements, which is harmless.
// Anchor clicks glide via the shared Lenis handler in setupLenis(). The spy +
// footer tuck-away live in updateScrollEffects().
const sectionPillBar = document.querySelector('.section-pills');
// Every pill — including the locked "Process" chip (Messaging) — maps to a real
// in-page section, so all of them take part in the scroll-spy. The pills are in
// DOM/scroll order, which the spy below relies on to pick the last section above
// the marker. The locked chip's selected look is styled muted-but-filled in
// project-overview.css.
const sectionPills = sectionPillBar
  ? Array.from(sectionPillBar.querySelectorAll('a'))
      .map(link => ({ link, el: document.querySelector(link.getAttribute('href')) }))
      .filter(s => s.el)
  : [];
const siteFooter = document.querySelector('.site-footer');

// The full-bleed blue panel that the sticky header inverts over (and that the
// 👋 cursor appears on). Only the homepage has one (#contact) — the project
// pages end on cream, so this is null there and both features simply stay off.
const darkPanel = document.getElementById('contact');
const contactSection = darkPanel;
const intro = document.querySelector('.intro');
const introBar = document.querySelector('.intro-bar'); // landing nav bar (homepage only)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// The rest of the site stays hidden through the one-time hero reveal (scribble
// draws inside the blob, then the headline emerges from it). The paragraph
// fades in first, then everything else. See initHero() below.
const html = document.documentElement;
let siteRevealed = false;

function revealRestOfSite() {
  html.classList.add('is-revealing');
  html.classList.remove('is-loading');
  updateScrollEffects();
  setTimeout(() => html.classList.remove('is-revealing'), 650);
}

function revealSite() {
  if (siteRevealed) return;
  siteRevealed = true;
  html.classList.add('is-text-revealed');
  setTimeout(revealRestOfSite, 300);
}

// ============================================================
// LANDING HERO — "Making products make sense." (Figma 339:3745). The hero's
// entrance is pure CSS (hero.css: the divider emits the headline/bio, then
// the bar fades in); this controller only runs the page-level load reveal.
// The previous blob-hero engine (BLOBS geometry, morph/settle loop, hover
// push, paragraph cycling) is archived with the old landing in
// archive/blob-hero-2026-08/js/main.js.
// ============================================================
function initHero() {
  // Project pages have no hero — and, unlike the homepage, never set
  // `is-loading` in their inline <head> script, so there is no load-reveal
  // to run there.
  if (!intro) return;
  startReveal();
}

// Reveal sequence. Reduced motion: just show everything. Motion: the hero runs
// its CSS entrance while the rest of the site holds, then fades in.
function startReveal() {
  if (reducedMotion.matches) {
    html.classList.add('is-text-revealed');
    revealRestOfSite();
    return;
  }
  setTimeout(revealSite, 200);
}

initHero();


// ============================================================
// MASTHEAD CAROUSEL — the Accessibility overview image is a 3-slide crossfade.
// Auto-advances; clicking a dot jumps to that slide and STOPS the auto-advance
// (the visitor has taken control). Guarded: only that page has [data-carousel],
// so this is a no-op everywhere else. Reduced motion / no JS: the first slide
// stays and the dots still switch manually — auto-advance just never starts.
// ============================================================
function initCarousel() {
  const root = document.querySelector('[data-carousel]');
  if (!root) return;
  const slides = Array.from(root.querySelectorAll('.project-carousel-slide'));
  const dots = Array.from(root.querySelectorAll('.project-carousel-dot'));
  if (slides.length < 2) return;

  const HOLD_MS = 5000;
  let active = 0;
  let timer = 0;

  function show(i) {
    active = i;
    slides.forEach((el, k) => el.classList.toggle('is-active', k === i));
    dots.forEach((el, k) => {
      const on = k === i;
      el.classList.toggle('is-active', on);
      if (on) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = 0;
  }
  function start() {
    if (timer || reducedMotion.matches) return;
    timer = setInterval(() => {
      if (document.hidden) return; // don't burn beats in a hidden tab
      show((active + 1) % slides.length);
    }, HOLD_MS);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      stop(); // visitor picked a slide — hand them control
      show(i);
    });
  });

  start();
}
initCarousel();

const heroFadeScrollRange = 320;
const scrollEffectDelay = 40;

function scrollEffectRatio(range, delay = scrollEffectDelay) {
  return Math.max((window.scrollY - delay) / range, 0);
}

// Quadratic ease-in: starts slow, then accelerates
function easeIn(t) {
  return t * t;
}

function updateScrollEffects() {
  // Resting at the very top of the page. The ≤480 header floats over the hero
  // there and drops its cream glass so the gradient field runs to the top of
  // the screen (responsive.css, 480 tier); everywhere else the class is inert.
  // Set pre-paint by the inline <head> script and maintained here — ABOVE the
  // is-loading return, because the header is on screen throughout the load
  // reveal and must not sit frosted until it finishes. The BARE state is the
  // added one, so a no-JS visitor keeps the legible frosted bar.
  html.classList.toggle('is-at-page-top', window.scrollY <= 0);

  // While the load reveal is in progress, let CSS control opacity
  // instead of stomping it with an inline style here
  if (html.classList.contains('is-loading')) return;

  // Landing header tuck: while the hero (which carries its own bottom nav
  // bar) is on screen, park the sticky header above the viewport; it slides
  // in once the reader passes the fold. Only the homepage has .intro-bar, so
  // this is a no-op on project pages. No-JS visitors never get the class —
  // the header is simply always visible. (On desktop the header is hidden
  // outright — the docking intro-bar below is the nav — so this only matters
  // on the ≤480 tier, where the tuck is neutralized anyway.)
  if (siteHeader && intro && introBar) {
    siteHeader.classList.toggle('is-tucked',
      window.scrollY < intro.offsetHeight - siteHeader.offsetHeight);
  }

  // The intro-bar docks: sticky pins it at the viewport top once the scroll
  // carries it there — frost it (is-docked → the ::before glass fades in)
  // while pinned, bare while it rests in the hero. Guarded: project pages
  // have no .intro-bar.
  if (introBar) {
    introBar.classList.toggle('is-docked', introBar.getBoundingClientRect().top <= 0);
  }

  // Scroll-spy: the active SECTION is the lowest one whose top has scrolled above
  // a line ~35% down the viewport (in the hero, none). Find it by comparing tops,
  // not array order — navSections mixes the header nav and the landing's intro-bar
  // (not in DOM order), and BOTH can be on screen pointing at the same section, so
  // highlight every link that targets it (and mark it for assistive tech).
  const marker = window.innerHeight * 0.35;
  let activeEl = null, activeTop = -Infinity;
  for (const s of navSections) {
    const top = s.el.getBoundingClientRect().top;
    if (top <= marker && top > activeTop) { activeTop = top; activeEl = s.el; }
  }
  navSections.forEach(s => {
    const on = s.el === activeEl;
    s.link.classList.toggle('is-active', on);
    if (on) s.link.setAttribute('aria-current', 'true');
    else s.link.removeAttribute('aria-current');
  });

  // Floating section pills (project pages): same spy as the nav above, but it
  // defaults to the first pill so Overview reads active at the top of the page.
  // Once the footer is in view there's nowhere further to jump, so tuck the bar
  // away. Guarded by length, so this is inert on the homepage.
  if (sectionPills.length) {
    const pillMarker = window.innerHeight * 0.35;
    let activePill = sectionPills[0].link;
    for (const s of sectionPills) {
      if (s.el.getBoundingClientRect().top <= pillMarker) activePill = s.link;
    }
    sectionPills.forEach(s => {
      const on = s.link === activePill;
      s.link.classList.toggle('is-active', on);
      if (on) s.link.setAttribute('aria-current', 'true');
      else s.link.removeAttribute('aria-current');
    });
    if (sectionPillBar && siteFooter) {
      const footerIn = siteFooter.getBoundingClientRect().top < window.innerHeight;
      sectionPillBar.classList.toggle('is-tucked', footerIn);
    }
  }

  // Invert the sticky bar to blue/white once the Contact panel slides
  // beneath it; stays inverted through the (also-blue) footer to page end
  // Invert once Contact reaches the scroll-anchor line (CSS scroll-padding-top,
  // where an anchor-clicked section rests) so clicking the Contact nav link flips
  // the bar on arrival, not after scrolling further in. Read here (not at init)
  // because the @import'd CSS may not be applied when the deferred script runs.
  // Both bars take the state: the .site-header (project pages, and the ≤480
  // homepage tier) and the docked .intro-bar (the homepage's own nav on
  // desktop, where the header is display:none). Whichever is hidden reports
  // offsetHeight 0, so the max below reads the visible one.
  const stickyBars = [siteHeader, introBar].filter(Boolean);
  if (contactSection && stickyBars.length) {
    const contactRect = contactSection.getBoundingClientRect();
    if (contactRect.height === 0) {
      // Contact is hidden (dropped at the mobile tier) — there's no blue panel to
      // invert over, so keep the bars in their normal (cream) state.
      stickyBars.forEach(bar => bar.classList.remove('is-over-dark'));
    } else {
      const scrollAnchorTop = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      const barHeight = Math.max(...stickyBars.map(bar => bar.offsetHeight));
      const invertLine = Math.max(scrollAnchorTop, barHeight);
      const overDark = contactRect.top <= invertLine + 1;
      stickyBars.forEach(bar => bar.classList.toggle('is-over-dark', overDark));
    }
  }

  // (The old hero's scroll-linked copy fade retired with the blob landing —
  // the new hero scrolls away as plain content.)

  // Contact fades in via the shared viewport-reveal system (data-reveal in the
  // markup), so there's no scroll-linked opacity for it here anymore.
}

// Batch all scroll-linked style writes into a single rAF pass per frame
// to avoid layout thrashing and keep the motion smooth
let scrollEffectsQueued = false;
function onScroll() {
  if (scrollEffectsQueued) return;
  scrollEffectsQueued = true;
  requestAnimationFrame(() => {
    updateScrollEffects();
    scrollEffectsQueued = false;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
updateScrollEffects();

// ============================================================
// MOTION SYSTEM — Lenis smooth scroll + Motion.dev viewport reveals
//
// Loaded from a CDN as ES modules (the site has no build step). Everything
// here is progressive enhancement: reduced-motion visitors skip it entirely,
// and if the CDN can't be reached we drop the is-motion flag so all the
// [data-reveal] content simply appears. Content is never left hidden.
// ============================================================

const REVEAL = {
  distance: 16,   // px of translate — a small rise; text stays readable mid-fade
  duration: 0.7,  // s — long enough to glide, still resolves before a fast scroller passes
  stagger: 0.08,  // s between items in a group (80ms) — a section lands as a sequence
  // easeOutCubic — softened 2026-08 from [0.16,1,0.3,1] (expo-out), whose
  // near-instant first frames read as an abrupt pop across sections.
  ease: [0.33, 1, 0.68, 1],
};

function initMotion() {
  const root = document.documentElement;
  if (reducedMotion.matches || !root.classList.contains('is-motion')) return;

  const LENIS_URL = 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/+esm';
  const MOTION_URL = 'https://cdn.jsdelivr.net/npm/motion@11.15.0/+esm';

  Promise.all([import(LENIS_URL), import(MOTION_URL)])
    .then(([lenisMod, motion]) => {
      setupLenis(lenisMod.default);
      setupReveals(motion);
    })
    .catch(() => {
      // CDN unreachable — reveal all content immediately, keep native scroll.
      root.classList.remove('is-motion');
    });
}

// Smooth scrolling. Lenis drives window scroll, so the existing scroll-linked
// effects (hero fade, contact fade, scroll-spy, header inversion) keep working;
// we just also nudge them from Lenis's own scroll event for extra smoothness.
function setupLenis(Lenis) {
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  window.__lenis = lenis;

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  lenis.on('scroll', onScroll);

  // Route in-page anchor clicks through Lenis so they glide instead of jumping
  // (native smooth is disabled while Lenis is active). Offset matches the
  // sticky header / scroll-padding-top so a section rests flush beneath it.
  // EXCEPTION: links inside the mobile-menu overlay land IMMEDIATELY — the
  // overlay covers the page while it closes, so animated travel underneath is
  // just distracting motion; the user should simply arrive in the section.
  const headerOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const fromMenu = !!link.closest('.mobile-menu');
      lenis.scrollTo(target, { offset: -headerOffset, immediate: fromMenu });
    });
  });
}

// Viewport reveals. Each [data-reveal-group] fades its [data-reveal] items in
// as it enters the viewport — typography first, supporting copy and imagery
// after — staggered so the eye is led through the section.
//
// Reveals replay in BOTH directions: when a group scrolls fully out of view it
// resets to hidden, so scrolling back up (or down) fades it in again rather
// than leaving it statically visible. Driven by getBoundingClientRect on scroll
// (robust across browsers, unlike an observer); Motion.dev runs the fade + rise.
function setupReveals(motion) {
  const { animate } = motion;
  const groups = Array.from(document.querySelectorAll('[data-reveal-group]'));

  function itemsOf(group) {
    // A group can itself be the single reveal target (e.g. the About heading),
    // otherwise its descendants are the items.
    return group.hasAttribute('data-reveal')
      ? [group]
      : Array.from(group.querySelectorAll('[data-reveal]'));
  }

  // Fade a group in (visible) or reset it to hidden (off-screen). Only acts on
  // an actual state change, so scrolling within a revealed group doesn't restart
  // the animation. Items stagger — typography first, supporting copy and imagery
  // after, honoring an optional data-reveal-order.
  function setVisible(group, visible) {
    if (group.__revealVisible === visible) return;
    group.__revealVisible = visible;
    itemsOf(group).forEach((el, i) => {
      if (visible) {
        const order = el.hasAttribute('data-reveal-order')
          ? parseInt(el.getAttribute('data-reveal-order'), 10)
          : i;
        animate(
          el,
          { opacity: 1, y: 0 },
          { duration: REVEAL.duration, delay: order * REVEAL.stagger, ease: REVEAL.ease }
        );
      } else {
        // Instant reset while the group is off-screen, ready to fade in on the
        // next entry. Not visible to the reader since the group isn't on screen.
        animate(el, { opacity: 0, y: REVEAL.distance }, { duration: 0 });
      }
    });
  }

  // FIRST PASS is permissive: anything already touching the viewport at load is
  // shown, even if it only peeks. Otherwise a group that pokes above the fold
  // renders as a blank gap until the reader scrolls — and how much peeks is
  // device-dependent, so it can't be handled by exempting specific elements
  // (work card 2 peeks 6px at 812 tall, 38px at 844, 126px at 932; none of
  // those clear the 85% line). After this pass the thresholds below govern.
  let firstPass = true;

  function update() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    groups.forEach((group) => {
      const r = group.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= vh) {
        // Fully off-screen (above or below). This is the ONLY time we reset to
        // hidden — never while any part of the group is still on screen — so a
        // section is never yanked to invisible mid-view. That harsh cut-out was
        // what you saw scrolling up, as a group left through the bottom edge.
        setVisible(group, false);
      } else if (firstPass || (r.top < vh * 0.9 && r.bottom > vh * 0.15)) {
        // Meaningfully in view → fade in (typography first). Wide gap from the
        // reset condition gives hysteresis, so there's no flicker at the edges.
        setVisible(group, true);
      }
      // Partially on screen but not past the reveal line yet: hold current state.
    });
    firstPass = false;
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  if (window.__lenis) window.__lenis.on('scroll', update);
  update();
}

// ≤1024 (tablet + mobile): the FIRST Work card should simply be there at load —
// on mobile it already peeks below the short hero (480 tier in responsive.css),
// and on tablet the first card is the landing beat right after the hero — so
// drop it out of the reveal system entirely rather than fading it in. Cards 2-4
// still reveal on scroll. Removing the attributes also clears the
// `html.is-motion [data-reveal]` opacity:0 initial state, so nothing is left
// hidden. (Desktop is full-viewport centered, so its first card is below the
// fold and reveals normally.)
if (window.innerWidth <= 1024) {
  const firstCard = document.querySelector('.work-card');
  if (firstCard) {
    firstCard.removeAttribute('data-reveal-group');
    firstCard.querySelectorAll('[data-reveal]').forEach((el) => el.removeAttribute('data-reveal'));
  }
}

initMotion();

// Custom cursor on work card images
const cursor = document.getElementById('custom-cursor');
const metaCursor = document.getElementById('meta-cursor');
const cardImages = document.querySelectorAll('.work-card-image');
const metaLabels = document.querySelectorAll('.meta-label');
const msLabels = document.querySelectorAll('.ms-label');
const msCursor = document.getElementById('ms-cursor');
const waveCursor = document.getElementById('wave-cursor');

// Custom cursors are a MOUSE affordance only. On touch, a tap fires synthetic
// mouseenter/mousemove events with NO matching mouseleave, so a cursor badge
// (e.g. the → over a work-card image, or the Meta/MS logo over a label) would
// appear and then stick on screen. Gate the whole system behind a true hover +
// fine-pointer device so none of these listeners bind on touch.
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.addEventListener('mousemove', (e) => {
    if (cursor) {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    }
    if (waveCursor) {
      waveCursor.style.left = e.clientX + 'px';
      waveCursor.style.top = e.clientY + 'px';
    }
  });

  // Show the 👋 cursor over the blue panel (Contact on the homepage).
  if (darkPanel && waveCursor) {
    darkPanel.addEventListener('mouseenter', () => waveCursor.classList.add('is-visible'));
    darkPanel.addEventListener('mouseleave', () => waveCursor.classList.remove('is-visible'));
  }

  cardImages.forEach(img => {
    if (!cursor) return;
    img.addEventListener('mouseenter', () => cursor.classList.add('is-visible'));
    img.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
  });

  msLabels.forEach(label => {
    if (!msCursor) return;
    label.addEventListener('mouseenter', () => {
      const rect = label.getBoundingClientRect();
      const img = msCursor.querySelector('img');
      img.style.height = rect.height + 'px';
      img.style.width = 'auto';
      msCursor.style.left = (rect.left + rect.width / 2) + 'px';
      msCursor.style.top = (rect.top + rect.height / 2) + 'px';
      msCursor.classList.add('is-visible');
    });
    label.addEventListener('mouseleave', () => {
      msCursor.classList.remove('is-visible');
    });
  });

  metaLabels.forEach(label => {
    if (!metaCursor) return;
    label.addEventListener('mouseenter', () => {
      const rect = label.getBoundingClientRect();
      const img = metaCursor.querySelector('img');
      img.style.height = rect.height + 'px';
      metaCursor.style.left = (rect.left + rect.width / 2) + 'px';
      metaCursor.style.top = (rect.top + rect.height / 2) + 'px';
      metaCursor.classList.add('is-visible');
    });
    label.addEventListener('mouseleave', () => {
      metaCursor.classList.remove('is-visible');
    });
  });
}

// ============================================================
// Mobile menu (Figma nodes 123:3733 / 123:3743)
// The "Menu" trigger opens a full-screen overlay; the overlay's
// in-page links (#work-section / #about) already route through the
// Lenis anchor handler set up in setupLenis(), so they glide-scroll.
// Behavior only matters on mobile, but the listeners are harmless on
// desktop where the trigger and overlay are display:none.
// ============================================================
(function initMobileMenu() {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;
  const closeBtn = menu.querySelector('.mobile-menu-close');
  let lastFocus = null;
  let finishClose = null; // pending .is-closing cleanup; non-null only mid-exit

  function open() {
    lastFocus = document.activeElement;
    // Re-opening mid-exit: clear the closing state so the entrance plays clean.
    if (finishClose) finishClose();
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    // Lock the background scroll. Prefer stopping Lenis when it's running;
    // fall back to an overflow lock for reduced-motion / no-Lenis visitors.
    if (window.__lenis) {
      window.__lenis.stop();
    } else {
      document.body.style.overflow = 'hidden';
    }
    const first = menu.querySelector('a, button');
    if (first) first.focus();
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    // Reverse of the entrance: .is-closing plays menu-slide-out and keeps the
    // panel display:flex until it lands (responsive.css); removing the class is
    // what actually hides it. animationend does that removal; the timeout is a
    // failsafe for when the animation never runs (viewport grown past the 480
    // tier mid-close, so the panel is already display:none) — without it the
    // class would linger and the next open would replay the exit.
    menu.classList.add('is-closing');
    const done = (e) => {
      if (e && e.target !== menu) return;
      menu.classList.remove('is-closing');
      menu.removeEventListener('animationend', done);
      clearTimeout(failsafe);
      finishClose = null;
    };
    const failsafe = setTimeout(done, 400);
    menu.addEventListener('animationend', done);
    finishClose = done;
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    if (window.__lenis) {
      window.__lenis.start();
    } else {
      document.body.style.overflow = '';
    }
    document.removeEventListener('keydown', onKeydown);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    // Keep focus inside the open overlay.
    const focusables = menu.querySelectorAll('a[href], button');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  toggle.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);

  // Tapping any link closes the overlay (the anchor scroll or navigation
  // then proceeds — Lenis has been restarted by close()).
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', close);
  });

  // If the viewport grows past the mobile tier while open, close so the
  // overlay never covers the restored desktop nav.
  const desktopQuery = window.matchMedia('(min-width: 481px)');
  desktopQuery.addEventListener('change', (e) => {
    if (e.matches && menu.classList.contains('is-open')) close();
  });
})();
