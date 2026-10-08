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
// When the SCROLL-SPY counts a section as arrived, which can come BEFORE its
// resting position. Same TDZ rule — declared here, set by initSectionGeometry.
let sectionSpyScrollY = null;
// Per section, how far down the viewport its content's top edge may still be
// when the spy switches to it (a fraction of the viewport height). Work needs
// it because the masonry is TALLER THAN THE SCREEN: its resting position puts
// the first cards right under the nav, so at 1440x900 the cards were fully on
// screen from scrollY ~300 while "Selected work" only lit at ~700. At 0.7 it
// lights once the first cards are 70% of the way down the screen (0.5 was
// mid-screen and read a touch late). Sections not
// listed use their resting position unchanged, as before.
const SPY_LEAD = { 'work-section': 0.7 };
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
let lastFieldCream = -1;
function setFieldCream(px) {
  // Same contract as setFieldScroll: root, rounded, guarded — per scroll frame.
  if (px === lastFieldCream) return;
  lastFieldCream = px;
  document.documentElement.style.setProperty('--field-cream', px + 'px');
}
// --field-cream shifts the MASK's end up (hero.css), so the white dissolve rides
// up the artwork. It is the artwork's lag plus the tuck's overhang — see the
// three-speed block in updateScrollEffects.
// How much of the scroll to the dock the tuck's overhang takes to close.
const FIELD_TUCK = { span: 0.6 };
// The artwork's lag: it moves at (1 − k) of the scroll while the white, the nav
// and Selected Work move at exactly 1 and slide up over it.
// REDESIGN: 0.5 (was 0.3) — the gradient drifts at half the scroll speed.
const FIELD_LAG = { k: 0.5 };
// The hero TEXT's parallax: the headline, divider and bio rise at a constant
// 1 + speed of the scroll — the fastest of the three layers. LINEAR, because a
// changing speed is what read as loose. Held once the bar pins; the text is off
// screen by then.
// REDESIGN: the lockup's PARALLAX over Selected Work — extra lift per px of
// scroll on top of riding Work's own push (see setHeroTextLift), so the text
// scrolls away faster than Work rises and fades out (once Work fills half the viewport) as it
// goes. 0 would lock the two together (no parallax, constant gap).
const HERO_TEXT = { speed: 0.8 };
let lastHeroTextLift = -1;
function setHeroTextLift(px) {
  if (px === lastHeroTextLift) return;
  lastHeroTextLift = px;
  document.documentElement.style.setProperty('--hero-text-lift', px + 'px');
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

// ABOUT → CONTACT IS THE HERO → WORK TRANSITION IN REVERSE (redesign,
// 2026-09-28, Jenna's ask). Three parts, each the mirror of one in the hero:
//   · the blue LEADS the panel and settles at HALF speed (CONTACT_LAG) — the
//     mirror of the gradient drifting at (1 − FIELD_LAG.k) as it leaves;
//   · About's copy lifts away faster than the scroll (ABOUT_LIFT.speed, the
//     hero lockup's HERO_TEXT.speed) and fades once the blue fills more than
//     half the viewport (fadeAt — the lockup's "Work fills half" rule);
//   · the blue scrim RIDES the copy: the ledge's top keeps ABOUT_LIFT.gap below
//     About's last line — the mirror of the white riding the lockup.
// All three are 0 at both resting positions (About's and Contact's), so both
// settled compositions are unchanged. Pure functions of scroll; the fade is a
// timed class toggle, like the lockup's.
const CONTACT_LAG = { k: 0 };      // OFF (2026-09-28, Jenna: "it pulls") — was 0.5
const ABOUT_LIFT = { speed: 0, fadeAt: 0.5, gap: 16 }; // lift OFF (was 0.8); fade + gap still live
// Contact's copy RIDES the blue on the way in: its heading holds `ride` px
// under the blue's top, then settles into its centred resting place as the page
// lands — so the blue never arrives as an empty band ahead of the content.
const CONTACT_COPY = { ride: null, navRamp: 96 }; // ride OFF (was 128): the copy reveals in order instead
let contactQ = 1;
// ...and the fourth part, the one that sets the PACE: Contact is laid out
// SHORTER by `px` (capped at `cap` of the About → Contact scroll), pulled back
// down by --contact-push at About's rest, and the push unwinds on the hero's own
// cubic ease-out (1 − q)³ — so Contact rises fastest on the first gesture past
// About and lands at exactly 1x. The mirror of HERO_SHORTEN.
const CONTACT_SHORTEN = { px: 0, cap: 0.5 }; // OFF — this was the sudden pull (was 500)
let contactShorten = 0;
let aboutRestY = null;
let lastContactPush = -1;
function setContactPush(px) {
  if (px === lastContactPush) return;
  lastContactPush = px;
  document.documentElement.style.setProperty('--contact-push', px + 'px');
}

let lastContactLag = 1;
function setContactLag(px) {
  // Moves .contact-bg's top and the ledge's bottom together (sections.css).
  if (px === lastContactLag) return;
  lastContactLag = px;
  document.documentElement.style.setProperty('--contact-lag', px + 'px');
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
  aboutRestY = null;
  // Zeroed FIRST, so the About → Contact distance is measured unshortened.
  contactShorten = 0;
  document.documentElement.style.setProperty('--contact-shorten', '0px');
  if (!contactSection || !aboutSection || !sectionRestingScrollY) return;
  const rest = sectionRestingScrollY(aboutSection);
  if (rest == null) return;   // ≤680 / reduced motion: nothing settles, so the
  const pageTop = (el) => {    // reach falls back to full, i.e. today's ledge.
    let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const maxY = () => document.documentElement.scrollHeight - window.innerHeight;
  if (!reducedMotion.matches) {
    contactShorten = Math.round(Math.max(0,
      Math.min(CONTACT_SHORTEN.px, (maxY() - rest) * CONTACT_SHORTEN.cap)));
    document.documentElement.style.setProperty('--contact-shorten', contactShorten + 'px');
  }
  aboutRestY = rest;
  // In ON-SCREEN terms: at About's rest the push is the whole shorten, so the
  // panel is seen exactly where it was before the layout moved.
  aboutRestEdge = Math.max(0, pageTop(contactSection) - rest + contactShorten);
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
  // Layout offsets, not a rect: the section carries translates (the hero's push
  // and --contact-push) that must not leak into a resting position.
  const docTop = (() => { let y = 0; for (let n = contactSection; n; n = n.offsetParent) y += n.offsetTop; return y; })();
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
// EXPERIMENT (hero-shorten): the hero is laid out SHORTER by `px`, so the nav
// and Selected Work genuinely sit higher and the bar pins after less scroll —
// then --hero-push translates them back DOWN by the same amount at rest, so the
// landing is unchanged, and unwinds LINEARLY to 0 exactly as the bar pins. The
// nav and Work therefore move at a constant 1 + px / dock of the scroll: faster,
// and constant, so none of the glide's speed-up-then-slow-down.
// ⚠️ It is a LAYOUT change (the bar's margin-top reads --hero-shorten), so it is
// only applied while this script can push things back: no JS, no shortening.
// ⚠️ px IS THE SPEED DIAL: nav/Work run at 1 + px / (bar's resting top − px) of
// the scroll. At 1440x900: 180 → 1.28x (imperceptible) · 240 → 1.41x (current) ·
// 300 → 1.58x · the 410 cap → 2.0x ("too free", lost the scroll's tension).
// REDESIGN: 400 (was 240). The extra is what used to be a text-only boost;
// carried here it lifts the lockup AND Selected Work together on the first
// gesture, so the gap between them holds instead of opening.
// 530 + a cap of 0.65 of the bar's resting top (was 400 / 0.5): Work gets its
// own share of the parallax speed — it rises faster to follow the lockup, which
// still leads it by HERO_TEXT.speed. Larger = faster Work, earlier pin.
const HERO_SHORTEN = { px: 530, cap: 0.65, bias: 1.5 };
let heroShorten = 0;
let fieldVisibleEnd = 0;
let lastHeroShorten = -1;
function setHeroShorten(px) {
  if (px === lastHeroShorten) return;
  lastHeroShorten = px;
  document.documentElement.style.setProperty('--hero-shorten', px + 'px');
}
let lastHeroPush = -1;
function setHeroPush(px) {
  if (px === lastHeroPush) return;
  lastHeroPush = px;
  document.documentElement.style.setProperty('--hero-push', px + 'px');
}
function measureFieldTuck() {
  // REDESIGN: measure with the bar back in flow — is-bar-lifted makes it
  // position: fixed (no offsetParent, no margins). updateScrollEffects re-adds
  // the class on its next pass.
  document.documentElement.classList.remove('is-bar-lifted');
  fieldOverhang = 0;
  fieldDockScroll = 0;
  fieldVisibleEnd = 0;
  heroShorten = 0;
  // Unshorten first: the tier or the window may have changed, and every number
  // below is measured against the layout this leaves.
  setHeroShorten(0);
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
  // animation's mid-flight position. Same rule as the Work carousel's photo
  // measurement — offsets ignore transforms.
  const pageTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  // Measured UNSHORTENED: this is where the bar sits at rest on screen, and
  // every visual target (the gap, the overhang) is about what the reader sees.
  const barRest = pageTop(intro) + intro.offsetHeight
    + parseFloat(getComputedStyle(introBar).marginTop || '0');
  if (barRest <= 0) return;
  const bio = document.querySelector('.intro-bio');
  if (bio) setFieldGap(Math.max(0, Math.round(barRest - (pageTop(bio) + bio.offsetHeight))));
  // ⚠️ THE TARGET IS THE BAR'S TOP, NOT ITS BOTTOM. Aiming at the bottom is the
  // obvious reading of "don't bleed past the bar" and it leaves the artwork
  // visible: the mask's last 40% is a fade, so landing its zero-alpha edge on the
  // bar's bottom line puts the whole faint tail of the ramp BEHIND the docked
  // bar, and the bar's own frost is translucent. Measured at 1440x740 that tail
  // still read as a coral wash across the strip. Landing it on the bar's TOP
  // instead means the field has ended before the bar begins.
  // ⚠️ AND THE TARGET IS THE ARTWORK'S *VISIBLE* END, NOT ITS BOX. Two things end
  // it above the box bottom: --field-rise has already lifted the field (offsets
  // don't see that transform), and the mask dissolves it at the FOLD
  // (min(100%, 100svh + rise) — hero.css). Aiming the box bottom at the bar
  // over-lifted by both: measured 30px of bare cream between the dissolve and
  // the docked bar at 1440x900, and 139px at 1440x740, where the fold binds.
  const rise = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--field-rise')) || 0;
  const svhProbe = document.createElement('div');
  svhProbe.style.cssText = 'position:absolute;top:0;height:100svh;visibility:hidden';
  document.body.appendChild(svhProbe);
  const svh = svhProbe.offsetHeight;
  svhProbe.remove();
  const visibleEnd = Math.min(fieldBottom - rise, mainTop + pageField.offsetTop + svh);
  fieldOverhang = Math.max(0, Math.round(visibleEnd - barRest));
  fieldVisibleEnd = visibleEnd;
  // Now shorten. Capped at half the bar's resting top so a short window still
  // has scroll left to unwind the push over.
  heroShorten = Math.round(Math.min(HERO_SHORTEN.px, barRest * HERO_SHORTEN.cap));
  setHeroShorten(heroShorten);
  // The bar pins when its LAYOUT top reaches the viewport's — the shortened one.
  fieldDockScroll = barRest - heroShorten;
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
  if (html.classList.contains('is-intro')) { runIntro(); return; }
  setTimeout(revealSite, 200);
}

// LOAD SCREEN (hero.css, --intro): the orbs are shown alone for at least
// INTRO.hold ms, longer only if the page itself isn't ready, never past
// INTRO.cap. Then is-intro comes off — the scrim rises (a CSS transition on
// --intro) and the nav + hero fade in — and the sections below follow.
const INTRO = { hold: 1500, iris: 1400, cap: 9000, followMs: 900 };
function runIntro() {
  // No scrolling under the loader. overflow: hidden stops the browser, but Lenis
  // drives scroll programmatically and ignores it, so wheel/touch/keys that
  // arrive during the intro would move the page and leave the reader mid-page
  // (at Work) when it opens. Swallowed here, restored at release.
  const block = e => {
    if (e.type === 'keydown' && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar'].includes(e.key)) return;
    e.preventDefault();
  };
  const blocked = ['wheel', 'touchmove', 'keydown'];
  blocked.forEach(t => window.addEventListener(t, block, { passive: false, capture: true }));
  const unblock = () => {
    blocked.forEach(t => window.removeEventListener(t, block, { capture: true }));
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  };
  window.scrollTo(0, 0);
  // initHeroField runs after initHero(); give it a beat, then check it drew.
  // No WebGL = no orbs to show, so skip the screen and reveal as usual.
  setTimeout(() => {
    if (!html.classList.contains('is-field-live')) {
      html.classList.remove('is-intro');
      unblock();
      setTimeout(revealSite, 200);
      return;
    }
    // Grow the artwork just enough to cover the viewport while it is dropped to
    // the top (its box is up to ~8% shorter than the screen on tall tablets).
    const box = document.querySelector('.page-field-canvas');
    if (box && box.offsetHeight) {
      html.style.setProperty('--intro-scale',
        (Math.max(1, window.innerHeight / box.offsetHeight) * 1.01).toFixed(4));
    }
    // IRIS: the orbs are shown through a circle that grows from a small dot at
    // the centre of the viewport until it clears the corners. Pre-paint the CSS
    // holds it at 14px (html.is-intro .page-field-*); this animates it on, and
    // release cancels it (the CSS rule goes with the class, so the field is whole).
    const irisR = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight) / 2 * 1.05);
    const irisY = window.innerHeight / 2;
    const irises = Array.from(document.querySelectorAll('.page-field-canvas, .page-field-grain'))
      .map(el => el.animate(
        [{ clipPath: `circle(14px at 50% ${irisY}px)` },
         { clipPath: `circle(${irisR}px at 50% ${irisY}px)` }],
        { duration: INTRO.iris, easing: 'cubic-bezier(0.65, 0, 0.2, 1)', fill: 'forwards' }));
    const pageReady = Promise.all([
      document.readyState === 'complete'
        ? null
        : new Promise(r => window.addEventListener('load', r, { once: true })),
      document.fonts ? document.fonts.ready : null
    ]);
    const held = new Promise(r => setTimeout(r, INTRO.hold));
    const cap = new Promise(r => setTimeout(r, INTRO.cap));
    Promise.race([Promise.all([held, pageReady]), cap]).then(() => {
      if (siteRevealed) return;
      siteRevealed = true;
      html.classList.remove('is-intro');
      unblock();
      irises.forEach(a => a.cancel());
      html.classList.add('is-text-revealed');
      setTimeout(revealRestOfSite, INTRO.followMs);
    });
  }, 200);
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
// ⚠️ THE FIELD NO LONGER DOES THIS (FIELD.ramp.white 0, 2026-09) — see the
// note on `ramp` below. It fades each orb in its OWN hue instead, which is
// also not grey: the halo came from ramping to rgba(0,0,0,0), i.e. to black.
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
  // ⚠️ `white` IS 0 — THE ORBS FADE OUT IN THEIR OWN HUE, NOT TOWARD WHITE
  // (2026-09). How far the outer half lerps to white: 1 is Figma's ramp.
  // The white lerp is what made the field go pale and muddy as it PULSED: an
  // orb's outer half is a pastel ring, and when the orb swells that ring
  // spreads over everything painted beneath it — pale blue over red averages
  // to grey mauve. Cyan never suffered because nothing paints above it.
  // Measured at 1440x900 over 16 exact phases (cyan pulse 0.15), floors:
  //   white  muddy share  field sat   bio    headline
  //   1      11–20%       0.46–0.52   2.75   2.42
  //   0.5    12–17%       0.48–0.53   2.93   2.64
  //   0      11–14%       0.49–0.54   3.04   2.89   <- shipped
  // ⚠️ IT IS ALSO THE BIGGEST CONTRAST GAIN THIS FIELD HAS FOUND: the white
  // rings were lightening the gaps the text sits in. The bio clears 3:1 at
  // every phase measured. Fading in-hue is NOT the black-halo trap noted on
  // the ramp elsewhere — that came from lerping to rgba(0,0,0,0).
  ramp:  { mid: 0.524038, midAlpha: 0.5, white: 0 },
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
  // ⚠️ CYAN'S y WENT -0.016 -> 0.12 (2026-09) — THE ONE CASE WHERE THE CENTRE
  // *IS* THE LEVER, because cyan is already on top of the stack. With offsetY it
  // sat at -0.27 of the field, core OFF the canvas, so only its faded fringe
  // showed — and a half-alpha cyan over red averages to grey mauve, which is the
  // "muddy" middle. At 0.12 the core reaches the top of the fold. Measured over
  // 12 exact phases, rendered shader pixels, worst pixel under the glyph boxes:
  //   1440x900  cyan share 1.7% -> 6.3%   bio 2.86 -> 2.79 floor   headline flat
  //   1440x740  cyan share 2.1% -> 7.6%   bio 3.00 -> 3.03 floor   headline -0.10
  // Past ~0.16 the gain keeps coming but the headline floor keeps slipping.
  // ⚠️ CYAN ALSO HOLDS ITS COLOUR LONGER (`ramp`, 2026-09) — a per-orb override
  // of FIELD.ramp, merged over it in draw(), so the other three are unchanged.
  // Same sweep, 1440x900, 12 phases, y 0.12 (bio/headline FLOORS):
  //   mid/midAlpha   cyan share  cyan sat  bio    headline
  //   shared .524/.5   6.3%       0.59     2.63   2.28
  //   .62/.6          17.5%       0.62     2.57   2.22   <- shipped
  //   .524/.7         14.8%       0.68     2.55   2.21
  //   .62/.7          21.5%       0.70     2.52   2.20
  //   .7/.7           27.9%       0.71     2.52   2.18
  // Pushing `mid` out spreads the blue further for less contrast than raising
  // midAlpha does; midAlpha is what makes it more SATURATED. Both cost the bio.
  // ⚠️ THEN y CAME BACK UP 0.12 -> 0.08, to let red show under the blue. With
  // the .62/.6 ramp, y trades cyan for red almost one-for-one and contrast
  // IMPROVES slightly as it rises (1440x900, same 12 phases):
  //   y      cyan    red     bio    headline
  //   0.12   17.5%    9.3%   2.57   2.22
  //   0.08   15.1%   11.8%   2.59   2.25   <- shipped
  //   0.04   12.8%   14.6%   2.60   2.29
  // This is the balance dial between the two — not a contrast lever.
  // ⚠️ CYAN PULSES AT 0.15, HALF THE OTHERS (`pulse`, 2026-09). It is top of the
  // stack, so its swelling covers red outright: at 0.30 red's share of the fold
  // fell to 1% at cyan's peak. At 0.15 red holds 12–24% through the cycle.
  // Blobs may set `pulse`; the rest take FIELD.motion.pulse.
  blobs: [
    // REDESIGN (2026-09-27): the hero text sits on WHITE now, so the contrast
    // limits that shaped these orbs no longer bind — they are tuned for colour.
    // Red now paints at the BOTTOM (paintOrder), and magenta/violet — which
    // sit over it — are SMALLER and held near their edges, so each reads as a
    // distinct orb: magenta left, red centre, violet right. All three hold
    // their colour further out (per-orb ramp); cyan lost its ramp boost and
    // then came down and grew a little (r .48 y .16). Measured over the
    // visible band at 1440x900: magenta 45%, red 30%, purple 16%, blue 8%.
    // Was, in order:
    //   magenta r .652 x .107 · violet r .5054 x .942 y .499 · red (shared
    //   ramp) · cyan r .4738 ramp { mid .62, midAlpha .6 }.
    // ⚠️ lab/field-shader.html is NOT synced with this.
    { col: [0.8392, 0.3020, 0.8078], r: 0.36,   x: 0.10,  y: 0.375, a: 1.00, ramp: { mid: 0.60, midAlpha: 0.65 } }, // magenta #D64DCE
    { col: [0.5725, 0.2196, 0.8902], r: 0.36,   x: 0.93,  y: 0.45,  a: 1.00, ramp: { mid: 0.60, midAlpha: 0.65 } }, // violet  #9238E3
    { col: [0.9765, 0.2471, 0.2471], r: 0.6275, x: 0.590, y: 0.640, a: 1.00, ramp: { mid: 0.62, midAlpha: 0.72 } }, // red     #F93F3F
    { col: [0.0039, 0.6235, 0.8471], r: 0.48,   x: 0.547, y: 0.16,  a: 1.00, pulse: 0.15 }, // cyan #019FD8 (was r .42 y .08)
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
  // PAINT ORDER — indices into `blobs`, BOTTOM first. Tuned in
  // lab/field-orbs.html against an exhaustive sweep of all 24 permutations,
  // scored on the worst pixel under the glyph lines across 12 orbit phases and
  // constrained to keep the blue. Was [0,1,2,3] (magenta, violet, red, cyan).
  //   before  bio 2.96-3.36 (2 of 12 phases under 3:1)   headline 2.31
  //   now     bio 3.16-3.34 (0 of 12)                    headline 2.59
  // ⚠️ THE BLUE CONSTRAINT IS WHAT PICKED THIS. The unconstrained winner
  // ([0,3,1,2], bio 3.26) gets there by burying cyan — blue share collapses
  // 16.3% -> 1.2%. Re-tune without that constraint and it finds the same cheat.
  // ⚠️ uCol MUST be permuted with uBlob. The shader composites slot 0 first, so
  // the uniform slot IS the stack position; upload one reordered and not the
  // other and every orb paints in its neighbour's colour.
  // REDESIGN (2026-09-27): RED AT THE BOTTOM — [2, 1, 0, 3] = red, violet,
  // magenta, cyan. Red was third, over violet and magenta, and with the
  // biggest reach it blanketed both: no purple, no distinct magenta. Under
  // them it fills the middle while magenta (left) and violet (right) paint
  // over it at the sides. Was [1, 0, 2, 3].
  paintOrder: [2, 1, 0, 3],
  // PHONE LAYOUT (≤480, chosen at page load with FIELD_STATIC). The phone draws
  // the field into its own narrow PORTRAIT box (responsive.css, .page-field-canvas
  // at the 480 tier), and the desktop layout — composed for a 16:10 frame, sized
  // against its WIDTH — left the lower half of that box pale, exactly where the
  // phone's headline and bio sit. These x / y / r replace the blobs' own (same
  // order as `blobs`; colours, ramps, pulse and paint order are shared). y is a
  // fraction of the box's HEIGHT, r of its WIDTH, and a blob's vertical reach is
  // r × aspect, so in a portrait box every orb reaches LESS far up and down than
  // it does across — which is why these are larger than the desktop radii.
  // ⚠️ NO LONGER READ (2026-09-28): phones now derive their layout from the
  // desktop one (phoneBlob, beside tabletBlob) since their gradient became the
  // top --phone-field-h only. Kept as the record of the tall-box tuning.
  phone: {
    offsetY: 0,
    blobs: [
      { x: 0.12, y: 0.30, r: 0.76 }, // magenta — left, behind the headline
      { x: 0.92, y: 0.44, r: 0.66 }, // violet  — right, headline's line ends to divider
      { x: 0.45, y: 0.68, r: 1.00 }, // red     — centre, under the bio (and its 5-line wrap at 360)
      { x: 0.60, y: 0.02, r: 0.60 }, // cyan    — top, behind the header
    ],
  },
  // Shifts all four orbs together; negative is up. y is normalised to the
  // field's HEIGHT, so -0.25 is a quarter of it.
  offsetY: -0.25,
  // ENTRANCE — orbs arrive one at a time rather than all at once.
  // ⚠️ DESKTOP AND TABLET ONLY, and that is forced rather than chosen: the
  // shader writes alpha 1 from a CREAM base, so the canvas is OPAQUE. Above 480
  // there is no longer a JPEG under it (see the <picture> in index.html) so it
  // animates onto the page's own background; at <=480 the JPEG is still there
  // and an entrance would cover the photo with flat cream and then fade orbs up
  // over it — strictly worse than no entrance. Phones draw fully formed.
  // ⚠️ ORDER SEQUENCES ALONG paintOrder, so `reverse` means cyan (top) first.
  // Timings are indexed by ORB, not by stack slot — reordering the stack must
  // not silently re-time the entrance.
  // LOAD SCREEN: each orb GROWS from a point to full size (ease-out), staggered;
  // all done by ~1.35s so the 1.5s hold ends on a finished field.
  entrance: { lead: 0, stagger: 150, duration: 900 },
  // REDESIGN: speed 2.4 (was 1.85) — ~30% quicker drift and pulse, same travel.
  motion: { speed: 2.4, drift: 0.050, driftYRatio: 0.2, pulse: 0.30, warp: 0.55 },
  // Buffer size vs CSS px, as a CAP on devicePixelRatio (2026-09-29). It was a
  // flat 1.0 — "a soft gradient carries no per-pixel detail, so 1x on a 2x
  // display is a 4x fill-rate saving nobody can see" — and that turned out to
  // be wrong in practice: the feedback was the hero "looks like a low quality
  // image". At 1x the browser stretches the buffer 2x, which softens the orb
  // edges and, worse, blows the one-code-value DITHER up into 2x2 device-pixel
  // blocks — exactly the texture of an over-compressed JPEG. Rendering at the
  // display's own density keeps the dither at device pixels, where it vanishes.
  // Capped at 2: a 3x phone gains nothing visible over 2x and pays 2.25x.
  renderScale: 2,
};

/* ⚠️ PHONES NOW GET THE SHADER TOO (2026-09) — this used to bail here and hide
   the canvas in responsive.css, so ≤480 rendered the static JPEG only. Both
   halves are gone; they were PAIRED and had to move together.
   The original reason was cost: no WebGL context, no compile, no render loop,
   and none of the per-frame backdrop-filter work "the two glass layers" would do
   over a moving field. That last clause no longer describes this tier — one of
   those layers (`.intro::after`'s frost) is commented out site-wide, and the
   other is `.intro-bar`, which is `display: none` below 680. So the phone's
   moving-field blur cost is the header's frost alone.
   ⚠️ WHAT IS STILL UNVERIFIED IS GPU COST ON A REAL MID-RANGE PHONE. It cannot be
   measured here, and the pane cannot judge this motion at all (see CLAUDE.md on
   `document.visibilityState`). The canvas is 1250×763 at renderScale 1.0 — one
   fragment shader over four circles — but if it stutters, restoring the bail
   plus the `display: none` is the whole revert.
   ⚠️ The `FIELD_PHONE = matchMedia('(max-width: 480px)')` binding went with them.
   A declared-but-unread value is the exact hazard that took this field down once
   before (the dead GLSL `LAYER` constant) — if the bail comes back, re-declare
   it rather than leaving it parked here. */

function initHeroField() {
  const canvas = document.getElementById('hero-field');
  if (!canvas) return;        // project pages have no field

  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, powerPreference: 'low-power' })
          || canvas.getContext('experimental-webgl');
  if (!gl) return;       // stay on the JPEG

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = [
    'precision highp float;',
    'uniform vec2 uRes,uAmp;uniform float uAspect,uTime,uWarp;',
    'uniform vec4 uBlob[4];uniform vec3 uCol[4];uniform vec4 uRamp[4];',
    // ⚠️ FIELD.layer is deliberately NOT emitted here. It was, as a dead constant
    // `LAYER` that no line of the shader body ever read — and being dead did not
    // make it harmless: the value is interpolated into GLSL source, so setting it
    // to 1.0 emitted `const float LAYER=1;`, which is an int-to-float type error
    // that fails the whole compile. That threw initHeroField, the try/catch caught
    // it, and the page silently fell back to the JPEG — a config-only edit taking
    // the entire field down. Anything interpolated into this string must be a
    // GLSL-valid literal; JS stringifies 1.0 as "1", 0.9 as "0.9".
    // The ramp's mid stop is PER ORB now (uRamp[i] = mid, midAlpha, pulse, white), uploaded
    // from FIELD.ramp unless a blob overrides it — see `ramp` on the cyan blob.
    // As uniforms rather than interpolated constants, so they cannot hit the
    // int-literal trap described above.
    'const vec3 CREAM=vec3(' + FIELD.cream.join(',') + ');',
    // Each blob breathes — radius grows by up to its pulse (uRamp[i].z) on its
    // own slow cycle. Cheap life: it changes how far a blob REACHES without
    // moving its centre, so unlike drift it does not slide colour off the text.
    // Rates are per-blob and unequal, so they never swell in unison. The amount
    // is FIELD.motion.pulse unless a blob sets its own `pulse`.
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
    'float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}',
    // Figma's three-stop ramp: alpha 1 -> MIDA over the first half, then
    // MIDA -> 0 while the colour lerps to white.
    'vec2 ramp(float t,vec2 m){if(t>=1.)return vec2(0.,1.);',
    ' if(t<=m.x)return vec2(1.+(m.y-1.)*(t/m.x),0.);',
    ' float u=(t-m.x)/(1.-m.x);return vec2(m.y*(1.-u),u);}',
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
    '  float rad=uBlob[i].z*(1.+uRamp[i].z*(.5+.5*sin(uTime*(.075+fi*.017)+fi)));',
    '  vec2 d=vec2(w.x-c.x,(w.y-c.y)/uAspect);',
    '  vec2 ra=ramp(length(d)/rad,uRamp[i].xy);float a=ra.x*uBlob[i].w;',
    '  if(a<=0.)continue;',
    '  col=col*(1.-a)+mix(uCol[i],vec3(1.),ra.y*uRamp[i].w)*a;cov=max(cov,a);}',
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
  ['uRes', 'uAspect', 'uTime', 'uWarp', 'uAmp', 'uBlob', 'uCol', 'uRamp']
    .forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  gl.uniform1f(U.uWarp, FIELD.motion.warp);
  gl.uniform2f(U.uAmp,  FIELD.motion.drift, FIELD.motion.drift * FIELD.motion.driftYRatio);

  // The box's CSS size, kept for the tablet layout below.
  let boxW = 1, boxH = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    boxW = Math.max(1, r.width);
    boxH = Math.max(1, r.height);
    const scale = Math.min(window.devicePixelRatio || 1, FIELD.renderScale);
    const w = Math.max(1, Math.round(r.width  * scale));
    const h = Math.max(1, Math.round(r.height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  // When each orb starts, indexed by BLOB (not by stack slot) — the entrance
  // runs along the paint order, so the two are different things.
  const entranceStarts = (() => {
    const e = FIELD.entrance;
    const starts = FIELD.blobs.map(() => 0);
    [...FIELD.paintOrder].reverse().forEach((blobIdx, slot) => {
      starts[blobIdx] = slot === 0 ? 0 : e.lead + (slot - 1) * e.stagger;
    });
    return starts;
  })();
  const ENTRANCE_MS = Math.max(...entranceStarts) + FIELD.entrance.duration;

  // ⚠️ LINEAR, DELIBERATELY. An ease-out is at maximum velocity at t=0, so an
  // orb is most of the way visible in its first frames and then crawls — which
  // reads as a POP, not a fade. For a fixed duration linear has the lowest
  // possible peak rate of change; measured, easeOutCubic is 77% flashier here.
  // Right for the hero's reveals (already-visible things that MOVE), wrong for
  // something whose opacity IS its presence.
  const blobData = new Float32Array(16);
  const colData  = new Float32Array(12);
  const rampData = new Float32Array(16);

  // TABLET LAYOUT (481-1024, responsive.css draws the shader in a screen-width
  // box there): DERIVED from the desktop composition rather than hand-tuned, so
  // any tablet shape — portrait or landscape — reads like the web layout. Each
  // orb keeps its place in the VISIBLE COLOUR BAND (top of the screen to the
  // white's end at 72svh): x scales with the width, y with the band's height,
  // and the radius by a height-weighted mean of the two (see sr). The reference is the desktop at 1440x900 (box 1440 x 1440/1.6377,
  // band 0.72 x 900). The desktop offsetY is baked in, so none is added after.
  // Read per draw from the live box, so it follows a window being resized.
  const FIELD_TABLET = matchMedia('(max-width: 1024px)');
  const TABLET_REF = { w: 1440, h: 1440 / 1.6377, band: 0.72 * 900 };
  let fieldRisePx = null;
  let heroPeekPx = null;
  function tabletBlob(b) {
    if (fieldRisePx == null) {
      const rs = getComputedStyle(document.documentElement);
      fieldRisePx = parseFloat(rs.getPropertyValue('--field-rise')) || 0;
      // The tablet landing is --hero-peek shorter (responsive.css 1024 tier),
      // and the white ends that much higher — so the band is too.
      heroPeekPx = parseFloat(rs.getPropertyValue('--hero-peek')) || 0;
    }
    const sx = boxW / TABLET_REF.w;
    // The stacked 481–768 hero publishes its own white end (measurePhoneField).
    const stackEnd = parseFloat(document.documentElement.style.getPropertyValue('--hero-field-end'));
    const bandPx = Number.isFinite(stackEnd) ? stackEnd : 0.72 * window.innerHeight - heroPeekPx;
    const sy = bandPx / TABLET_REF.band;
    // Weighted toward the band's HEIGHT (2/3 : 1/3, not an even geometric
    // mean): red paints at the bottom and fills whatever the others don't
    // reach, so in a tall portrait band an even mix left it at 51% of the
    // colour. Landscape barely moves (sx and sy are close there).
    const sr = Math.pow(sy, 2 / 3) * Math.pow(sx, 1 / 3);
    const X = b.x * TABLET_REF.w * sx;
    const Y = ((b.y + FIELD.offsetY) * TABLET_REF.h - fieldRisePx) * sy;
    return Object.assign({}, b, {
      x: X / boxW,
      y: (Y + fieldRisePx) / boxH,
      r: (b.r * TABLET_REF.w * sr) / boxW,
    });
  }

  // PHONE LAYOUT (≤480), DERIVED THE SAME WAY (2026-09-28). The phone's shader
  // box is now just the top --phone-field-h of the screen (responsive.css), so
  // the whole box IS the colour band: the desktop composition is fitted into it
  // exactly as tabletBlob fits it into a tablet's band. Replaces the hand-tuned
  // FIELD.phone layout, which was built for a tall box behind the lockup. The
  // phone box has no rise transform, so the desktop's (200px) is only undone.
  // The band runs from the screen's TOP: the phone header is transparent over
  // the gradient (is-header-on-field), so the top-centre blue shows behind it
  // the way it does behind the desktop landing nav.
  const PHONE_REF_RISE = 200;
  function phoneBlob(b) {
    const sx = boxW / TABLET_REF.w;
    const sy = boxH / TABLET_REF.band;
    const sr = Math.pow(sy, 2 / 3) * Math.pow(sx, 1 / 3);
    const Y = ((b.y + FIELD.offsetY) * TABLET_REF.h - PHONE_REF_RISE) * sy;
    return Object.assign({}, b, {
      x: (b.x * TABLET_REF.w * sx) / boxW,
      y: Y / boxH,
      r: (b.r * TABLET_REF.w * sr) / boxW,
    });
  }

  function draw(t, entranceMs) {
    resize();
    const e = FIELD.entrance;
    const tablet = !FIELD_STATIC.matches && FIELD_TABLET.matches;
    FIELD.paintOrder.forEach((blobIdx, slot) => {
      const b = FIELD_STATIC.matches ? phoneBlob(FIELD.blobs[blobIdx])
        : tablet ? tabletBlob(FIELD.blobs[blobIdx])
        : FIELD.blobs[blobIdx];
      // LOAD SCREEN: the orbs are drawn fully formed — the reveal is the circular
      // iris in runIntro(), not a per-orb entrance. (FIELD.entrance / entranceMs
      // are now unused; left in place rather than ripped out of the draw loop.)
      blobData[slot * 4 + 0] = b.x;
      blobData[slot * 4 + 1] = b.y + (FIELD_STATIC.matches || tablet ? 0 : FIELD.offsetY);
      blobData[slot * 4 + 2] = b.r;
      blobData[slot * 4 + 3] = b.a;
      colData[slot * 3 + 0] = b.col[0];
      colData[slot * 3 + 1] = b.col[1];
      colData[slot * 3 + 2] = b.col[2];
      // Permuted with uBlob like uCol — the slot IS the stack position.
      const rp = Object.assign({}, FIELD.ramp, b.ramp);
      rampData[slot * 4 + 0] = rp.mid;
      rampData[slot * 4 + 1] = rp.midAlpha;
      rampData[slot * 4 + 2] = b.pulse ?? FIELD.motion.pulse;
      rampData[slot * 4 + 3] = rp.white ?? 1;
    });
    gl.uniform4fv(U.uBlob, blobData);
    gl.uniform3fv(U.uCol, colData);
    gl.uniform4fv(U.uRamp, rampData);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uAspect, canvas.width / canvas.height);
    gl.uniform1f(U.uTime, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const FIELD_STATIC = matchMedia('(max-width: 480px)');
  const staticField = reducedMotion.matches || FIELD_STATIC.matches;
  // ⚠️ TWO SEPARATE CONDITIONS THAT COINCIDE TODAY. The entrance needs the
  // field to animate at all (not reduced motion, not the phone's static path)
  // AND needs no JPEG underneath (>480). The second is currently implied by the
  // first, but they are different reasons — if phones ever start animating, the
  // width gate must still hold or the entrance will cover the photo with flat
  // cream and fade orbs up over it.
  const runEntrance = !staticField && !FIELD_STATIC.matches;

  // First frame BEFORE the reveal. With an entrance that frame is deliberately
  // EMPTY (bare cream): above 480 there is no image under the canvas any more,
  // so there is nothing for it to cover. Without one it is the finished field.
  draw(0, runEntrance ? 0 : null);
  html.classList.add('is-field-live');

  // Reduced motion keeps the artwork and drops only the movement — the field
  // should not change character because someone asked the page to hold still.
  //
  // ⚠️ PHONES TAKE THE SAME PATH, AND FOR GPU COST RATHER THAN PREFERENCE
  // (2026-09). The orbs render; the loop never starts. One draw, then the canvas
  // is a static texture the compositor can leave alone — per-frame shader work
  // goes to zero, which is the entire cost of having enabled the field here.
  // ⚠️ IT ALSO STOPS THE HEADER'S FROST RE-BLURRING. `.site-header`'s
  // backdrop-filter sits over the hero at ≤680; over a MOVING field the browser
  // must recompute it every frame, over a static one it blurs once and caches.
  // That was the specific unresolved cost recorded against this field.
  // ⚠️ THE TRADE IS SMALL HERE BY CONSTRUCTION: the motion is ±72px over 16–44s,
  // so on a phone — where the hero is on screen briefly and the field is cropped
  // to 30% of its width — almost none of that drift was ever visible anyway.
  // ⚠️ Re-declared deliberately after the `FIELD_PHONE` bail was deleted; this is
  // a different question (should it MOVE) from the one that bail answered
  // (should it EXIST), so it gets its own name rather than reviving that one.
  if (staticField) return;

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
  let entranceT = runEntrance ? 0 : null;
  let prev = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    // dt-based, not frame-counted, so the speed is identical at 60 and 120Hz;
    // capped so a backgrounded tab resuming cannot jump the whole distance.
    const dtMs = Math.min(now - prev, 100);
    const dt = dtMs / 1000;
    prev = now;
    // ⚠️ Stops while off screen or backgrounded. It does NOT re-check the phone
    // tier: a desktop session resized down keeps animating until reload, which is
    // correct — the static path is a page-load decision about the DEVICE, not a
    // per-frame one, and re-checking a matchMedia every frame is the kind of cost
    // this change exists to remove.
    if (!onScreen || document.hidden) return;
    clock += dt * FIELD.motion.speed;
    // Shares the same capped dt, so a resuming background tab cannot jump the
    // entrance either — it picks up where it left off rather than snapping.
    if (entranceT !== null && entranceT < ENTRANCE_MS) {
      entranceT = Math.min(ENTRANCE_MS, entranceT + dtMs);
    }
    draw(clock, entranceT);
  })(prev);
}

// THE PHONE GRADIENT'S HEIGHT (≤480): it ends PHONE_FIELD_GAP above the
// headline (2026-09-28; was min(40svh → 50svh, headline − 32)). The lockup is bottom-anchored in a hero of
// 100dvh − 184, so on a short phone the headline rises above 40% of the screen
// (375x667: headline at 181, 40svh at 267) and the colour would sit behind it.
// Set BEFORE initHeroField: phones draw one static frame, sized by this box.
const PHONE_FIELD_GAP = 48;
function measurePhoneField() {
  const root = document.documentElement;
  const h1 = document.querySelector('.intro-headline');
  // ABOVE 480 — THE WHITE ENDS PHONE_FIELD_GAP ABOVE THE HEADLINE (2026-09-28).
  // First only for the stacked hero (740x1000: headline at 602, the 72svh end
  // at 632); now at every width, because a fixed share of the screen doesn't
  // follow the headline either way — it ran 12–23px BEHIND it on short laptops
  // (1280x800, 1366x768, 1440x760) and left 195px of empty cream above it on a
  // portrait iPad (1024x1366). Published in PAGE px for the tiers' masks and
  // canvas boxes and for tabletBlob's band. Above 1024 (and not stacked) the
  // CSS takes min() with the 72svh end, so it only ever pulls the white UP
  // there: the desktop canvas box is sized by its aspect, not by this, and a
  // white that moved down could expose the artwork's bottom edge.
  const aboveMobile = h1 && window.matchMedia('(min-width: 481px)').matches;
  if (aboveMobile) {
    let t = 0;
    for (let n = h1; n; n = n.offsetParent) t += n.offsetTop;
    root.style.setProperty('--hero-field-end', Math.round(Math.max(160, t - PHONE_FIELD_GAP)) + 'px');
  } else {
    root.style.removeProperty('--hero-field-end');
  }
  if (!h1 || !window.matchMedia('(max-width: 480px)').matches) {
    root.style.removeProperty('--phone-field-h');
    return;
  }
  // OFFSETS, not a rect: the load reveal translates the headline (it rises
  // 64px into place), so a rect taken at init reads it 64px low. Offsets ignore
  // transforms, so the tier's own --hero-drop (also a transform) is added back.
  let top = 0;
  for (let n = h1; n; n = n.offsetParent) top += n.offsetTop;
  top += parseFloat(getComputedStyle(root).getPropertyValue('--hero-drop')) || 0;
  // Ends a fixed PHONE_FIELD_GAP above the headline (Jenna: "move the gradient
  // down"), no longer capped at a share of the screen.
  const px = Math.round(Math.max(120, top - PHONE_FIELD_GAP));
  root.style.setProperty('--phone-field-h', px + 'px');
}
// STACK THE HERO THE MOMENT ITS HEADLINE WOULD WRAP TO 4 LINES (2026-09-28,
// Jenna). Width alone can't say when — the headline steps 56 → 44px at 1024,
// so it is 4 lines at 1025–~1200 and 3 again at 1024 — so it is MEASURED: the
// class is cleared, the side-by-side headline's lines counted (offsetHeight,
// which ignores the load reveal's transform), and the class set if > 3. The
// ≤768 tier stacks by media query anyway; ≤680 has the phone layout.
function measureHeroStack() {
  const root = document.documentElement;
  const h1 = document.querySelector('.intro-headline');
  root.classList.remove('is-hero-stacked');
  if (!h1 || window.matchMedia('(max-width: 768px)').matches) return;
  const lh = parseFloat(getComputedStyle(h1).lineHeight) || 1;
  root.classList.toggle('is-hero-stacked', Math.round(h1.offsetHeight / lh) > 3);
}
measureHeroStack();
measurePhoneField();

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
// REDESIGN (exploration): the fixed top nav over the hero. Its clock shows
// Seattle time; the fade and the hand-off to .intro-bar live in
// updateScrollEffects. Null on project pages, so all of it is skipped there.
const topNav = document.querySelector('.top-nav');
// THE HAND-OFF (timed transitions, not scroll-linked opacities):
// - The landing nav (.top-nav) is NOT pinned: it sits at the top of the page
//   and simply scrolls away with the hero (hero.css).
// - WORK_IN — Selected Work fades up from the first bit of scroll, so the
//   cards are visibly rising right under the lockup (sections.css).
// - The docked bar is revealed once the gradient has cleared from under it —
//   the white's edge reaching the bar's bottom (updateScrollEffects).
//   NAV_REVEAL_MAX is the backstop.
// - The lockup fades out (0.5s, hero.css) once Selected Work fills more than
//   half the viewport.
const WORK_IN = 8;
// Below this the .intro-bar is display:none (responsive.css 680 tier).
const NO_LANDING_BAR = window.matchMedia('(max-width: 680px)');
// At and below this the first Work card peeks above the fold (responsive.css ≤1376).
const WORK_PEEKS = window.matchMedia('(max-width: 1376px)');
const NAV_REVEAL_MAX = 400;
// Where the "Selected work" nav click LANDS (sectionClickScrollY): the first
// card's TOP EDGE one --gap-group below the nav. (It was shared with an
// automatic glide into Work on the hand-off — REMOVED 2026-09-27 at Jenna's
// ask: it pulled the reader down. Don't reintroduce one; see Horizontal Tracks
// for the four earlier auto-scrolls that were removed for the same reason.) Not Work's centred resting
// position, which left ~230px of air under the bar. Page position from
// offsets, so the push and the reveal's translate don't skew it. Null where
// there is no top nav or no bar (project pages, and ≤680 via the caller).
// ⚠️ The card, not its title: in the masonry (worktree-work-section) the title
// sits at the BOTTOM of a card ~625px tall, so aiming at it glided straight
// past the first image. (It was `.work-card .section-title` in the carousel,
// where the title led the card.) The <li> is measured, not its link — the
// link is the reveal's transform target.
function workLandingScrollY() {
  const bar = document.querySelector('.intro-bar');
  const title = document.querySelector('#work-section .work-card');
  if (!topNav || !bar || !title) return null;
  let y = 0;
  for (let n = title; n; n = n.offsetParent) y += n.offsetTop;
  const gap = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--gap-group')) || 48;
  const barH = bar.offsetHeight || 64;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.min(Math.max(y - barH - gap, 0), Math.max(max, 0));
}
// Extra lift on the first gesture, on top of riding the white edge (see
// setHeroTextLift). px at full; reached by `over` of the way to the pin.
const HERO_TEXT_BOOST = { px: 0, over: 0.4 };
// REDESIGN: the hero's left edge sits on the clock's, and its right column
// spans exactly the nav's items — from
// "Selected work"'s left edge to the "Say hello" pill's right edge — at every
// width the top nav shows. Measured rather than restated because below 768 the
// items are a content-width cluster (their widths come from the morph sizers
// and the font), which CSS cannot express. Layout-only: init, resize, fonts.
// Where the top nav is display:none (≤680) both properties are cleared and the
// tier CSS takes over. CSS fallbacks are the desktop values, for no-JS.
function measureNavColumns() {
  if (!topNav) return;
  const root = document.documentElement.style;
  const first = topNav.querySelector('.top-nav-link');
  const cta = topNav.querySelector('.top-nav-cta');
  const clock = topNav.querySelector('.top-nav-clock');
  if (!first || !cta || !clock || getComputedStyle(topNav).display === 'none') {
    root.removeProperty('--nav-col-w');
    root.removeProperty('--nav-col-inset');
    root.removeProperty('--nav-lead');
    return;
  }
  // ...and the headline's left edge sits on the clock's.
  root.setProperty('--nav-lead', clock.getBoundingClientRect().left.toFixed(2) + 'px');
  const l = first.getBoundingClientRect().left;
  const r = cta.getBoundingClientRect().right;
  root.setProperty('--nav-col-w', (r - l).toFixed(2) + 'px');
  root.setProperty('--nav-col-inset',
    (document.documentElement.clientWidth - r).toFixed(2) + 'px');
}

function initTopNav() {
  if (!topNav) return;
  document.documentElement.classList.add('has-top-nav');
  // Every clock on the page: the desktop top nav's AND the phone header's.
  const clocks = document.querySelectorAll('.top-nav-clock');
  if (!clocks.length) return;
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const tick = () => {
    const now = new Date();
    clocks.forEach((clock) => {
      clock.textContent = fmt.format(now); // e.g. "10:42 AM PDT"
      clock.dateTime = now.toISOString();
    });
    // Re-render on the next minute boundary rather than polling.
    setTimeout(tick, 60000 - (now.getTime() % 60000) + 50);
  };
  tick();
}

function initHeadlineMorph() {
  const h1 = document.querySelector('.intro-headline');
  if (!h1 || h1.hasAttribute('data-static') || reducedMotion.matches) return;

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

initTopNav();
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
    // REDESIGN: the top nav's items take the same morph, which is also what
    // sizes each one to fit its wider label — so the two navs' items match.
    { selector: '.intro-bar-links a[href$="#work-section"], .top-nav-link[href$="#work-section"]', rest: 'Selected work', hover: 'What I made' },
    { selector: '.intro-bar-links a[href$="#about"], .top-nav-link[href$="#about"]', rest: 'About me', hover: 'Who am I?' },
    { selector: '.intro-bar-cta, .top-nav-cta', rest: 'Say hello', hover: 'Why hello!' },
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
// REDESIGN: after the morph has sized the top nav's items. Fonts change those
// widths, so measure again once they land (and re-derive the field tuck, which
// reads the bio's position).
measureNavColumns();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    measureNavColumns();
    measureFieldTuck();
    updateScrollEffects();
  });
}

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

// The Work MASONRY (sections.css .work-grid). With JS off the grid is a plain
// two-column grid with aligned rows; this turns it into a masonry by making each
// row a 1px track and giving every card a span equal to its own height plus the
// gap. Grid auto-placement then puts each card in whichever column frees up
// first — the shorter one — so DOM order stays reading order and nothing is
// ever moved in the DOM.
//
// It re-measures whenever a card changes height (a ResizeObserver per card, so
// a width change, a font swap or media loading all land here), and switches
// itself off wherever the grid is down to ONE column (<=768, responsive.css) —
// read from the live track count, so the breakpoint lives in CSS alone.
// Heights are offsetHeight, not a rect: the reveal system translates the card
// link while this runs, and a transform must not leak into the layout.
function initWorkMasonry() {
  const grid = document.querySelector('.work-grid');
  if (!grid || !('ResizeObserver' in window)) return; // project pages have none
  // A card with `hidden` is out of the layout, not a zero-height slot.
  const cards = Array.from(grid.children).filter((card) => !card.hidden);

  // Each card's height WITHOUT the stretch below. The stretch lives on the card
  // (as padding under its media), so its own height includes it; subtracting
  // the stretch it currently carries gives the natural height back, which is
  // what keeps the ResizeObserver from chasing its own writes.
  const extraOf = (card) => parseFloat(card.dataset.extra) || 0;
  const setExtra = (card, px) => {
    card.dataset.extra = px;
    card.style.setProperty('--work-extra', px + 'px');
  };

  const layout = () => {
    const cs = getComputedStyle(grid);
    const columns = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
    if (columns < 2) {
      grid.classList.remove('is-masonry');
      cards.forEach((card) => {
        card.style.gridRowEnd = '';
        setExtra(card, 0);
      });
      return;
    }
    const gap = parseFloat(cs.columnGap) || 0; // the same token drives both axes
    grid.classList.add('is-masonry');

    // PASS 1 — place on natural heights, so the stretch never decides which
    // column a card lands in.
    const natural = cards.map((card) => card.offsetHeight - extraOf(card));
    cards.forEach((card, i) => {
      card.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil(natural[i] + gap));
    });

    // PASS 2 — BOTTOMS LEVEL. Find each column's last card and stretch the
    // ones in the shorter columns by the difference, so the grid ends on one
    // line (the reference is Jenna's: "align top and bottom evenly"). Only the
    // LAST card of a column moves, so nothing is re-placed: lengthening the
    // bottom of a column can only make that column later, never earlier.
    // Offsets, not rects — the reveal translates each card's link.
    const last = new Map(); // column x -> { i, bottom }
    cards.forEach((card, i) => {
      const x = card.offsetLeft;
      const bottom = card.offsetTop + natural[i];
      const prev = last.get(x);
      if (!prev || bottom > prev.bottom) last.set(x, { i, bottom });
    });
    const floor = Math.max(...[...last.values()].map((c) => c.bottom));
    const extra = new Array(cards.length).fill(0);
    // The stretch lands under the media frame, and object-fit: cover then
    // crops the art's sides — fine for a sliver, not for a column holding a
    // single card (3 cards: Messaging alone was stretched 376px, losing ~37%
    // of its width). Past LEVEL_MAX of the frame's own height, the columns
    // simply end unevenly.
    const LEVEL_MAX = 0.15;
    last.forEach(({ i, bottom }) => {
      const media = cards[i].querySelector('.work-card-media');
      const frame = media ? media.offsetHeight - extraOf(cards[i]) : 0;
      const short = Math.round(floor - bottom);
      // (A contained frame was once exempt from LEVEL_MAX because stretching it
      // can't crop — but it made the Groups card 778px tall, too tall to see
      // whole on screen. Reverted: every card obeys the cap.)
      extra[i] = short <= frame * LEVEL_MAX ? short : 0;
    });

    cards.forEach((card, i) => {
      if (extraOf(card) !== extra[i]) setExtra(card, extra[i]);
      card.style.gridRowEnd = 'span ' + Math.max(1, Math.ceil(natural[i] + extra[i] + gap));
    });
  };
  // Laid out straight from the observer, NOT deferred to a rAF: observer
  // callbacks already run before paint, and rAF stops outright in a background
  // tab, which left the spans stale (cards overlapping) until it came back.
  // No feedback loop: a span never changes a card's own height, and a stretch
  // this pass wrote is subtracted back out before measuring, so the pass it
  // triggers derives the same numbers and writes nothing.
  const ro = new ResizeObserver(layout);
  cards.forEach((card) => ro.observe(card));
  ro.observe(grid);
  layout();
}
initWorkMasonry();

// Work cards with hover media: the still at rest, the GIF on hover. The GIF's
// src is set on first hover (and re-set with a fresh fragment each time, which
// restarts it from its first frame without refetching — a fragment is not part
// of the fetch); the class that shows it lands on `load`, so a slow first
// fetch never shows an empty frame. Mouse and keyboard focus only — touch has
// no hover — and nothing under reduced motion. Null-safe: pages without it
// simply find no targets.
function initWorkHoverMedia() {
  if (reducedMotion.matches) return;
  // TOUCH (no hover — phones, tablets): the media plays once the WHOLE CARD is
  // on screen (2026-09-28, Jenna) and goes back to the still once it is less
  // than half visible — the gap keeps a small scroll from flickering it off.
  // A card taller than the screen counts as "whole" once it fills 90% of it.
  const touch = window.matchMedia('(hover: none)').matches;
  const io = touch && 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const ctl = e.target.__hoverMedia;
          if (!ctl) return;
          const full = e.intersectionRatio >= 0.99
            || e.intersectionRect.height >= window.innerHeight * 0.9;
          if (full && !ctl.on) { ctl.on = true; ctl.play(); }
          else if (ctl.on && e.intersectionRatio < 0.5) { ctl.on = false; ctl.stop(); }
        });
      }, { threshold: [0, 0.25, 0.5, 0.75, 0.9, 0.99, 1] })
    : null;
  document.querySelectorAll('.work-card-hover[data-hover-src]').forEach((img) => {
    const link = img.closest('.work-card-link');
    if (!link) return;
    const src = img.dataset.hoverSrc;
    let play, stop;
    // A <video> hover (MP4 — a fraction of a GIF's weight, full colour): the
    // src lands on first play, each play restarts it from 0, and the class
    // that shows it waits for play() to resolve, so a slow first fetch still
    // shows the still rather than an empty frame. Paused on stop.
    if (img.tagName === 'VIDEO') {
      play = () => {
        if (!img.getAttribute('src')) img.src = src;
        img.currentTime = 0;
        const p = img.play();
        if (p && p.then) p.then(() => link.classList.add('is-hover-playing')).catch(() => {});
      };
      stop = () => { link.classList.remove('is-hover-playing'); img.pause(); };
    } else {
      // A GIF: src set on first play, re-set with a fresh #fragment each time,
      // which restarts it from frame 1 without refetching.
      let n = 0;
      play = () => {
        img.onload = () => link.classList.add('is-hover-playing');
        img.src = src + '#' + (++n);
      };
      stop = () => link.classList.remove('is-hover-playing');
    }
    if (io) {
      link.__hoverMedia = { play, stop, on: false };
      io.observe(link);
      return;
    }
    link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') play(); });
    link.addEventListener('pointerleave', stop);
    link.addEventListener('focus', play);
    link.addEventListener('blur', stop);
  });
}
initWorkHoverMedia();

// Work-card skeleton: a grey shimmering frame until the still has loaded
// (sections.css). Only frames whose still is not yet decoded get it, so a
// cached load paints straight through; an error clears it too, so a broken
// image never leaves the frame shimmering forever.
function initWorkSkeleton() {
  document.querySelectorAll('.work-card-cover').forEach((img) => {
    const media = img.closest('.work-card-media');
    if (!media || (img.complete && img.naturalWidth)) return;
    media.classList.add('is-loading');
    const done = () => media.classList.remove('is-loading');
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}
initWorkSkeleton();


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

  // THE PHONE HEADER IS TRANSPARENT AND WHITE WHILE IT IS OVER THE GRADIENT
  // (≤480, 2026-09-28, Jenna — like the desktop landing nav): no frost, white
  // clock, white pill. Held while the gradient's SOLID colour (above its white
  // fade) is still behind the header; after that the frosted cream bar returns,
  // or white type would sit on cream. Above the is-loading return, like the
  // flag above it, because the header is on screen through the load reveal.
  // ≤680, everywhere this header is the nav (was ≤480 only; 481–680 kept the
  // frosted band over the gradient). The white's end comes from the measured
  // tokens — --phone-field-h (≤480) or --hero-field-end (481–768) — in page
  // px; the header stays transparent while that end, less a fade's worth, is
  // still below it.
  if (siteHeader) {
    let onField = false;
    if (NO_LANDING_BAR.matches) {
      const rs = document.documentElement.style;
      const end = parseFloat(rs.getPropertyValue('--phone-field-h'))
        || parseFloat(rs.getPropertyValue('--hero-field-end'));
      if (end) onField = end - window.scrollY - 112 > siteHeader.getBoundingClientRect().bottom;
    }
    siteHeader.classList.toggle('is-header-on-field', onField);
  }

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
  // carries it there. is-docked no longer switches the glass on (it shows at
  // rest too, hero.css) — it still marks the pinned state. Guarded: project pages
  // have no .intro-bar.
  if (introBar) {
    const docked = introBar.getBoundingClientRect().top <= 0;
    introBar.classList.toggle('is-docked', docked);
    // REDESIGN: the hand-off from the top nav to this bar (is-bar-docked) is
    // decided further down, once push is known — see is-bar-lifted.
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
  // EXPERIMENT (work-glide, rev. "slide over"): three layers at three speeds,
  // all pure functions of scrollY, none of them ever reversing.
  //   hero text     — 1 + HERO_TEXT.speed  (fastest)
  //   artwork       — 1 − FIELD_LAG.k      (lags: classic background parallax)
  //   white + nav + Selected Work — exactly 1, so they ride up OVER the artwork
  //                   and eat it from below; nothing below the hero is moved.
  // The white stays glued to the nav by construction: --field-cream shifts the
  // mask's end up by the artwork's lag (so the dissolve keeps its place on the
  // PAGE while the artwork sinks under it) plus the tuck's own overhang, which
  // lands the gradient's end on the bar's top by FIELD_TUCK.span of the way to
  // the dock. No lift on the nav means nothing to undo when it pins.
  const t = fieldDockScroll > 0
    ? Math.min(1, Math.max(0, window.scrollY / (fieldDockScroll * FIELD_TUCK.span))) : 0;
  const tuck = 1 - Math.pow(1 - t, 3);
  const travel = fieldDockScroll > 0 ? Math.min(window.scrollY, fieldDockScroll) : 0;
  const lag = Math.round(FIELD_LAG.k * travel);
  // The push that undoes the shortening: heroShorten at rest, 0 at the pin.
  // A BIASED SMOOTHSTEP, ss(p^bias): zero slope at BOTH ends, so the nav leaves
  // rest at the scroll's own speed (the tension), the shortening builds, and it
  // eases back to exactly 1x as the bar pins — no change of pace under Selected
  // Work there. `bias` > 1 pushes the fast part late. At 1440x900, 240px:
  //   bias 1   → peak 1.62x at 50% (symmetric)
  //   bias 1.5 → peak 1.76x at 69% (shipped): 1.04 1.14 1.28 1.44 1.60 1.72 1.76 1.68 1.44 1.00
  //   bias 2   → peak 1.92x at 78%
  // The plain ease-in p^2 it replaced ended at 1.8x and dropped to 1x at the pin.
  const pinP = fieldDockScroll > 0 ? travel / fieldDockScroll : 0;
  // REDESIGN: EASE-OUT, not the biased smoothstep. The hero text now fades out
  // early, and with the old curve Work started at ~1x and only sped up late, so
  // it lagged exactly when the text left — ~450px of empty screen mid-scroll.
  // (1 − p)^2 puts Work's fastest rise on the first gesture (1 + 2·S/D, ~1.8x
  // at 1440x900) and eases to exactly 1x at the pin (slope 0 there), so the
  // dock still doesn't jump. HERO_SHORTEN.bias is unused by this curve.
  // CUBIC ease-out (was quadratic): more of Work's catch-up happens before the
  // docked nav appears, so the cards are already close under it.
  // Slope is still 0 at the pin (1x there, no jump); the cost is a faster first
  // gesture (1 + 3·S/D at the start, vs 1 + 2·S/D).
  const pinR = 1 - pinP;
  const push = fieldDockScroll > 0 ? heroShorten * pinR * pinR * pinR : 0;
  setHeroPush(Math.round(push));
  // Negative: .page-field's transform subtracts it, so the artwork moves DOWN
  // relative to the page, i.e. slower than the scroll.
  setFieldScroll(-lag);
  // The white's end, on the page, is fieldVisibleEnd + lag − cream (the artwork
  // sank by lag; the mask pulls its end up by cream). It must sit on the nav's
  // VISUAL top — the shortened layout top plus the push — with the resting
  // overhang closing on the tuck's curve. At rest this is exactly 0.
  const navTop = (fieldDockScroll) + push;
  // REDESIGN: the lockup's lift (applied below as --hero-text-lift).
  const bt = fieldDockScroll > 0 ? Math.min(1, pinP / HERO_TEXT_BOOST.over) : 0;
  const boost = HERO_TEXT_BOOST.px * (1 - (1 - bt) * (1 - bt));
  const textLift = fieldDockScroll > 0
    ? Math.round(heroShorten - push + boost + HERO_TEXT.speed * travel) : 0;
  // REDESIGN: the white RIDES THE LOCKUP — its edge keeps its resting 16px
  // above the headline all the way up (cream = lag + textLift: the artwork
  // sinks by lag, the text rises by textLift). It used to be forced to the
  // viewport top within the first ~48px so the docked bar never landed on
  // gradient, which wiped the colour almost instantly; the nav swap now waits
  // for the white to reach the top nav instead, so that force is not needed.
  const cream = fieldDockScroll > 0
    ? (topNav ? lag + textLift
              : fieldVisibleEnd + lag - navTop - fieldOverhang * (1 - tuck))
    : 0;
  const creamPx = Math.max(0, Math.round(cream));
  setFieldCream(creamPx);
  // REDESIGN: the docked bar is revealed once the GRADIENT HAS CLEARED from
  // under it — the white's solid edge reaching the bar's bottom — so it lands
  // on plain cream, not over a band of colour. Tried and rejected: when the
  // landing nav scrolls off (64px — too soon, the bar sat over the gradient)
  // and when Selected Work reaches the bar (~290px — too late, no nav for a
  // long stretch). The edge is READ from the canvas's mask (the redesign ends
  // the white at a CSS 72svh that no JS constant restates), and only while it
  // can still matter; NAV_REVEAL_MAX is the backstop. Back above, reverses.
  let whiteEndV = Infinity;
  if (topNav && fieldDockScroll > 0 && window.scrollY > 0 && window.scrollY <= NAV_REVEAL_MAX) {
    const cv = document.querySelector('.page-field-canvas');
    if (cv) {
      const cs = getComputedStyle(cv);
      const stops = (cs.maskImage || cs.webkitMaskImage || '').match(/-?[\d.]+px/g);
      if (stops) whiteEndV = cv.getBoundingClientRect().top + parseFloat(stops[stops.length - 1]);
    }
  }
  const navOut = fieldDockScroll > 0 && !!topNav && window.scrollY > 0
    && (window.scrollY > NAV_REVEAL_MAX
        || whiteEndV <= ((introBar && introBar.offsetHeight) || 64));
  // The lockup fades only once Selected Work fills MORE THAN HALF the
  // viewport — its visual top (push included, hence the rect) above the middle
  // of the screen. Jenna's rule; not tied to the nav reveal or a distance.
  const workEl = document.getElementById('work-section');
  const heroOut = fieldDockScroll > 0 && !!workEl
    && workEl.getBoundingClientRect().top < window.innerHeight / 2;
  if (topNav) {
    html.classList.toggle('is-hero-text-out', heroOut);
    // ≤680 there is no landing bar (fieldDockScroll stays 0), so the timed
    // fade-up never fired and the Work cards sat at opacity 0 on phones. There
    // the container is simply in; each card still has its own reveal.
    // ≤1376 the first card PEEKS at rest (--hero-peek, responsive.css), so
    // the container is in from the start there — a timed fade-up would leave
    // the peek empty until the first scroll.
    html.classList.toggle('is-work-in', NO_LANDING_BAR.matches || WORK_PEEKS.matches
      || (fieldDockScroll > 0 && window.scrollY > WORK_IN));
  }
  // REDESIGN: the docked bar takes over at the nav swap (navOut) —
  // before it would pin on its own. From then on it is position: FIXED at the top (is-bar-lifted,
  // hero.css), with Work taking a matching negative margin so the layout is
  // identical. ⚠️ NOT a scroll-linked transform: that was tried (--bar-lift)
  // and it glitched — scroll events land a frame behind the compositor's
  // scroll, so a sticky bar corrected by a per-frame transform wobbles while
  // the page is moving, and this bar is moving at 2-3x the scroll there.
  if (topNav && introBar) {
    const show = navOut || (fieldDockScroll > 0 && window.scrollY >= fieldDockScroll);
    html.classList.toggle('is-bar-lifted', show);
    html.classList.toggle('is-bar-docked', show);
    introBar.inert = !show;
  }
  // REDESIGN: the hero text rides the white scrim's edge rather than a speed of
  // its own. That edge moves on the page by (lag − cream) — the artwork sinks by
  // lag, the mask pulls its end up by cream — so lifting the text by
  // (cream − lag) keeps it at a fixed distance below the edge the whole way up.
  // 0 at rest. HERO_TEXT.speed is unused while this holds.
  // ...plus HERO_TEXT_BOOST on top: an extra lift front-loaded onto the first
  // gesture (ease-out over the first `over` of the way to the pin), so the
  // lockup visibly glides off as soon as the reader scrolls. It leads the white
  // edge by up to `px`, which is fine — it is fading out over the same stretch.
  // REDESIGN: HERO_TEXT_BOOST.px is 0 — the extra first-gesture lift moved
  // into HERO_SHORTEN, where Work shares it. A text-only boost opens a gap.
  // ...and it now rides WORK's own extra movement (heroShorten − push) rather
  // than (cream − lag): the two differ by the resting overhang and the lag,
  // which on short windows let the gap to Work grow ~80px mid-scroll. Locked
  // to Work, the lockup→Work gap is constant at every size by construction,
  // and it still tracks the white closely, which is tied to the same bar.
  setHeroTextLift(textLift);

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
  if (sectionSpyScrollY) {
    for (const s of navSections) {
      // Resting position, or earlier for a section in SPY_LEAD (Work) — see
      // sectionSpyScrollY. Clicks still land at rest.
      const rest = sectionSpyScrollY(s.el);
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
  // REDESIGN: the docked bar is revealed early (gradient cleared), with Selected Work
  // rising right under it — so from that moment "Selected work" reads active,
  // rather than waiting for Work's resting position. Only fills an empty slot;
  // About and Contact still take over as they are reached.
  if (!activeEl && html.classList.contains('is-bar-docked')) {
    activeEl = document.getElementById('work-section');
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
      // The HOMEPAGE floatie also stays tucked until the landing is behind the
      // reader — the hero's bottom above the middle of the screen (2026-09-28,
      // Jenna). The project pages' chapter floatie is unaffected.
      const heroEl = sectionPillBar.classList.contains('section-pills--site-nav')
        ? document.querySelector('.intro') : null;
      const onLanding = heroEl && heroEl.getBoundingClientRect().bottom > window.innerHeight * 0.5;
      sectionPillBar.classList.toggle('is-tucked', footerIn || !!onLanding);
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

  // THE BLUE'S LEAD (see CONTACT_LAG). `t` runs 0 at About's resting position
  // to 1 at Contact's, on a smoothstep so neither end has a kink; the offset is
  // k × (distance still to travel) × t, which is 0 at BOTH rests and settles at
  // (1 − k) speed. NEGATIVE = the blue sits ABOVE the panel's layout top.
  // THE PACE (CONTACT_SHORTEN): the push unwinds from the whole shorten at
  // About's rest to 0 at the scroll floor, on the hero's cubic ease-out.
  if (contactShorten > 0 && aboutRestY != null) {
    // ⚠️ The floor is read LIVE, not from the measure: images and fonts that
    // land after it change the page's height, and a stale distance left the
    // push short of 0 at the bottom — Contact never reached its locked view.
    const floorY = document.documentElement.scrollHeight - window.innerHeight;
    const q = Math.max(0, Math.min(1, (window.scrollY - aboutRestY) / Math.max(1, floorY - aboutRestY)));
    contactQ = q;
    setContactPush(Math.round(contactShorten * (1 - q) * (1 - q) * (1 - q)));
  } else {
    setContactPush(0);
    contactQ = 1;
  }

  let contactLead = 0;
  let contactT = 0;
  if (contactSection && aboutRestEdge > 0) {
    const ce = contactSection.getBoundingClientRect().top;
    const span = aboutRestEdge - contactRestEdge;
    const u = span > 0 ? Math.max(0, Math.min(1, (aboutRestEdge - ce) / span)) : 0;
    contactT = u * u * (3 - 2 * u);
    if (!reducedMotion.matches) {
      // × (1 − t): the lead tapers out as it lands, so the blue arrives at FULL
      // scroll speed. At plain k the blue settled at 0.5x, and that slow tail
      // happened exactly under the nav — the scrim hung there (Jenna).
      contactLead = -CONTACT_LAG.k * Math.max(0, ce - contactRestEdge) * contactT * (1 - contactT);
    }
  }
  setContactLag(Math.round(contactLead));

  // About's parallax. Guarded: project pages have no #about, so nothing is ever
  // published and the CSS fallback (0px) leaves them exactly as they were.
  if (aboutSection) {
    const vh = window.innerHeight;
    const r = aboutSection.getBoundingClientRect();
    // Distance of the section's centre from the viewport's — 0 where it settles,
    // signed, so the lag flips with the approach direction on its own.
    // ⚠️ ANCHORED TO ABOUT'S RESTING SCROLL POSITION when there is one, not to
    // the viewport's centre (2026-09-28). About is taller than a short window
    // (measured at 1536x751), so at its resting position — heading one nav
    // below the top — its centre is still well below the screen's, the peek was
    // NOT 0 there, and clicking "About me" landed the heading 18px UNDER the
    // bar. aboutRestY is where the nav click and the spy say About settles, so
    // 0 lands exactly there. Same sign: positive while About is still below.
    const d = aboutRestY != null
      ? aboutRestY - window.scrollY
      : (r.top + r.height / 2) - vh / 2;
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
    // ⚠️ REDESIGN: the old push toward the ledge is replaced by the hero's
    // lockup behaviour, mirrored — the copy lifts away at ABOUT_LIFT.speed of the
    // scroll past its resting position, and fades once the blue fills more than
    // half the viewport. The resting lag blends out over the first 120px so the
    // hand-over has no step.
    if (contactSection) {
      const ce = contactSection.getBoundingClientRect().top;
      const travel = aboutRestEdge > 0 ? Math.max(0, aboutRestEdge - ce) : 0;
      const w = Math.min(1, travel / 120);
      const lift = reducedMotion.matches ? 0 : -ABOUT_LIFT.speed * travel;
      peek = peek * (1 - w) + lift;
      aboutSection.classList.toggle('is-about-out',
        travel > 0 && ce + contactLead < vh * ABOUT_LIFT.fadeAt);
    }
    // ≤680 (phones): no About parallax. Its pull-up is bounded by the section
    // gap, which is 96 on desktop but 64 here — measured, it lifted About's
    // heading to 4px under the last Work card (2026-09-28).
    if (NO_LANDING_BAR.matches) peek = 0;
    setAboutPeek(Math.round(peek));
  }

  const stickyBars = [siteHeader, introBar].filter(Boolean);
  if (contactSection && stickyBars.length) {
    const contactRect = contactSection.getBoundingClientRect();
    if (contactRect.height === 0) {
      // Contact is hidden (dropped at the mobile tier) — there's no blue panel to
      // invert over, so keep the bars in their normal (cream) state.
      stickyBars.forEach(bar => bar.classList.remove('is-over-dark', 'is-over-ramp'));
      setBarBleed(BAR_BLEED);
      setDarkMix(0);
      setBarFill('');
      setContactPeek(0);
      setContactLag(0);
    } else {
      const scrollAnchorTop = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      const barHeight = Math.max(...stickyBars.map(bar => bar.offsetHeight));
      const invertLine = Math.max(scrollAnchorTop, barHeight);
      const gap = contactRect.top + contactLead - invertLine; // bar's bottom to the BLUE's top

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
      // Where the BLUE actually is: the panel's layout top plus its lead (see
      // CONTACT_LAG). Everything that describes colour — the ledge, the bar's
      // tint, its fill, the label flip — reads this, not the layout top.
      const blue = edge + contactLead;
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
      // ⚠️ REDESIGN: THE LEDGE RIDES ABOUT'S COPY (the mirror of the hero's
      // white riding the lockup) instead of growing on a fixed reach schedule:
      // its top keeps ABOUT_LIFT.gap below About's last line, capped at the
      // token's length. It blends in from the resting length over the first
      // 120px of travel, so About's resting composition keeps its clean cream. No direction term — scrolling up plays it backwards.
      const restLen = Math.min(contactLedgeRest, ledge);
      let liveLedge;
      if (aboutSection && aboutSection.lastElementChild && aboutRestEdge > 0) {
        const aboutBottom = aboutSection.lastElementChild.getBoundingClientRect().bottom;
        const ride = Math.max(1, Math.min(ledge, blue - (aboutBottom + ABOUT_LIFT.gap)));
        // Engages over the first 120px past About's rest (the same hand-over as
        // the lift), so the scrim is riding by the time the copy is moving.
        const w = Math.min(1, Math.max(0, aboutRestEdge - edge) / 120);
        liveLedge = Math.max(1, restLen + (ride - restLen) * w);
      } else {
        liveLedge = ledge;                     // unmeasurable -> the full ledge
      }
      // ⚠️ AND IT SHORTENS AS IT NEARS THE NAV. By then About has faded and the
      // ride has nothing to follow, so a full-length ramp only crawled past the
      // bar. Capped to the blue's distance from the bar's bottom (floored at
      // CONTACT_COPY.navRamp), the scrim sweeps behind the nav instead.
      liveLedge = Math.max(1, Math.min(liveLedge,
        Math.max(CONTACT_COPY.navRamp, blue - invertLine)));
      setLedgeLift(Math.round(ledge - liveLedge));
      setContactEdge(Math.round(blue * 100) / 100);

      const covered = blueBehindBar(blue, liveLedge, invertLine);
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
        ? contactAlphaAt(contactGlyphMid, blue, liveLedge) >= DARK_TEXT_ALPHA
        : mix >= DARK_TEXT_AT;
      stickyBars.forEach(bar => bar.classList.toggle('is-over-dark', flipToWhite));
      // Blue behind the bar but not yet swapped: labels go FULL black (hero.css
      // .is-over-ramp) — the resting 0.8 black fails AA on the deep ramp.
      stickyBars.forEach(bar => bar.classList.toggle('is-over-ramp', !flipToWhite && covered > 0));

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
      if (barLive && ledge > 0 && blue > 0 && blue - liveLedge < barHeight + BAR_BLEED + 2) {
        setBarFill(buildBarFill(blue, liveLedge));
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
      // ⚠️ REDESIGN: the copy RIDES THE BLUE (CONTACT_COPY) instead of the
      // direction-dependent peek above (`magnitude * peekDir`, now unused). It
      // follows the blue's lead and is pulled up from its centred resting offset
      // to `ride` below the blue's top, easing back to 0 over the About →
      // Contact scroll. Position-only, so scrolling up plays it backwards.
      const settle = contactQ * contactQ * (3 - 2 * contactQ);
      const pull = CONTACT_COPY.ride == null ? 0
        : Math.max(0, contactCopyOffset - CONTACT_COPY.ride) * (1 - settle);
      setContactPeek(reducedMotion.matches || CONTACT_COPY.ride == null
        ? 0 : Math.round(contactLead - pull));
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
// The stack decision re-runs once a resize SETTLES too: measured mid-resize
// (1180 → 1024) it read the layout before the 1024 tier's type step applied
// and stacked a headline that fits in 3 lines.
let heroStackTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(heroStackTimer);
  heroStackTimer = setTimeout(() => {
    measureHeroStack();
    measurePhoneField();
    updateScrollEffects();
  }, 150);
});
window.addEventListener('resize', () => {
  measureHeroStack();
  measurePhoneField();
  measureNavColumns(); // REDESIGN: before the tuck, which reads the bio
  measureFieldTuck();
  measureContactArrival();
  measureAboutRest();
  updateScrollEffects();
});
// Late layout (images, web fonts) changes the page's height after the first
// measure; re-measure once each has settled, or the Contact pacing and resting
// positions are taken from a page that no longer exists.
const remeasureLate = () => {
  measureHeroStack();
  measurePhoneField();
  measureNavColumns();
  measureFieldTuck();
  measureContactArrival();
  measureAboutRest();
  updateScrollEffects();
};
window.addEventListener('load', remeasureLate);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasureLate);
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
// The horizontal carousel it served is gone too (2026-09, now a two-column
// masonry that scrolls with the page). If a hold is ever wanted again, read the
// four failures above first.
// Fraction of a section's leftover space placed ABOVE its content when it
// settles. 0.5 is a true centre; lower lifts the content.
const SECTION_BIAS = { about: 0.34 };
const SECTION_MIN_AIR = 40; // px between the nav and a section's content, at least

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
    // Floored at SECTION_MIN_AIR below the nav: when the content is taller than
    // the window (About at 1536x751) the leftover is negative and the heading
    // landed flush against the bar's bottom edge.
    const wantedTop = NAV_OFFSET + Math.max(SECTION_MIN_AIR, (available - contentHeight) * bias);
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
  // The spy's arrival line: the resting position, or EARLIER for a section in
  // SPY_LEAD — once its content's top has risen to that fraction of the
  // viewport. Never later than rest, so a nav click (which lands at rest)
  // always lights its own link.
  // ⚠️ ON-SCREEN position (a rect), NOT offsets — deliberately unlike
  // restingFor. The redesign lays the hero out SHORTER and pushes everything
  // after it back down visually (`translate: --hero-push`), so a layout offset
  // put Work's content 240px higher than it appears and lit "Selected work"
  // at the very top of the hero. The rect includes that push; it is taken on
  // the section's container, which the reveal does not translate (it moves
  // the card links inside it). Re-derived every frame, so it tracks the push
  // as it unwinds: the test reduces to "content top <= lead of the viewport".
  sectionSpyScrollY = (el) => {
    const rest = sectionRestingScrollY(el);
    // ABOUT lights the moment the Work cards are OUT OF VIEW — the bottom of
    // the card grid (the taller masonry column) has passed up behind the nav
    // (2026-09-28, Jenna). Its resting position was late (heading ~106px from
    // the top); a fraction of the screen (0.4) was too early. Rect, not
    // offsets, like SPY_LEAD below, so the hero's push is included.
    if (el.id === 'about' && rest != null) {
      const grid = document.querySelector('.work-grid');
      if (grid) {
        // A rect, not offsetHeight/offsetParent: the docked bar is position:
        // fixed, which reports offsetParent null. display:none (≤680) reads 0.
        const nav = introBar ? introBar.getBoundingClientRect().height : 0;
        const gridBottom = grid.getBoundingClientRect().bottom + window.scrollY;
        return Math.min(rest, gridBottom - nav);
      }
    }
    const lead = SPY_LEAD[el.id];
    if (rest == null || lead == null || !el.children.length) return rest;
    const top = el.children[0].getBoundingClientRect().top + window.scrollY;
    return Math.min(rest, top - window.innerHeight * lead);
  };
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
    if (el.id === 'contact') return topAlignedFor(el);
    // REDESIGN: Work's click lands the first card one --gap-group under the
    // nav (workLandingScrollY). It sits BELOW Work's resting position (the
    // spy's threshold), so the spy still lights "Selected work" after it.
    if (el.id === 'work-section') {
      const landing = workLandingScrollY();
      if (landing != null) return landing;
    }
    return restingFor(el);
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
// Where a Work card fades in / back out, as fractions of the viewport height
// measured on the card's top. Was 0.85 / 0.95.
// REDESIGN: 0.9 / 0.95 — the same 0.9 line every other section reveals on. At
// 0.97 the reveal fired with only ~34px of card above the fold while Work was
// rising at ~1.8x, so the whole rise-and-fade played out of sight.
const WORK_REVEAL = { in: 0.9, out: 0.95 };
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
      // ⚠️ EXCEPT About while Contact has it faded out (#about.is-about-out,
      // ABOUT_LIFT). The lift carries About's content off the top, which used to
      // reset it here — so scrolling back up it replayed a staggered reveal on
      // top of the lift's own fade and sat half-blank for a moment. Held in its
      // revealed state, it comes back on the one 0.5s fade, like the hero's
      // lockup. Once the class is gone the normal reset applies again.
      if (group.closest('#about.is-about-out')) return;
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
        // The cards rise out of the hero behind the sliding white, and at 85%
        // (135px into a 900px fold) they were well on screen before revealing. They reveal as soon as they clear the fold
        // (WORK_REVEAL.in); the out line sits just past it to keep hysteresis.
        if (firstPass || (r.top < vh * WORK_REVEAL.in && r.bottom > vh * 0.15)) {
          setVisible(group, true);
        } else if (r.top > vh * WORK_REVEAL.out) {
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
    const link = card.querySelector('a.work-card-link');
    // data-href FIRST: it names the project page even on the two locked cards,
    // whose real href is the external Figma deck (see index.html).
    const href = link ? link.dataset.href || link.getAttribute('href') || '' : '';
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
