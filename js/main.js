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

// The landing's own bottom bar is the desktop nav — spy it the same way (the
// site-header nav above only exists on ≤480 / project pages).
const introBarSections = [
  { sel: '#work-section', id: 'work-section' },
  { sel: '#about', id: 'about' },
  { sel: '#contact', id: 'contact' },
]
  .map(({ sel, id }) => ({
    link: document.querySelector(`.intro-bar-links a[href="${sel}"], .intro-bar-cta[href="${sel}"]`),
    el: document.getElementById(id),
  }))
  .filter(s => s.link && s.el);
navSections.push(...introBarSections);

// Where each settling section comes to rest, published by initSectionGeometry so
// the anchor handler in setupLenis can aim at the SAME place. Returns null for
// anything that does not settle, and stays null on the project pages, which have
// none of these sections.
//
// ⚠️ DECLARED HERE, ABOVE updateScrollEffects, AND IT HAS TO BE. `let` sits in a
// temporal dead zone until its declaration runs, and updateScrollEffects() is
// called at module scope further down — so declaring this beside
// initSectionGeometry threw "Cannot access before initialization" the moment the
// spy read it. That killed the whole script, and because `is-motion` hides every
// [data-reveal] pre-paint, the PROJECT PAGES rendered blank.
//
// The homepage hid the bug: it sets `is-loading`, and updateScrollEffects returns
// early on that before it reaches the spy. The project pages never set
// `is-loading`, so they ran straight into it. Anything the spy reads must be
// declared above this line, and must be tested on a project page.
let sectionRestingScrollY = null;
// Where a NAV CLICK should land, which is not always where the section rests.
// Same TDZ rule as above — declared here, above updateScrollEffects.
let sectionClickScrollY = null;

const siteHeader = document.querySelector('.site-header');

// Where the sticky nav sits — the same offset anchor-scrolling uses to rest a
// section below the bar, so the scroll-spy and the anchor jumps agree on what
// "arrived at this section" means. Read once: this is consulted on every scroll
// event, and getComputedStyle there would be wasteful.
const NAV_OFFSET = parseFloat(
  getComputedStyle(document.documentElement).scrollPaddingTop) || 0;

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
// How far the sticky bar's frosted glass reaches past its own bottom edge. Must
// match the `100px` fallback in hero.css's .intro-bar::before — that fallback is
// what a no-JS visitor gets, and it is the correct value everywhere except the
// approach to Contact.
const BAR_BLEED = 100;
// How much approach the bar's colour change is spread over, in px of scroll, and
// the point in it where the LABELS switch.
//
// The inversion used to be one binary flip at the moment Contact's top reached
// the bar. At 1440x900 that moment IS the scroll floor — Contact is sized
// `100dvh - nav - footer`, so its top comes to rest exactly on the nav line and
// the blue never travels under the bar at all — which meant the whole palette
// changed after the page had already stopped moving. Spreading the glass over
// the approach ties it to the scroll instead.
//
// The tint itself no longer HAS a window — it is the fraction of the bar that
// actually has blue behind it (see updateScrollEffects), which needs no tuning.
// Two guessed windows came before it, 260px then 100px, both ending at the
// bar's bottom edge: they started colouring the strip while the panel was still
// below it and nothing blue was under the bar at all. Only the label threshold
// below is a choice now.
//
// 0.85 is where black and white are equally legible on the part-mixed strip:
// measured on the composite, white 4.51:1 and black 4.66:1, crossing right
// there. Below it black wins, above it white does, so it is the one point where
// the switch costs nothing either way. The LABELS have to switch rather than
// fade — a half-faded black-to-white label is grey, and grey is unreadable on
// both ends.
const DARK_TEXT_AT = 0.85;
// How much of the bar has to be over the panel before the strip is fully the
// panel's colour. Below 1 on purpose: at 1 the tint tracks coverage exactly, and
// the bar spends the whole pass visibly lighter than the section it is inside,
// with the labels stuck dark — DARK_TEXT_AT is only reachable at the very end
// because white needs a strip that is nearly fully blue. At 0.6 the strip
// commits early, the labels switch at 51% coverage instead of 85%, and both
// still land on the measured crossover rather than ahead of it.
const DARK_FULL_AT = 0.6;
let lastBarBleed = -1;
let lastDarkMix = -1;
function setDarkMix(v) {
  // Rounded to 1% and guarded, for the reason setBarBleed is: this runs on every
  // scroll frame and repaints a backdrop-filtered layer.
  const px = Math.round(v * 100) / 100;
  if (px === lastDarkMix) return;
  lastDarkMix = px;
  document.documentElement.style.setProperty('--dark-mix', px);
}
function setBarBleed(px) {
  // Written on the ROOT, not per bar: one property, and the two pseudo-elements
  // that read it inherit it. Guarded on the last value because updateScrollEffects
  // runs on every scroll frame and this invalidates a backdrop-filter — there is
  // no reason to re-run that while the number is unchanged, which is nearly
  // always.
  if (px === lastBarBleed) return;
  lastBarBleed = px;
  document.documentElement.style.setProperty('--bar-bleed', px + 'px');
}
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

// Hero statement text-morph. Cycles the H1 between three statements the way the
// motion-primitives TextMorph does — but rebuilt in vanilla JS (no React/build
// step to import it). Each character is keyed by character + how many times it
// has appeared; characters shared between the outgoing and incoming statement
// KEEP THE SAME DOM NODE and slide from their old position to their new one (a
// manual FLIP), so the words appear to morph fluidly into each other. Letters
// only in the old statement fade out; letters only in the new one fade in.
//
// Progressive enhancement: the H1 ships in the HTML with the first statement as
// plain text, so no-JS visitors and crawlers keep that (and its SEO/JSON-LD
// value); this only runs on the homepage with motion allowed. .intro-top is
// bottom-anchored and overflow-clipped, so the statements' differing line counts
// never move the divider below.
function initHeadlineMorph() {
  const h1 = document.querySelector('.intro-headline');
  if (!h1 || reducedMotion.matches) return;

  const PHRASES = [
    'Making products make sense.',
    'Finding the patterns others miss.',
    'Defining how products behave.',
  ];
  const SLIDE = 1100;  // ms shared letters travel to their new positions
  const FADE = 650;    // ms enter / exit fade
  const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'; // gentle, symmetric ease in/out
  const DWELL = 5200;  // ms a statement rests fully shown (>5s: readable, calm)
  const FIRST = 5200;  // ms before the first morph (lets the load reveal settle)
  let idx = 0;
  let busy = false;

  // Absolutely-positioned exiting/entering letters are placed relative to the H1.
  h1.style.position = 'relative';

  // Key = character + its occurrence index, so the Nth "e" in one statement maps
  // to the Nth "e" in the next. This is what decides which letters persist.
  function makeKeyer() {
    const seen = Object.create(null);
    return (ch) => ch + '#' + (seen[ch] = (seen[ch] || 0) + 1);
  }

  // Build word/char spans for `text` into `frag`. A char is REUSED (persists)
  // when a node with its key exists and hasn't been claimed; otherwise a fresh
  // hidden node is created and pushed to `entering`. Words are nowrap spans so
  // the line only ever wraps between words.
  function build(frag, text, pool, used, entering) {
    const key = makeKeyer();
    text.split(' ').forEach((word, wi, words) => {
      const wspan = document.createElement('span');
      wspan.className = 'word';
      for (const ch of word) {
        const k = key(ch);
        let node = pool && pool.get(k);
        if (node && !used.has(k)) {
          used.add(k);
        } else {
          node = document.createElement('span');
          node.className = 'char';
          node.textContent = ch;
          node.style.opacity = '0';
          node.style.filter = 'blur(4px)';
          node.style.transform = 'translateY(0.22em)';
          entering.push(node);
        }
        node.dataset.key = k;
        wspan.appendChild(node); // moves the node if it was reused
      }
      frag.appendChild(wspan);
      if (wi < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });
  }

  function morphTo(text) {
    if (busy) return;
    busy = true;

    // Purge any exit letters a throttled prior cleanup may have left behind, so
    // they can never be re-adopted into the character pool below.
    h1.querySelectorAll('.char-exit').forEach((n) => n.remove());

    // FIRST: snapshot every current (non-exiting) character and its viewport rect.
    const pool = new Map();
    const firstRect = new Map();
    h1.querySelectorAll('.char:not(.char-exit)').forEach((n) => {
      pool.set(n.dataset.key, n);
      firstRect.set(n.dataset.key, n.getBoundingClientRect());
    });
    const oldTop = [...h1.childNodes];

    // Build the incoming layout, moving reused nodes into it.
    const used = new Set();
    const entering = [];
    const frag = document.createDocumentFragment();
    build(frag, text, pool, used, entering);

    // Exiting = old letters not reused. Pull them out of flow (absolute) so they
    // can fade in place without affecting the new layout; real coords set below.
    const exiting = [];
    pool.forEach((node, k) => {
      if (used.has(k)) return;
      node.classList.add('char-exit'); // excluded from the pool of any later morph
      node.style.position = 'absolute';
      node.style.margin = '0';
      node.style.transition = 'none';
      h1.appendChild(node); // reparent out of its old word span before removal
      exiting.push(node);
    });

    // Swap old layout → new layout.
    oldTop.forEach((n) => { if (n.parentNode === h1) h1.removeChild(n); });
    h1.appendChild(frag);

    // Now that the new layout exists, position the exiting letters at their old
    // spot (relative to the H1's new box, so a moved box doesn't shift them).
    const host = h1.getBoundingClientRect();
    exiting.forEach((node) => {
      const r = firstRect.get(node.dataset.key);
      node.style.left = (r.left - host.left) + 'px';
      node.style.top = (r.top - host.top) + 'px';
    });

    // LAST: decide which reused letters actually SLIDE. A letter only slides if
    // its new home is near its old one; a letter that would fly a long way across
    // the screen instead cross-fades — a ghost fades out at the old spot while the
    // real letter fades in at the new one — so the morph stays calm, not chaotic.
    const fontPx = parseFloat(getComputedStyle(h1).fontSize) || 64;
    const MAX_SLIDE = fontPx * 1.5; // px a letter may travel before it cross-fades
    const sliders = [];
    used.forEach((k) => {
      const node = pool.get(k);
      const a = firstRect.get(k);
      const b = node.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (Math.hypot(dx, dy) <= MAX_SLIDE) {
        // Near: FLIP slide — invert to the old spot now, release in the rAF.
        node.style.opacity = '1';
        node.style.filter = 'blur(0px)';
        node.style.transition = 'none';
        node.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        sliders.push(node);
      } else {
        // Far: leave a ghost fading out at the old spot...
        const ghost = node.cloneNode(true);
        ghost.classList.add('char-exit');
        ghost.style.position = 'absolute';
        ghost.style.margin = '0';
        ghost.style.left = (a.left - host.left) + 'px';
        ghost.style.top = (a.top - host.top) + 'px';
        ghost.style.transform = 'none';
        ghost.style.opacity = '1';
        ghost.style.filter = 'blur(0px)';
        ghost.style.transition = 'none';
        h1.appendChild(ghost);
        exiting.push(ghost);
        // ...and fade the real letter in at its new spot (treat it as entering).
        node.style.transition = 'none';
        node.style.opacity = '0';
        node.style.filter = 'blur(4px)';
        node.style.transform = 'translateY(0.22em)';
        entering.push(node);
      }
    });

    void h1.offsetWidth; // flush the inverted start state

    requestAnimationFrame(() => {
      sliders.forEach((node) => {
        node.style.transition = 'transform ' + SLIDE + 'ms ' + EASE;
        node.style.transform = 'translate(0px, 0px)';
      });
      // Entering letters drift up + sharpen once the slide is underway, so they
      // arrive with motion instead of popping in.
      const delay = Math.round(SLIDE * 0.2);
      entering.forEach((node) => {
        node.style.transition =
          'opacity ' + FADE + 'ms ease ' + delay + 'ms, ' +
          'filter ' + FADE + 'ms ease ' + delay + 'ms, ' +
          'transform ' + FADE + 'ms ' + EASE + ' ' + delay + 'ms';
        node.style.opacity = '1';
        node.style.filter = 'blur(0px)';
        node.style.transform = 'translateY(0)';
      });
      // Exiting letters drift up slightly as they soften away.
      exiting.forEach((node) => {
        node.style.transition =
          'opacity ' + FADE + 'ms ease, filter ' + FADE + 'ms ease, transform ' + FADE + 'ms ' + EASE;
        node.style.opacity = '0';
        node.style.filter = 'blur(4px)';
        node.style.transform = 'translateY(-0.14em)';
      });
    });

    setTimeout(() => {
      exiting.forEach((n) => n.remove());
      // Clear the FLIP inline transform/transition so the next snapshot is clean.
      h1.querySelectorAll('.char:not(.char-exit)').forEach((n) => {
        n.style.transition = '';
        n.style.transform = '';
      });
      busy = false;
    }, SLIDE + 120);
  }

  // The initial statement is already in the HTML — convert it to keyed spans
  // (shown, no entrance; it rides the CSS load-reveal), then start cycling.
  const initFrag = document.createDocumentFragment();
  const initEntering = [];
  build(initFrag, PHRASES[0], null, new Set(), initEntering);
  initEntering.forEach((n) => { n.style.opacity = ''; n.style.filter = ''; n.style.transform = ''; });
  h1.textContent = '';
  h1.appendChild(initFrag);

  let first = true;
  (function loop() {
    setTimeout(() => {
      idx = (idx + 1) % PHRASES.length;
      morphTo(PHRASES[idx]);
      first = false;
      loop();
    }, first ? FIRST : SLIDE + DWELL);
  })();
}

initHeadlineMorph();

// Scroll-triggered video. A work-card video (data-autoplay-in-view) sits under a
// sibling .work-card-poster JPG — the placeholder no-JS visitors and crawlers
// see. Nothing but that poster loads up front (preload="none"). The video plays
// through once from the start when ~40% of the card scrolls into view (from
// either direction); the poster CROSSFADES out the instant playback actually
// begins, so a poster that isn't the exact first frame never shows as a hard cut.
// It stops on its last frame (no loop attribute), and rewinds ONLY once the card
// is COMPLETELY out of frame — never while still visible, which would jump the
// frame mid-view — restoring the poster (off-screen, unseen) so the next
// scroll-in starts clean. An "armed" flag keeps a partial leave/re-entry from
// restarting it. Muted + playsinline so autoplay is allowed (incl. iOS). Skipped
// under reduced motion, where the poster simply stays and nothing loads.
function initScrollVideos() {
  const vids = document.querySelectorAll('video[data-autoplay-in-view]');
  if (!vids.length || reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const armed = new WeakSet();
  vids.forEach((v) => armed.add(v)); // eligible to play on the first entry
  const posterOf = (v) => v.parentNode.querySelector('.work-card-poster');

  // Buffer AHEAD. preload="none" keeps the page light, but if we waited until the
  // card was in view to fetch the MP4, you'd see the poster held, then a sudden
  // pop into playback once it downloaded — jarring. So start buffering ~a screen
  // before the card reaches view (in ANY direction); by the time it hits the 40%
  // play mark the first frame is decoded and playback is instant.
  // The margin is 800 on all four sides, not just top/bottom: since 2026-08 the
  // Work cards sit in a HORIZONTAL track (sections.css .work-list), so cards 2–4
  // approach from the RIGHT, not from below. With 0 horizontal margin they only
  // began loading as they slid into frame — exactly the pop this observer exists
  // to prevent. Vertical lead time is unchanged.
  const prep = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const v = entry.target;
      v.preload = 'auto';
      v.load();
      obs.unobserve(v); // buffer once; keep it
    });
  }, { rootMargin: '800px' });
  vids.forEach((v) => prep.observe(v));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const v = entry.target;
      if (!entry.isIntersecting) {
        // Fully out of frame: rewind (invisible, so no glitch), re-arm, and bring
        // the poster back (off-screen, unseen) so the next entry crossfades clean.
        v.pause();
        try { v.currentTime = 0; } catch (e) {}
        armed.add(v);
        const poster = posterOf(v);
        if (poster) poster.classList.remove('is-faded');
      } else if (entry.intersectionRatio >= 0.4 && armed.has(v)) {
        // Back to 40% in view: play once from frame 0, then disarm — so staying
        // in view (or a partial leave that never fully exits) won't rewind it.
        armed.delete(v);
        try { v.currentTime = 0; } catch (e) {}
        const poster = posterOf(v);
        const reveal = () => { if (poster) poster.classList.add('is-faded'); };

        // ⚠️ WAIT FOR DATA BEFORE CALLING play(). Asking an element that has only
        // metadata (readyState 1) to play does not queue the request — it stalls
        // in `waiting`, and the next pause kills it for good, because `armed` was
        // already spent above. Measured: play at rs=1, `waiting`, `pause` 170ms
        // later, `canplay` 140ms after THAT. The card then sat on its poster
        // until it left the frame and came back. That is the "sometimes it
        // doesn't play" bug.
        //
        // It bites the Work track hardest because rotation RESETS these
        // elements: normalize() moves a card's node to the other end of the
        // list, the media element re-runs resource selection, and a video that
        // was readyState 4 drops back to 1 — so the 800px prebuffer having
        // already run is no guarantee it is ready when the play threshold
        // arrives. work-accessibility shows it most, being the largest file.
        const startWhenReady = () => {
          // The card may have left while we waited. The leave handler re-arms,
          // so that is the signal to abandon this attempt rather than start
          // playback off-screen.
          if (armed.has(v)) return;
          const p = v.play(); // muted → allowed
          // Fade the poster only once playback has actually begun (a frame is
          // up), so the crossfade reveals moving video, never a blank/black gap.
          // On failure, re-arm rather than swallow: a spent flag with no
          // playback is the state that leaves a card stuck on its poster.
          if (p && p.then) p.then(reveal).catch(() => { armed.add(v); });
          else reveal();
        };
        // HAVE_FUTURE_DATA — enough to start and keep going, not just one frame.
        if (v.readyState >= 3) startWhenReady();
        else v.addEventListener('canplay', startWhenReady, { once: true });
      }
    });
  }, { threshold: [0, 0.4] });
  vids.forEach((v) => io.observe(v));

  // THE CARD RESTS ON THE VIDEO'S LAST FRAME. Nothing runs on `ended` — the
  // paused video simply holds its final frame, and the poster stays faded out
  // underneath it.
  //
  // ⚠️ IT USED TO SWAP THE POSTER BACK IN, and that was a workaround for a
  // problem that no longer exists. Three of the four MP4s were encoded 1330x416
  // against the 2376 device px a 1188px card needs on a 2x display — a 1.79x
  // upscale — so the last frame was visibly soft and the 2660x830 poster carried
  // detail the video did not. Since the 2026-08-31 re-export every clip is a
  // native 2660x830, so the last frame is exactly as sharp as the JPG and the
  // swap bought nothing while costing a visible jump: the poster is close to the
  // final frame but not identical to it (measured mean channel delta 12-16, most
  // of it q70 JPEG compression), and that difference showed as a flicker at the
  // moment playback stopped.
  //
  // If a clip is ever re-exported at a lower resolution again, this is the
  // mitigation to bring back — but fix the export first.
}
initScrollVideos();

// The horizontal Work track (sections.css .work-list) LOOPS: scroll past the
// last card and the first comes round again, in either direction, with no end
// stop. Progressive enhancement — with JS off the track is still a perfectly
// good finite horizontal scroller (and .work-list keeps its :not(.is-looping)
// end-snap for that case), so nothing here can hide a card.
//
// ROTATION, NOT CLONING. The four cards are never duplicated: when the scroll
// crosses a threshold, the card at one end is MOVED to the other end and the
// scroll position is walked back by exactly one card-step, so the pixels on
// screen do not change. One DOM node per project is what lets everything else
// keep working untouched — initScrollVideos' IntersectionObservers and the
// reveal groups both hold ELEMENT references, and a moved element is the same
// element. Cloning would have meant 12 cards, 12 <video> tags, duplicate
// headings for the crawlers that read this page, and clones whose video never
// plays because the observers were never attached to them.
//
// THE INVARIANT: scrollLeft always sits in [STEP, 2·STEP). That is one card of
// buffer on each side of the visible one, which is all a track needs when the
// card is nearly a viewport wide. Snap positions are exact multiples of STEP
// (.work-list's scroll-padding-inline is set to its own padding-inline, so
// card i snaps at i·STEP), which is why adding or subtracting a whole STEP
// always lands on another snap position — the jump never has to fight
// scroll-snap, and scroll-snap-type never has to be toggled off around it.
function initWorkCarousel() {
  const track = document.querySelector('.work-list');
  if (!track) return; // project pages have no Work track
  // Fewer than 3 and there isn't enough content to fill the buffer on both
  // sides, so the seam would show. Leave those as a normal finite scroller.
  if (track.children.length < 3) return;

  // PHONE HAS NO HORIZONTAL TRACK. At <=480 responsive.css reverts .work-list to
  // a vertical stack, and the loop must switch off with it — this is a
  // correctness gate, not an optimisation. On a column layout scrollLeft is
  // pinned at 0, so normalize()'s "scroll back into the buffer" branch would be
  // permanently true and re-prepend a card on every scroll event, scrambling the
  // running order of the projects. The query has to track the CSS breakpoint;
  // both carry a note pointing at the other.
  const horizontal = window.matchMedia('(min-width: 481px)');
  // The order the page shipped in. The loop rotates the DOM, so this is the only
  // record of it — needed to hand a correct stack back when the phone tier takes
  // over, and it must be captured before the first rotation.
  const authored = [...track.children];
  // The pagination bar, if the page ships one. Indexed against `authored`, NOT
  // against the live DOM: the loop rotates children constantly, so dot 1 has to
  // mean "the first project in the document" rather than "whatever is first
  // right now". Optional — project pages have no track at all.
  const pagination = track.parentElement
    && track.parentElement.querySelector('.work-pagination');
  const dots = pagination
    ? [...pagination.querySelectorAll('.work-pagination-dot')]
    : [];
  let active = false;
  let damping = false;   // true while the wheel-driven damped run owns scrollLeft

  let step = 0;

  // Card width + the track's gap. Read live: every tier changes both.
  function measureStep() {
    const first = track.firstElementChild;
    if (!first) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  }

  // Pull scrollLeft back into [STEP, 2·STEP), rotating one card per step. Also
  // does the initial placement: at load scrollLeft is 0, so the first pass
  // moves the LAST card to the front and lands on STEP — which leaves the
  // original first card flush on the container's left edge, exactly where it
  // sat before the loop existed, with the previous project now reachable by
  // scrolling backwards. The guard is a belt-and-braces stop against a
  // pathological layout (step measured as 0) spinning the loop forever.
  //
  // BOTH branches fire only at a BOUNDARY SNAP POSITION — 2*STEP going forward,
  // 0 going back — never on merely leaving the rest position. That symmetry is
  // the whole point, and getting it wrong is a real bug that shipped: the
  // backward test used to be `scrollLeft < step`, which is true after ONE PIXEL
  // of leftward movement. So the first frames of a backward gesture teleported
  // scrollLeft forward by a whole card. The browser had already computed its
  // snap target from the pre-jump position, so the gesture finished a card away
  // from where the platform thought it was and came to rest off the snap line —
  // scrolling forward snapped cleanly, scrolling back did not. Rotating only at
  // 0 and 2*STEP means the jump always happens exactly where the gesture has
  // naturally arrived, and -/+ STEP always lands on another snap position.
  //
  // The 1px tolerance on the backward test is deliberate. A fractional layout
  // can leave scrollLeft resting at something like 0.4, which `<= 0` would never
  // match — and unlike the forward side there is no runway left past 0 to try
  // again on the next event, so the loop would dead-end at the left edge and the
  // reader could not scroll back any further. Forward needs no such tolerance:
  // past 2*STEP the track still has real distance (max is ~2.9*STEP), so a
  // missed trigger simply fires on the next scroll event.
  // TOUCH BUDGET. On a finger swipe there is no wheel to intercept — touch falls
  // straight through to native scroll — and the loop then hands the momentum
  // fresh runway on every rotation, so it never runs out and the track spins
  // through the whole carousel. That is the same failure scroll-snap-stop fixes
  // for the wheel, except iOS does not honour snap-stop reliably through
  // momentum, and rewriting scrollLeft mid-flight can defeat the snap target the
  // browser already picked.
  //
  // So: at most TOUCH.rotations per gesture. Once spent, the rotation simply
  // stops happening and the track runs out of its OWN finite runway and halts —
  // exactly how a non-looping carousel kills a fling. The invariant is restored
  // once the scroll settles, which is instant and pixel-preserving, so invisible.
  //
  // NOT a clamp on scrollLeft: writing to it while native momentum is running is
  // a tug-of-war the reader sees as jitter. Withholding the rotation takes
  // nothing away — it just stops giving.
  function normalize(force) {
    // The damped run owns scrollLeft for its duration and calls this itself once
    // it has settled. Without this guard the closing frames of a BACKWARD run
    // (approaching 0) would trip the rotation mid-flight, which sets scrollLeft
    // to STEP while the next frame is still easing toward 0 — the two then fight
    // for the rest of the run.
    if (damping) return;
    if (!active || step <= 0) return;
    const budgeted = !force && performance.now() - lastTouchAt < TOUCH.momentum;
    let guard = 0;
    while (track.scrollLeft >= step * 2 && guard++ < 16) {
      if (budgeted && touchRotations >= TOUCH.rotations) return;
      const from = track.scrollLeft;
      track.appendChild(track.firstElementChild);
      track.scrollLeft = from - step;
      touchRotations++;
    }
    while (track.scrollLeft <= 1 && guard++ < 16) {
      if (budgeted && touchRotations >= TOUCH.rotations) return;
      const from = track.scrollLeft;
      track.insertBefore(track.lastElementChild, track.firstElementChild);
      track.scrollLeft = from + step;
      touchRotations++;
    }
  }

  // Which project is at the resting slot, as an AUTHORED index. scrollLeft rests
  // at STEP with one card of buffer each side, so the card on show is
  // children[1]; Math.round(scrollLeft / step) generalises that mid-gesture to
  // whichever card the reader is closest to landing on. That yields a DOM
  // position, and authored.indexOf turns it back into "which project" — the only
  // thing a dot can point at while the DOM rotates underneath it.
  function updateDots() {
    if (!dots.length || !active || step <= 0) return;
    const card = track.children[Math.round(track.scrollLeft / step)];
    const i = card ? authored.indexOf(card) : -1;
    if (i < 0) return;
    dots.forEach((dot, k) => {
      const on = k === i;
      dot.classList.toggle('is-active', on);
      if (on) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  // Publish where the resting card's photo ENDS, as a distance from the
  // container's top, so the bar can hold itself just inside that edge.
  //
  // Why this is not pure CSS: at >=1025 the photo is the card's last element, so
  // the container's own bottom would serve — but at <=1024 it moves to the TOP
  // and its height is a ratio of the card's WIDTH, while `top` percentages
  // resolve against HEIGHT. One measured number covers both, and re-runs from
  // measure(), which already fires on every resize and tier change.
  function publishPhotoBottom() {
    if (!pagination || !active) return;
    const host = pagination.parentElement;
    const card = track.children[1] || track.firstElementChild;
    const photo = card && card.querySelector('.work-card-image-link');
    if (!host || !photo) return;
    // offsetTop/offsetHeight, NOT getBoundingClientRect: the photo carries
    // data-reveal, so before its group animates in it is translated down by
    // REVEAL.distance (16px) and the rect reports that. Measured at load, that
    // put the bar 16px low — it read as 8px inside the photo instead of 24.
    // Offsets ignore transforms, so the anchor is the layout position either
    // way. host is the photo's offsetParent (#work-section .site-container is
    // the nearest positioned ancestor); keep that `position: relative` if this
    // ever moves.
    const y = photo.offsetTop + photo.offsetHeight;
    host.style.setProperty('--work-photo-bottom', y + 'px');
  }

  // Re-measure on resize and keep the reader on the card they were looking at:
  // the step width changes at every breakpoint, so the raw scrollLeft would
  // point at a different card after the jump.
  function measure() {
    if (!active) return;
    const previous = step;
    step = measureStep();
    if (step > 0 && previous > 0) {
      track.scrollLeft = Math.round(track.scrollLeft / previous) * step;
    }
    publishPhotoBottom();
    updateDots();
    normalize();
  }

  // KEYBOARD. Tabbing to a card's link makes the browser scroll it into view on
  // its own, and that scroll then trips normalize() — which rotates the DOM and
  // rewrites scrollLeft underneath the browser's own positioning. Measured, the
  // two together landed focus on the card sitting in the PEEK slot: mostly off
  // the right edge, with its focus ring cut in half. So don't leave the two to
  // negotiate. Rotate until the focused card IS the flush one and put the track
  // on the invariant directly — deterministic, and it can't fight a smooth
  // scroll because .work-list's scroll-behavior is `auto`, not the page's
  // `smooth`. Nothing else needs a scroll-into-view: focus order follows the
  // rotated DOM, which IS the visual order, so tabbing walks the cards in the
  // order they are actually seen.
  //
  // ⚠️ NEVER MOVE THE FOCUSED CARD ITSELF. Moving a focused element resets the
  // browser's sequential-focus navigation starting point, and the measured
  // result was Tab walking the projects BACKWARDS (Accessibility → Groups →
  // Loop → Messaging) — every card correctly flush, in exactly the wrong order.
  // Bringing the card to slot 1 by shuffling only the cards AROUND it fixes the
  // order and costs nothing: from slot 0 one card is pulled off the end to sit
  // in front of it; from slot i>1 the (i−1) cards ahead of it go to the back,
  // none of which is the card itself.
  // Rotate until `card` occupies the resting slot, then sit on it. Shared by
  // keyboard focus and the pagination dots, so the two cannot drift into
  // disagreeing about where "in view" is.
  //
  // ⚠️ It never moves `card` itself. Moving a focused element resets the
  // browser's sequential-focus starting point; measured, that sent Tab BACKWARDS
  // through the projects. Hence the first loop: when the card is already first,
  // rotate the LAST card in front of it rather than appending the card away.
  //
  // The landing is INSTANT, not damped. Damping exists to make a wheel gesture
  // feel continuous with the reader's hand; a dot click and a Tab press are
  // discrete, and easing across three cards would drag two unrelated projects
  // past the eye on the way. It also keeps this clear of the damping machinery,
  // which owns scrollLeft while it runs.
  function bringIntoView(card) {
    if (!active || step <= 0) return;
    if (!card || card.parentElement !== track) return;
    let guard = 0;
    while (track.firstElementChild === card && guard++ < 16) {
      track.insertBefore(track.lastElementChild, track.firstElementChild);
    }
    while (track.children[1] !== card && guard++ < 16) {
      track.appendChild(track.firstElementChild);
    }
    track.scrollLeft = step;
    updateDots();
  }

  function flushFocusedCard(event) {
    const card = event.target.closest('.work-card');
    if (card) bringIntoView(card);
  }

  dots.forEach((dot, k) => {
    dot.addEventListener('click', () => stepToward(k));
  });

  // normalize() is idempotent and cheap (a comparison, and nothing else on the
  // overwhelming majority of scroll events), so it can run on every one. It
  // re-enters via the scroll event its own scrollLeft write fires; that pass
  // finds the invariant already satisfied and does nothing.
  // DAMPED HORIZONTAL MOTION (2026-08). Wheel deltas accumulate into a single
  // `target`, and every frame scrollLeft eases a fraction of the remaining
  // distance toward it. Adapted from the Codrops horizontal-gallery technique,
  // with one deliberate change: that version replaces native scrolling with a
  // virtual value behind `overflow: hidden`. Here the damping is applied to the
  // REAL scrollLeft of a real scroll container, so the track keeps working with
  // JS off, keeps native keyboard scrolling (which flushFocusedCard depends on),
  // and keeps touch — none of which survive a virtual scroller.
  //
  // ⚠️ THE ACCUMULATING TARGET IS THE WHOLE POINT — do not "simplify" this back
  // into a fixed-duration animation per gesture. That was tried and reverted the
  // same day (see CLAUDE.md): a real flick keeps firing momentum wheel events for
  // a second or more after the fingers lift, so each one landing after an
  // animation finished started another, and one flick lurched through two or
  // three cards. Deltas folding into one target cannot chain, because there is no
  // discrete animation to re-trigger — and delta MAGNITUDE starts mattering
  // again, so a gentle scroll moves a little and a flick moves a lot.
  const DAMP = {
    // MILLISECONDS to land a card. This used to be a per-frame ease fraction,
    // which meant every adjustment needed the decay formula solved by hand and,
    // worse, tied the speed to the refresh rate — identical code ran 1033ms on a
    // 60Hz display and 517ms on a 120Hz one. dampStep now derives the per-frame
    // factor from this and the elapsed time, so the number below IS the duration
    // on any display.
    //
    // It also makes the timing consistent ACROSS BREAKPOINTS: a fixed ease made
    // the smaller cards at ≤1024 arrive sooner, because the same fraction of a
    // shorter distance is less travel. Deriving from the real step holds 650ms
    // everywhere.
    //
    // Judged on real hardware, not here — rAF does not tick in the preview pane,
    // so this dial can only be set by eye. 370ms read as too fast, 840ms as
    // laggy, 540ms was close; 650 is the settled value. Note those were all set
    // against the OLD exponential curve, where most of the number was an
    // invisible tail — under the spring below, 650ms is 650ms of visible motion,
    // so it will feel slower than the same number did before.
    arrival: 650,
    // How close counts as arrived. At 0.5px the last few pixels crawl for
    // hundreds of ms while nothing visibly moves — 2px is under half a device
    // pixel of visible error and cuts that dead tail off.
    settle: 2,
    // Fraction of a card the reader must push before the destination is
    // committed. Small on purpose — this is "which way did they mean", not "did
    // they push far enough", and waiting longer is what caused the linger.
    commit: 0.1,
    quiet: 120,     // ms of wheel silence that means the gesture (and its
                    // momentum tail) has genuinely ended
    lineHeight: 16, // px per line, for mouse wheels that report deltaMode 1
  };

  const TOUCH = {
    rotations: 1,    // rotations allowed per finger swipe
    momentum: 1200,  // ms after the last touch that still counts as that gesture
    settle: 180,     // ms of scroll silence before the invariant is restored
  };
  let lastTouchAt = -Infinity;
  let touchRotations = 0;
  let touchSettleTimer = 0;

  let dampTarget = 0;
  let dampAnchor = 0;
  let dampSettling = false;
  let dampFrame = 0;
  let dampQuiet = 0;
  let dampBackstop = 0;
  let dampLocked = false;   // swallowing the momentum tail after a run finished
  let dampUnlock = 0;

  // After a run lands, the flick that caused it is STILL firing momentum wheel
  // events — often for another half second. Re-arming immediately would let the
  // tail start a second run, which is the chaining that killed the first
  // attempt at this. So the track locks on arrival and stays locked for as long
  // as events keep arriving, unlocking only once they have been silent for
  // DAMP.quiet. This gates RE-ARMING only, never the motion, so the worst a
  // mis-timed unlock can do is briefly delay a genuine second flick.
  function relock() {
    dampLocked = true;
    clearTimeout(dampUnlock);
    dampUnlock = setTimeout(() => { dampLocked = false; }, DAMP.quiet);
  }

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  function endDamp() {
    if (!damping) return;
    damping = false;
    dampSettling = false;
    cancelAnimationFrame(dampFrame);
    clearTimeout(dampQuiet);
    clearTimeout(dampBackstop);
    dampVel = 0;
    track.scrollLeft = dampTarget;   // land exactly on the boundary
    track.style.scrollSnapType = ''; // back to the stylesheet's mandatory
    normalize();                     // rotate, and come to rest on STEP
    updateDots();                    // the card changed — so has the page
    relock();                        // and swallow the flick's remaining tail
  }

  let dampLast = 0;
  let dampVel = 0;   // px/s — carried ACROSS target changes, see below

  // CRITICALLY DAMPED SPRING, not exponential decay.
  //
  // Exponential decay (`pos += (target - pos) * factor`) is ease-OUT ONLY: its
  // velocity is at maximum on the very first frame and only ever falls. Measured
  // at a 650ms setting it put 39% of the travel in the first 50ms and half of it
  // in 70ms, then spent the remaining half of the budget covering 4% at under
  // 8px/frame — invisible. So the motion launched hard and the number in the
  // config bore little relation to the duration anyone perceives, which is why
  // this dial was so hard to tune: raising it lengthened a tail you cannot see
  // while leaving the abrupt start exactly as it was.
  //
  // A critically damped spring starts from REST, accelerates, then decelerates
  // into the target — real ease-in-out — and, being critically damped, settles
  // without overshoot. It also gives velocity CONTINUITY: `dampVel` survives a
  // target change, so when onWheel commits mid-run the motion bends toward the
  // new destination instead of restarting from zero.
  //
  // Integrated with the exact analytic solution for critical damping rather than
  // Euler steps, so it is stable at any dt — including the 50ms cap below, where
  // a naive integrator visibly overshoots.
  function dampStep(now) {
    const dt = (dampLast ? Math.min(now - dampLast, 50) : 16.67) / 1000;
    dampLast = now;

    // ω from the requested arrival time. For critical damping the remaining
    // fraction after time T is (1 + ωT)·e^(−ωT); ωT ≈ 8.5 lands it on
    // DAMP.settle for the card widths this site uses, so ω = 8.5 / arrival.
    // (That holds arrival to within ~5% across the breakpoints — well under
    // anything perceptible.)
    const omega = 8.5 / (DAMP.arrival / 1000);

    const displacement = track.scrollLeft - dampTarget;
    const b = dampVel + omega * displacement;
    const decay = Math.exp(-omega * dt);
    const nextDisplacement = (displacement + b * dt) * decay;

    dampVel = (b - omega * (displacement + b * dt)) * decay;
    track.scrollLeft = dampTarget + nextDisplacement;

    // Settle on position AND velocity. Position alone is not enough once
    // velocity is carried across a target change: a reversal can arrive at the
    // target still moving, and stopping there would cut the motion dead.
    if (dampSettling
        && Math.abs(nextDisplacement) < DAMP.settle
        && Math.abs(dampVel) < DAMP.settle * 20) {
      endDamp();
      return;
    }
    dampFrame = requestAnimationFrame(dampStep);
  }

  // ONE CARD toward the project a dot names, carried by the same spring a wheel
  // gesture gets.
  //
  // ⚠️ IT STEPS, IT DOES NOT JUMP — and that is forced, not preferred. Landing on
  // a distant project with only one card of travel would mean making it adjacent
  // first, and it cannot be done: the loop reorders by ROTATION, which preserves
  // the cycle, so the distance between two cards around the ring is invariant.
  // The choice is one card of motion OR arriving in one click, never both.
  // With four projects that costs little — from any card, two of the other three
  // are one step away (one forward, one back) and only the opposite one needs a
  // second click.
  //
  // Direction is the shorter way round; a tie (the opposite card) goes forward.
  function stepToward(k) {
    if (!active || step <= 0) return;
    const target = authored[k];
    const current = track.children[Math.round(track.scrollLeft / step)];
    if (!target || !current || target === current) return;
    // A wheel run already owns scrollLeft — let it finish rather than fight it.
    if (damping) return;

    const n = authored.length;
    const forward = (k - authored.indexOf(current) + n) % n;
    const dir = forward <= n - forward ? 1 : -1;

    // Reduced motion takes the same route the wheel path does at this point:
    // no animation, just the destination.
    if (reducedMotion.matches) {
      bringIntoView(dir === 1 ? track.children[2] : track.firstElementChild);
      return;
    }

    // Start a damped run exactly the way onWheel does, with one difference:
    // dampSettling is true from the first frame. A wheel gesture has to wait to
    // learn where the reader meant to go; a click said so outright.
    damping = true;
    dampSettling = true;
    dampAnchor = Math.round(track.scrollLeft);
    dampTarget = dampAnchor + dir * step;
    track.style.scrollSnapType = 'none';
    dampLast = 0;
    dampVel = 0;
    dampFrame = requestAnimationFrame(dampStep);
    dampBackstop = setTimeout(endDamp, 2000);
  }

  // Fallback resolver for a push that never got decisive: the reader nudged the
  // track a little and stopped. Send it back where it came from. The COMMITTED
  // case does not come through here — see onWheel — because waiting for the
  // gesture to go quiet before choosing a destination is exactly what made the
  // track linger part-way and then jump.
  function onQuiet() {
    if (!damping || dampSettling) return;
    dampTarget = dampAnchor;
    dampSettling = true;
  }

  function onWheel(event) {
    // Reduced motion and the phone tier both fall through to native scrolling.
    if (!active || reducedMotion.matches) return;
    // Vertical intent belongs to the page — never swallow it. Only a gesture
    // that is predominantly horizontal is ours.
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    // ...and STOP IT HERE. preventDefault only cancels the browser's own
    // scrolling; the event still bubbles, and Lenis listens on `window`. A real
    // trackpad swipe is never exactly deltaY 0 — measured, a horizontal flick
    // carried deltaY 18 — so Lenis was receiving that remainder and easing the
    // PAGE up or down underneath the reader while the track moved sideways.
    // That is the subtle vertical drift while scrolling the carousel.
    // (A pure deltaY of 0 never showed it, because Lenis discards those itself
    // as an unknown gesture — which is exactly why this only bit on real
    // hardware and never in a synthetic test.)
    // Genuinely vertical gestures still reach Lenis untouched: they return above,
    // before this line.
    event.stopPropagation();

    // Still swallowing the previous flick's momentum tail. Keep it swallowed,
    // and hold the lock open for as long as the tail keeps arriving.
    if (dampLocked) { relock(); return; }

    if (!damping) {
      damping = true;
      dampSettling = false;
      dampAnchor = Math.round(track.scrollLeft);
      dampTarget = dampAnchor;
      // mandatory snap re-snaps ANY programmatic scrollLeft to the nearest snap
      // position, which would flatten every intermediate frame. It stands down
      // for the run and is restored in endDamp — safe against a re-snap because
      // every position written after that point is itself a snap position.
      track.style.scrollSnapType = 'none';
      dampLast = 0;   // fresh clock, so the first frame uses the 60fps default
      dampVel = 0;    // a new gesture starts from rest — that IS the ease-in
      dampFrame = requestAnimationFrame(dampStep);
      // See the glide note in CLAUDE.md: rAF STOPS in a backgrounded tab, and
      // this run owns snap-off plus the `damping` flag. Timers are only
      // throttled when hidden, never stopped, so the backstop has to be a timer.
      dampBackstop = setTimeout(endDamp, 2000);
    }

    // deltaMode 1 means the wheel reports LINES, not pixels — common on real
    // mouse wheels. Without this a mouse wheel would barely move the track.
    const px = event.deltaMode === 1 ? event.deltaX * DAMP.lineHeight : event.deltaX;

    // THE CAP. Clamping to one card either side of where the gesture started is
    // what stops a hard flick running away, and it does so without needing to
    // know when the gesture ends — the momentum tail keeps arriving and simply
    // finds the target already pinned. This is the job scroll-snap-stop does on
    // the native path, done here because snap is off during the run.
    dampTarget = clamp(dampTarget + px, dampAnchor - step, dampAnchor + step);

    // COMMIT AS SOON AS THE PUSH IS DECISIVE. The destination must not wait for
    // the gesture to end: a trackpad keeps firing momentum events for up to a
    // second after the fingers lift, so deciding at that point left the track
    // sitting part-way (the linger) and then jumping to the card (the snap).
    // A tenth of a card is enough to know which way the reader meant to go.
    const moved = dampTarget - dampAnchor;
    if (Math.abs(moved) >= step * DAMP.commit) {
      dampTarget = dampAnchor + Math.sign(moved) * step;
      dampSettling = true;   // the ease can now finish and land
      return;
    }

    // Not decisive yet — if the reader stops here, onQuiet sends it home.
    clearTimeout(dampQuiet);
    dampQuiet = setTimeout(onQuiet, DAMP.quiet);
  }
  // passive:false because the whole point is to preventDefault.
  track.addEventListener('wheel', onWheel, { passive: false });

  // A fresh swipe gets a fresh budget; touchmove keeps the window open through a
  // long drag while the finger is still down.
  track.addEventListener('touchstart', () => {
    lastTouchAt = performance.now();
    touchRotations = 0;
  }, { passive: true });
  track.addEventListener('touchmove', () => { lastTouchAt = performance.now(); }, { passive: true });

  track.addEventListener('scroll', () => {
    normalize();
    // Called here rather than inside normalize(): that returns early while the
    // damped run owns scrollLeft, and again when a touch gesture has spent its
    // rotation budget — in both of which the track is still very much moving.
    // Four class toggles, cheap enough to run on every scroll event.
    updateDots();
    // Scroll gone quiet: the gesture is over. Restore the invariant ignoring the
    // budget, so the next swipe starts from a full buffer on both sides again.
    clearTimeout(touchSettleTimer);
    touchSettleTimer = setTimeout(() => { touchRotations = 0; normalize(true); }, TOUCH.settle);
  }, { passive: true });
  track.addEventListener('focusin', flushFocusedCard);
  // Resize drives BOTH jobs, and the tier check comes first: crossing 480 has to
  // switch the loop on or off before re-measuring, or measure() would size a
  // step from whichever layout it is no longer in.
  window.addEventListener('resize', () => { syncToTier(); measure(); });

  function enable() {
    if (active) return;
    active = true;
    // Tells the CSS the loop is live, so the no-JS end-snap steps aside — and
    // reveals the pagination, which is hidden until this class lands.
    track.classList.add('is-looping');
    step = 0;   // force measure() to re-read rather than trust a stale tier
    measure();
  }

  function disable() {
    if (!active) return;
    active = false;
    track.classList.remove('is-looping');
    // Put the projects back in the order the document declares them. appendChild
    // on an element already in the parent MOVES it, so replaying the authored
    // list in order is enough to undo any rotation.
    authored.forEach((card) => track.appendChild(card));
    track.scrollLeft = 0;
    step = 0;
  }

  function syncToTier() {
    if (horizontal.matches) enable(); else disable();
  }

  // TWO triggers on purpose, because correctness rides on this and neither event
  // is guaranteed on its own. `change` is the precise one — it fires only when
  // the 480 boundary is actually crossed — but it is a single point of failure,
  // and one was observed being dropped in testing (a desktop→phone transition
  // left the loop live over a vertical stack, which is exactly the state that
  // scrambles the card order). `resize` is noisier but independent, so a missed
  // `change` self-heals on the next resize tick. syncToTier is idempotent —
  // enable()/disable() both no-op when already in that state — so double
  // delivery costs nothing.
  horizontal.addEventListener('change', syncToTier);
  syncToTier();
}
initWorkCarousel();


// ============================================================
// IMAGE CAROUSEL — a crossfade between slides, used by the project pages'
// masthead figure and by the homepage About photo. Auto-advances; clicking a dot
// jumps to that slide and STOPS the auto-advance (the visitor has taken
// control). Reduced motion / no JS: the first slide stays and the dots still
// switch manually — auto-advance just never starts.
//
// EVERY [data-carousel] on the page is wired, not just the first. This used to
// be a single querySelector, which was fine only while exactly one page element
// ever carried the attribute; the About photo made that assumption false, and a
// second carousel would have silently done nothing.
// ============================================================
function initCarousel() {
  document.querySelectorAll('[data-carousel]').forEach(initOneCarousel);
}

function initOneCarousel(root) {
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

  // Scroll-spy: the active section is the LAST one whose RESTING POSITION the
  // page has reached. Highlight every link that targets it (and mark it for
  // assistive tech) — navSections mixes the header nav and the landing's
  // intro-bar, and both can be on screen pointing at the same section.
  //
  // Resting positions, not section tops. This measured tops against the nav line
  // until sections began settling CENTRED (initSectionGeometry): once they did,
  // About's top rests ~130px BELOW that line and never satisfied the test, so
  // clicking About scrolled correctly and then left Work highlighted. Reading the
  // same positions the settle and the anchors use is what keeps the three in
  // agreement — a section is "arrived at" in exactly one sense across the site.
  //
  // The rule is otherwise the shape it always was: monotonic, last-reached wins,
  // and nothing active up in the hero because no resting position has been passed
  // yet. It also retires the old special case for the final section, which could
  // never reach the nav line and needed "the page bottom counts as arriving" —
  // Contact's resting position is reachable, so it simply works.
  let activeEl = null, activeRest = -Infinity;
  let restingKnown = false;
  if (sectionRestingScrollY) {
    for (const s of navSections) {
      const rest = sectionRestingScrollY(s.el);
      if (rest == null) continue;                  // not a settling section / not this tier
      restingKnown = true;
      // 2px of slack: the resting position is fractional and the scroll lands on
      // whole pixels, so an exact >= would flicker at the boundary.
      if (window.scrollY >= rest - 2 && rest > activeRest) { activeRest = rest; activeEl = s.el; }
    }
  }
  // FALLBACK for anywhere the settle does not run — ≤480, and reduced motion,
  // where initSectionGeometry returns before publishing anything. Same rule as
  // before: last section whose top has passed the nav, with the page bottom
  // standing in for the final section, which can never climb that high.
  if (!restingKnown) {
    const atBottom = Math.ceil(window.scrollY + window.innerHeight)
                     >= document.documentElement.scrollHeight - 2;
    let activeTop = -Infinity, lastEl = null, lastTop = -Infinity;
    for (const s of navSections) {
      const top = s.el.getBoundingClientRect().top;
      if (top > lastTop) { lastTop = top; lastEl = s.el; }
      if (top <= NAV_OFFSET && top > activeTop) { activeTop = top; activeEl = s.el; }
    }
    if (atBottom && lastEl) activeEl = lastEl;
  }
  navSections.forEach(s => {
    const on = s.el === activeEl;
    s.link.classList.toggle('is-active', on);
    if (on) s.link.setAttribute('aria-current', 'true');
    else s.link.removeAttribute('aria-current');
  });

  // Floating section pills: the project pages' chapter nav, and the homepage's
  // own Work/About floatie. Same idea as the nav spy above but it DEFAULTS to the
  // first pill, so Overview reads active at the top of a project page. Once the
  // footer is in view there's nowhere further to jump, so tuck the bar away.
  //
  // This is NOT inert on the homepage — an older comment here said it was. Both
  // of the homepage's pills resolve to real sections, so the spy genuinely runs;
  // anything built on "this never executes on the homepage" would be unsafe.
  // It keeps the 35% marker rather than the nav offset the nav spy now uses:
  // About is the LAST pill here, so it holds to the bottom regardless, and on the
  // project pages the pills sit at the BOTTOM of the screen, where a line a third
  // of the way down is the right hand-over point.
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
      setBarBleed(BAR_BLEED);
      setDarkMix(0);
    } else {
      const scrollAnchorTop = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      const barHeight = Math.max(...stickyBars.map(bar => bar.offsetHeight));
      const invertLine = Math.max(scrollAnchorTop, barHeight);
      const gap = contactRect.top - invertLine;   // bar's bottom to the panel's top

      // PROGRESSIVE INVERSION — driven by HOW MUCH OF THE BAR ACTUALLY HAS BLUE
      // BEHIND IT, which is the whole rule and needs no tuning.
      //
      // Contact's colour now runs up behind the nav, so the panel's top edge
      // crosses the bar itself: it reaches the bar’s BOTTOM (invertLine) with
      // none of the bar covered, and the viewport top with all of it covered.
      // That fraction IS the tint, so the bar is never bluer than its own
      // backdrop.
      //
      // ⚠️ THIS REPLACED A GUESSED WINDOW, retuned twice and still wrong. It was
      // an arbitrary run-up of scroll (260px, then 100px) ending at the bar’s
      // bottom edge, so the strip started colouring while the panel was still
      // well below it and nothing blue was behind the bar at all — a wash over
      // cream. It also needed an easing curve to hold the tint back, and a 1px
      // fudge to stop the ramp finishing at 0.99 on a fractional edge. None of
      // that survives once the quantity being measured is the real one: this
      // starts exactly when blue first appears under the bar, reaches 1 exactly
      // when the bar is covered, and is linear because it reports a coverage
      // fraction rather than performing a transition.
      // ...but it COMMITS once the panel is meaningfully behind it, rather than
      // tracking coverage all the way to 1. Reporting coverage literally left the
      // bar part-cream until the panel had almost entirely passed behind it —
      // lighter than the panel it was sitting in, with the labels still dark
      // because white cannot be made legible on a half-mixed strip. Reaching full
      // blue at DARK_FULL_AT of coverage puts the whole change in the first ~38px
      // of the 64px pass, so it is finished well before the section settles, and
      // the label switch lands on a strip that is dark enough to carry white.
      const covered = (invertLine - contactRect.top) / invertLine;
      const mix = Math.max(0, Math.min(1, covered / DARK_FULL_AT));
      setDarkMix(mix);
      // The labels switch once, near the end. See DARK_TEXT_AT.
      stickyBars.forEach(bar => bar.classList.toggle('is-over-dark', mix >= DARK_TEXT_AT));

      // CLIP THE FROST TO CONTACT'S TOP EDGE. The bar's glass bleeds BAR_BLEED
      // past its own bottom so it melts into the page instead of ending on a
      // line — right over cream content, wrong over Contact, which is a
      // hard-edged full-bleed panel. For the ~100px before the bar inverts, that
      // cream blur was lying across the top of the blue and veiling it.
      // Handing back exactly the gap keeps the frost on the cream it belongs to:
      // full bleed until the panel is within reach, then shrinking to 0 as the
      // two meet, so they butt together as solid strips.
      setBarBleed(Math.max(0, Math.min(BAR_BLEED, Math.round(gap))));
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
    // The GLIDE is the expo ease-out (keep it); the HEAVINESS is the duration.
    // 1.1s felt heavy, 0.85s went stiff (too little glide) — 1.0 keeps the glide
    // with a touch less weight. Duration is the fine dial between those two.
    duration: 1.0,
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
  initSectionGeometry(lenis);

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
      // A settling section does not rest with its top on the nav line — it rests
      // CENTRED in the space under it (see initSectionGeometry). Aiming these at
      // the generic offset made the link land in one place and then get moved
      // again 140ms later when the settle ran, a visible two-stage jump whose
      // direction flipped with the window height: down on a short window, up on
      // a tall one. Ask for the section's own answer instead — which for Contact
      // is its TOP, not its centre.
      const resting = sectionClickScrollY && sectionClickScrollY(target);
      if (resting != null) {
        lenis.scrollTo(resting, { immediate: fromMenu });
        return;
      }
      lenis.scrollTo(target, { offset: -headerOffset, immediate: fromMenu });
    });
  });
}
// Section GEOMETRY only — no scrolling, no holding.
//
// Publishes two things and does nothing else: each section's composed resting
// position (used by nav-link clicks and by the scroll-spy) and the measured
// footer height (used by Contact's min-height in CSS).
//
// ⚠️ THE WORK PIN LIVED HERE AND IS GONE (2026-08). Four versions were built and
// every one of them took the scroll away from the reader: settle on idle, settle
// on idle for Work only, ease in on entry, and hold-in-place on entry. The last
// was the closest — it moved nothing — but it still froze the page under someone
// who was only passing through, and needed an arming flag, a cooldown, a release
// accumulator and five escape hatches to stay survivable.
//
// What replaced it is far simpler and is already in initWorkCarousel: a gesture
// judged predominantly horizontal is stopPropagation'd so it never reaches Lenis,
// which pins the vertical position for exactly as long as the reader is working
// the carousel and not a moment longer. Vertical gestures are untouched and
// scroll the page normally. No state, nothing to escape from, nothing to re-arm.
//
// If a hold is ever wanted again, read the four failures above first.
function initSectionGeometry(lenis) {
  const sections = ['work-section', 'about', 'contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const footer = document.querySelector('.site-footer');
  const lastSection = sections[sections.length - 1];
  if (!sections.length) return;             // project pages
  const wide = window.matchMedia('(min-width: 481px)');

  // A section's resting position: its CONTENT centred in the space under the nav,
  // so the air above and below matches.
  //
  // Content is the SPAN OF THE SECTION'S CHILDREN — first child's top to last
  // child's bottom — not box-height-minus-padding. #about and #contact carry a
  // min-height so they fill the frame, and box-minus-padding counts that added
  // empty space as content: About measured 640 instead of its real 475 and would
  // have settled 48px under the nav with 632px of nothing beneath it. Children
  // rather than one wrapper because the sections are not uniformly shaped —
  // About has TWO (its heading, then .about-layout, which is pulled up to sit
  // BESIDE the heading, so the span is 475 not 531) while Work and Contact have
  // one. And not a card: the Work cards rotate as the loop runs and their heights
  // are not guaranteed equal once a title wraps to another line.
  function restingFor(el) {
    const kids = el.children;
    const box = el.getBoundingClientRect();
    let contentTop = box.top;
    let contentHeight = box.height;
    if (kids.length) {
      const first = kids[0].getBoundingClientRect();
      const last = kids[kids.length - 1].getBoundingClientRect();
      contentTop = first.top;
      contentHeight = Math.max(0, last.bottom - first.top);
    }
    const available = window.innerHeight - NAV_OFFSET;
    // Taller than the space it gets: nothing to centre, sit it under the nav.
    const wantedTop = NAV_OFFSET + Math.max(0, (available - contentHeight) / 2);
    const target = window.scrollY + contentTop - wantedTop;
    // Clamp, or the last section asks for a position the page cannot reach.
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.min(Math.max(target, 0), Math.max(max, 0));
  }

  // Top of the section against the top of the VIEWPORT — not the nav line.
  // Contact's colour runs up behind the bar (its box carries the nav's height as
  // extra top padding), so landing its edge on the nav line would leave that
  // 64px strip of panel above the fold and put the boundary back under the bar.
  // Sending the box's top to 0 puts the bar inside the section, over one
  // continuous colour.
  function topAlignedFor(el) {
    // ceil, not round: the section's top is fractional (64.27 before this moved,
    // 0.27 after), and rounding DOWN would leave that sliver of the previous
    // section showing above the panel. The bar happens to cover it either way,
    // but landing a hair past is free and does not depend on that.
    const target = Math.ceil(window.scrollY + el.getBoundingClientRect().top);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.min(Math.max(target, 0), Math.max(max, 0));
  }

  sectionRestingScrollY = (el) => (sections.includes(el) && wide.matches ? restingFor(el) : null);

  // WHERE A CLICK LANDS, which is deliberately not always the resting position.
  //
  // Contact opens on its TOP: it is a full-bleed colour panel, and arriving at it
  // centred leaves a band of cream above the blue with the heading floating in
  // the middle. Top-aligned, the panel meets the bar — which is also the position
  // the progressive inversion is built around, so the bar arrives fully blue
  // instead of part-way. Work and About still centre; their content sits on the
  // page's own cream and centring is what balances the air around it.
  //
  // ⚠️ ONLY THE CLICK MOVES. The spy still asks restingFor() whether the reader
  // has "arrived", and the two must not be swapped: the click target is now at or
  // BELOW the spy's threshold (2541 vs 2501 at 1440x900), so clicking Contact
  // still satisfies the spy and lights the right link. Reversing that — a click
  // landing SHORT of the threshold — is the bug that once left Work highlighted
  // after clicking About.
  sectionClickScrollY = (el) => {
    if (!sections.includes(el) || !wide.matches) return null;
    return el.id === 'contact' ? topAlignedFor(el) : restingFor(el);
  };

  // Contact's min-height is `100dvh - nav - footer`, and the footer's height is
  // set by its own type, so it has to be measured rather than guessed.
  function publishFooterHeight() {
    if (!footer || !lastSection) return;
    document.documentElement.style.setProperty(
      '--footer-height', Math.round(footer.getBoundingClientRect().height) + 'px');
  }
  // Contact's own content height, so its padding can give way rather than push
  // the footer off the fold.
  //
  // Contact reserves the footer's height in its min-height, so the two are meant
  // to fill the space under the nav exactly — but min-height is a FLOOR, and at a
  // short window the copy plus a fixed 96px of padding outgrew it and the footer
  // went under. Measured at 1440x700: content 447 + 192 padding = 639 against a
  // 555 min-height, so the panel grew 84px and pushed the footer 83px below.
  //
  // The padding is the part that should yield. Contact already CENTRES its
  // content, so on a tall window the min-height makes the space and the padding
  // is inert — 154px of air either side at 1440x900, where the padding is only
  // 96. Shrinking it changes nothing there, and is exactly what buys the fit
  // lower down. The arithmetic lives in the CSS clamp; this supplies the one
  // number CSS cannot know.
  //
  // No feedback loop: the span is the inner block's own height, which does not
  // depend on the section's padding. It DOES depend on width (wrapping), which is
  // why it re-runs on resize alongside the footer.
  function publishContactContent() {
    const contact = document.getElementById('contact');
    const inner = contact && contact.firstElementChild;
    if (!inner) return;
    document.documentElement.style.setProperty(
      '--contact-content', Math.round(inner.getBoundingClientRect().height) + 'px');
  }

  function publishMetrics() {
    publishFooterHeight();
    publishContactContent();
  }

  publishMetrics();
  window.addEventListener('resize', publishMetrics);
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
  function setVisible(group, visible, animateOut) {
    if (group.__revealVisible === visible) return;
    group.__revealVisible = visible;
    itemsOf(group).forEach((el, i) => {
      const order = el.hasAttribute('data-reveal-order')
        ? parseInt(el.getAttribute('data-reveal-order'), 10)
        : i;
      if (visible) {
        animate(
          el,
          { opacity: 1, y: 0 },
          { duration: REVEAL.duration, delay: order * REVEAL.stagger, ease: REVEAL.ease }
        );
      } else if (animateOut) {
        // Animated fade-OUT for a group that's leaving through the bottom edge
        // while still on screen (work cards, see update()) — a mirror of the
        // fade-in, so the card visibly sinks + fades rather than snapping away.
        animate(
          el,
          { opacity: 0, y: REVEAL.distance },
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
        // Fully off-screen (above or below): instant reset to hidden, ready to
        // fade in on the next entry.
        setVisible(group, false);
      } else if (group.classList.contains('work-card')) {
        // Work cards mirror the reveal on the BOTTOM edge: they fade in as the
        // top rises past 85% of the viewport and fade OUT (animated) as it drops
        // back past 95% — so scrolling up, the card visibly disappears as it
        // leaves the bottom, symmetric with how it arrived. The 85→95% gap is
        // hysteresis against flicker. (Leaving through the TOP while scrolling
        // down still just resets once off-screen, above — no harsh cut-out there.)
        if (firstPass || (r.top < vh * 0.85 && r.bottom > vh * 0.15)) {
          setVisible(group, true);
        } else if (r.top > vh * 0.95) {
          setVisible(group, false, true);
        }
      } else if (firstPass || (r.top < vh * 0.9 && r.bottom > vh * 0.15)) {
        // Other sections: fade in when meaningfully in view, and only reset once
        // fully off-screen (above) — never a mid-view cut-out.
        setVisible(group, true);
      }
      // Partially on screen but not past a threshold yet: hold current state.
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

const metaCursor = document.getElementById('meta-cursor');
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
  // Site-wide soft glow that trails the pointer (decorative; aria-hidden).
  // Injected here rather than authored into every page's HTML — it's purely
  // presentational, so JS-only is fine and it needs no per-page markup. Only
  // reads over dark areas (the landing gradient, Contact); see .cursor-glow.
  const cursorGlow = document.createElement('div');
  cursorGlow.className = 'cursor-glow';
  cursorGlow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursorGlow);

  document.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
    if (!cursorGlow.classList.contains('is-visible')) {
      cursorGlow.classList.add('is-visible');
    }
    if (waveCursor) {
      waveCursor.style.left = e.clientX + 'px';
      waveCursor.style.top = e.clientY + 'px';
    }
  });

  // Per-project glow colour. Each project maps a URL fragment (shared by its
  // homepage Work-card link and its overview page path) to a .cursor-glow
  // modifier class defined in global.css.
  const GLOW_VARIANTS = [
    { match: 'accessibility',   cls: 'is-accessibility' }, // pink
    { match: 'messaging',       cls: 'is-messaging' },     // blue
    { match: 'microsoft-loop',  cls: 'is-loop' },          // purple
    { match: 'facebook-groups', cls: 'is-groups' },        // red
  ];
  const ALL_GLOW_CLASSES = GLOW_VARIANTS.map(v => v.cls);
  function setGlowVariant(cls) {
    cursorGlow.classList.remove(...ALL_GLOW_CLASSES);
    if (cls) cursorGlow.classList.add(cls);
  }

  // On a project overview page, the glow carries that project's colour the whole
  // time. On the homepage this is null, so the glow rests on the default white.
  const pageVariant = GLOW_VARIANTS.find(v => location.pathname.includes(v.match)) || null;
  setGlowVariant(pageVariant ? pageVariant.cls : null);

  // Homepage Work cards: colour the glow to the card being hovered, reverting to
  // the page default on leave. (Overview pages have no .work-card, so this is a
  // no-op there.)
  document.querySelectorAll('.work-card').forEach(card => {
    const link = card.querySelector('a.work-card-image-link');
    const href = link ? link.getAttribute('href') || '' : '';
    const variant = GLOW_VARIANTS.find(v => href.includes(v.match));
    if (!variant) return;
    card.addEventListener('mouseenter', () => setGlowVariant(variant.cls));
    card.addEventListener('mouseleave', () => setGlowVariant(pageVariant ? pageVariant.cls : null));
  });

  // Show the 👋 cursor over the blue panel (Contact on the homepage).
  if (darkPanel && waveCursor) {
    darkPanel.addEventListener('mouseenter', () => waveCursor.classList.add('is-visible'));
    darkPanel.addEventListener('mouseleave', () => waveCursor.classList.remove('is-visible'));
  }

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
