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
let lastFieldGap = -1;
function setFieldGap(px) {
  // The room between the bio's last line and the nav bar's top. hero.css sizes
  // the field's dissolve from it — the ramp must end on the bar and must not
  // reach back into the bio, and that distance is 96px at 1024x768 against 229px
  // at 1440x900, so it cannot be a constant. Layout-only, so this is written
  // once per measure rather than per scroll frame.
  if (px === lastFieldGap) return;
  lastFieldGap = px;
  document.documentElement.style.setProperty('--field-gap', px + 'px');
}
let lastFieldScroll = -1;
function setFieldScroll(px) {
  // Same contract as setBarBleed: written on the ROOT (all three .page-field
  // elements read it through one CSS transform), rounded, and guarded on its
  // last value because this runs every scroll frame and .intro-bar::before's
  // backdrop-filter samples the layer it moves.
  if (px === lastFieldScroll) return;
  lastFieldScroll = px;
  document.documentElement.style.setProperty('--field-scroll', px + 'px');
}
// ============================================================
// CONTACT'S ARRIVAL — the ledge, the bar's matching fill, the parallax peek
// ============================================================
// Contact's top travels a FULL VIEWPORT from the fold to its resting place
// (measured 1280x720: maxScroll and the panel's top coincide), and until 2026-09
// nothing moved for 91% of it — the whole inversion was crammed into the last
// 64px. These three published values spend that runway.
const CONTACT = {
  // ⚠️ hero.css's frost gradient, TRANSCRIBED. The bar's fill has to know what
  // the frost hides in order to repair it, and a background gradient cannot be
  // read back out of CSS. Keep these in step with the second background-image
  // layer on .intro-bar::before — nothing enforces it, the same standing hazard
  // as --color-accent / --color-accent-rgb.
  //
  // ⚠️ THIS IS A SAMPLED SMOOTHSTEP NOW, not the old four-stop piecewise line.
  // The cream holds 0.95 to the lowest nav item (50px) and eases to 0 across the
  // rest of the box (166px at full bleed). contactFrostAt interpolates linearly
  // between these, so the count is how faithfully the curve is reproduced —
  // eighths track it to well under a code value.
  // ⚠️ THE PLATEAU POINT AT 50 IS LOAD-BEARING. Without it the first segment
  // interpolates straight from 0 to the first curve sample and skips the flat
  // hold, putting the JS 8 code values under the CSS right at the nav item's
  // bottom — the one place the two must agree, since that is where the bar's
  // fill is repairing the most opaque part of the frost.
  frost: [[0, 0.95], [50, 0.95], [64.5, 0.9092], [79.0, 0.8016], [93.5, 0.6494], [108.0, 0.475], [122.5, 0.3006], [137.0, 0.1484], [151.5, 0.0408], [166.0, 0.0]],
  // How far past the bar the fill is built. The bar's ::before runs
  // --bar-bleed + 2px past its own box, and BAR_BLEED is its 100px maximum.
  fillDepth: 176,
  peek: {
    // Parallax distance as a fraction of the window, and its ceiling in px.
    rate: 0.5,
    // ⚠️ THIS IS WHAT MAKES THE COPY APPEAR EARLY. The peek is NEGATIVE on the
    // way in — the copy is pulled UP out of its composed position and settles
    // back down — so raising this brings it into view sooner, on top of the
    // 232px it already sits below the panel's top at rest. It is also subtracted
    // from the window's anchor, so the window opens earlier to match.
    max: 140,
    // THE WINDOW ENDS WHERE THE NAV MEETS THE SECTION'S TOP — the copy keeps
    // rising for the whole approach and lands exactly as the panel docks.
    // ⚠️ It used to stop early (0.6 of the way from the scroll floor to the
    // ledge/bar meeting point) so the panel carried settled copy the rest of the
    // way. Ending at the bar line is the deliberate replacement.
    endAtNavLine: true,
    // ⚠️ THE ONLY DIRECTION-DEPENDENT MOTION ON THE SITE (2026-09), and it is a
    // deliberate exception. Everything else here — --field-scroll, --dark-mix,
    // --about-peek, the ledge — is a pure function of POSITION, which is what
    // makes them symmetric and reproducible from a single sample. This one is
    // not: scrolling down the copy LAGS (pulled up, closing the gap above it),
    // scrolling up it LEADS (pushed down, dropping away from the nav).
    //
    // ⚠️ THE SIGN BLENDS OVER SCROLL DISTANCE, NOT TIME, and that distinction is
    // load-bearing. Flipping it outright snaps the copy by 2x the peek the
    // instant the reader reverses. A time-based ease would fix that and would be
    // exactly the transition on a scroll-linked value that the standing rule
    // forbids — it would lag the page. Blending per pixel scrolled keeps it a
    // function of the reader's own motion with no clock in it.
    flipOver: 250,   // px of scroll to fully reverse the sign
    // ⚠️ THE LEDGE'S TOP DESCENDS ON THE WAY UP — its bottom stays welded to the
    // panel and the height shortens, so the blue's leading edge sits LOWER as
    // the reader scrolls up. 96 -> 80 at the cap.
    //
    // ⚠️ "PULL IT DOWN" AND "MAKE IT SOFTER" ARE OPPOSITE INSTRUCTIONS HERE, and
    // this was built both ways before that was clear. The bottom is welded, so
    // the only thing that can move is the top, and the height is the only thing
    // that can carry it:
    //   · shorten -> the top DESCENDS (lower blue) and the ramp compresses
    //   · stretch -> the ramp lengthens (softer) and the top RISES, which washes
    //     up over About's photo and copy
    // There is no setting that does both. "Lower" won, so this shortens.
    //
    // ⚠️ NEVER A TRANSLATE, whichever way the height goes. The gradient reaches
    // alpha 1 at its own bottom, so moving that bottom below the panel's top
    // leaves the ramp part-way when it meets solid blue — 40 code values of step
    // at 24px, 66 at 32, against the 54-value seam this change exists to remove.
    //
    // ⚠️ THE CAP IS BOUNDED BY ABRUPTNESS, NOT BANDING. 25 stops hold the spacing
    // under 4px at every length here, so the ramp is never under-sampled; what
    // fails is the dissolve starting to read as a cut, somewhere below ~56px.
    // 16 keeps the ramp at 80 — a visible descent with the dissolve intact, and
    // a long way clear of that floor if it ever wants to go further.
    ledgeShorten: 16,
  },

  // ⚠️ THE LEDGE'S REACH IS SCROLL-LINKED — IT ONLY WASHES OVER ABOUT ON THE WAY
  // DOWN TO CONTACT, AND AT ABOUT'S RESTING POSITION IT DOES NOT TOUCH THE COPY.
  // `rest` is exactly --about-tail: the ledge fills About's bottom padding and
  // stops, so the cream space under the copy is intact while About is the thing
  // being read. It then grows to the full --contact-ledge-length as Contact
  // arrives. ⚠️ Keep `rest` AT OR UNDER --about-tail — past it the ledge eats the
  // cream gap at rest, which is the one thing this schedule exists to protect.
  //
  // ⚠️ THE WINDOW IS MEASURED, NOT A VIEWPORT FRACTION. It runs from ABOUT'S OWN
  // resting edge to Contact's, both of which the page already computes, so it
  // tracks whatever those sections actually do at this width instead of assuming
  // a composition. `span` ends the growth before the panel docks, so the reach is
  // finished rather than still arriving when the section settles.
  // ⚠️ `rest` IS READ FROM --contact-ledge-rest, NOT SET HERE — this is only the
  // no-JS-token fallback. --about-tail is authored as `rest + --gap-section`, so
  // the cream the reader sees at rest is a section gap by construction; a second
  // copy of the length here would let that guarantee rot silently.
  reach: { rest: 160, span: 0.62 },
};

let lastContactEdge = -1;
function setContactEdge(px) {
  // The bar's fill is built from this, so it is written on the ROOT and guarded
  // like the rest: every scroll frame, and it repaints a backdrop-filtered layer.
  if (px === lastContactEdge) return;
  lastContactEdge = px;
  document.documentElement.style.setProperty('--contact-edge', px + 'px');
}
let lastBarFill = '';
function setBarFill(css) {
  if (css === lastBarFill) return;
  lastBarFill = css;
  const root = document.documentElement.style;
  if (css) root.setProperty('--bar-fill', css);
  // Removing it (rather than setting a flat value) is what restores hero.css's
  // own fallback verbatim — the pre-2026-09 bar, exactly.
  else root.removeProperty('--bar-fill');
}
// ABOUT'S PARALLAX (2026-09). Contact's peek is anchored to a panel ARRIVING;
// About has no arriving edge — it is cream on cream and it is reached from both
// directions — so the anchor is its own resting position instead.
//
// ⚠️ THE OFFSET FLIPS SIGN, and that is what makes one rule serve both
// directions. Scrolling down, About sits below centre and its content lags
// DOWNWARD; scrolling up from Contact it sits above centre and lags UPWARD.
// Both settle to 0 as it centres, so there is no direction term anywhere — the
// same property that made Contact's peek symmetric.
//
// ⚠️ SMOOTHSTEP, NOT CONTACT'S CUBIC — the geometry is different, so the curve
// is too, and pretending they match would be wrong. Contact's window is built so
// its EXTREME coincides with the copy's first sight, which is exactly where an
// ease-out should be fastest. About's extremes are where it is off-screen, so a
// cubic spends the motion in the wrong place: measured at cap 60, it gives 7.5px
// at half the span where smoothstep gives 30, and it sat pinned at the cap for
// more than half the traverse.
// Smoothstep is also flat at BOTH ends, so it eases into rest AND into the
// clamp; a cubic reaches the cap at full slope and kinks there.
// ⚠️ `max` IS BOUNDED BY THE SECTION'S OWN PADDING (--gap-section, 96px). The
// transform moves the CONTENT while the section's box stays put, so the content
// eats into its own padding: at +60 About's copy sits 36px above Contact's top
// instead of 96, and at -60 its heading sits 36px below Work instead of 96. Take
// this past 96 and the content crosses into a neighbouring section. 60 leaves
// 36px of margin at both seams — re-check both if --gap-section ever changes.
const ABOUT_PEEK = {
  max: 60,       // lag while About is travelling
  span: 0.5,     // as a fraction of the viewport
  // ⚠️ PUSH TOWARD THE LEDGE as Contact arrives — About's copy leans INTO the
  // dissolve instead of lifting away from it, which is what tightens that seam.
  // Bounded by contrast, and there is room: the copy lands on the ledge's first
  // third, where black measures 11.2:1 at 40px (20.4:1 on bare cream, and still
  // 9.0:1 at 48). The binding constraint is taste, not legibility.
  push: 40,
};

let lastAboutPeek = -1;
function setAboutPeek(px) {
  if (px === lastAboutPeek) return;
  lastAboutPeek = px;
  document.documentElement.style.setProperty('--about-peek', px + 'px');
}

// Blended scroll direction for the peek's sign: -1 down, +1 up. Moves by the
// fraction of CONTACT.peek.flipOver actually scrolled, so a reversal eases
// across a quarter-screen of the reader's own travel rather than snapping.
let peekDir = -1;
let peekLastY = null;
function updatePeekDir() {
  const y = window.scrollY;
  if (peekLastY === null) { peekLastY = y; return; }
  const delta = y - peekLastY;
  peekLastY = y;
  if (delta === 0) return;
  const target = delta > 0 ? -1 : 1;
  const step = Math.abs(delta) / CONTACT.peek.flipOver;
  peekDir += Math.max(-step, Math.min(step, target - peekDir));
  peekDir = Math.max(-1, Math.min(1, peekDir));
}

let lastLedgeLift = -1;
function setLedgeLift(px) {
  if (px === lastLedgeLift) return;
  lastLedgeLift = px;
  document.documentElement.style.setProperty('--contact-ledge-lift', px + 'px');
}

let lastContactPeek = -1;
function setContactPeek(px) {
  if (px === lastContactPeek) return;
  lastContactPeek = px;
  document.documentElement.style.setProperty('--contact-peek', px + 'px');
}

// The frost's alpha at a given y inside the bar's ::before box.
function contactFrostAt(y) {
  const f = CONTACT.frost;
  if (y >= f[f.length - 1][0]) return 0;
  for (let i = 1; i < f.length; i++) {
    if (y <= f[i][0]) {
      const [y0, a0] = f[i - 1], [y1, a1] = f[i];
      return a0 + (a1 - a0) * (y - y0) / (y1 - y0);
    }
  }
  return 0;
}

// THE BAR PAINTS CONTACT'S OWN RAMP, REPAIRED FOR THE FROST BENEATH IT.
//
// The ::before composites [accent over frost] over the page, and the page here
// already carries the ledge. For the result to EQUAL the page we need the
// layer's colour to equal the page's, which solves to
//     a = r*f / (1 - r + r*f)
// with r the ledge's alpha at that y and f the frost's. Painting a = r instead
// double-coats the bleed (63 code values over-blue); confining a = r to the
// bar's own height leaves the frost bleeding uncovered (a 186-value cliff at
// the bar's edge). This is exact — measured deviation 0 at every position.
//
// ⚠️ Rebuilt per frame because r moves with scroll, and it cannot be a static
// CSS gradient: the alphas depend non-linearly on the edge's position, and
// calc() cannot express that. It is one property write, guarded, and it is only
// ever built while Contact is within a ledge of the bar.
// LAYOUT-ONLY, like measureFieldTuck: these three are constants between resizes,
// and updateScrollEffects runs every scroll frame. --contact-ledge needs a
// getComputedStyle and the resting edge needs scrollHeight, both of which force
// layout — neither belongs in the hot path.
// WHERE BLACK AND WHITE ARE EQUALLY LEGIBLE on accent-over-cream. Black and
// white cross where (L+.05)/.05 == 1.05/(L+.05), i.e. L = sqrt(1.05*0.05)-0.05
// = 0.1791; on this ramp that is alpha 0.86, where BOTH measure 4.58:1 and both
// clear AA. Derived, not tuned — re-derive if --color-accent or --color-bg move.
const DARK_TEXT_ALPHA = 0.86;

let contactLedge = 0;
let contactRestEdge = 0;
// Contact's edge at ABOUT's resting position — the top of the reach window.
// ⚠️ Taken from sectionRestingScrollY (i.e. restingFor), never re-derived: a
// second definition of "where About settles" is exactly the kind that drifts.
let aboutRestEdge = 0;
let contactLedgeRest = 160;
function measureAboutRest() {
  aboutRestEdge = 0;
  if (!contactSection || !aboutSection || !sectionRestingScrollY) return;
  const rest = sectionRestingScrollY(aboutSection);
  if (rest == null) return;   // ≤680 / reduced motion: nothing settles, so the
  const pageTop = (el) => {    // reach falls back to full, i.e. today's ledge.
    let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  aboutRestEdge = Math.max(0, pageTop(contactSection) - rest);
}
let contactAccentRGB = '74, 69, 255';
let contactGlyphMid = 32;
let contactCopyOffset = 0;
function measureContactArrival() {
  // ⚠️ PUBLISH THE ROOM FIRST, THEN READ THE LEDGE — --contact-ledge clamps
  // against --contact-gap, so reading it before this is written gets the
  // fallback rather than the measured answer.
  //
  // THE ROOM IS THE DISTANCE FROM THE PRECEDING SECTION'S CONTENT TO CONTACT'S
  // TOP EDGE, and the ledge can never exceed it. The ledge paints OVER the
  // section above (Contact is positioned, so its pseudo-elements sit above a
  // non-positioned sibling), so every pixel it overshoots is a pixel of someone
  // else's content washed blue. Shipped at a flat 220px against a 96px room, it
  // ran 124px into About and tinted the photo and the last lines of the copy.
  // Same rule and same failure mode as the hero field's --field-gap.
  if (contactSection) {
    const pageTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
    const prev = contactSection.previousElementSibling;
    // offsets, NOT getBoundingClientRect: the blocks above carry the reveal
    // system's translateY while this runs, and a rect would report mid-flight.
    // Same rule as measureFieldTuck.
    const last = prev && (prev.lastElementChild || prev);
    if (last) {
      const room = pageTop(contactSection) - (pageTop(last) + last.offsetHeight);
      if (room > 0) document.documentElement.style.setProperty('--contact-gap', Math.round(room) + 'px');
    }
  }

  const cs0 = getComputedStyle(document.documentElement);
  contactAccentRGB = cs0.getPropertyValue('--color-accent-rgb').trim() || '74, 69, 255';

  // ⚠️ READ THE LEDGE'S PAINTED HEIGHT, NOT THE TOKEN. --contact-ledge is a
  // clamp(), and an unregistered custom property computes to its TOKEN STREAM,
  // not to a length — getPropertyValue returns the literal string
  // "clamp(90px, 96px, 300px)" and parseFloat gives NaN. That fails silently and
  // expensively: contactLedge would be 0, so buildBarFill would never run and
  // the bar would drop back to the flat tint, quietly restoring the 21% step
  // this whole change exists to remove, while the ledge itself still looked
  // right. The pseudo-element's own height IS the resolved value, and it is also
  // the thing the bar has to match — so this cannot disagree with what paints.
  //
  // ⚠️ AND ZERO THE LIFT FIRST. The painted height is
  // `calc(--contact-ledge - --contact-ledge-lift)`, so measuring while a lift is
  // published reads the ALREADY-SHORTENED ledge and the next frame subtracts the
  // lift again — the reach would ratchet down on every resize mid-scroll. Latent
  // while the lift was only ever 16px at the top of the page; not latent once it
  // carries the whole reach.
  document.documentElement.style.setProperty('--contact-ledge-lift', '0px');
  lastLedgeLift = 0;
  // The ledge's RESTING length, off the same token --about-tail is derived from.
  const restTok = parseFloat(cs0.getPropertyValue('--contact-ledge-rest'));
  contactLedgeRest = Number.isFinite(restTok) ? restTok : CONTACT.reach.rest;
  // ⚠️ AND SUBTRACT THE OVERLAP. The painted box now extends
  // --contact-ledge-overlap PAST the panel's top (see global.css), but every
  // consumer here means "the ledge's length ABOVE the panel" — the bar's fill is
  // anchored to the panel's edge, so feeding it the painted height would slide
  // the whole ramp down by that much.
  const overTok = parseFloat(cs0.getPropertyValue('--contact-ledge-overlap'));
  const ledgeOverlap = Number.isFinite(overTok) ? overTok : 0;
  contactLedge = contactSection
    ? Math.max(0, (parseFloat(getComputedStyle(contactSection, '::before').height) || 0) - ledgeOverlap)
    : 0;

  // HOW FAR THE COPY SITS BELOW THE PANEL'S TOP EDGE. The peek's window is
  // anchored to THIS, not to the panel's edge — see the note at its call site.
  // offsets, not getBoundingClientRect: .contact-inner carries the peek's own
  // transform, and a rect would feed the output back into the input.
  contactCopyOffset = 0;
  if (contactSection) {
    const copy = contactSection.querySelector('.contact-email');
    if (copy) {
      const pageTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
      contactCopyOffset = Math.max(0, pageTop(copy) - pageTop(contactSection));
    }
  }
  // The glyphs' own mid-line inside the bar. The bar is a GRADIENT now, so
  // "what the labels sit on" is a position, not the bar-wide average.
  if (introBar && introBar.offsetParent) {
    const link = introBar.querySelector('.intro-bar-links a');
    if (link) {
      const br = introBar.getBoundingClientRect(), lr = link.getBoundingClientRect();
      contactGlyphMid = (lr.top + lr.bottom) / 2 - br.top;
    }
  }
  if (!contactSection) return;
  // Where the panel's top edge comes to rest once the page is scrolled out.
  const docTop = contactSection.getBoundingClientRect().top + window.scrollY;
  contactRestEdge = Math.max(0,
    docTop - (document.documentElement.scrollHeight - window.innerHeight));
}

const LEDGE_BIAS = 1.7;

// Contact's fill alpha at a viewport y — the ledge's smoothstep above the
// panel, solid below it. Shared by the bar's fill and by blueBehindBar.
function contactAlphaAt(y, edge, ledge) {
  if (y >= edge) return 1;
  if (ledge <= 0 || y <= edge - ledge) return 0;
  // ⚠️ BIASED SMOOTHSTEP — ss(t^LEDGE_BIAS), and it MUST match the gradient in
  // sections.css stop for stop. The bias holds the blue light over About's last
  // line so the ledge can be long; feed the bar a plain smoothstep while the
  // page paints a biased one and the 21% seam this whole system removes is back.
  const t = Math.pow((y - (edge - ledge)) / ledge, LEDGE_BIAS);
  return t * t * (3 - 2 * t);
}

// HOW MUCH BLUE IS ACTUALLY BEHIND THE BAR — the mean of the above over the
// bar's own band. See the note at its call site for why this is the shipped
// rule rather than a new one.
function blueBehindBar(edge, ledge, barBand) {
  if (barBand <= 0) return 0;
  if (ledge <= 0) {
    // The hard-edge case, in closed form — identical to the expression this
    // generalises, with none of the sampling error.
    return Math.max(0, Math.min(1, (barBand - edge) / barBand));
  }
  const SAMPLES = 32;
  let sum = 0;
  for (let i = 0; i < SAMPLES; i++) {
    sum += contactAlphaAt((i + 0.5) / SAMPLES * barBand, edge, ledge);
  }
  return sum / SAMPLES;
}

function buildBarFill(edge, ledge) {
  const ACC = contactAccentRGB;
  const ys = new Set([69, 90, 112]);              // the frost bends at each
  for (let i = 0; i <= 20; i++) ys.add(i / 20 * CONTACT.fillDepth);
  const stops = [...ys].sort((a, b) => a - b).map(y => {
    const r = contactAlphaAt(y, edge, ledge);
    const f = contactFrostAt(y);
    const d = 1 - r + r * f;
    const a = d <= 0 ? 1 : (r * f) / d;
    return `rgba(${ACC}, ${a.toFixed(4)}) ${y.toFixed(1)}px`;
  });
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}

const contactSection = darkPanel;
const aboutSection = document.getElementById('about');
const intro = document.querySelector('.intro');
const introBar = document.querySelector('.intro-bar'); // landing nav bar (homepage only)
const pageField = document.querySelector('img.page-field');

// ⚠️ THE FIELD TUCKS BEHIND THE DOCKING BAR (2026-09) — and the bleed it closes
// is a VIEWPORT-HEIGHT problem, not a scroll one. --field-w is 100vw, so the
// artwork's height follows the window's WIDTH and does not shrink when the
// window gets shorter: measured at 1440, the field's bottom sits at page 879
// whatever the height is, while the bar's resting bottom rides 100svh. At
// 1440x900 the bar finishes at 884 and nothing shows; at 1440x740 it finishes at
// 724 and 155px of gradient stands below the docked bar, over Selected Work.
//
// The fix has to cost NOTHING at rest. Anchoring the mask to the bar instead was
// the obvious move and is the wrong one: it compresses the dissolve on exactly
// the short viewports that have the problem, and the fade would then run through
// the bio — the block whose contrast the field's whole geometry is tuned around.
// A scroll-linked shift is zero at scrollY 0, so every measured figure holds.
//
// TWO MEASURED NUMBERS, no constants restated from the CSS:
//   overhang   how far the field's bottom runs past the bar's resting bottom
//   dockScroll the scroll position at which the bar pins (its resting top)
// The shift ramps 0 -> overhang across 0 -> dockScroll, so the gap closes
// smoothly and is exactly zero at the instant the bar pins — no jump at the dock
// point — and the clamp past it keeps the field from ever re-emerging.
let fieldOverhang = 0;
let fieldDockScroll = 0;
function measureFieldTuck() {
  fieldOverhang = 0;
  fieldDockScroll = 0;
  // offsetParent is null when the bar is display:none — the ≤680 tier, where
  // there is no pinned bar to tuck behind and the phone tier owns the field's
  // transform outright. Nothing to do, and setFieldScroll(0) below clears any
  // shift left over from a wider layout.
  if (!pageField || !intro || !introBar || !introBar.offsetParent) return;
  const main = pageField.offsetParent;
  if (!main) return;
  const mainTop = main.getBoundingClientRect().top + window.scrollY;
  // offsets, NOT getBoundingClientRect: the field carries the very transform
  // this publishes, so a rect would feed its own output back in. Verified —
  // offsetTop/offsetHeight read identically with --field-scroll at 0 and 200px.
  const fieldBottom = mainTop + pageField.offsetTop + pageField.offsetHeight;
  // The bar is a SIBLING of .intro pulled up by a negative top margin, so its
  // resting position is .intro's bottom plus that margin. Read from the computed
  // margin rather than from --bar-tail: same number, but derived, so changing the
  // pull-up in CSS cannot leave this stale. (offsetTop is no use here — measured,
  // it tracks the sticky offset and reads the scroll position once docked.)
  // Offsets accumulated to the page, NOT getBoundingClientRect: the hero's load
  // reveal translates .intro-band while this runs, and a rect would report the
  // animation's mid-flight position. Same rule as initWorkCarousel's photo
  // measurement — offsets ignore transforms.
  const pageTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const barTop = pageTop(intro) + intro.offsetHeight
    + parseFloat(getComputedStyle(introBar).marginTop || '0');
  if (barTop <= 0) return;
  const bio = document.querySelector('.intro-bio');
  if (bio) setFieldGap(Math.max(0, Math.round(barTop - (pageTop(bio) + bio.offsetHeight))));
  // ⚠️ THE TARGET IS THE BAR'S TOP, NOT ITS BOTTOM. Aiming at the bottom is the
  // obvious reading of "don't bleed past the bar" and it leaves the artwork
  // visible: the mask's last 40% is a fade, so landing its zero-alpha edge on the
  // bar's bottom line puts the whole faint tail of the ramp BEHIND the docked
  // bar, and the bar's own frost is translucent. Measured at 1440x740 that tail
  // still read as a coral wash across the strip. Landing it on the bar's TOP
  // instead means the field has ended before the bar begins.
  fieldOverhang = Math.max(0, Math.round(fieldBottom - barTop));
  fieldDockScroll = barTop;
}
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
// HERO FIELD — the landing's gradient as a live WebGL shader,
// drawn over the static hero-bkg.jpg rather than instead of it.
// Values exported from lab/field-shader.html; the artwork is
// Figma 521:3788.
//
// WHAT THE SOURCE ACTUALLY IS (read off the four exported blob
// SVGs, not eyeballed): four circles, each one radial gradient at
// layer opacity 0.9, all sharing ONE ramp —
//     0        colour, alpha 1
//     0.524038 colour, alpha 0.3
//     1        WHITE,  alpha 0
// That last stop lifting to WHITE is why the artwork dissolves
// into the cream page instead of greying out at its edges.
// The colours are saturated (#9238E3 #019FD8 #D64DCE #F93F3F);
// the pastels in the JPEG are what they become after the ramp.
//
// FAILURE IS ALWAYS THE JPEG. Nothing here removes the <img>, and
// the reveal class is only set after a frame is genuinely on
// screen — so no-JS, no-WebGL, a driver refusal or a shader
// compile error all land on exactly the previous hero. The whole
// body is also wrapped in try/catch: main.js is shared by every
// page and `is-motion` hides all [data-reveal] pre-paint, so an
// uncaught throw here would blank the site.
// ============================================================
const FIELD = {
  // Invariant — transcribed from the Figma file. Not tuning knobs.
  // ⚠️ midAlpha DEPARTS FROM FIGMA (0.3 -> 0.5), and it is the single most
  // useful number in this object. The ramp collapses each orb to midAlpha by
  // 52.4% of its radius, so at 0.3 the GAPS BETWEEN ORBS — which is exactly
  // where the headline and bio sit — fall to near-cream. Raising it makes each
  // orb hold its colour further out. Measured over the viewport at 1440x900:
  //   0.30 (Figma)  mean saturation 0.407   headline 2.56   bio 2.74
  //   0.40          0.447                   2.82            2.99
  //   0.50          0.486                   3.04            3.22
  //   0.60          0.522                   3.17            3.42
  // Figma's own export means 0.465, so 0.50 is MORE saturated than the source
  // while also being the first setting where both text blocks clear 3:1. This
  // is the one lever found that improves the look and the accessibility
  // together; everything else in this field trades one against the other.
  ramp:  { mid: 0.524038, midAlpha: 0.5 },
  // ⚠️ DOCUMENTATION ONLY — NOTHING READS THIS. It records Figma's layer opacity;
  // it is not applied to the render and never has been. It used to be interpolated
  // into the shader as a constant the shader body ignored, which made it a live
  // hazard rather than an inert note (see the comment at the shader source), so
  // that emission is gone. The field has always painted at full opacity.
  // ⚠️ Do NOT "fix" this by wiring it into the composite: every orb radius, the
  // ramp's midAlpha and both text blocks' contrast were tuned by measurement
  // against the export with it absent. Applying 0.9 now would desaturate the whole
  // field at once and drop the headline and bio below their thresholds together.
  layer: 1.0,
  cream: [0.984, 0.988, 0.973],
  // ⚠️ VIOLET AND MAGENTA ARE A PAIR (2026-09), the way cyan and red already
  // were. They used to be the OUTER two, 0.35 apart, with the tighter cyan/red
  // pair (0.17 apart) sitting between and above them — so each of the outer two
  // had its centre buried inside one of the inner two, and neither rendered as
  // itself: violet came out #CD5895 (pink) and magenta #9390DB (periwinkle),
  // hue errors of 55 and 67 degrees from their own colours.
  // ⚠️ IT IS DISTANCE FROM THE ORB ABOVE, NOT SPREAD. Violet sat at 0.710 with
  // red at 0.625 — 34% of red's radius, deep inside it. At 0.840 it is 70% of
  // the way out, past the ramp's midpoint, and reads as itself while STILL
  // sitting beside red on the right. Being next to red was never the problem;
  // being inside it was.
  // Pairing both on the left also fixes the hue (6 degrees) but strands the bio
  // at 2.05, because the bio is in the RIGHT column and violet was its second
  // light source. Violet right / magenta left scores 12 degrees and 2.51 — the
  // hue fix at almost none of the contrast cost.
  /* PLACEMENT FROM FIGMA TeNe3E4y6xGRTFC1CrEPuX / 37:23, as-is.
     A 1440x800 frame (the fold, not a full page) holding a 2747x2309 group.
     Order bottom-to-top: magenta, red, violet, CYAN. All at opacity 1.0.

     ⚠️ THE GROUP OFFSET IS FITTED, NOT ASSUMED. Figma gives the group's own box
     but not where it sits in the frame, and assuming "centred" was wrong once
     already. A grid search rendering this four-circle model against the
     downsampled export lands at (-662, -696), RMS 0.065. RE-FIT WHENEVER THE
     NODE CHANGES — it has changed four times, with a different frame size, orb
     count-of-changes and paint order each time.
         field x = (frame px + 208.8) / 1857.6
         field y = (frame py + 204.2) / 1134.3
         radius  = r / 1857.6
     Radii convert against the WIDTH: the shader divides dy by the aspect, which
     is what keeps the orbs circular in pixels.

     ⚠️ Depends on --hero-lift being 0. The mock draws the lockup against the
     hero's centre; reinstate the lift and every y here must drop by lift/1134.

     ⚠️ THIS IS THE SOURCE COMPOSITION, UNADJUSTED. Measured, its headline band
     runs ~2.7-3.0 against a required 3.0, and the Figma export itself measures
     2.37 there — the shortfall is in the design, not the port. Earlier passes
     that moved orbs around to fix it are deliberately NOT carried over. */
  // ⚠️ RED PAINTS ABOVE VIOLET (2026-09) — a PAINT-ORDER change, and the order is
  // the whole fix. Figma's order is magenta, red, violet, cyan; red is third from
  // the top there, so violet (x 0.942, r 0.5054) covered it and red only survived
  // where violet's alpha had fallen off. Measured: with red painted under violet
  // the field's reddest pixel sat at x 0.42 no matter where red's CENTRE was moved
  // to — moving it right just pushed it further under violet and made it worse.
  // ⚠️ MOVING THE CENTRE IS NOT THE LEVER. This is the fourth time that has been
  // established here (cyan, magenta, violet, now red) — check the order first.
  // ⚠️ AND RED IS THE LIGHTEST ORB, so it cannot simply be parked under the bio.
  // White on red is 3.61:1; white on violet is 5.40:1. Putting red under the bio
  // in violet's PLACE dropped the bio to 2.50-2.77, its worst of any variant —
  // the block the move was meant to help. Above violet it is additive instead:
  // source-over keeps violet underneath, so the bio reads 2.86-3.24, better than
  // the Figma original's 2.72-3.11, while red's visible area goes 41.5% -> 52.3%.
  // Measured over 14 orbit phases per variant, worst pixel under the line boxes.
  blobs: [
    { col: [0.8392, 0.3020, 0.8078], r: 0.5669, x: 0.107, y: 0.375, a: 1.00 }, // magenta #D64DCE
    { col: [0.5725, 0.2196, 0.8902], r: 0.5054, x: 0.942, y: 0.499, a: 1.00 }, // violet  #9238E3
    { col: [0.9765, 0.2471, 0.2471], r: 0.6275, x: 0.590, y: 0.640, a: 1.00 }, // red     #F93F3F
    { col: [0.0039, 0.6235, 0.8471], r: 0.4738, x: 0.547, y: -0.016, a: 1.00 }, // cyan   #019FD8
  ],
  // Calmed 2026-09 (speed 2.05 -> 1.7, drift 0.05 -> 0.032). Drift carries
  // most of the reduction on purpose: amplitude reads as restraint,
  // frequency reads as alive, and dropping the rates instead is what
  // produced a field that was animated in theory and static to a reader.
  // drift is the HORIZONTAL excursion; driftYRatio scales the vertical one
  // down from it. Lowered 0.055 -> 0.038 (2026-09) to narrow the contrast swing
  // under the text: the field's movement is what put the bio below threshold at
  // its worst phases, not its resting composition. Vertical travel moves the headline and bio across bands of
  // the gradient and swings their contrast, so it is kept short; horizontal
  // travel is close to free. Raise drift for more life, raise driftYRatio only
  // after re-measuring both blocks.
  // ⚠️ drift RAISED 0.038 -> 0.050 (2026-09), and the ceiling is MEASURED, not
  // guessed. Amplitude is the dial for liveliness — never the orbit rates, which
  // were once taken to 0.031 rad/s giving a 203-second cycle moving ~2px/sec:
  // animated on paper, static to a reader.
  // Swept at 1440x900 over 20 phases of the slowest component, COMPOSITED THROUGH
  // THE MASK (sampling the raw canvas overstates every one of these):
  //   drift  x travel  bio floor-ceiling   passes 3:1
  //   0.038  +/-55px   3.03 - 3.22         yes
  //   0.050  +/-72px   3.02 - 3.24         yes   <- shipped
  //   0.056  +/-81px   3.01 - 3.26         yes, by 0.01 — too thin to ship
  //   0.062  +/-89px   2.98 - 3.27         NO
  //   0.070  +/-101px  2.94 - 3.27         NO
  // ⚠️ The FLOOR is what fails, not the mean: widening drift widens the SWING
  // (0.19 -> 0.33 across that range) while the ceiling rises, so a mean or a
  // single sample looks fine right up to the point the worst phase is illegal.
  // Re-measure the bio's floor over a full cycle before raising this again.
  // ⚠️ pulse RAISED 0.16 -> 0.30 (2026-09). At 0.30 the largest orb (red) swells
  // 271px in radius and back over its 27-45s period, against 145px before.
  // ⚠️ IT WENT TO 0.60 FIRST AND CAME BACK — THE LIMIT IS HUE, NOT CONTRAST.
  // At 0.60 the field visibly "becomes purple at one point". The cause is NOT
  // that the peak is more purple — measured, the purple maximum barely moves
  // (40.4% -> 41.8% of the field across every setting tried, including the
  // original). It is that the TROUGH GETS PALER: small orbs leave more cream, so
  // the purple share falls 31.9% -> 17.9% and the field starts cycling between
  // washed-out and purple. That EXCURSION is what the eye catches.
  //   pulse  red grows  purple swing  purple floor
  //   0.16   +145px     8.7 pts       31.9%
  //   0.25   +226px     11.9          29.1%
  //   0.30   +271px     13.7          27.5%   <- shipped
  //   0.35   +316px     15.6          25.7%
  //   0.60   +542px     24.0          17.9%   <- too much, reads as a colour cycle
  // ⚠️ DRIFT IS NOT INVOLVED — check this before "fixing" the wrong dial, which
  // is what was reached for first. Holding pulse and changing drift leaves the
  // swing flat (15.9 -> 15.7 at pulse 0.35; 24.6 -> 24.0 at 0.60); holding drift
  // and changing pulse nearly triples it.
  // ⚠️ PULSE HAS NO ACCESSIBILITY CEILING, AND THAT IS A PROPERTY OF THE
  // RECTIFIED WAVE, not luck. `(.5+.5*sin)` runs 0..1, so an orb's MINIMUM is
  // always its base radius whatever pulse is set to — raising it can only add
  // colour at the peak, never take any away. Contrast therefore improves
  // monotonically. Swept at 1440x900 over 20 exact phases, composited:
  //   pulse  red grows  bio floor  headline floor  mean sat  colour evenness
  //   0.16   +145px     3.02       2.43            --        --
  //   0.35   +316px     3.13       2.55            0.409     0.897
  //   0.60   +542px     3.24       2.60  <- peak   0.395     0.893
  //   0.75   +678px     3.29       2.59            0.381     0.907
  //   0.90   +813px     3.32       2.52            0.365     0.921
  // (Contrast keeps improving well past what is usable — see the HUE table above
  //  for the constraint that actually binds.)
  // Contrast that with `drift` directly above, which FAILS at 0.062: the two
  // dials are not alike, and the difference is entirely that one is rectified
  // and the other is not.
  // ⚠️ 0.60 IS A MEASURED KNEE, NOT A LIMIT. Two things turn over there. The
  // HEADLINE floor peaks at 0.60 and declines after; and MEAN SATURATION falls
  // steadily as pulse rises (0.409 -> 0.365), because at the peak each orb's
  // outer ramp — which lifts to WHITE — covers more of the field. So past 0.60
  // the bio keeps improving while the field gets paler and the headline gets no
  // better. That is the trade to weigh, not an accessibility wall.
  // ⚠️ IT DOES NOT MUSH THE COLOURS, which was the thing worth checking before
  // going big. Measured at the fullest phase, the four hues' share of the field
  // stays even (Shannon evenness 0.89-0.92) and actually RISES with pulse: red's
  // dominance drops .45 -> .40 while cyan gains .22 -> .32. Bigger orbs overlap
  // more but they do not collapse into one wash.
  // ⚠️ Do NOT "restore" a bare sin to make it shrink below base. That was the
  // original form and the trough pulled every orb's reach in by 8% at once,
  // which is what put the bio's worst phases under threshold.
  motion: { speed: 1.85, drift: 0.050, driftYRatio: 0.2, pulse: 0.30, warp: 0.55 },
  // Buffer size vs CSS px. BELOW devicePixelRatio deliberately: a soft
  // gradient carries no per-pixel detail, so 1.0 on a 2x display is a 4x
  // fill-rate saving nobody can see. Grain is the one thing that does want
  // device pixels, which is why it is a CSS layer (hero.css) and not in here.
  renderScale: 1.0,
};

/* Phones get the static JPEG, full stop — see the matching block in
   responsive.css. Bailing here (rather than only hiding the canvas in CSS) is
   the point: no WebGL context, no shader compile, no render loop, and none of
   the per-frame backdrop-filter work the two glass layers would otherwise do
   over a moving field. ⚠️ PAIRED WITH THE 480 TIER IN responsive.css — move one
   and you must move the other, as initWorkCarousel is paired with that tier. */
const FIELD_PHONE = matchMedia('(max-width: 480px)');

function initHeroField() {
  const canvas = document.getElementById('hero-field');
  if (!canvas) return;        // project pages have no field
  if (FIELD_PHONE.matches) return;   // phones: the <img> underneath is the hero

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, powerPreference: 'low-power' })
          || canvas.getContext('experimental-webgl');
  if (!gl) return;       // stay on the JPEG

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = [
    'precision highp float;',
    'uniform vec2 uRes,uAmp;uniform float uAspect,uTime,uWarp;',
    'uniform vec4 uBlob[4];uniform vec3 uCol[4];',
    // ⚠️ FIELD.layer is deliberately NOT emitted here. It was, as a dead constant
    // `LAYER` that no line of the shader body ever read — and being dead did not
    // make it harmless: the value is interpolated into GLSL source, so setting it
    // to 1.0 emitted `const float LAYER=1;`, which is an int-to-float type error
    // that fails the whole compile. That threw initHeroField, the try/catch caught
    // it, and the page silently fell back to the JPEG — a config-only edit taking
    // the entire field down. Anything interpolated into this string must be a
    // GLSL-valid literal; JS stringifies 1.0 as "1", 0.9 as "0.9".
    'const float MID=' + FIELD.ramp.mid + ',MIDA=' + FIELD.ramp.midAlpha + ';',
    'const vec3 CREAM=vec3(' + FIELD.cream.join(',') + ');',
    // Each blob breathes — radius +/- PULSE on its own slow cycle. Cheap
    // life: it changes how far a blob REACHES without moving its centre,
    // so unlike drift it does not slide colour off the text. Rates are
    // per-blob and unequal, so they never swell in unison.
    'const float PULSE=' + FIELD.motion.pulse + ';',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}',
    // Figma's three-stop ramp: alpha 1 -> MIDA over the first half, then
    // MIDA -> 0 while the colour lerps to white.
    'vec2 ramp(float t){if(t>=1.)return vec2(0.,1.);',
    ' if(t<=MID)return vec2(1.+(MIDA-1.)*(t/MID),0.);',
    ' float u=(t-MID)/(1.-MID);return vec2(MIDA*(1.-u),u);}',
    'void main(){vec2 uv=gl_FragCoord.xy/uRes;uv.y=1.-uv.y;',
    // Domain warp — the one liberty over the source. Figma's circles are
    // exact; displacing the sample point makes the boundaries curl as they
    // drift. uWarp 0 renders the file verbatim.
    ' vec2 q=vec2(fbm(uv*2.4+vec2(0.,uTime*.16)),fbm(uv*2.4+vec2(5.2,1.3-uTime*.13)));',
    ' vec2 w=uv+uWarp*.22*(q-.5);',
    // Source-over onto cream, bottom to top — the model Figma uses. NOT a
    // weighted average; the overlaps have to stack or the mixed hues go wrong.
    ' vec3 col=CREAM;float cov=0.;',
    ' for(int i=0;i<4;i++){float fi=float(i);',
    // Orbit periods 48/39/33/29s, deliberately unequal so the four never
    // return to the same arrangement. To calm this down lower uAmp, not the
    // rates: amplitude reads as restraint, frequency reads as alive.
    //
    // THE AXES ARE NOT EQUAL. uAmp.x is the horizontal wander and uAmp.y is a
    // fraction of it (motion.driftYRatio), because vertical travel is the
    // expensive direction: the headline and bio each sit on a band of the
    // gradient, so moving the mass up and down swings their contrast hardest.
    // Measured — splitting the axes cut the bio's swing across a full orbit
    // from 0.61 to 0.41 while giving 31% MORE side-to-side travel.
    // ⚠️ Sideways is cheaper, NOT free: the bio sits in the right column, so
    // horizontal travel slides colour off it too. Widening x from 0.042 to
    // 0.055 took the bio's floor 1.68 -> 1.61 — still inside the 1.6-2.3 band,
    // but that IS the floor. Re-measure the bio before raising drift again.
    //
    // X SUMS TWO INCOMMENSURATE SINES so the horizontal path never repeats —
    // one sine is an ellipse you can learn after a minute of watching. The
    // weights total 1.0, so uAmp.x is still the true peak excursion.
    '  float ax=uAmp.x*(.62*sin(uTime*(.130+fi*.028)+fi*1.7)+.38*sin(uTime*(.077+fi*.019)+fi*4.1));',
    '  float ay=uAmp.y*cos(uTime*(.110+fi*.024)+fi*2.3);',
    '  vec2 c=uBlob[i].xy+vec2(ax,ay);',
    // ⚠️ THE PULSE ONLY GROWS. (.5+.5*sin) rectifies the wave to 0..1, so an
    // orb runs from its base radius up to base*(1+PULSE) and back — never
    // below. It used to be a bare sin, i.e. +/-PULSE, and the shrink half was
    // costing contrast: the trough pulled every orb's reach in by 8% at once,
    // which is what put the bio's worst phases under its threshold.
    '  float rad=uBlob[i].z*(1.+PULSE*(.5+.5*sin(uTime*(.075+fi*.017)+fi)));',
    '  vec2 d=vec2(w.x-c.x,(w.y-c.y)/uAspect);',
    '  vec2 ra=ramp(length(d)/rad);float a=ra.x*uBlob[i].w;',
    '  if(a<=0.)continue;',
    '  col=col*(1.-a)+mix(uCol[i],vec3(1.),ra.y)*a;cov=max(cov,a);}',
    // DITHER — one code value of noise before the 8-bit quantisation turns a
    // banding step into imperceptible grain. Neither a JPEG ramp nor a video
    // encode can do this; it is the technical case for rendering the field.
    ' col+=(hash(gl_FragCoord.xy+fract(uTime)*71.3)-.5)/255.;',
    ' gl_FragColor=vec4(col,1.);}',
  ].join('\n');

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  // One full-screen triangle — cheaper than a quad, and no seam down the middle.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uRes', 'uAspect', 'uTime', 'uWarp', 'uAmp', 'uBlob', 'uCol']
    .forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  gl.uniform3fv(U.uCol,  new Float32Array(FIELD.blobs.flatMap(b => b.col)));
  gl.uniform4fv(U.uBlob, new Float32Array(FIELD.blobs.flatMap(b => [b.x, b.y, b.r, b.a])));
  gl.uniform1f(U.uWarp, FIELD.motion.warp);
  gl.uniform2f(U.uAmp,  FIELD.motion.drift, FIELD.motion.drift * FIELD.motion.driftYRatio);

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width  * FIELD.renderScale));
    const h = Math.max(1, Math.round(r.height * FIELD.renderScale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(t) {
    resize();
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uAspect, canvas.width / canvas.height);
    gl.uniform1f(U.uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // First frame BEFORE the reveal, so the class never uncovers an empty canvas.
  draw(0);
  html.classList.add('is-field-live');

  // Reduced motion keeps the artwork and drops only the movement — the field
  // should not change character because someone asked the page to hold still.
  if (reducedMotion.matches) return;

  // Only draw while the field is actually on screen. It bleeds well past the
  // fold, so this observes the CANVAS rather than .intro — stopping at the
  // hero's edge would freeze it while a third of it is still visible.
  let onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      es => { onScreen = es[0].isIntersecting; },
      { rootMargin: '100px' }
    ).observe(canvas);
  }

  let clock = 0;
  let prev = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    // dt-based, not frame-counted, so the speed is identical at 60 and 120Hz;
    // capped so a backgrounded tab resuming cannot jump the whole distance.
    const dt = Math.min(now - prev, 100) / 1000;
    prev = now;
    // Also stops if a desktop session is resized/rotated into the phone
    // tier, where the CSS has hidden the canvas — no point drawing it.
    if (!onScreen || document.hidden || FIELD_PHONE.matches) return;
    clock += dt * FIELD.motion.speed;
    draw(clock);
  })(prev);
}

try {
  initHeroField();
} catch (e) {
  // Field is decorative — the JPEG underneath is the real content. Never let
  // it take the page down with it.
  console.warn('Hero field unavailable, using the static image:', e);
}

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

// Every item in the site nav answers itself while the pointer (or keyboard
// focus) is on it: "Selected work" -> "What I made", "About me" -> "Who am I?",
// "Say hello" -> "Why hello!". A vanilla port of motion-primitives' TextMorph
// (motion-primitives.com/docs/text-morph), using the same keyed-FLIP technique
// as initHeadlineMorph above but tuned the way a button wants rather than a
// headline: letters only FADE (no blur, no drift), on one short spring.
//
// Keys are LOWERCASED character + occurrence, which is the reference's rule and
// not this file's other one. It is what decides which letters travel and which
// cross-fade. Measured, not guessed — counted off the animations each pair
// actually creates:
//
//   Say hello     -> Why hello!    7 of 10 travel  (the strongest of the three:
//                                  the "h" of "hello" slides left to become the
//                                  "h" of "Why", a second "h" fades in behind it)
//   About me      -> Who am I?     4 travel, 5 in, 4 out
//   Selected work -> What I made   5 travel, 6 in, 8 out (the weakest — the two
//                                  share little but t/space/w/d/e, so it reads
//                                  more as a cross-fade than a slide)
//
// The spring IS the reference's default (stiffness 280, damping 18, mass 0.3),
// solved here once rather than carried as a runtime dependency: omega0 = 30.55
// rad/s, zeta = 0.982 — a hair inside critical, so it settles in 285ms with no
// overshoot (peak 0.999). SPRING is that curve sampled at 25 points. Native
// WAAPI throughout, no Motion.dev import, so a CDN failure can't take the nav
// down with it.
//
// Progressive enhancement: every label ships as plain text in the HTML, so no-JS
// visitors, crawlers and reduced-motion readers get the resting label and
// nothing else. Each ACCESSIBLE NAME stays the resting label whatever is on
// screen — these are links to real sections, and a name that changes under the
// pointer breaks voice control ("click Selected work") and would announce the
// joke instead of the destination.
//
// Selectors match BOTH the homepage's own anchors and the project pages'
// "../index.html#…" form, so one table covers all five pages. They are scoped to
// .intro-bar-links on purpose: the <=480 header nav and the .section-pills
// floatie carry the same two destinations, have no hover to drive a morph, and
// are deliberately left alone.
function initNavMorph() {
  if (reducedMotion.matches) return;

  const MORPHS = [
    { selector: '.intro-bar-links a[href$="#work-section"]', rest: 'Selected work', hover: 'What I made' },
    { selector: '.intro-bar-links a[href$="#about"]', rest: 'About me', hover: 'Who am I?' },
    { selector: '.intro-bar-cta', rest: 'Say hello', hover: 'Why hello!' },
  ];

  const DURATION = 285; // ms — the spring's own settle time, see above
  const SPRING =
    'linear(0, 0.0521, 0.1659, 0.2993, 0.43, 0.5472, 0.6468, 0.7286, 0.7939, ' +
    '0.8452, 0.8847, 0.9148, 0.9375, 0.9545, 0.967, 0.9763, 0.983, 0.9879, ' +
    '0.9914, 0.9939, 0.9957, 0.997, 0.9979, 0.9986, 0.999)';
  // linear() is Safari 17.4 / Chrome 113 and up; older engines take the closest
  // bezier. An unsupported easing string THROWS out of animate(), so this is a
  // guard, not a nicety.
  const EASE =
    window.CSS && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)')
      ? SPRING
      : 'cubic-bezier(0.2, 0.8, 0.3, 1)';

  MORPHS.forEach(({ selector, rest, hover }) => {
    document.querySelectorAll(selector).forEach((el) => setupMorph(el, rest, hover));
  });

  function setupMorph(el, REST, HOVER) {
    // Only take over an element still reading the label this morph is written
    // for — so a copy edit in the HTML disables the morph rather than fighting it.
    if (el.textContent.trim() !== REST) return;

    // The box reserves room for the WIDER of the two labels at all times, so a
    // morph can never resize its own item. The whole bar is one flex row that the
    // wordmark's `margin-right: auto` drives rightward, so ANY item that grew
    // mid-morph would shove every item after it sideways — the nav would twitch
    // each time a pointer crossed any of the three.
    //
    // It is reserved in CSS, not measured: both labels ship as hidden sizer spans
    // stacked with the live one in a single inline-grid cell, so the cell is the
    // max of the two and the letters centre inside it. Measuring instead was
    // tried and is a trap — these are `display: none` at <=480, so a lock taken
    // while the window was narrow froze the box at 0px and the label never came
    // back, and even a correct measurement goes stale the moment a breakpoint
    // changes --size-base underneath it.
    const box = document.createElement('span');
    box.className = 'nav-morph';
    box.setAttribute('aria-hidden', 'true'); // the <a>'s aria-label is the name
    // Each sizer is split into the SAME per-character inline-blocks as the live
    // label. Setting it as ordinary text instead leaves the reservation a shade
    // short — inline-blocks get no kerning between them, so the live label is
    // marginally wider than that string shaped in one piece, and the box grew
    // 0.26px mid-morph. (The .nav-morph-char class is shared for identical metrics;
    // every query below is scoped to `run`, so sizer letters are never morphed.)
    [REST, HOVER].forEach((label) => {
      const sizer = document.createElement('span');
      sizer.className = 'nav-morph-sizer';
      for (const ch of label) {
        const letter = document.createElement('span');
        letter.className = 'nav-morph-char';
        letter.textContent = ch === ' ' ? '\u00A0' : ch;
        sizer.appendChild(letter);
      }
      box.appendChild(sizer);
    });
    const run = document.createElement('span');
    run.className = 'nav-morph-run';
    box.appendChild(run);

    el.setAttribute('aria-label', REST);
    el.textContent = '';
    el.appendChild(box);

    const live = new Map();     // key -> character node in flow
    const exitPool = new Map(); // key -> node out of flow, fading, still adoptable
    let current = '';
    let hovered = false;
    let focused = false;

    render(REST, false);

    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return; // a tap is not a hover; it's a nav
      hovered = true;
      sync();
    });
    el.addEventListener('pointerleave', () => { hovered = false; sync(); });
    // KEYBOARD focus only. Chrome focuses a link on mousedown, so a plain
    // `focus` handler leaves the item stuck on its answer for as long as it keeps
    // focus after a click — and every one of these links scrolls the page rather
    // than leaving it, so that is the whole trip to the section and beyond.
    // :focus-visible is exactly the distinction: it matches a Tab, not a click.
    el.addEventListener('focus', () => {
      focused = el.matches(':focus-visible');
      sync();
    });
    el.addEventListener('blur', () => { focused = false; sync(); });

    function sync() {
      render(hovered || focused ? HOVER : REST, true);
    }

    function render(text, animate) {
      if (text === current) return;
      current = text;

      const host = run.getBoundingClientRect();

      // FIRST: where every character is right now, in-flight transform and
      // opacity included — so interrupting a morph mid-flight resumes from what
      // is actually on screen instead of snapping to wherever it was headed.
      const first = new Map();
      run.querySelectorAll('.nav-morph-char').forEach((n) => {
        first.set(n, { rect: n.getBoundingClientRect(), opacity: getComputedStyle(n).opacity });
      });

      // Build the incoming label. A key both labels share REUSES its node, and
      // that reuse is the whole trick: the same element ends up somewhere new, so
      // it can slide there. Nodes mid-exit stay adoptable, so flicking off the
      // button and back picks the same letters up mid-fade instead of popping.
      const seen = Object.create(null);
      const nextLive = new Map();
      const fading = [];
      const frag = document.createDocumentFragment();

      for (const ch of text) {
        const lower = ch.toLowerCase();
        const key = lower + '#' + (seen[lower] = (seen[lower] || 0) + 1);
        let node = live.get(key);
        if (node) {
          live.delete(key);
        } else if ((node = exitPool.get(key))) {
          exitPool.delete(key);
          node.style.position = '';
          node.style.left = '';
          node.style.top = '';
          fading.push(node); // turn its fade around, back up to full
        } else {
          node = document.createElement('span');
          node.className = 'nav-morph-char';
          node.style.opacity = '0';
          fading.push(node);
        }
        // Keys are case-INSENSITIVE, so a reused node can be carrying the other
        // case: the "A" of "About me" is the very node that becomes the "a" of
        // "Who am I?". Write the glyph every time — the node travels, and the
        // letter it draws is whatever the incoming label says. The reference gets
        // this for free (React re-renders the span's children under the same key);
        // leaving it out rendered "Who AM I?" back when the label was title-case,
        // and because a cap M is wider than an m it also overflowed the width the
        // sizers had reserved, by 2.5px.
        node.textContent = ch === ' ' ? '\u00A0' : ch;
        nextLive.set(key, node);
        frag.appendChild(node); // moves the node when it was reused
      }

      // Whatever `live` still holds went unclaimed. Pull it out of flow at the
      // spot it already occupies so the new label reflows around it immediately
      // — the reference's popLayout — and fade it away there.
      const unclaimed = [...live.entries()];
      live.clear();
      nextLive.forEach((node, key) => live.set(key, node));

      unclaimed.forEach(([key, node]) => {
        const stranded = exitPool.get(key);
        if (stranded && stranded !== node) stranded.remove();
        const f = first.get(node);
        node.style.position = 'absolute';
        node.style.left = (f.rect.left - host.left) + 'px';
        node.style.top = (f.rect.top - host.top) + 'px';
        exitPool.set(key, node);
      });

      run.appendChild(frag);
      // EVERY fading node is re-driven below, not just this pass's own — the
      // cancel further down kills any exit animation still running, and a node
      // whose fade was cancelled and not restarted would sit in the box forever.
      const leaving = [...exitPool.entries()];
      leaving.forEach(([, node]) => run.appendChild(node)); // fades paint on top

      // Cancel in-flight work only now that its result has been measured.
      run.querySelectorAll('.nav-morph-char').forEach((n) => {
        n.getAnimations().forEach((a) => a.cancel());
      });

      if (!animate) {
        leaving.forEach(([key, node]) => { exitPool.delete(key); node.remove(); });
        fading.forEach((n) => { n.style.opacity = ''; });
        return;
      }

      // LAST + PLAY. One spring drives the slide and both fades, the way the
      // reference hands its single `transition` to layout and opacity alike.
      // animate() applies its first keyframe from creation, so the inverted start
      // state needs no separate flush.
      live.forEach((node) => {
        const f = first.get(node);
        if (!f) return; // brand new — nothing to slide from
        const dx = f.rect.left - node.getBoundingClientRect().left;
        if (!dx) return;
        node.animate(
          { transform: ['translateX(' + dx + 'px)', 'translateX(0px)'] },
          { duration: DURATION, easing: EASE }
        );
      });

      fading.forEach((node) => {
        const f = first.get(node);
        node.style.opacity = '';
        node.animate({ opacity: [f ? f.opacity : '0', '1'] }, { duration: DURATION, easing: EASE });
      });

      leaving.forEach(([key, node]) => {
        const f = first.get(node);
        node.animate(
          { opacity: [f ? f.opacity : '1', '0'] },
          { duration: DURATION, easing: EASE, fill: 'forwards' }
        ).finished.then(
          () => {
            if (exitPool.get(key) === node) exitPool.delete(key);
            node.remove();
          },
          () => {} // cancelled by a later morph, which has already re-driven it
        );
      });
    }
  }
}

initNavMorph();

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
  // ⚠️ HOW MUCH OF THE CARD MUST BE IN VIEW BEFORE IT PLAYS AND CROSSFADES.
  // ⚠️ IT WENT TO 0.6 AND CAME BACK — don't raise it again without reading why.
  // It was raised chasing a report of cards "appearing with no fade", which the
  // ROTATION BUG turned out to explain in full: normalize()'s forward test was
  // missing a 1px tolerance, so on any viewport with a fractional card width the
  // track stranded one step past rest and mandatory snap yanked it on the next
  // gesture. 0.6 was treating a symptom of that, and once the real cause was
  // fixed it was pure cost: ~45ms later on every horizontal advance (measured —
  // ratio 0.4 is crossed at ~85ms, 0.6 at ~130ms) in exchange for nothing.
  // For reference, the fade was already comfortably visible at 0.4: measured on
  // the live site, play at 85ms, fade 116->483ms, card fully arrived at 266ms —
  // so 217ms of the crossfade lands AFTER the card is in place.
  // ⚠️ IT IS PAIRED WITH THE OBSERVER'S THRESHOLD ARRAY at the bottom of this
  // function — an IntersectionObserver only delivers a callback when a listed
  // threshold is CROSSED, so raising the comparison without raising the
  // threshold means the callback that would satisfy it never arrives, and no
  // card ever plays. Move both or neither.
  // ⚠️ Do not push it much higher. The ratio is the VIDEO's, and it must stay
  // reachable on a short viewport: the clip renders ~371px tall at 1440, so 0.6
  // needs 223px of it on screen. Fine everywhere realistic, but 0.9 would strand
  // the card on its poster on a laptop with a short window.
  const PLAY_AT = 0.4;
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
  // ⚠️ IT KEEPS OBSERVING. This used to `obs.unobserve(v)` on the first hit, with
  // the comment "buffer once; keep it" — and the premise is false in a LOOP. The
  // track rotates (normalize()), so a card that was two steps away and never
  // reached, or whose media element was reset by the move, has no way back to
  // buffered once its observer is gone. Measured on the live site: two of the
  // four videos sat at readyState 0 with networkState IDLE at any moment — the
  // far buffer positions — so the FIRST advance was instant and the SECOND
  // landed on a cold card. That is the "delay, and it doesn't quite load the
  // next card in a full loop" report: after one rotation the card that becomes
  // "next" is the one that was two away, and it is cold.
  // Cold start costs 672ms from load() to canplay for a 2.03MB clip, and the
  // play path below deliberately waits on canplay — so that is 672ms of poster
  // on top of DAMP.arrival's 650ms of travel.
  // ⚠️ An IntersectionObserver DOES re-fire when a node is moved in the DOM
  // (verified: re-appending a target produced one extra callback), which is
  // exactly the signal rotation generates and unobserve was throwing away.
  // ⚠️ THE TWO GUARDS ARE LOAD-BEARING. `load()` on an element that is already
  // holding data restarts the fetch and throws the buffer away; on one that is
  // PLAYING it also stops playback dead. readyState >= 3 is the same threshold
  // the play path uses, so anything it would accept is left alone.
  // ⚠️ IT WARMS THE POSTER TOO, NOT JUST THE VIDEO — and forgetting that is what
  // made a card "harshly appear" instead of sliding in. The posters are
  // loading="lazy", which is right for a vertical page and WRONG for this
  // horizontal track: the two buffer cards sit ~1200-2600px off-screen
  // SIDEWAYS, well past the browser's own lazy threshold. Measured at rest, both
  // far cards reported `poster.complete === false` and naturalWidth 0 — so they
  // were rendering as genuinely BLANK boxes, and the image only arrived, fully
  // formed and with no transition, once the card had slid into view.
  // ⚠️ The card's LAYOUT never moved (verified: every card 1216x596 through an
  // advance, no size change anywhere), so this is not a reflow — it is an empty
  // box being filled at the last moment.
  // Flipping `loading` to eager on an image that has not loaded starts the fetch
  // immediately, which is all this needs; posters are 296-432KB each.
  const prep = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const v = entry.target;
      const poster = posterOf(v);
      if (poster && !poster.complete) poster.loading = 'eager';
      if (v.readyState >= 3 || !v.paused) return;
      v.preload = 'auto';
      v.load();
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
      } else if (entry.intersectionRatio >= PLAY_AT && armed.has(v)) {
        // Back to PLAY_AT in view: play once from frame 0, then disarm — so
        // staying in view (or a partial leave that never fully exits) won't
        // rewind it.
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
  }, { threshold: [0, PLAY_AT] });
  vids.forEach((v) => io.observe(v));

  // ⚠️ AND WARM EVERY POSTER ONCE THE PAGE IS IDLE, UNCONDITIONALLY. The
  // observer above covers a card that comes within 800px, but the LEFT BUFFER
  // card never does: at rest it sits ~1220px off-screen to the left and stays
  // there until the reader scrolls backward or cycles all the way round.
  // Measured — it reported `complete: false` and naturalWidth 0 through a full
  // forward advance, i.e. it renders as a BLANK box, and the image then arrives
  // fully formed with no transition the moment it slides in. That is the
  // "harshly appears" report.
  // ⚠️ This is deliberately NOT geometry-driven. Tying it to the observer would
  // make a blank card depend on rootMargin arithmetic against a horizontally
  // rotating track — the exact reasoning that produced the bug. Four posters at
  // 296-432KB, fetched when the browser says it is idle, is the cheap
  // deterministic answer.
  // ⚠️ It stays `loading="lazy"` IN THE MARKUP on purpose: no-JS visitors and
  // crawlers keep the lazy behaviour, and the initial page load is unchanged —
  // idle means after first paint, not during it.
  // ⚠️ GATED ON THE SECTION, NOT ON IDLE AND NOT ON EACH CARD. Warming on idle
  // alone works but spends ~1.1MB of posters on a visitor who never scrolls to
  // Selected Work — including on a phone. Watching the SECTION instead keeps the
  // determinism (one big static target, no rotation, no per-card rootMargin
  // arithmetic) while costing a bouncing visitor nothing.
  const warmPosters = () => vids.forEach((v) => {
    const poster = posterOf(v);
    if (poster && !poster.complete) poster.loading = 'eager';
  });
  // ⚠️ ON IDLE, AS EARLY AS POSSIBLE — NOT GATED ON SCROLL POSITION. This was
  // tried twice the other way and both were wrong, so don't re-derive it:
  //   1200px margin — MEASURED useless. Selected Work's top sits EXACTLY at the
  //     fold, so the gate was already satisfied at page load and deferred nothing.
  //   200px margin — deferred correctly and was still TOO LATE. It arms about one
  //     gesture before a section that begins at the fold, so three ~400KB posters
  //     were still arriving while the reader was already looking at the cards,
  //     and the image popped in. Reported as "not loading smoothly, it just
  //     harshly appears".
  // A poster has no fade of its own: whenever it finishes decoding it simply
  // paints, so the ONLY way it is not a pop is for it to be there first. Idle is
  // the earliest moment that costs the initial render nothing.
  // ⚠️ The data trade is deliberate and small: ~1.1MB of posters for a section
  // that starts at the fold, i.e. one that virtually every visitor reaches. It is
  // NOT during first paint — requestIdleCallback means after it — so LCP and the
  // hero are untouched, and preload="none" still keeps the 10MB of VIDEO out of
  // the initial load, which was always the expensive part.
  if ('requestIdleCallback' in window) requestIdleCallback(warmPosters, { timeout: 2000 });
  else setTimeout(warmPosters, 800);

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
    // ⚠️ THE FORWARD TEST NEEDS THE SAME 1px TOLERANCE THE BACKWARD ONE HAS, and
    // an earlier note here explicitly claimed it did not. That was wrong, and it
    // stranded the carousel on any viewport where the card's width is fractional.
    // MEASURED at a 1396px window: --width-right-column's clamp resolves the card
    // to 1175.3359375, so step is 1235.3359375 and the boundary is 2470.671875 —
    // but scrollLeft can only land on a device pixel, so it stops at 2470.5, a
    // shortfall of 0.17px. `>=` is then false forever: normalize() never rotates,
    // the track sits one step past its rest position, and the reader sees the
    // PREVIOUS card hanging on the left with no next-card peek on the right.
    // ⚠️ THIS IS INVISIBLE AT 1440. The design width makes the card exactly 1216
    // and every boundary a whole number, so testing there will never show it.
    // Test any width that makes the clamp produce a fraction.
    while (track.scrollLeft >= step * 2 - 1 && guard++ < 16) {
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

  // ...and the field lifts away as the reader moves. See measureFieldTuck above.
  // ⚠️ EASED OUT, AND ONLY BECAUSE THE MASK MADE IT FREE TO BE. While this was
  // the thing keeping colour off the bar it had to be LINEAR — it was reporting
  // a distance closing, and the gap had to reach zero exactly at the dock. The
  // mask now ends on the bar's top by construction (hero.css), so the bar is
  // clean at every scroll position on its own and this is pure parallax. Cubic
  // ease-out front-loads it: 27% of the travel in the first 10% of the scroll,
  // 88% by the halfway point, so the artwork answers the first gesture instead
  // of trailing it.
  // ⚠️ Easing the MAPPING is not a transition. This stays a pure function of
  // scrollY with no time term, so it cannot lag the page — see the standing rule
  // that nothing scroll-linked may carry a CSS transition.
  const t = fieldDockScroll > 0
    ? Math.min(1, Math.max(0, window.scrollY / fieldDockScroll)) : 0;
  setFieldScroll(fieldOverhang === 0 ? 0
    : Math.round(fieldOverhang * (1 - Math.pow(1 - t, 3))));

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
  updatePeekDir();

  // About's parallax. Guarded: project pages have no #about, so nothing is ever
  // published and the CSS fallback (0px) leaves them exactly as they were.
  if (aboutSection) {
    const vh = window.innerHeight;
    const r = aboutSection.getBoundingClientRect();
    // Distance of the section's centre from the viewport's — 0 where it settles,
    // signed, so the lag flips with the approach direction on its own.
    const d = (r.top + r.height / 2) - vh / 2;
    const span = Math.max(1, vh * ABOUT_PEEK.span);
    const n = Math.min(1, Math.abs(d) / span);

    // ⚠️ NEGATED: the copy is pulled UP on the approach and settles DOWN into
    // place, so it arrives EARLIER rather than lagging behind the section. It
    // used to lag downward, which delayed the content exactly while the reader
    // was coming to it — the same sign error Contact's peek had, and fixed the
    // same way. Leaving upward it still pushes down, which is what the
    // ledge-proximity blend below wants.
    let peek = -Math.sign(d) * ABOUT_PEEK.max * n * n * (3 - 2 * n);

    // ⚠️ AS CONTACT ARRIVES, ABOUT'S COPY IS PUSHED TOWARD THE LEDGE rather than
    // left to its own lag. Its lag is NEGATIVE while it leaves upward — exactly
    // while Contact approaches — which lifts the copy AWAY from the panel and
    // opens bare cream above the dissolve. Measured before this: the visible gap
    // went 96 -> 156, widened by the whole peek, and the ledge cannot absorb it
    // because it is sized from OFFSETS (transform-blind) and stays 96 while the
    // gap grows.
    //
    // Tapering the lag to zero fixes that but only gets back to 96. Blending it
    // to a positive PUSH goes further and closes the seam: the copy leans into
    // the top of the dissolve, where the ramp's alpha is still low enough to
    // cost it nothing (11.2:1 at the shipped 40px).
    //
    // The blend runs on Contact's own approach, so it is symmetric: scrolling up
    // to About, Contact recedes and the push relaxes back into the lag.
    if (contactSection) {
      const ce = contactSection.getBoundingClientRect().top;
      const near = Math.max(0, Math.min(1, (vh - ce) / (vh * 0.75)));
      peek = peek * (1 - near) + ABOUT_PEEK.push * near;
    }
    setAboutPeek(Math.round(peek));
  }

  const stickyBars = [siteHeader, introBar].filter(Boolean);
  if (contactSection && stickyBars.length) {
    const contactRect = contactSection.getBoundingClientRect();
    if (contactRect.height === 0) {
      // Contact is hidden (dropped at the mobile tier) — there's no blue panel to
      // invert over, so keep the bars in their normal (cream) state.
      stickyBars.forEach(bar => bar.classList.remove('is-over-dark'));
      setBarBleed(BAR_BLEED);
      setDarkMix(0);
      setBarFill('');
      setContactPeek(0);
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
      // ⚠️ THE SAME RULE, GENERALISED FROM A HARD EDGE TO A SOFT ONE. The line
      // this replaces read (invertLine - contact.top) / invertLine: the fraction
      // of the bar's band the panel covers. That IS the mean alpha of Contact's
      // fill over the band — but only because a hard edge is alpha 1 below the
      // edge and 0 above it. With a ledge the same sentence still holds; the
      // integral just has a ramp in it.
      //
      // So the bar starts tinting early NOT because a start point was picked,
      // but because there is genuinely blue behind it — which is exactly what
      // the shipped rule was written to guarantee. A soft edge satisfies it
      // rather than breaking it.
      //
      // ⚠️ With contactLedge 0 this returns the old expression EXACTLY (verified
      // to zero delta across the whole approach), so project pages, no-JS and
      // any future hard-edged panel are untouched.
      // ---- LEDGE GEOMETRY, hoisted: the coverage rule and the label flip both
      // read the LIVE ledge, so it has to exist before them. ----
      const ledge = contactLedge;                    // measured, not read per frame
      const edge = contactRect.top;
      // The ledge's live height, SHORTENED as the reader scrolls up so its top
      // descends and the blue sits lower. Everything downstream takes this rather
      // than the token, or the bar's fill stops matching the ramp it is a window
      // onto and the seam comes back.
      //
      // THE REACH: how far the ledge is allowed to climb over About at this
      // scroll position. 0 at About's resting edge (the ledge is exactly its
      // bottom padding and the copy sits on clean cream), 1 once the reader has
      // travelled `span` of the way to Contact's own resting edge.
      // ⚠️ Smoothstep, so it is flat at BOTH ends — the growth neither starts nor
      // stops with a kink, and About's resting composition is a stationary point
      // rather than a corner the reader crosses.
      const reachSpan = (aboutRestEdge - contactRestEdge) * CONTACT.reach.span;
      const reachT = aboutRestEdge > 0 && reachSpan > 0
        ? Math.max(0, Math.min(1, (aboutRestEdge - edge) / reachSpan))
        : 1;                                   // unmeasurable -> today's full ledge
      const reach = reachT * reachT * (3 - 2 * reachT);
      const restLen = Math.min(contactLedgeRest, ledge);
      const reached = restLen + (ledge - restLen) * reach;
      const ledgeShorten = Math.max(0, peekDir) * CONTACT.peek.ledgeShorten;
      const liveLedge = Math.max(1, reached - ledgeShorten);
      setLedgeLift(Math.round(ledge - liveLedge));
      setContactEdge(Math.round(edge * 100) / 100);

      const covered = blueBehindBar(contactRect.top, liveLedge, invertLine);
      const mix = Math.max(0, Math.min(1, covered / DARK_FULL_AT));
      setDarkMix(mix);
      // THE LABELS SWITCH ONCE, AND ON WHAT THEY ACTUALLY SIT ON.
      //
      // ⚠️ `mix >= DARK_TEXT_AT` IS WRONG ONCE THERE IS A LEDGE, and it fails in
      // the dangerous direction. 0.85 was calibrated when --dark-mix meant "the
      // fraction of the bar covered by OPAQUE blue"; it now means "the mean alpha
      // of a soft ramp", which is a different quantity. Measured on the shipped
      // ledge, the flip landed at Contact's edge 140 where the backdrop under the
      // glyphs is rgb(160,158,252) and WHITE READS 2.40:1 — well under AA, for
      // ~75px of scroll.
      //
      // The bar is a gradient now, so the honest test is the alpha at the GLYPHS'
      // own mid-line against the measured black/white crossover. At that point
      // both are 4.58:1. No proxy, and nothing to re-tune if the ramp changes.
      //
      // The old test is kept for a hard edge (--contact-ledge: 0), where the
      // gradient does not exist and 0.85 is still the measured answer.
      const flipToWhite = liveLedge > 0
        ? contactAlphaAt(contactGlyphMid, contactRect.top, liveLedge) >= DARK_TEXT_ALPHA
        : mix >= DARK_TEXT_AT;
      stickyBars.forEach(bar => bar.classList.toggle('is-over-dark', flipToWhite));

      // CLIP THE FROST TO CONTACT'S TOP EDGE. The bar's glass bleeds BAR_BLEED
      // past its own bottom so it melts into the page instead of ending on a
      // line — right over cream content, wrong over Contact, which is a
      // hard-edged full-bleed panel. For the ~100px before the bar inverts, that
      // cream blur was lying across the top of the blue and veiling it.
      // Handing back exactly the gap keeps the frost on the cream it belongs to:
      // full bleed until the panel is within reach, then shrinking to 0 as the
      // two meet, so they butt together as solid strips.
      setBarBleed(Math.max(0, Math.min(BAR_BLEED, Math.round(gap))));

      // ---- THE LEDGE, THE BAR'S FILL, AND THE PEEK ----------------------
      // Build the bar's fill only while the ledge is anywhere near it. Outside
      // that the flat fallback in hero.css is already correct — cream above,
      // solid accent below — so this costs nothing for most of the page.
      // ⚠️ AND ONLY WHERE THE BAR EXISTS. At ≤680 responsive.css sets
      // .intro-bar { display: none } and the mobile header carries the nav, so
      // there is no bar to paint a ramp into. The ledge itself still renders —
      // it is the panel's own edge, not the bar's.
      const barLive = introBar && introBar.offsetParent !== null;
      if (barLive && ledge > 0 && edge > 0 && edge - liveLedge < barHeight + BAR_BLEED + 2) {
        setBarFill(buildBarFill(edge, liveLedge));
      } else {
        setBarFill('');
      }

      // THE PARALLAX PEEK. The copy is offset downward and the offset shrinks as
      // the panel rises, so it travels UP faster than the panel and is revealed
      // into place. Same cubic ease-out as the hero's --field-scroll tuck — one
      // curve for both parallaxes on the site.
      //
      // ⚠️ IT IS EXACTLY 0 AT REST, which is the design constraint: the settled
      // composition has to be byte-identical to before this existed.
      //
      // The window runs from the panel entering the fold down to `endAt` of the
      // way to the scroll floor. ⚠️ The floor is MEASURED (the panel's resting
      // edge), not assumed to be 0: on a page short enough that Contact never
      // reaches the top, a hard-coded 0 would leave the copy permanently offset.
      const vh = window.innerHeight;
      const meetEdge = ledge + barHeight;
      const restEdge = contactRestEdge;              // measured, not read per frame
      // The nav line, floored at the panel's own resting edge so a short page
      // cannot ask for a position it can never reach.
      const endEdge = Math.max(restEdge, barHeight);

      // ⚠️ THE WINDOW IS ANCHORED TO THE COPY, NOT TO THE PANEL'S EDGE, and that
      // is the whole reason the peek is visible at all. The copy sits
      // contactCopyOffset (~327px) BELOW the panel's top, so starting the window
      // when the EDGE crosses the fold starts it while the copy is still a third
      // of a screen below it. Measured at 900 tall: 58% of the peek was spent
      // before the heading appeared (80 -> 34 with it still off-screen), and it
      // was down to 20 by the time it crossed. Scrolling down you saw the last
      // 20px; scrolling up you watched the copy pushed away, which reads clearly
      // — a real asymmetry in VISIBILITY from a function with no direction term.
      //
      // Starting where the COPY meets the fold puts the whole travel on screen.
      // The peak is subtracted too: the copy is offset downward by it, so the
      // anchor has to account for its own displacement or the copy still starts
      // below the fold.
      // +max, not -max: the copy is pulled UP by the peek now, so it reaches the
      // fold EARLIER than its resting offset would put it.
      const startEdge = Math.max(endEdge + 1, vh - contactCopyOffset + CONTACT.peek.max);
      const span = Math.max(1, startEdge - endEdge);
      const travel = Math.min(Math.max(0, edge - endEdge), span);
      const peakPeek = Math.min(CONTACT.peek.max, CONTACT.peek.rate * span);
      // ⚠️ SMOOTHSTEP, NOT THE HERO TUCK'S CUBIC — and the two requirements are
      // genuinely incompatible, so this is a trade rather than a correction. A
      // cubic ease-out is FLAT by two-thirds of its window by construction: it
      // was measured at 80 -> 19 over the first third and ~0 for the rest, so
      // "keep moving until the nav meets the section" cannot be expressed with
      // it at any window length. Smoothstep spends the travel evenly across the
      // middle and is still flat at BOTH ends, so it leaves the hold and lands
      // at the dock without a corner.
      // The cost is that the peek no longer shares a curve with --field-scroll;
      // the hero tuck's front-loading is right there because its window starts
      // at the reader's first gesture, and wrong here for the same reason.
      // ⚠️ THE OFFSET IS NEGATIVE — the copy is pulled UP during the approach and
      // settles DOWN into its composed position. It lagged downward until 2026-09,
      // which was backwards for this section: the copy already sits 232px below
      // the panel's top at rest (64 nav + 96 padding + 72 centring slack), so a
      // downward lag ADDED to the emptiest part of the arrival. Measured at
      // Contact's edge 300 the gap above the copy was 266 — 232 of composition
      // plus 34 of peek working against it.
      // ⚠️ IT STILL REVEALS UPWARD. The panel rises faster than the copy settles,
      // so the copy's net screen travel is still upward (452 -> 296 at cap 80);
      // only the gap above it closes instead of opening.
      // The resting value is 0 either way, so the composed layout is untouched.
      const x = travel / span;                        // 1 at first sight, 0 at the nav line
      const magnitude = peakPeek * x * x * (3 - 2 * x);
      // -1 scrolling down (lag, gap closes), +1 scrolling up (lead, drops away).
      // Magnitude is 0 at the resting position, so the sign can never snap there.
      setContactPeek(Math.round(magnitude * peekDir));
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
// The field tuck's two numbers are pure layout, so they are measured once and on
// resize rather than every frame — and the resize matters more than usual here,
// because the overhang they describe is created by the window's HEIGHT while the
// field's own height follows its WIDTH. Re-measure, then republish immediately:
// the ramp's slope has changed under the reader's current scroll position.
measureFieldTuck();
measureContactArrival();
measureAboutRest();
window.addEventListener('resize', () => {
  measureFieldTuck();
  measureContactArrival();
  measureAboutRest();
  updateScrollEffects();
});
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
// Fraction of a section's leftover space placed ABOVE its content when it
// settles. 0.5 is a true centre; lower lifts the content.
const SECTION_BIAS = { about: 0.34 };

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
  // ⚠️ OFFSETS, NOT getBoundingClientRect — the children can be TRANSFORMED.
  // About's parallax translates its two .site-container children, and a rect
  // reports that translation, so the target was computed from wherever the peek
  // happened to have the content at the moment of the click. Measured: About
  // settled with its heading at -104, off the top of the screen, because the
  // peek was at -60 when the target was taken. Offsets ignore transforms, so
  // this is the section's real position whatever the parallax is doing.
  // Same rule as measureFieldTuck and measureContactArrival.
  const pageTopOf = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  function restingFor(el) {
    const kids = el.children;
    let contentDocTop = pageTopOf(el);
    let contentHeight = el.offsetHeight;
    if (kids.length) {
      const firstTop = pageTopOf(kids[0]);
      const lastEl = kids[kids.length - 1];
      contentDocTop = firstTop;
      contentHeight = Math.max(0, (pageTopOf(lastEl) + lastEl.offsetHeight) - firstTop);
    }
    const available = window.innerHeight - NAV_OFFSET;
    // ⚠️ THE LEFTOVER IS NOT ALWAYS SPLIT EVENLY. A true centre (0.5) put About
    // 98px under the nav with 153px below it — visibly low, because the eye reads
    // a block as centred when it sits slightly ABOVE the geometric middle, and
    // because About's content is top-heavy (a 56px heading over body copy).
    // SECTION_BIAS is the fraction of the leftover placed ABOVE the content.
    // Work and Contact keep 0.5; only About is lifted.
    // ⚠️ A smaller bias means a LARGER resting scrollY, which moves the scroll
    // spy's threshold LATER — and Contact's click target (topAlignedFor) does not
    // move with it. Those two must not cross: re-measure the margin after
    // changing this. See the note on --contact-lift.
    const bias = SECTION_BIAS[el.id] ?? 0.5;
    const wantedTop = NAV_OFFSET + Math.max(0, (available - contentHeight) * bias);
    // contentDocTop is already a DOCUMENT coordinate, so no scrollY term here.
    const target = contentDocTop - wantedTop;
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
  measureAboutRest();   // the reach window's top anchor; needs the line above.

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
