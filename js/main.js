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
// index.html, so the list filters down to empty and the spy is a no-op.
const navSections = [
  { link: navWork, el: document.getElementById('work-section') },
  { link: document.querySelector('.site-nav-bar a[href="#about"]'), el: document.getElementById('about') },
  { link: document.querySelector('.site-nav-bar a[href="#contact"]'), el: document.getElementById('contact') },
].filter(s => s.link && s.el);

const siteHeader = document.querySelector('.site-header');

// The full-bleed blue panel that the sticky header inverts over (and that the
// 👋 cursor appears on). Only the homepage has one (#contact) — the project
// pages end on cream, so this is null there and both features simply stay off.
//
// ⚠️ The `.conversation-invite` fallback is DEAD: no page renders that component
// any more (see the DEAD CODE note in project-overview.css). Harmless — the
// querySelector just returns null — but delete it together with the CSS, not on
// its own.
const darkPanel = document.getElementById('contact') || document.querySelector('.conversation-invite');
const contactSection = darkPanel;
const intro = document.querySelector('.intro');
const introHeadline = document.querySelector('.intro-headline');
const introBody = document.querySelector('.intro-body');
const scrollIndicator = document.querySelector('.scroll-indicator');
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
// LIVING HERO — the blob stays the exact Figma silhouette but flows like a
// fluid, and the type slowly reflows inside it. Progressive enhancement:
// reduced-motion / no-JS visitors get the static blob + static headline via
// CSS; this controller just reveals the site.
// ============================================================

// Per-breakpoint blob geometry, pulled from the Figma frames. Each entry is a
// 4-anchor closed path in its own frame's viewBox (vw×vh): A = anchors, C1[k] =
// anchor k's outgoing handle, C2[k] = anchor k+1's incoming handle. The morph
// swaps the active set + the SVG viewBox at the breakpoints (matching the CSS
// tiers), so every tier gets its own correctly-shaped/sized blob rather than a
// scaled desktop one. The CSS sizes the element to vw×vh so it renders 1:1.
const BLOBS = [
  { max: 480, vw: 390, vh: 844,
    A:[[125.231,116.573],[31.5723,259.956],[325.056,382.599],[362.771,279.628]],
    C1:[[34.5106,103.191],[87.9757,369.131],[361.185,362.629],[348.541,223.388]],
    C2:[[-0.671066,197.546],[288.926,402.568],[377.001,335.868],[299.289,142.249]] },
  // The 768 and 1024 tiers share ONE silhouette in Figma — the 768 frame's
  // Subtract (217:6214) is the 1024 frame's (206:5450) shifted 116px left in
  // the same 1044×775 canvas. Coordinates below are exact from those assets,
  // so the shape (and its smooth anchors) is identical across the boundary —
  // no size/shape jump when the tier switches.
  { max: 768, vw: 1044, vh: 775,
    A:[[282.113,147.42],[146.164,356.165],[571.737,534.434],[626.517,384.547]],
    C1:[[150.543,128.012],[227.889,515.011],[624.154,505.343],[605.92,302.708]],
    C2:[[99.4456,265.36],[519.321,563.524],[647.113,466.385],[534.547,184.657]] },
  { max: 1024, vw: 1044, vh: 775,
    A:[[398.113,147.42],[262.164,356.165],[687.736,534.434],[742.517,384.547]],
    C1:[[266.543,128.012],[343.889,515.011],[740.153,505.343],[721.92,302.708]],
    C2:[[215.446,265.36],[635.319,563.524],[763.113,466.385],[650.547,184.657]] },
  { max: 1280, vw: 1280, vh: 775,   // Figma "Laptop" 217:5984 — narrower blob so copy clears down to 1025
    A:[[241.271,116.193],[75.2881,390.039],[581.716,615.334],[649.639,419.378]],
    C1:[[84.139,93.0141],[170.568,595.494],[644.899,576.642],[626.287,313.186]],
    C2:[[20.8208,272.589],[518.532,654.026],[672.99,525.57],[542.749,160.666]] },
  { max: Infinity, vw: 1440, vh: 760,
    A:[[319.313,133.184],[124.461,419.57],[743.295,669.927],[821.107,463.831]],
    C1:[[128.375,105.018],[244.628,639.475],[818.97,630.373],[790.376,350.764]],
    C2:[[55.7667,293.86],[667.619,709.48],[851.839,576.898],[685.651,187.224]] },
];
function blobForWidth(w) {
  for (const b of BLOBS) if (w <= b.max) return b;
  return BLOBS[BLOBS.length - 1];
}

// Emit the closed cubic-bezier `d` for a blob, with optional per-anchor offsets.
function blobPathD(b, o) {
  o = o || [[0, 0], [0, 0], [0, 0], [0, 0]];
  let d = `M${round2(b.A[0][0] + o[0][0])} ${round2(b.A[0][1] + o[0][1])}`;
  for (let s = 0; s < 4; s++) {
    const a = s, z = (s + 1) % 4;
    d += `C${round2(b.C1[s][0] + o[a][0])} ${round2(b.C1[s][1] + o[a][1])} ` +
         `${round2(b.C2[s][0] + o[z][0])} ${round2(b.C2[s][1] + o[z][1])} ` +
         `${round2(b.A[z][0] + o[z][0])} ${round2(b.A[z][1] + o[z][1])}`;
  }
  return d + 'Z';
}

function initHero() {
  // Project pages have no hero — and, unlike the homepage, never set `is-loading`
  // in their inline <head> script, so there is no load-reveal to run here.
  if (!intro) return;

  const blobSvg = document.querySelector('.intro-blob');
  const blobPath = document.querySelector('.intro-blob-path');
  const lines = Array.from(document.querySelectorAll('.intro-line'));

  // Active tier's blob; set its viewBox + resting shape up front so reduced-
  // motion (and the first paint) get the right blob for the current breakpoint.
  let blob = blobForWidth(window.innerWidth);
  if (blobSvg) blobSvg.setAttribute('viewBox', `0 0 ${blob.vw} ${blob.vh}`);
  if (blobPath) blobPath.setAttribute('d', blobPathD(blob));
  window.addEventListener('resize', () => {
    const b = blobForWidth(window.innerWidth);
    if (b === blob) return;
    blob = b;
    if (blobSvg) blobSvg.setAttribute('viewBox', `0 0 ${b.vw} ${b.vh}`);
    if (reducedMotion.matches && blobPath) blobPath.setAttribute('d', blobPathD(b));
  });

  startReveal();
  if (reducedMotion.matches || !blobPath) return;

  // ---- Blob morph (fluid, shape-preserving) ----------------------------
  // Each anchor drifts on its own slow, non-repeating 2D path, carrying its two
  // handles — so the tangent is preserved (no kinks) and only the spans between
  // corners flex, reading as a fluid edge. Amplitude is ~1% of the ACTIVE blob's
  // width so the drift looks the same at every breakpoint. Eased in from zero.
  const AMP_FRAC = 14 / 1440;         // ~1% of width
  const w1 = (2 * Math.PI) / 26, w2 = (2 * Math.PI) / 34;
  const LINE_X = 5, LINE_Y = 4, wx = (2 * Math.PI) / 23, wy = (2 * Math.PI) / 29;
  const startT = performance.now();
  let rafId = 0, running = false;

  function drift(a, t, amp) {
    return [
      amp * (0.6 * Math.sin(w1 * t + a * 1.3) + 0.4 * Math.sin(w2 * t + a * 2.1 + 0.5)),
      amp * (0.6 * Math.sin(w1 * t + a * 1.9 + 1.0) + 0.4 * Math.sin(w2 * t + a * 0.7 + 2.0)),
    ];
  }

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const t = (now - startT) / 1000;
    const r = Math.min(t / 1.5, 1);
    const k = r * r * (3 - 2 * r);            // smoothstep amplitude ramp
    const amp = k * blob.vw * AMP_FRAC;
    blobPath.setAttribute('d', blobPathD(blob, [drift(0, t, amp), drift(1, t, amp), drift(2, t, amp), drift(3, t, amp)]));

    // Float each word on its own slow X/Y oval (distinct phase per line).
    for (let i = 0; i < lines.length; i++) {
      const tx = k * LINE_X * Math.sin(wx * t + i * 1.1);
      const ty = k * LINE_Y * Math.sin(wy * t + i * 1.7 + 0.6);
      lines[i].style.transform = `translate(${round2(tx)}px, ${round2(ty)}px)`;
    }
  }
  function play() { if (!running) { running = true; rafId = requestAnimationFrame(frame); } }
  function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); }

  // Only animate while the hero is on screen and the tab is visible.
  const hero = document.querySelector('.intro');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? play() : pause()));
    }, { threshold: 0 }).observe(hero);
  } else {
    play();
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
}

// Reveal sequence. Reduced motion: just show everything. Motion: the headline
// settles into focus (blur -> sharp), then the rest of the site fades in.
function startReveal() {
  if (reducedMotion.matches) {
    html.classList.add('is-text-revealed');
    revealRestOfSite();
    return;
  }
  html.classList.add('is-headline-in');
  setTimeout(revealSite, 200);
}

function round2(x) { return Math.round(x * 100) / 100; }

initHero();

const heroFadeScrollRange = 320;
const scrollEffectDelay = 40;
const scrollIndicatorFadeRange = 50;

function scrollEffectRatio(range, delay = scrollEffectDelay) {
  return Math.max((window.scrollY - delay) / range, 0);
}

// Quadratic ease-in: starts slow, then accelerates
function easeIn(t) {
  return t * t;
}

function updateScrollEffects() {
  // While the load reveal is in progress, let CSS control opacity
  // instead of stomping it with an inline style here
  if (html.classList.contains('is-loading')) return;

  // Scroll-spy: the active nav item is the last section whose top has
  // scrolled above a line ~35% down the viewport. In the hero, none.
  const marker = window.innerHeight * 0.35;
  let activeLink = null;
  for (const s of navSections) {
    if (s.el && s.el.getBoundingClientRect().top <= marker) activeLink = s.link;
  }
  navSections.forEach(s => s.link.classList.toggle('is-active', s.link === activeLink));

  // Invert the sticky bar to blue/white once the Contact panel slides
  // beneath it; stays inverted through the (also-blue) footer to page end
  // Invert once Contact reaches the scroll-anchor line (CSS scroll-padding-top,
  // where an anchor-clicked section rests) so clicking the Contact nav link flips
  // the bar on arrival, not after scrolling further in. Read here (not at init)
  // because the @import'd CSS may not be applied when the deferred script runs.
  if (contactSection && siteHeader) {
    const contactTop = contactSection.getBoundingClientRect().top;
    const scrollAnchorTop = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
    const invertLine = Math.max(scrollAnchorTop, siteHeader.offsetHeight);
    siteHeader.classList.toggle('is-over-dark', contactTop <= invertLine + 1);
  }

  // Everything below is the hero's own scroll accent — project pages have no
  // hero, so there's nothing left to do there.
  if (!introHeadline || !introBody || !scrollIndicator) return;

  if (reducedMotion.matches) {
    introHeadline.style.opacity = '';
    introBody.style.opacity = '';
    scrollIndicator.style.opacity = '';
    return;
  }

  // The one hero scroll accent: the headline and paragraph fade out
  // together as the reader scrolls down. Clamped to 1 so it settles.
  const fade = easeIn(Math.min(scrollEffectRatio(heroFadeScrollRange), 1));
  const opacity = 1 - fade;
  introHeadline.style.opacity = opacity;
  introBody.style.opacity = opacity;

  // Scroll indicator has done its job the moment you scroll — fade it
  // out quickly right away, no delay.
  scrollIndicator.style.opacity = 1 - Math.min(window.scrollY / scrollIndicatorFadeRange, 1);

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
  distance: 20,   // px of translate — a clear but composed rise
  duration: 0.8,  // s — long enough to read on the way in, in either direction
  stagger: 0.08,  // s between items in a group (80ms)
  ease: [0.16, 1, 0.3, 1], // gentle ease-out, no overshoot
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
  const headerOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -headerOffset });
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
      } else if (r.top < vh * 0.85 && r.bottom > vh * 0.15) {
        // Meaningfully in view → fade in (typography first). Wide gap from the
        // reset condition gives hysteresis, so there's no flicker at the edges.
        setVisible(group, true);
      }
      // Partially on screen but not past the reveal line yet: hold current state.
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  if (window.__lenis) window.__lenis.on('scroll', update);
  update();
}

// Tablet + phone: the hero deliberately stops short of the fold so the FIRST
// Work card already peeks above it (see the 768 tier in responsive.css). It's
// on screen at load, so fading it in is wrong — drop it out of the reveal
// system entirely and let it simply be there. Cards 2-4 still reveal.
// Removing the attributes also clears the `html.is-motion [data-reveal]`
// opacity:0 initial state, so nothing is left hidden.
if (window.innerWidth <= 768) {
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

// Show the 👋 cursor over the blue panel (Contact on the homepage, the
// Conversation Invitation on a project page) — desktop (mouse) only
if (darkPanel && waveCursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
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

  function open() {
    lastFocus = document.activeElement;
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
    menu.classList.remove('is-open');
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
