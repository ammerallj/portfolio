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
  { link: document.querySelector('.site-nav-bar a[href="#about"]'), el: document.getElementById('about') },
  { link: document.querySelector('.site-nav-bar a[href="#contact"]'), el: document.getElementById('contact') },
].filter(s => s.link && s.el);

const siteHeader = document.querySelector('.site-header');

// Floating in-page section nav — only the project overview pages render
// `.section-pills`, so `sectionPills` is empty (and every loop over it a no-op)
// on the homepage. Each pill links to a section on its own page (#overview /
// #process / #impact); the anchor clicks glide via the shared Lenis handler in
// setupLenis(). The spy + footer tuck-away live in updateScrollEffects().
const sectionPillBar = document.querySelector('.section-pills');
// Every pill — including the locked "Process" chip (Accessibility / Messaging) —
// maps to a real in-page section, so all of them take part in the scroll-spy.
// The pills are in DOM/scroll order (overview → process → impact), which the spy
// below relies on to pick the last section above the marker. The locked chip's
// selected look is styled muted-but-filled in project-overview.css.
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
const introInner = document.querySelector('.intro-inner');
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
  // Mobile (Figma 272:433, 375×844): a compact egg in the UPPER area — the
  // cycling copy sits in it, the first Work card is fully in view below.
  // Silhouette bbox x ~14–359, y ~87–316 (painted center ~201 — the CSS pins
  // .intro-inner there).
  { max: 480, vw: 375, vh: 844,
    A:[[346.353,161.649],[69.154,109.489],[60.601,278.447],[326.125,266.869]],
    C1:[[328.97,126.764],[10.521,144.715],[205.654,348.342],[367.811,227.346]],
    C2:[[171.722,47.87],[-15.002,242.018],[284.439,306.392],[363.734,196.535]] },
  // Portrait tablet (Figma 277:5122, 768×760): a mid-size egg, top-anchored —
  // the cycling 32px copy sits on its center (painted y ≈ 158–593), no CTA.
  { max: 768, vw: 768, vh: 760,
    A:[[688.061,300.266],[161.719,201.226],[145.478,522.039],[649.652,500.057]],
    C1:[[655.055,234.025],[50.387,268.111],[420.903,654.754],[728.805,425.011]],
    C2:[[356.472,84.223],[1.924,452.867],[570.499,575.103],[721.065,366.506]] },
  // Landscape tablet (Figma 265:502, 1024×1366 portrait canvas): the egg sits
  // in the UPPER area (painted y ≈ 110–700), copy inside it, and the first
  // Work card is fully in view below (card content at y 783 in the frame).
  // Covers the 769–1024 band; the CSS top-anchors this canvas at 1:1.
  { max: 1024, vw: 1024, vh: 1366,
    A:[[892.259,320.768],[238.565,197.763],[218.396,596.2],[844.558,568.898]],
    C1:[[851.269,238.499],[100.296,280.832],[560.461,761.026],[942.862,475.695]],
    C2:[[480.441,52.45],[40.108,510.292],[746.253,662.102],[933.249,403.036]] },
  // Laptop (Figma 265:483 @1280 / 265:521 @1025 — those two frames share ONE
  // path, identical coordinates ±112px of x): the frames keep this silhouette
  // ~viewport-centered at a constant size, so the coordinates below are the
  // exact 1280-canvas path translated +91.65px in x to put the silhouette's
  // center on the 1440 canvas center — the centered element then lands it
  // frame-true at every width in the band. Fixed size; sides crop as the
  // viewport narrows.
  { max: 1439, vw: 1440, vh: 760,
    A:[[1152.99,295.5],[403.368,154.455],[380.223,611.402],[1098.28,580.07]],
    C1:[[1105.99,201.152],[244.803,249.727],[772.485,800.421],[1211.02,473.176]],
    C2:[[680.745,-12.204],[175.773,512.884],[985.546,686.964],[1199.99,389.848]] },
  // Desktop (Figma 258:479, 1440×760): the big centred egg (drawn very slightly
  // wider/shorter than the laptop one — ≤1.5%, invisible at the swap).
  { max: Infinity, vw: 1440, vh: 760,
    A:[[1159.15,272.474],[373.882,169.788],[372.189,627.318],[1095.95,561.979]],
    C1:[[1101,184],[219.966,272.39],[772.866,797.738],[1203.54,449.916]],
    C2:[[643.129,-9.69],[163.354,538.495],[988.356,674.041],[1217.31,360.947]] },
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

  // Centre the VISIBLE silhouette, not the canvas. The path's bbox is not
  // centred inside its own viewBox (the shape is bottom-heavy), so centring the
  // <svg> box leaves the blob looking low/off. Measure the gap between the
  // element's centre and the path's centre and publish it as CSS vars for
  // hero.css to correct. Measured from the RESTING path (called right after it's
  // set) so the settle animation never shifts it, and it's idempotent — moving
  // the element moves both rects together, so the delta is invariant.
  function centerSilhouette() {
    if (!blobSvg || !blobPath) return;
    try {
      const s = blobSvg.getBoundingClientRect();
      const p = blobPath.getBoundingClientRect();
      if (!s.width || !p.width) return;
      blobSvg.style.setProperty('--blob-dx', `${round2((s.left + s.width / 2) - (p.left + p.width / 2))}px`);
      blobSvg.style.setProperty('--blob-dy', `${round2((s.top + s.height / 2) - (p.top + p.height / 2))}px`);
    } catch (e) { /* not laid out yet — the 0px fallbacks in hero.css apply */ }
  }

  // Active tier's blob; set its viewBox + resting shape up front so reduced-
  // motion (and the first paint) get the right blob for the current breakpoint.
  let blob = blobForWidth(window.innerWidth);
  if (blobSvg) blobSvg.setAttribute('viewBox', `0 0 ${blob.vw} ${blob.vh}`);
  if (blobPath) blobPath.setAttribute('d', blobPathD(blob));
  centerSilhouette();
  window.addEventListener('resize', () => {
    const b = blobForWidth(window.innerWidth);
    if (b === blob) return;
    blob = b;
    if (blobSvg) blobSvg.setAttribute('viewBox', `0 0 ${b.vw} ${b.vh}`);
    // Repaint the new tier's resting shape. During the brief settle window the
    // morph loop overwrites this next frame (seamless); once settled — or under
    // reduced motion — this IS what keeps the blob correct across breakpoints.
    if (blobPath) blobPath.setAttribute('d', blobPathD(b));
    centerSilhouette();   // each tier's path has its own bbox offset
  });

  startReveal();
  if (reducedMotion.matches || !blobPath) return;

  // ---- Blob morph — a lively entrance easing into a PERPETUAL subtle idle --
  // The blob breathes noticeably as the page loads, then eases down to a very
  // subtle continuous drift and keeps living — never freezing. Each anchor
  // drifts on its own slow 2D path carrying its two handles (tangent preserved,
  // no kinks); amplitude is a fraction of the ACTIVE blob's width so it looks
  // the same per tier. The two sine frequencies are incommensurate, so the
  // motion never visibly repeats. Paused off-screen / hidden-tab below.
  const AMP_FRAC = 14 / 1440;         // entrance amplitude, ~1% of width
  const IDLE_FRAC = 0.3;              // idle floor: 30% of entrance (~4px @1440)
  const w1 = (2 * Math.PI) / 26, w2 = (2 * Math.PI) / 34;
  // Envelope (seconds): ease amplitude 0->1, hold lively, ease down to the idle
  // floor — then hold that floor forever. Tune these to change how long the
  // hero's entrance "lives" before quieting down.
  const RAMP_IN = 1.5, HOLD = 2.0, RAMP_OUT = 2.5;
  const SETTLE_END = RAMP_IN + HOLD + RAMP_OUT;
  const smoothstep = (r) => r * r * (3 - 2 * r);
  const startT = performance.now();
  let rafId = 0, running = false;

  function drift(a, t, amp) {
    return [
      amp * (0.6 * Math.sin(w1 * t + a * 1.3) + 0.4 * Math.sin(w2 * t + a * 2.1 + 0.5)),
      amp * (0.6 * Math.sin(w1 * t + a * 1.9 + 1.0) + 0.4 * Math.sin(w2 * t + a * 0.7 + 2.0)),
    ];
  }

  // Amplitude over time: rise, hold at full, ease down to the idle floor, stay.
  function envelope(t) {
    if (t <= RAMP_IN) return smoothstep(t / RAMP_IN);
    if (t <= RAMP_IN + HOLD) return 1;
    if (t < SETTLE_END) return 1 - (1 - IDLE_FRAC) * smoothstep((t - RAMP_IN - HOLD) / RAMP_OUT);
    return IDLE_FRAC;
  }

  // ---- Hover morph — the egg yields under the cursor (fine pointers only) --
  // A gaussian push composed with the idle drift: anchors near the pointer ease
  // away from it, so the edge under the cursor flexes while the far side holds.
  // hoverK eases the whole effect in/out (enter/leave never snaps) and each
  // anchor's offset is lerped per-frame, so quick mouse sweeps read as the egg
  // lagging softly behind the cursor rather than twitching.
  const finePointer = window.matchMedia('(pointer: fine)');
  const HOVER_PUSH_FRAC = 16 / 1440;   // max push ≈ 1.1% of the blob's width
  const HOVER_SIGMA_FRAC = 0.24;       // falloff radius vs the blob's width
  const hover = { x: 0, y: 0, over: false };
  let hoverK = 0;
  const hoverOff = [[0, 0], [0, 0], [0, 0], [0, 0]];

  function updateHover(e) {
    const r = blobSvg.getBoundingClientRect();
    if (!r.width) return;
    // Pointer position in the blob's viewBox space (the element renders 1:1 or
    // uniformly scaled, so one scale factor maps both axes).
    const scale = blob.vw / r.width;
    hover.x = (e.clientX - r.left) * scale;
    hover.y = (e.clientY - r.top) * scale;
    try {
      hover.over = blobPath.isPointInFill(new DOMPoint(hover.x, hover.y));
    } catch (err) {
      // No isPointInFill (old engines): fall back to "anywhere over the hero".
      hover.over = true;
    }
  }
  if (finePointer.matches && blobSvg) {
    intro.addEventListener('pointermove', updateHover);
    intro.addEventListener('pointerleave', () => { hover.over = false; });
  }

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    const t = (now - startT) / 1000;
    const k = envelope(t);
    const amp = k * blob.vw * AMP_FRAC;

    // Ease the hover presence, then each anchor's push toward its target.
    hoverK += ((hover.over ? 1 : 0) - hoverK) * 0.08;
    const push = blob.vw * HOVER_PUSH_FRAC;
    const sigma = blob.vw * HOVER_SIGMA_FRAC;
    const o = [];
    for (let i = 0; i < 4; i++) {
      let tx = 0, ty = 0;
      if (hoverK > 0.001) {
        const vx = blob.A[i][0] - hover.x, vy = blob.A[i][1] - hover.y;
        const dist = Math.hypot(vx, vy) || 1;
        const mag = hoverK * push * Math.exp(-(dist * dist) / (2 * sigma * sigma));
        tx = (vx / dist) * mag;
        ty = (vy / dist) * mag;
      }
      hoverOff[i][0] += (tx - hoverOff[i][0]) * 0.12;
      hoverOff[i][1] += (ty - hoverOff[i][1]) * 0.12;
      const dr = drift(i, t, amp);
      o.push([dr[0] + hoverOff[i][0], dr[1] + hoverOff[i][1]]);
    }
    blobPath.setAttribute('d', blobPathD(blob, o));
  }
  function play() { if (!running) { running = true; rafId = requestAnimationFrame(frame); } }
  function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); }

  // Only animate while the hero is on screen and the tab is visible — the idle
  // loop costs nothing when the blob can't be seen, and the drift picks up
  // exactly where its clock left off (t keeps advancing, phase stays smooth).
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

// Reveal sequence. Reduced motion: just show everything. Motion: the blob plays
// its entrance settle while the copy lockup fades in, then the rest of the site.
function startReveal() {
  if (reducedMotion.matches) {
    html.classList.add('is-text-revealed');
    revealRestOfSite();
    return;
  }
  setTimeout(revealSite, 200);
}

function round2(x) { return Math.round(x * 100) / 100; }

initHero();

// ============================================================
// HERO CYCLE — at ≤768px the two hero paragraphs share one slot and crossfade
// every few seconds to keep the compact egg compact (Figma 277:5121 / 272:432).
// Progressive enhancement: without JS or with reduced motion the class is never
// added and the paragraphs simply stack (responsive.css). Guarded for project
// pages (no .intro-copy there).
// ============================================================
function initHeroCycle() {
  // Claim first: a fast-scrolling visitor should meet the point of view, not
  // the résumé line — the credential follows on the next beat.
  const slides = [
    document.querySelector('.intro-claim'),
    document.querySelector('.intro-headline'),
  ].filter(Boolean);
  if (slides.length < 2 || reducedMotion.matches) return;

  const mq = window.matchMedia('(max-width: 768px)');
  const HOLD_MS = 5000;
  const EXIT_MS = 600; // covers the exit transition before the base-state snap
  let timer = 0;
  let resetTimer = 0;
  let active = 0;

  // Sequential hand-off (see the cycling CSS in responsive.css): the current
  // slide gets is-cycle-exit (lifts away), the next gets is-cycle-active (its
  // delayed transition rises it in after the exit). Once the exit has played,
  // strip the class so the slide snaps back below the slot while invisible.
  function show(i) {
    slides.forEach((el, k) => {
      if (k === i) {
        el.classList.remove('is-cycle-exit');
        el.classList.add('is-cycle-active');
      } else if (el.classList.contains('is-cycle-active')) {
        el.classList.remove('is-cycle-active');
        el.classList.add('is-cycle-exit');
      }
    });
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      slides.forEach((el) => el.classList.remove('is-cycle-exit'));
    }, EXIT_MS);
  }
  function start() {
    if (timer) return;
    html.classList.add('is-hero-cycling');
    show(active);
    timer = setInterval(() => {
      // Skip beats in a hidden tab so a return visit isn't mid-transition.
      if (document.hidden) return;
      active = (active + 1) % slides.length;
      show(active);
    }, HOLD_MS);
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = 0;
    clearTimeout(resetTimer);
    html.classList.remove('is-hero-cycling');
    slides.forEach((el) => el.classList.remove('is-cycle-active', 'is-cycle-exit'));
  }

  const update = () => (mq.matches ? start() : stop());
  mq.addEventListener('change', update);
  update();
}
initHeroCycle();

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
  if (contactSection && siteHeader) {
    const contactRect = contactSection.getBoundingClientRect();
    if (contactRect.height === 0) {
      // Contact is hidden (dropped at the mobile tier) — there's no blue panel to
      // invert over, so keep the header in its normal (cream) state.
      siteHeader.classList.remove('is-over-dark');
    } else {
      const scrollAnchorTop = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      const invertLine = Math.max(scrollAnchorTop, siteHeader.offsetHeight);
      siteHeader.classList.toggle('is-over-dark', contactRect.top <= invertLine + 1);
    }
  }

  // Everything below is the hero's own scroll accent — project pages have no
  // hero, so there's nothing left to do there.
  if (!introInner) return;

  if (reducedMotion.matches) {
    introInner.style.opacity = '';
    return;
  }

  // The one hero scroll accent: the copy lockup fades out as the reader scrolls
  // down. Clamped to 1 so it settles.
  const fade = easeIn(Math.min(scrollEffectRatio(heroFadeScrollRange), 1));
  introInner.style.opacity = 1 - fade;

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
  distance: 12,   // px of translate — a small rise; text stays readable mid-fade
  duration: 0.5,  // s — quick enough to resolve before a fast scroller passes it
  stagger: 0.05,  // s between items in a group (50ms) — a section lands near-together
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
