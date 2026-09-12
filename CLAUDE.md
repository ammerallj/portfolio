# Project: Portfolio Site Architecture

Static site — plain HTML, modular CSS, and one vanilla-JS file. No build step,
no framework, no dependencies. Served as static files.

The homepage is one page; each project also has a **Project Overview page** in
`work/` (see **Project Overview Pages** below). `js/main.js` and `style.css` are
shared by all of them.

## File Map
- **Project overview pages:** `work/*.html` (4) — see **Project Overview Pages** below.
- **Main HTML:** `index.html` — structure/content only. A tiny inline `<script>` in `<head>` sets `is-motion` + `is-loading` pre-paint (both only when JS runs, so no-JS visitors aren't left on a blank page); ends with a single `<script src="js/main.js" defer>`.
- **JavaScript:** `js/main.js` — all interactions: nav scroll-spy, the landing header tuck (`is-tucked` while the hero's `.intro-bar` is on screen), page load reveal, header-over-Contact color inversion, custom cursors, the About tab view (`initAboutTabs`), the animated hero field (`initHeroField` — see **The animated field** below), the looping Work carousel (`initWorkCarousel` — see **Horizontal Tracks** below), **plus the motion system** (Lenis smooth scroll + Motion.dev viewport reveals). The blob-hero engine (BLOBS morph, hover push, paragraph cycling) retired 2026-08 — archived copy in `archive/blob-hero-2026-08/js/main.js`. See **Motion & Scrolling** below for knobs — don't re-read the whole file.
- **CSS entry:** `style.css` — **@import list only, no rules.** Do not add styles here.
- **CSS components:** `css/components/`
  - `global.css` — reset, design tokens (`:root` custom properties), base typography, focus/skip-link, `.site-container` layout, `.page-section` structure, custom cursor, `.visually-hidden`, **motion reveal initial state** (`html.is-motion [data-reveal]`) + Lenis classes (`html.lenis`)
  - `header.css` — `.site-header`, `.site-nav-bar`, nav links, `.is-over-dark` inversion state. **Now the ≤480 homepage only** — it's `display:none` over the landing at desktop and the project pages dropped it (2026-08) for the shared `.intro-bar`. Don't build new nav on it.
  - `hero.css` — the **landing** (2026-08, Figma 339:3745): `.page-field` full-page gradient image **plus the WebGL field layered over it** (`.page-field-canvas` / `.page-field-grain`, 2026-09 — see **The animated field**), `.intro` stage (statement / divider / frosted band / `.intro-bar` bottom nav), the divider-mask load reveals, and the `is-loading` page hold. The previous blob hero is archived in `archive/blob-hero-2026-08/`.
  - `sections.css` — `.page-section` content: Selected Work (the horizontal `.work-list` track — see **Horizontal Tracks**), Contact (including its **soft leading edge** and the parallax peek — see **Contact's soft leading edge**), About, case-study placeholder. It also still owns the **footprint link list** (`.footprint-group` / `.footprint-group-title` / `.footprint-list` + the `↗`), whose only consumer is now the project pages — see **Public Footprints** below.
  - `footer.css` — `.site-footer`
  - `project-overview.css` — the shared Project Overview template: §0 `.intro-bar--page` (the landing's nav bar pinned to the top of these pages), `.project-hero`, `.project-masthead` (title + metadata `<dl>`), `.project-block` (description / impact / role), §0a the section-seam rules, `.next-case` (§9) with its two treatments — `--image` (destination art, the pager) and `--outline` + `--locked` (the hairline Full-case-study card) — (`.project-locked` / `.invite-button` were deleted 2026-08), the `.project-carousel` masthead crossfade, and `.section-pills`. Imported after `sections.css` (it leans on `.section-label`, `.about-body`, `.contact-connect-links`) and before `responsive.css`.
  - `mobile-menu.css` — the ≤480 `.mobile-menu` overlay (the connect-only panel
    behind the header's "Say hello" trigger) on every page.
  - `responsive.css` — **ALL width breakpoints, site-wide.** Organized by screen size (1440 → 1024 → 768 → **680** → 480px). Imported last so it overrides desktop styles. The 680 tier is a NAV-ONLY tier — see **The nav hand-off at 680** below.

## Landing (2026-08) — "Making products make sense."
The homepage hero is the Figma 339:3745 landing: `images/hero-bkg.jpg` laid as
a PAGE background at `z:-1` inside `main` (a stacking context — body's own
background otherwise paints over negative-z elements). **THE FIELD IS KEPT OFF
SELECTED WORK BY TWO THINGS, AND THEY DIVIDE THE JOB BY SCROLL STATE (2026-09):
a short eased MASK at rest, and a scroll-linked TUCK (`--field-scroll`) once the
reader moves.** See **The field tuck** below for the second. It used to run past
the fold and dissolve into the cream on its own, which was true of the JPEG (its
lower reaches are near-white) and NOT of the shader, whose blobs are larger and
more saturated and left visible colour under the bar and over Selected Work.

⚠️ **THE MASK IS 17 STOPS IN PX ON `.page-field`, AND IT ENDS AT THE FOLD — not
on the artwork's bottom, and NOT on the nav bar's top.** It runs
`--field-mask-start` → `--field-mask-end`, where
`--field-mask-end: min(100%, calc(100svh + --field-rise))` — **the end of the
landing viewport**.
⚠️ **SO COLOUR DOES REACH THE NAV, DELIBERATELY.** An earlier version of this
entry ended the ramp on the bar's TOP and claimed "no gradient ever paints behind
the nav"; that was true then and is not now. The ramp was moved DOWN a whole
bar-height to reveal more gradient — measured alpha at the bar's top edge is
**~0.16 at 1440×900 and ~0.52 at 1440×740**, because a short window packs the
bio, the bar and the fold together. See the `--field-rise` note below for the
trade, and put `--field-mask-end` back to `calc(100svh - 64px - --bar-tail)` to
restore the clean strip.

⚠️ **`--field-rise` (30px) MOVES THE ARTWORK WITHOUT MOVING THE SCRIM, and the
`+ --field-rise` in the mask is what buys that.** The two live in different
coordinate spaces: a mask resolves in the ELEMENT'S OWN BOX, so translating the
element drags the dissolve along with it. Adding the same amount to the mask's
end cancels it exactly — element goes up N, stops go down N in element space,
ramp lands on the same PAGE pixel.
- ⚠️ **It cancels only the `100svh` term, deliberately.** `100svh` is a PAGE
  position (the fold) and must be held. `100%` is the ARTWORK'S OWN BOTTOM EDGE,
  which genuinely does move up with the artwork — there is nothing below it left
  to dissolve. Verified: at 1440×740 (fold binds) the scrim stays on page 591→740
  at every rise; at 1440×900 (artwork's bottom binds) it rides 879 → 849.
- ⚠️ **30px IS THE CEILING, MEASURED — 45 ALREADY FAILS.** Raising the artwork
  trades the bio for the headline, pulling richer colour up behind the headline
  and leaving the bio on paler ground. At 1440×900, the binding case: **rise 0 →
  bio 3.10 / headline 2.53 · 30 → 3.04 / 2.60 (shipped) · 45 → 2.99 FAILS · 60 →
  2.97 FAILS · 90 → 2.84 FAILS.** 1440×740 is looser (3.22 → 3.16) and does not
  bind. The bio's 3:1 is the wall.
- **≤480 is untouched**: that tier replaces `.page-field`'s transform outright so
  it never reads `--field-rise`, and its mask's `100%` term binds at 763 against
  the `842` the `+30` produces, so the shift cannot reach it either.
⚠️ **THIS USED TO BE THE NAV BAR'S TOP (`100svh - 80`) and was moved DOWN a whole
bar-height, deliberately, to reveal more gradient.** The ramp keeps its length
and simply sits 80px lower, so nothing is traded for the extra colour — and it
pays twice: the bio ends up 80px CLEAR of the ramp instead of touching it, and
red's core comes back out of the fade at short viewports (alpha 1.0 at 1440×900).
⚠️ **THE CONSEQUENCE IS COLOUR BEHIND THE NAV** — measured alpha at the bar's top
edge is ~0.16 at 1440×900 but **~0.52 at 1440×740**, because a short window packs
the bio, the bar and the fold together. There is no way to move the ramp down and
keep that strip clean; the nav is physically in the band. Put it back to
`calc(100svh - 64px - --bar-tail)` for a clean strip and a shorter reveal.
⚠️ **`--field-bar-top` IS DELETED**, along with the ≤680 tier's neutralising
override. It existed only to anchor this. A token nothing reads is the exact
hazard that took the field down once (the dead GLSL `LAYER`) and silently pinned
the ramp another time (a stale `--field-fade`) — `100svh` needs no per-tier
handling because it is true where there is no bar.
⚠️ **`100%`, NOT `--field-bottom` — they are the same number on desktop and
DIFFERENT ONES at ≤480.** A mask resolves in the ELEMENT'S OWN BOX;
`--field-bottom` is a PAGE coordinate, and the phone tier bakes its
`+--field-nudge-y` transform into it. Measured at 375: `--field-bottom` is 792
against an element only 763 tall, so the ramp ran off the bottom of its own box
and the artwork ended at **alpha 0.16 — a soft cut instead of a dissolve.**
⚠️ **`--field-clip` IS DELETED** (from `:root` and from the ≤480 tier); an earlier
entry described a `calc(100% − --field-clip − --field-fade)` mask the file no
longer has. **`--field-fade` still exists and IS live** — every stop reads it.
- ⚠️ **A PERCENTAGE MASK CANNOT DO THIS, which is why the stops are px.** The
  field's height follows the viewport's WIDTH and the bar's position follows its
  HEIGHT, so the bar lands at a different FRACTION of the artwork at every window
  size: measured, the bar's top is **93% of the field at 1440×900, 75% at
  1440×740 and 67% at 1024×768.** One percentage is wrong at two of those. Before
  this, the bar STRADDLED the fade — near-full colour above it, cream immediately
  below — so the dissolve ran straight across the nav.
- ⚠️ **THE CURVE IS A SMOOTHSTEP (`1 − (3t² − 2t³)`), AND THE SHAPE IS WHAT READS
  SMOOTH — the length is secondary.** Three shapes were tried and each failure
  explains the next:
  1. `clip-path: inset()` — a hard cut by definition, rejected on sight.
  2. a **170px LINEAR** ramp — replaced the cut with a visible horizontal **BAND**.
     A straight alpha line has a slope discontinuity at each END and the eye reads
     those two corners as edges even when no single pixel is a step.
  3. an **EASE-IN** ramp — killed the band and still looked abrupt. Built to hold
     the artwork at full strength as long as possible, it put HALF the alpha drop
     in the last third, so the transition compressed into a narrow strip above the
     nav *no matter how long the ramp was*. Lengthening could not fix a shape
     problem.
  A smoothstep has **zero slope at both ends** (neither corner exists) and puts
  alpha 0.5 at the true midpoint. **Never take it to two stops.**
- ⚠️ **THE STOP COUNT IS THE THIRD THING THAT MATTERED.** Browsers interpolate
  LINEARLY between gradient stops, so the count sets how faithfully the curve is
  actually drawn — every stop is a small slope discontinuity, the same defect that
  made the linear ramp band, repeated small. At eighths on a 67px ramp the stops
  land 8px apart and those seven corners read as faint Mach banding on saturated
  colour. **Sixteenths** puts them ~4px apart with a largest alpha step of 0.093.
  ⚠️ **The fix for a visible band is MORE STOPS BEFORE MORE LENGTH** — resampling
  is free, lengthening spends the room between the bio and the bar. Go to 24 stops
  before reaching for the length.
- ⚠️ **THE LENGTH IS MEASURED, AND THE CONSTRAINT IS ONE-SIDED.**
  `--field-fade: clamp(90px, --field-gap, 300px)` — the measured room between the
  bio and the bar (see **The field tuck**), never a fraction of the field's height.
  Resolved: **229px at 1440×900 · 149px at 1440×740 · 119px at 1440×680 · 96px at
  1024×768.**
  ⚠️ **A FACTOR OF 1.0 IS THE CEILING: the ramp starts exactly where the bio ends
  and never touches it.** `--field-gap` IS that room, so 1.0 spends all of it.
  ⚠️ **1.14 WAS TRIED AND MEASURED AS A REGRESSION — do not "reclaim" it.** The
  reasoning was that a smoothstep is still at alpha 0.957 an eighth of the way
  down, so the ramp could start that much higher for free (solve
  `1 − gap/fade ≤ 0.125`). It is not free: composited through the mask at
  1440×900 the bio's floor went **3.02 → 2.95, under its 3:1 threshold**, on a
  nominal 4% attenuation. A ramp that touches white type costs more than its
  alpha figure suggests, because it lightens the WORST pixel and the worst pixel
  is what the threshold is measured on.
  ⚠️ **MEASURE CONTRAST COMPOSITED THROUGH THE MASK, NOT OFF THE CANVAS.**
  `readPixels` reads the drawing buffer, which is BEFORE the CSS mask, so any
  figure taken that way is optimistic wherever the ramp overlaps the type — that
  is what hid the 1.14 regression at first. Sample the canvas, then blend each
  pixel toward `FIELD.cream` by the smoothstep's alpha at that page y.
  The only floor is banding; 90px is it.
`--bar-tail` (16px) is the gap between the bar's bottom and the hero's, and
`.intro-bar`'s `margin-bottom` reads the same token so the two cannot drift.
The hero stage: statement (top half, 96px Hanken) →
full-width hairline divider (**at the exact centre MINUS `--hero-lift`** since
2026-09 — see below) → frosted band (bottom half,
backdrop-blur) with the bio in its right column → `.intro-bar` along the
bottom (wordmark hard left; Work·About with the header's chip hover states +
the solid-black "Say hello" pill grouped hard right, one `--gap-group` apart —
see **The landing nav bar** below). Load: the divider "emits" headline up + bio
down (masked by each region's overflow, 64px travel over a 40px gap,
REVEAL.ease), then the bar fades in — all CSS, reduced-motion exempt. The
sticky header stays in the DOM, tucked above the viewport over the hero
(js/main.js) and sliding in past the fold; at **≤680** the tuck is neutralized,
the `.intro-bar` is hidden, and the floatie pill + header Contact trigger
carry mobile nav. **At ≤680 the header is `position: fixed` and FLOATS over the
hero** so the field reaches the top of the screen — it is bare while the page
rests at the top (`html.is-at-page-top`, a third pre-paint flag set in
index.html's inline script beside `is-motion`/`is-loading` and maintained in
`updateScrollEffects` ABOVE its `is-loading` return) and takes back the frosted
cream glass on scroll. The BARE state is the added one, so no-JS keeps the
legible bar. Because the header left the flow there, `.intro`'s phone height is
`100dvh - 184px`, not `- 246px` — the 62px it used to eat came back off; both
numbers preserve the same ~120px Work-card peek. The phone tier also
art-directs the field (**2026-09: `--field-w` 1250px and nudged +50px right /
+120px down** — the +180 pair was tuned against the SHADER, and the shader is off
at this tier, which rendered the JPEG's headline at 1.52, below the band; 120 is
where the JPEG's two blocks land equal at 2.33 / 2.33 — was 1594.85 / +40 until the shader landed and the bio's contrast
had to be re-measured; see **The animated field**)
and drops the headline/divider/bio `--hero-drop` via `transform`, which is why
the hero box and the peek math are unaffected by that shift. **The phone tier
owns its own hero geometry tokens** (`--hero-h`, `--hero-drop`, `--divider-y`,
plus a `--field-bottom` that adds the flat `--field-nudge-y` back on): change
`--hero-drop` alone to move the whole lockup, and the frost pane follows.
That pane is re-derived at ≤480 rather than inherited — hero.css builds it out
of `50dvh` assuming a full-height hero with the divider at its centre, and
neither holds here. Watch the bio's contrast whenever the field shrinks: at a
70% crop its last lines fell off the gradient onto near-cream (white type at
1.11:1); 85% keeps them at ~1.6–2.3:1. ≤1024 tiers are INTERIM
(desktop composition, tighter insets) pending frames — **except the field, which
the tablet tier now sizes to the viewport HEIGHT** (`--field-w: max(1688.69px,
220svh, 117.27vw)`, 2026-08-31 — **`svh`, not `dvh`**, for the same reason
`.intro` uses it; the doc said `dvh` here and the code has always said `svh`). The frozen px width is a desktop assumption: it
ends the gradient at y=907 however tall the window is, while the divider stays
pinned to 50dvh and slides down with the viewport, so on a portrait tablet the
lockup walks off the bottom of its own artwork — measured 1.08:1 headline and
1.02:1 bio at 1024×1366, white on white. 220dvh restates the desktop
relationship as a ratio: landscape (1024×768) resolves to 1690px and is
deliberately unchanged, 768×1024 grows to 2253, 1024×1366 to 3005, and both
blocks land in the ~1.6–2.3 band. **It is a BALANCE, not a maximum** — the
lockup is taller than the artwork's strong band, so headline and bio pull
against each other: a first pass also dropped the −12% shift and took the bio to
2.06 while the headline fell to 1.23. Keep the shift. **Measure, don't derive**
— the bio sits in the right column, so growing the field moves it horizontally
across the gradient too, and a formula holding the vertical fraction constant
scored 1.81 where the measured fit scored 2.12. The cost is magnification:
3005px from a 3600px source is a 1.67× upscale on a 2× display, invisible on a
soft gradient but the reason not to push the ratio higher. **The desktop field grew 10% on 2026-08-31**: `--field-w` in hero.css is now
`max(1857.6px, 129vw)`, up from `max(1688.69px, 117.27vw)`. **The px and vw
terms move together** — `vw × 14.4` = the px freeze point — or the freeze stops
matching the 1440 render.
⚠️ **SUPERSEDED — DESKTOP `--field-w` IS NOW PLAIN `100vw` (2026-09).** The field
IS the viewport rather than a larger box cropped by it: at 1857×1134 against a
1440×900 fold, 418px of width and 234px of height were never seen, and the Figma
composition — drawn in a 1440×800 frame that IS the viewport — could never land
where it was drawn. **There is no px freeze and no `vw × 14.4` pairing left on
desktop**, so the paragraph above is history, not instruction. `--field-bottom`
is now just width ÷ aspect, `calc(--field-w * 0.61061)` = **879px at 1440 wide**,
which does NOT clear a 900px fold — it stops 21px short of it, and the dissolve
below is what closes that. ⚠️ **Orb x/y are now direct frame fractions** because
the field box and the Figma frame are the same rectangle; change this width and
every position must be re-derived.
⚠️ **The 1024/1025 seam is now a LARGE step, not ~10%.** Desktop resolves to the
window width (1025px at the seam) while the tablet side holds its 1688.69px
floor — a ~65% jump. Only visible while dragging a window across that exact
boundary, but re-measure landscape tablet before ever locking the two together. It puts the artwork ~2% ABOVE the original 126.5vw
composition rather than 7.3% under it, and it helps the bio: measured at
1440×900, headline 1.24 → 1.31 and bio 1.22 → 1.51. The gradient's bottom edge
moves 907 → 998px, so it now clears a 900px fold outright, and the frost pane
follows on its own (it is derived from `--field-bottom`).
**≤1024 was deliberately NOT scaled with it.** That tier keeps
`max(1688.69px, 220svh, 117.27vw)`, because raising its floor would re-scale the
landscape-tablet composition that was measured and tuned separately. The cost is
a ~10% step in field width at the 1024/1025 seam on short viewports, visible only
while dragging a window across that exact boundary. Re-measure landscape before
ever locking the two together.

**The hero is sized in `svh`, never `dvh` (2026-08-31).** `.intro`'s height,
the frost pane's two `50svh` terms and the tablet `--field-w` all use it, and
they must move together — anything sized as a fraction of the hero that stays on
`dvh` drifts away from it on exactly the frame that matters. `dvh` tracks the
CURRENT viewport, so on iOS Safari it grows the instant the URL bar collapses —
the first scroll gesture a reader makes, the one carrying them into Selected
Work — and the hero re-lays-out mid-scroll, taking the docking `.intro-bar` and
everything after it with it. `svh` is the small viewport, a fixed value, so the
hero never reflows. The trade is that once the chrome collapses the fold is
taller than the hero and a little more of Selected Work shows at rest.
⚠️ **This cannot be tested in a desktop browser or the preview pane**: `svh`,
`dvh` and `lvh` are all equal without retractable browser UI (verified — all
three read 1024 at a 1024-tall window), so a resize test proves the reflow
MECHANISM but says nothing about the unit. It needs a real iOS device.
**Two places still on `dvh` deliberately:** the ≤480 `--hero-h`
(`calc(100dvh - 184px)`, whose 120px card-peek math is tuned and would shift)
and About/Contact's `min-height`s in sections.css. The previous
blob-hero landing is archived, fully self-contained, in
`archive/blob-hero-2026-08/`.

### The field tuck (`--field-scroll` / `--field-gap`, 2026-09)

**Two mechanisms keep the artwork off the nav and off Selected Work, and they
split the job by scroll state.** The MASK (above) handles rest; the TUCK handles
motion. Both are measured, neither restates a constant from the other.

⚠️ **THE BLEED WAS A VIEWPORT-HEIGHT PROBLEM, NOT A SCROLL ONE — diagnose it that
way or you will fix the wrong thing.** `--field-w` is `100vw`, so the artwork's
HEIGHT follows the window's WIDTH and does not shrink when the window gets
shorter: measured at 1440 wide, the field's bottom sits at page **879 whatever
the height is**, while the bar's resting bottom rides `100svh`. At 1440×900 the
bar finishes at 884 and nothing shows; at 1440×740 it finishes at 724 and **155px
of gradient stood below the docked bar, over Selected Work**. The first report of
this looked like a scroll bug and is not one.

**`--field-scroll`** — published by `updateScrollEffects`, read by `.page-field`'s
`transform: translate(-50%, calc(-1 * var(--field-scroll, 0px)))`. All three
layers (img, canvas, grain) carry `.page-field`, so one transform moves the lot.
- **It is ZERO AT REST, and that is the whole design constraint.** Every contrast
  figure in this document is measured at `scrollY 0`, so a mechanism that costs
  nothing there cannot regress any of them. The resting transform resolves to
  `matrix(1, 0, 0, 1, -720, 0)` — byte-identical to the old `translateX(-50%)`.
- ⚠️ **THE OBVIOUS ALTERNATIVE IS WORSE.** Anchoring the mask alone (no tuck)
  compresses the dissolve on exactly the short viewports that have the problem,
  and the fade then runs through the bio — the block the field's whole geometry
  is tuned around.
- **Cubic ease-out**, so it answers the first gesture: 27% of the travel in the
  first 10% of scroll, 88% by halfway. ⚠️ **It was LINEAR while it was doing
  correctness work** — it had to close a gap to exactly zero at the dock. Once
  the mask ended on the bar's top by construction, the curve became free.
- ⚠️ **Easing the MAPPING is not a transition.** It stays a pure function of
  `scrollY` with no time term, so it cannot lag the page. The standing rule that
  **nothing scroll-linked may carry a CSS transition** is untouched.

**THE HERO LOCKUP RIDES THE SAME `--field-scroll` (2026-09), AND "SAME" IS THE
POINT.** `.intro-top` / `.intro-divider` / `.intro-band` add
`- var(--field-scroll, 0px)` to their `--hero-lift` transform, so type and field
move as ONE unit.
- ⚠️ **DO NOT GIVE THE LOCKUP A RATE OF ITS OWN.** Moving together keeps the
  composition RIGID — verified, the headline's offset from the field's top is a
  constant **217px at every scroll position**. That is what makes the contrast
  figures measured at `scrollY 0` valid all the way up. Give the lockup its own
  multiplier and the two drift apart, the type slides onto colour nobody
  measured, and the worst phase stops being knowable from a resting sample.
  **The parallax is between the HERO and the PAGE, not within the hero.**
- The `.intro-bar` deliberately does NOT move, so the lockup travels AWAY from
  it rather than into it.
- **Not added to the ≤480 rule** — `--field-scroll` is provably 0 wherever the
  bar is `display: none`, so it would be inert config there.

**`--field-gap`** — the measured room between the bio's last line and the bar's
top, published by `measureFieldTuck` and read by hero.css to size the dissolve.
⚠️ **IT CANNOT BE A CONSTANT:** 229px at 1440×900, 179 at 800, 149 at 740, 119 at
680, and only **96px at 1024×768**, whose bio runs longer. `--field-fade` is
`clamp(90px, --field-gap, 300px)` — the whole gap, which is the ceiling. See the
mask notes above for why 1.14× the gap is a measured regression, not headroom.

**`measureFieldTuck` is LAYOUT-ONLY — it runs at init and on resize, never per
frame.** Two numbers, both measured, no CSS constants restated:
- ⚠️ **`offsetTop` IS USELESS FOR THE BAR — it tracks the sticky offset.** Measured:
  `introBar.offsetTop` reads 660 at rest and **1500 at scrollY 1500**. The bar's
  resting top is derived instead from `.intro`'s box plus the bar's own computed
  negative `margin-top`, so changing the pull-up in CSS cannot leave this stale.
- ⚠️ **The FIELD is measured with offsets, not `getBoundingClientRect`** — it
  carries the very transform this publishes, so a rect would feed the output back
  into its own input. Verified identical at `--field-scroll` 0 and 200px. The bio
  is measured by accumulating `offsetTop` for the same reason: the hero's load
  reveal translates `.intro-band` while this runs.
- **Resize matters more than usual here**, because the overhang is created by the
  window's HEIGHT while the field's height follows its WIDTH.
- **It skips entirely where the bar is `display: none`** (`offsetParent === null`,
  i.e. ≤680) and publishes `--field-scroll: 0`, which also clears any shift left
  over from a wider layout. Phones are untouched: they keep their own tier
  transform, which does not read the token.

### The headline MORPHS between three statements (`initHeadlineMorph`)

⚠️ **THE H1 IS NOT ONE STRING, AND EVERY HEADLINE CONTRAST FIGURE IN THIS
DOCUMENT SHOULD BE READ WITH THAT IN MIND.** `initHeadlineMorph` (js/main.js)
cycles `.intro-headline` between **three** statements — "Making products make
sense." · "Finding the patterns others miss." · "Defining how products behave."
— on a 5200ms dwell, rebuilt from motion-primitives' TextMorph in vanilla JS.
Characters shared between the outgoing and incoming statement **keep the same DOM
node** and FLIP from their old position to their new one; letters only in one
side fade. Progressive enhancement: the H1 ships in the HTML with the first
statement as plain text, so no-JS visitors and crawlers keep that and its
SEO/JSON-LD value.
- ⚠️ **A MID-MORPH SCREENSHOT LOOKS BROKEN AND IS NOT.** Caught between phrases
  the H1 reads as interleaved gibberish (measured: `"MkucakFinding the patterns
  others miss.dntepaeroem"`) with `.char-exit` spans at `opacity: 0` and
  `blur(4px)` still in the DOM. Two screenshots were misread as a rendering bug
  before this was traced. Wait out the 650ms fade before judging a capture.
- ⚠️ **THE THREE PHRASES ARE DIFFERENT LENGTHS, so they occupy different bands of
  the gradient and the headline's contrast is really THREE bands, not one.** A
  measurement that does not say which phrase was showing is under-determined.
  The figures recorded elsewhere here predate this being noticed.
- `.intro-top` is bottom-anchored and overflow-clipped, so the statements'
  differing line counts never move the divider below them.
- Skipped entirely under `prefers-reduced-motion`.

### The animated field (`initHeroField`, 2026-09)
**The gradient is RENDERED, not served** — a WebGL fragment shader on
`.page-field-canvas`, drawn **over** the JPEG rather than instead of it. Config
lives in the `FIELD` object at the top of `initHeroField` in js/main.js; the
tuning harness is `lab/field-shader.html` (excluded from the build), whose
**Export config** button emits a paste-ready `FIELD`.

**The values come from the FIGMA SOURCE (521:3788), never from sampling the
JPEG** — and this is the trap, because sampling the JPEG is the obvious move and
it is wrong. The export is the faded RESULT: sampling it recovers the blobs'
OVERLAP PRODUCTS and presents them as sources. A first pass did exactly that and
produced seven blobs, three of which (periwinkle, sky, pink) do not exist in the
file at all — they are where blue meets violet and red meets magenta. Baking
mixes in as ingredients and then mixing again is why it read muddy.
- **FOUR circles**, painted bottom to top: magenta `#D64DCE` · violet `#9238E3`
  · red `#F93F3F` · cyan `#019FD8`.
  ⚠️ **THAT ORDER IS NOT FIGMA'S, AND THE DEPARTURE IS THE POINT.** Figma paints
  magenta, red, violet, cyan — red third from the top, under violet. **Red was
  lifted ABOVE violet (2026-09) and it is the single change that made red
  visible.** Measured: with red under violet the field's reddest pixel stayed at
  x 0.42 no matter where red's CENTRE was moved, because violet (x 0.942,
  r 0.5054) covered it and red only survived where violet's alpha had fallen off.
  ⚠️ **PROMINENCE IS PAINT ORDER, NOT RADIUS OR POSITION** — established four
  separate times here now (cyan, magenta, violet, red). Check the order first.
  ⚠️ **AND RED IS THE LIGHTEST ORB, so it cannot just be parked under the bio.**
  White on red is 3.61:1; white on violet is 5.40:1. Moving red under the bio in
  violet's PLACE measured 2.50–2.77 — its worst of any variant, on the very block
  the move was meant to help. Above violet it is additive instead: source-over
  keeps violet underneath, so the bio reads **3.02–3.20** while red's visible area
  goes 41.5% → 54.9%.
- ⚠️ **`FIELD.layer` IS DOCUMENTATION ONLY — NOTHING READS IT.** It records
  Figma's 0.9 layer opacity; the field has always painted at full opacity. It
  used to be interpolated into the shader as a `LAYER` constant the shader body
  ignored, which made a dead value into a live hazard: setting it to `1.0` made
  JS stringify it `"1"` and emit `const float LAYER=1;`, an int-to-float type
  error that failed the whole compile, threw `initHeroField`, and dropped the
  page to the JPEG fallback — a config-only edit taking the field down. That
  emission is gone. **Anything interpolated into the shader string must be a
  GLSL-valid literal.** Do not "fix" this by wiring 0.9 into the composite: every
  radius, `midAlpha` and both contrast bands were tuned with it absent.
- **One ramp, shared by all four:** colour at alpha 1 → **`midAlpha` at offset
  0.524038** → **WHITE at alpha 0**.
  ⚠️ **`midAlpha` IS 0.5, NOT FIGMA'S 0.3 — and it is the most useful number in
  the object.** The ramp collapses each orb to `midAlpha` by 52.4% of its radius,
  so at 0.3 the GAPS BETWEEN ORBS — exactly where the headline and bio sit — fall
  to near-cream. Measured over the viewport at 1440×900: 0.30 → sat 0.407,
  headline 2.56, bio 2.74 · 0.40 → 0.447 / 2.82 / 2.99 · **0.50 → 0.486 / 3.04 /
  3.22** · 0.60 → 0.522 / 3.17 / 3.42. Figma's own export means 0.465, so 0.50 is
  MORE saturated than the source *and* the first setting where both blocks clear
  3:1. It is the one lever found that improves look and accessibility together. ⚠️ **That last stop lifts to WHITE, not to
  transparent** — it is what dissolves the artwork into the cream page instead of
  greying out at the edges. Ramping to `transparent` (i.e. `rgba(0,0,0,0)`) drags
  every stop toward black and rings each blob with a grey halo.
- Compositing is **source-over, bottom to top**, matching Figma. Not a weighted
  average — the overlaps have to stack or the mixed hues come out wrong.
- Blob **placement is transcribed from Figma `TeNe3E4y6xGRTFC1CrEPuX` / `37:23`**
  — a 1440×800 frame (the fold, not a page) holding a 2747×2309 group — with one
  exception: red's x/y, which the paint-order work above moved to (0.590, 0.640).
  ⚠️ **THE GROUP OFFSET IS FITTED, NOT ASSUMED.** Figma gives the group's box but
  not where it sits in the frame, and "centred" was wrong once already (55px out).
  A grid search against the downsampled export lands at (−662, −696), RMS 0.065.
  **RE-FIT WHENEVER THE NODE CHANGES** — it has changed four times, each with a
  different frame size, orb count and paint order. The conversion is in the
  `blobs` comment in js/main.js; superseded values live in `lab/field-shader.html`'s
  `FIGMA.source`.
  ⚠️ **RADII ARE NOT THE FILE'S** — they are 0.5669 / 0.5054 / 0.6275 / 0.4738
  (magenta / violet / red / cyan), roughly 1.7–2.5× the file's, grown to back the
  text. An older entry here quoted .300→.325-scale numbers; those are long gone.

**FAILURE IS ALWAYS THE JPEG, and nothing may change that.** The `<img>` stays,
keeps `fetchpriority="high"`, and its URL stays byte-identical to the
`<link rel="preload">`. The canvas and grain are `opacity: 0` until
`html.is-field-live` lands, which `initHeroField` sets **only after a frame is
genuinely drawn**. So no-JS, no-WebGL, a driver refusal and a shader compile
error all rest on exactly the previous hero, and the image is still the LCP paint.
- ⚠️ **Never give the canvas its own background.** A cream fill would cover the
  image before the first frame and make the fallback worse than what it replaces.
- The call is **null-guarded AND wrapped in try/catch**. main.js is shared by
  every page and `is-motion` hides every `[data-reveal]` pre-paint, so an
  uncaught throw here blanks the whole site. The field is decorative; the image
  under it is the real content.

**Canvas and grain both carry `.page-field`, and that is the whole reason there
is no new responsive work.** They inherit its box and every per-tier override
with it — `--field-w` at all three tiers and the ≤480 crop nudge. The art
direction is expressed as **width + transform, never as an image crop**, so it
applies to a canvas unchanged. ⚠️ **THAT COVERS THE BOX, NOT EVERYTHING — this
entry used to say "nothing was added to responsive.css" and that is now false.**
Two field rules live there deliberately: the **480** tier switches the canvas and
grain off outright (`.page-field-canvas, .page-field-grain { display: none }`,
paired with the JS bail), and the **680** tier neutralises `--field-bar-top` to
`100000px` because there is no bar for the dissolve to end on. Both state facts
about their own tier rather than re-tuning the artwork. The one thing they need of their own is `aspect-ratio: 1.6377`, because an
`<img>` derives that from 3600×2198 and a canvas cannot — the same constant
`--field-bottom` is built from, so **re-derive both together** on a re-export.

**GRAIN IS A CSS LAYER, NOT SHADER CODE** (`.page-field-grain`), and it is **art
direction** — Figma bakes an `feTurbulence` into every blob — not a banding
workaround. The shader's dither does that job separately.
- **Why it cannot live in the shader:** the canvas renders at `renderScale` 1.0,
  deliberately BELOW `devicePixelRatio` (a soft gradient has no per-pixel detail,
  so 1.0 on a 2× display is a 4× fill-rate saving nobody can see). Grain is the
  one element that *does* want device pixels — in the canvas every speck was
  doubled. An SVG background rasterises at full device resolution whatever the
  canvas does, so sharpness and the performance dial stay independent.
- ⚠️ **The `discrete` transfer is what makes grain SHARP — do not drop it.**
  `feTurbulence` is a smooth Perlin cloud at *every* frequency; raising
  `baseFrequency` and fading it down just gives finer mush. Quantising to two
  levels is what produces speckle. Figma's own export uses a discrete transfer
  for exactly this. `saturate 0` matters too (raw turbulence is COLOURED noise,
  and coloured speckle over a gradient reads as JPEG artifacts), as does forcing
  alpha to 1 (or the noise's own alpha punches holes and it goes blotchy).
- ⚠️ **`baseFrequency` and `numOctaves` are COUPLED.** Octaves stack harmonics at
  2×/4×/8× the base, so at the shipped 1.3 a third octave lands past Nyquist and
  aliases back down as low-frequency blotch — raising octaves makes it SOFTER.
  Held at 2. Coarse grain (below ~0.8) can afford 3–4.
- It is **static**, like the source. Grain redrawn per frame crawls — the shimmer
  that makes dithered GIFs look cheap.

**Reduced motion keeps the artwork and drops only the movement**: one static
frame, loop never started. The field should not change character because someone
asked the page to hold still. Drawing also stops when the canvas leaves the
viewport — observed on the **canvas**, not `.intro`, because the field bleeds
well past the fold and stopping at the hero's edge would freeze it with a third
still visible.

**Motion is dt-based, not frame-counted**, so the speed is identical at 60 and
120Hz, with `dt` capped at 100ms so a resuming background tab cannot jump the
whole animation in one frame. ⚠️ **A consequence worth knowing before you debug
it:** in any throttled context the cap makes the field run slow — at 1 rAF tick
per second it advances at one-tenth speed. That is correct behaviour, and it is
also why **the preview pane cannot judge this motion at all** (measured: the pane
throttling rAF to ~1Hz, with pixel deltas indistinguishable from dither alone).
⚠️ **THE REAL VARIABLE IS `document.visibilityState`, NOT "the pane" — and knowing
that is the difference between hours of false readings and a working test.**
Measured in one session: a HIDDEN pane reports `rafHz 0.9` and eventually stops
rAF outright, blocks media playback, and deprioritises IntersectionObserver
delivery; the SAME pane, visible, reports **`rafHz 60.3`** and behaves normally.
So a hidden pane does not merely run slow — videos never load, observers never
fire, animations freeze mid-flight, and every one of those looks exactly like a
site bug. **Check `document.visibilityState` before trusting any timing,
playback, animation or IntersectionObserver reading, and abort the measurement if
it is `hidden`.**
- **What still works while hidden:** layout. `getBoundingClientRect`,
  `offsetWidth/Height`, computed styles and `scrollLeft` are all reliable, so
  geometry bugs CAN be measured in a hidden pane. That is how the 0.17px rotation
  bug and the blank posters were both found.
- **What to do instead:** drive the user's own browser through the
  `claude-in-chrome` tools. It is visible, runs at 60Hz, and is the environment
  the reader actually has. Several bugs this file records were only reproducible
  there, because they depend on the reader's real viewport width.
- ⚠️ **A tab you have been injecting into is not a clean room.** Destroyed Lenis,
  leftover globals and prior scroll state produced "nothing loads at all" twice,
  both times mistaken for a regression. Use a fresh tab for any state-dependent
  check.
Same limitation as `DAMP.arrival` — see the note under **Damped horizontal
motion**. Judge it in a real browser window.
- ⚠️ **`motion.drift` IS THE DIAL FOR LIVELINESS — never the orbit rates.**
  Amplitude reads as restraint; frequency reads as alive. An early pass took the
  rates to 0.031 rad/s — a 203-second cycle moving ~2px/sec — which is animated
  in theory and static to a reader.
- **Shipped at 0.050 (raised from 0.038, 2026-09), and the CEILING IS MEASURED.**
  Swept at 1440×900 over 20 phases of the slowest component, composited through
  the mask: **0.038 → ±55px, bio 3.03–3.22 · 0.050 → ±72px, bio 3.02–3.24 ·
  0.056 → ±81px, bio 3.01–3.26 (passes by 0.01, too thin to ship) · 0.062 →
  ±89px, bio 2.98 FAILS · 0.070 → ±101px, bio 2.94 FAILS.** Verified at 1440×740
  too, where the bio is more comfortable (3.14–3.32) because the ramp clears it
  by 80px there.
- ⚠️ **THE FLOOR FAILS, NOT THE MEAN.** Widening drift widens the SWING (0.19 →
  0.33 across that sweep) while the ceiling *rises*, so a mean — or any single
  sample — looks fine right up to the point the worst phase is illegal. Always
  re-measure the bio's FLOOR over a full cycle before raising this.
- ⚠️ **THE ORBIT IS TOO SLOW TO SWEEP BY WAITING — drive `uTime` directly.** The
  slowest component has a ~84-unit period, and the preview pane throttles rAF to
  ~0.9Hz, so waiting for phases takes minutes and times out. Set the `uTime`
  uniform yourself and draw+`readPixels` synchronously inside ONE rAF callback:
  20 exact phases in a single frame, and the phases are reproducible instead of
  wherever the clock happened to land.
- ⚠️ **`motion.pulse` HAS NO ACCESSIBILITY CEILING, AND `motion.drift` DOES — the
  two dials are NOT alike.** The difference is entirely that the pulse is
  RECTIFIED: `(.5+.5*sin)` runs 0..1, so an orb's minimum is always its base
  radius whatever pulse is set to. Raising it can only add colour at the peak,
  never take any away, so contrast improves MONOTONICALLY. Swept at 1440×900 over
  20 exact phases, composited: **0.16 → red grows 145px, bio 3.02–3.24 · 0.35 →
  +316px, bio 3.13–3.32 · 0.45 → +407px, bio 3.18–3.38 · 0.60 → +542px, bio
  3.24–3.51** — and at 0.60 even the headline's best phases reach 3.23.
  ⚠️ **BUT THE BINDING CONSTRAINT IS HUE, NOT CONTRAST — shipped at 0.30.** Taken
  to 0.60 the field visibly "becomes purple at one point". The cause is NOT a
  more purple peak: the purple maximum barely moves (**40.4% → 41.8%** of the
  field across every setting tried, the original included). It is that the
  **TROUGH GETS PALER** — small orbs leave more cream, so the purple share falls
  **31.9% → 17.9%** and the field cycles between washed-out and purple. That
  EXCURSION is what the eye catches. Purple swing by pulse: **0.16 → 8.7pts ·
  0.25 → 11.9 · 0.30 → 13.7 (shipped) · 0.35 → 15.6 · 0.60 → 24.0.**
  ⚠️ **`drift` IS NOT INVOLVED IN THE PURPLE, and it was the first thing reached
  for.** Hold pulse and change drift: the swing is flat (15.9 → 15.7 at pulse
  0.35; 24.6 → 24.0 at 0.60). Hold drift and change pulse: it nearly triples.
  **When the field's COLOUR misbehaves over time, measure pulse; when its
  POSITION does, measure drift.**
  ⚠️ **Do NOT "restore" a bare sin so it shrinks below base.** That was the
  original form and the trough pulled every orb's reach in by 8% at once, which
  is what put the bio's worst phases under threshold.
- **The motion is real but slow by design** — measured on the live site: ±72px
  horizontal over 16–44s per orb (two incommensurate sines, so the path never
  repeats), ±9px vertical, and a +30% radius pulse over 27–45s. Raising drift
  0.038→0.050 and pulse 0.16→0.30 took the share of the field moving more than
  the dither floor from **5.8% → 10.7%** and up again. ⚠️ Confirming it
  runs is a MEASUREMENT, not a look: in the pane, rAF at 0.9Hz plus the 100ms
  `dt` cap means the field advances ~0.09s of animation per wall second, ~11×
  slow. Sample the canvas twice a few seconds apart and compare against the
  dither floor (±1 code value); a max delta of ~10 is the loop running.

⚠️ **`--hero-lift` IS `0px` (2026-09) — the section below describes a 60px lift
that is no longer applied.** It was zeroed because the Figma lockup mock
(`TeNe3E4y` / `37:23`) places the divider at the hero's exact centre and the orb
positions are drawn against THAT; lifting the lockup while keeping the mock's
field put the type above its colour and measured the headline down at 1.75–2.15.
The token is KEPT rather than deleted — the frost pane's `top` and `height` still
read it, so one number still moves the whole lockup if it is ever wanted again.
Everything below remains the correct description of what it does when non-zero.

**`--hero-lift` MOVES THE WHOLE LOCKUP UP (hero.css, was 60px, 2026-09).** The
desktop mirror of the ≤480 tier's `--hero-drop`, and like it, **the ONE number
to change**: headline, divider, bio and the frost pane all read from it.
- It is a **TRANSFORM** on `.intro-top` / `.intro-divider` / `.intro-band`, so
  `.intro`'s box, the Work-card peek and the docking bar's maths are untouched —
  only the composition inside the fold moves.
- ⚠️ **The pane's `top` AND `height` both compensate.** `top: calc(50% -
  --hero-lift)` keeps the glass starting on the divider; the height gains the
  same `+ --hero-lift` or the pane ends short of the artwork and leaves an
  unfrosted tail behind Selected Work. (Measured at `--hero-lift: 0` and 1440×900
  the pane runs 450 → 900 while the field bottom is 879, so the pane now overruns
  the artwork by 21px rather than matching it — harmless while the frost is off,
  but re-derive both if the pane is ever switched back on.)
- **≤480 overrides the same three selectors** (responsive.css imported last) and
  re-derives its own pane, so phones keep their +70px drop untouched.
- **The contrast gain was large**, because the bio moved up onto richer colour:
  1.95–2.47 → 2.24–2.75 from the lift alone.

⚠️ **THE FROST IS OFF ENTIRELY (2026-09) — `.intro::after` no longer blurs or
tints at all.** The rule still exists and still spans divider → field bottom, but
its `backdrop-filter` lines are commented out and it declares no background: the
Figma lockup mock has no blur below the divider, the artwork is as crisp there as
above it, and the hairline is the only thing marking the seam. The tint had
already been walked 0.12 → 0.06 → none, each step bought back white-bio contrast.
The paragraph below records that middle step and is kept for the rule it states.

**THE FROST WAS 0.06, NOT 0.12 (2026-09).** `.intro::after`'s cream wash was
halved while `blur(7px)` stayed. The blur is the effect; the tint only colours
it — and the tint was subtracting contrast from the white bio sitting on it.
Bio 2.24–2.75 → **2.48–2.89**. ⚠️ If this is tuned again, **drop the alpha, keep
the blur** — glass reads as glass because of the blur.

⚠️ **PHONES (≤480) GET THE JPEG ONLY — NO SHADER (2026-09).** `initHeroField`
bails on a `(max-width: 480px)` match and the 480 tier sets the canvas and grain
to `display: none`. Bailing in JS is the point: no WebGL context, no shader
compile, no render loop, and none of the per-frame `backdrop-filter` work the two
glass layers would otherwise do over a moving field — `display: none` alone would
leave the loop running invisibly. ⚠️ **The two are PAIRED**, like
`initWorkCarousel` and its tier: move one and you must move the other.
⚠️ **AND THE TIER'S GEOMETRY IS TUNED TO WHATEVER IT ACTUALLY PAINTS.** The
shader and the JPEG have different colour distributions, so `--field-w` /
`--field-nudge-y` tuned for one is wrong for the other — the shader-tuned
1250 + 180 renders the JPEG's headline at **1.52**, below the band. Now 1250 +
120: headline 2.02 / 2.89, bio 1.76 / 2.59. Re-measure on a SETTLED page load;
flipping the properties inline and sampling immediately reads low.

⚠️ **THE ORBS WERE GROWN TO BACK THE TEXT (2026-09), and that is what the
radii are for.** They are not a faithful trace of the Figma file's sizes — the
file's own r values are kept in `lab/field-shader.html`'s `FIGMA.source`. Two
findings drove it:
- **RED IS POSITIONED TO BACK THE BIO.** The bio's centre in field space is
  ~(0.65, 0.64) at 1440 and 1024, and (0.50, 0.60) at 768. Red sat at (0.610,
  0.515), which put the bio's RIGHT EDGE at 80% of red's radius where the ramp
  has collapsed to ~0.13 alpha — visible as white behind the type.
  ⚠️ **It cannot simply move down to meet the bio.** A blob's vertical reach is
  `r × aspect` (the distance metric divides dy by aspect), so red already
  reaches v≈0.93; dropping its centre to the bio's y pushes colour past the
  field's bottom and undoes the bleed fix. **Right is free, down is not.**
  ⚠️ **SUPERSEDED (2026-09): red now sits at (0.590, 0.640)** — level with the
  bio's own y. The prohibition held only while the mask ended at the artwork's
  bottom; the dissolve is anchored to the nav bar now, so pushing colour below it
  costs nothing. And moving the centre was never the lever anyway — see the
  paint-order note above.
- **Growing all four is what actually fixed the pale lower-left.** Moving red
  alone helped 1440/1024 and REGRESSED 768 to 1.57 (below band), because that
  tier's bio is full-width and centred at x 0.50. Radii went violet .300→.325,
  cyan .220→.285 (also y .325→.360), magenta .330→.365 (x .270→.300), red
  .290→.310. Measured after — headline / bio avg range:
  **1440×900 2.75–3.13 / 2.00–2.29 · 1024×768 2.88–3.17 / 2.04–2.34 ·
  768×1024 2.58–3.29 / 1.93–2.53.** Best the hero has measured; the bleed at
  Work's top moved only 0.016 → 0.020.
- **Cyan was the lever**, not red: it was the smallest orb and sat highest, so
  the gap it left was exactly the band the bio sits in.

⚠️ **THE FIELD IS ANIMATED, SO CONTRAST IS A RANGE, NOT A NUMBER.** White type
over it changes legibility with the orbit phase, and a single sample is worth
little — an early ≤480 measurement was ~0.4 out for exactly this reason.
`FIELD.motion.speed` is mutable at runtime, so fast-forward it (90 works) and
sample a dozen phases. **This also caught a real regression:** the shader shipped
with the phone bio at **1.46** where the JPEG had held **2.34**, because the
tuned blobs sit higher and the phone crop left the bio on near-cream. Fixed at
≤480 by taking `--field-w` to 1250 and `--field-nudge-y` to 180 — measured
headline 1.73–2.36, bio 1.77–2.41 across a full orbit. ⚠️ **The two pull against
each other** (every 70px of nudge is roughly +0.3 bio / −0.25 headline), the same
balance the 1024 tier documents. Re-measure BOTH after touching either.

⚠️ **THE BIO IS 24px / weight 500 / leading 1.4 — AND THE SIZE IS ACCESSIBILITY,
NOT TASTE.** The **500 is undocumented elsewhere and load-bearing**: body copy on
this site sits at 400, and this is the one prose block that departs, because it is
white type over the field and the extra stroke weight is doing legibility work the
contrast cannot. Inter is loaded variable (`wght@400..700`), so it costs no extra
download. ⚠️ Weight does not change the WCAG class at this size — 24px is large
text at **any** weight — so dropping to 400 would not re-trigger 4.5:1, it would
just lose the legibility. WCAG large text is 18pt/24px at any weight; below it, type is normal
text and wants **4.5:1** instead of 3:1. Three passes of field tuning were spent
chasing 4.5, and an exhaustive search of the orb space (violet x/r, magenta x,
cyan r, red r) found **no arrangement that reaches it** — the geometry's ceiling
is ~3.8. The bio's floor was already above 3.0, so the compliant move was to
change the TYPE CLASS rather than the artwork. **Leading stays 1.4**, not the old
dek's 1.08: only size and weight decide the class. Measured at 1440×900 over 22
orbit phases — **2.90–3.63, mean 3.34, below 3.0 at 2 of 22 phases.** Those two
dips are the drift passing pale underneath; lowering `motion.drift` would close
them. Line counts: 3 at 1440 and 768, 5 at 375, no overflow at any tier.
⚠️ **THE HEADLINE IS THE REMAINING FAILURE**: 2.62–2.96 over the same 22 phases,
below its 3:1 at **every** one. It is already 96px/700, so there is no type class
left to gain — only a scrim, or accepting it as a documented exception.

The paragraph below is the superseded reasoning, kept because the mechanism it
describes is still how the threshold works:

⚠️ **THE BIO WAS JUDGED AGAINST 4.5:1, NOT 3:1 (2026-09, superseded above).** `.intro-bio`
moved from a 24px dek (leading 1.08) onto `--size-lg`/1.4 — plain body copy,
matching `.about-body p`, `.work-card-description` and `.project-dek`. At 24px
white regular type was WCAG **large text** and wanted 3:1; at 18px it is normal
text and wants **4.5:1**. Nothing that was passing regressed — the measured band
cleared neither threshold — but the shortfall roughly doubled, so any future
field tuning is aiming at a target 1.5 points further away.
- **The measured number actually IMPROVED**, which is the counter-intuitive
  part: fewer, tighter lines means the block ends higher, and the bottom line is
  always the weakest (it is the one that runs off the gradient onto near-cream).
  Same orbit phase, 375×812, worst pixel per line: **5 lines at 24px floored at
  1.92**; **4 lines at 18px floor at 2.06**. One phase, not the full orbit —
  it is a same-phase A/B of the geometry, so use it for the DELTA and keep
  1.77–2.41 as the band.
- **The block's TOP is anchored, so the lockup does not move.** Measured
  identical at 1440 (426), 768 (552) and 375 (360); only the bottom rises.
  Desktop barely changes at all — 3 lines either way, 78px → 76px — because the
  541.66px column was already setting the same count (verified at both sizes).
  The tiers that visibly gain air are 768 (3 lines → 2) and 375 (5 → 4).

⚠️ **THE FIELD'S UP-SHIFT IS CAPPED BY THE BIO, NOT BY TASTE (2026-09).** The
shift went **−12% → −18%** to pull the artwork's bleed out of Selected Work: the
shader's blobs are larger and more saturated than the JPEG's, so more colour
survived past the fold than the old "dissolves into cream on its own" assumed.
Measured at 1440×760 (short window, where Work's top sits highest), peak
saturation at Work's top: **−12% 0.132 · −16% 0.098 · −18% 0.061 · −20% 0.069
· −24% 0.048.** Going further is what the bio cannot afford — avg contrast
floor: −16% 1.87 · −18% 1.68 · −20% ~1.6 · −24% 1.30.
- ⚠️ **`translateY` and `--field-bottom`'s factor are ONE number written twice.**
  0.84/0.82/0.88 ÷ 1.6377 — re-derive the factor whenever the shift moves or the
  frost pane stops ending where the artwork does. hero.css carries both.
- **≤480 is insulated** — that tier restates BOTH the transform and the factor
  with its own −12%, so desktop changes never reach it. It also shows the JPEG,
  which has a different colour distribution, so it must be tuned separately.
- **Raising the LOCKUP recovers some of the cost, but not enough to be worth it.**
  Tested: −24% flat gives bio 1.30; −24% with the text lifted 60px gives 1.47;
  −28%/+80px gives 1.62 — better than −24% flat despite a higher field. So the two
  moves really do trade. But none beat −18% at rest, and lifting the lockup puts
  the divider off the exact vertical centre and drags the frost pane's `top: 50%`
  anchor with it. **Not a nudge — a composition change.**
  ⚠️ **This was subsequently DONE deliberately — see `--hero-lift` below.** The
  note stands as the reason not to reach for it to fix contrast; it was reached
  for as a composition decision, and the contrast gain came along with it.
- **The zero-cost fix, if the bleed ever needs to go entirely:** a vertical
  falloff at the bottom of the SHADER, ramping to cream over the last ~20% of the
  canvas. It only touches the region below the text, so it costs the bio nothing
  and leaves the divider alone. About four lines of GLSL, not yet built.

⚠️ **UNRESOLVED: `backdrop-filter` cost over a moving field.** `.intro::after`
and `.intro-bar::before` both sample this field. ⚠️ **HALF OF THIS RESOLVED
ITSELF:** `.intro::after`'s blur is commented out, so only ONE layer blurs over
the field now, and the bar's filter is `blur(calc(16px * (1 - --dark-mix)))`
rather than the 5.5px recorded here. Over the static JPEG the browser blurred once and cached; over the canvas
both re-blur every frame, full width. `updateScrollEffects`' guard on
`--dark-mix` / `--bar-bleed` (written once and checked against its last value
precisely because those invalidate a backdrop-filter) no longer buys anything —
the layer is invalidated every frame regardless. Fine on an M-series Mac,
**untested on a mid-range Android**, and not testable in the preview pane. If it
stutters, the fix is to stop compositing: render the blurred lower half inside
the shader instead of blurring above it — one draw rather than a draw plus two
full-width blurs.

**The field asset is ONE file, and its name is the source's name.** The repo
holds only `images/hero-bkg.jpg` — 3600×2198, ~1.4MB, and that file is already
the compressed derivative. The 18MB+ Figma export it came from has **never been
committed**; it lives outside the repo. There is no `images/hero-bkg-web.jpg`
and there never was — an earlier version of this doc described a two-file
source/derivative pair the repo has never had, so don't go looking for the
`-web` file or rebuild the split. Regenerate by running
`sips --resampleWidth 3600 -s formatOptions 78` over the external source and
**overwriting `images/hero-bkg.jpg` in place**, then bump its `?v=` by hand
(images aren't touched by the pre-commit stamper) in **both** places that name
it — the `<link rel="preload" as="image">` in index.html's `<head>` and the
`<img class="page-field">` in `<main>`. Those two URLs must stay byte-identical
or the preload fetches a second copy of a 1.4MB LCP image instead of priming
the one the page uses. **The image is now the FALLBACK as well as the LCP paint**
(see **The animated field** above) — it is what every visitor without WebGL sees,
so it cannot be dropped even though a shader usually covers it. The `<img>`'s `width`/`height` are the asset's real
pixels — re-derive them on a re-export, and re-check the `1.6377` aspect that
hero.css's `--field-bottom` is derived from.

### The nav hand-off at 680 (2026-09)
**The desktop bar is shown down to 681px and no further**, because that is where
it stops fitting. It is content-width and cannot shrink — every item is `nowrap`,
and a flex item will not go below min-content — so a narrower viewport does not
compress it, it simply overflows and the "Say hello" pill runs off the right edge.

Measured at 1440 with the 2026-09 labels: `24px padding ×2 + wordmark 147.8 +
gap 48 + links (106.26 + 48 + 77.89) + gap 48 + pill 117.89 = **641.84**`, and
~644.5 once the scroll-spy puts the Work link on `wght 600`. **Re-measure that sum
whenever a nav label changes, and move the breakpoint** — 680 is that number plus
~35px for a font fallback.

⚠️ **This band was broken before the 2026-09 rename too** — the old "Work"/"About"
bar needed 541px, so 481–540 already clipped. The rename widened an existing
fault; the 680 tier is what actually closed it.

**The tier carries NAV AND (almost) NOTHING ELSE.** The one non-nav-looking rule
is `:root { --field-bar-top: 100000px }`, and it earns its place by stating a nav
fact: there is no bar here, so the hero field's dissolve has no bar-top to end on
and falls back to the artwork's own bottom. Otherwise it holds exactly the rules
that swap
the bar for the mobile header + floatie: `.intro-bar` off, `.site-header`
fixed/visible/bare-at-top, the tuck neutralized, `.intro-bar--page` collapsed to
wordmark + "Say hello", `.section-pills--site-nav` on, and the header row / inline nav
/ trigger / overlay switches. Every one of them simply MOVED UP from the 480 tier,
so ≤480 is unchanged (`max-width: 680` matches phones too, and the 480 block still
follows and wins where they overlap).
- **Do not put type, spacing or composition here.** The phone hero geometry
  (`--hero-h`, `--hero-drop`, the field crop, the 120px card peek) and the phone
  type scale stay at ≤480, because they are about a phone; this is about one bar's
  arithmetic. Verified after the move: at 375 the hero is still `100dvh − 184`
  and the card peek still measures exactly 120px.
- **`.intro-bar` is a SIBLING of `.intro`**, not a child, and its negative top
  margin is cancelled by an equal bottom margin — which is why hiding it costs the
  hero nothing. This is what made the move safe.
- **`.intro-bar--page` must stay after `.intro-bar`** in the block: same
  specificity (0,1,0), so source order is the only thing re-showing the project
  pages' bar.
- **The homepage floatie had to come up with the bar.** The header's inline nav is
  hidden here and its trigger opens the connect panel only, so without
  `.section-pills--site-nav` there would be no route to Work or About at all
  between 481 and 680.
- **The project pages' CHAPTER floatie deliberately did NOT move** — that one is
  in-page nav for a long document, governed by page structure rather than by this
  bar's width, and stays ≤480 along with its phone pill sizing.

### The landing nav bar (`.intro-bar`)
**Wordmark left, then Work · About · "Say hello" as ONE group on the right**, at a
single repeating `--gap-group` interval (60 desktop → 48). `.intro-bar-name` takes
`margin-right: auto` and everything else is content-width.

⚠️ **THE LINK COLOUR IS `rgba(0, 0, 0, 0.8)`, SCOPED TO `.intro-bar-links a`, AND
IT IS A MEASURED FLOOR — not a style choice.** It is deliberately NOT
`--color-text-70`: these links sit on the moving gradient rather than on cream, so
the site-wide muted token does not clear AA there. 0.8 is the **lowest alpha that
passes**, measured against the field across a full orbit at **4.93:1** (AA wants
4.5 for normal text). ⚠️ **Do not swap it for the token, and do not lower it.**
⚠️ **Two measurement traps here, both hit once:** the alpha must be COMPOSITED
onto the backdrop before computing luminance (comparing `rgba(0,0,0,0.7)`'s own
luminance read 6.77 where the real figure was 4.24), and the "Say hello" pill is
an OPAQUE black chip — sampling the field behind it reports a false failure
(2.71) when the actual contrast is 21:1.

It was a **three-column rig** — wordmark and `.intro-bar-cta-wrap` each `flex: 1 1 0`
with a fixed 450px link track (360 at ≤1024, 280 at ≤768) holding three `flex: 1 1 0`
groups justified start / center / end. That composed only for exactly three links.
Dropping Footprints (2026-08) broke it in place: "Work" stayed pinned to the track's
left edge, "About" sat adrift in the middle of the right half because `:nth-child(2)`
still centred it, and ~90px of empty track trailed past it with `:nth-child(3)`
matching nothing. **Don't reintroduce a fixed track or the nth-child justification** —
the current rig has no per-count numbers and survives adding or removing a link.
The three `flex-basis` overrides and the bar's two per-tier `gap` overrides are gone
from responsive.css with it; the bar's `gap` is now the links→CTA seam alone.

**The frost bleed is clipped to Contact's top edge (`--bar-bleed`, 2026-08-31).**
⚠️ **"Contact's top edge" now means the PANEL's, not the ledge's — see
**Contact's soft leading edge** below. Clipping it to the ledge instead was
tried and drives the bleed to 0 exactly when the ledge arrives, cutting the
frost and grain dead at the bar's bottom. The line below about "a hard-edged
full-bleed blue panel" is history: the panel's leading edge is a dissolve now.
The rule and the shipped line are both unchanged.**
`.intro-bar::before` reaches 100px past the bar's own bottom so the glass melts
into the page instead of ending on a line. That is right over cream content and
wrong over Contact, which is a hard-edged full-bleed blue panel: for the ~100px
before the bar inverts, the cream blur lay **across the top of the blue**,
veiling an architectural edge with a blur belonging to the page above it.
`updateScrollEffects` now hands back exactly the gap — full 100 until the panel
is within reach, shrinking to 0 as they meet, so the two butt together as solid
strips. The grain on `::after` rides the same value via
`min(40px, var(--bar-bleed))`; there is nothing to publish separately.
- **The 100px default lives in the CSS**, so no-JS and the project pages (no
  `#contact`, so the block never runs) keep today's behaviour untouched.
- **The gradient's stops had to become PX.** They were percentages, which
  resolve against the pseudo's height — the bar *plus* the bleed. As the bleed
  shrank, 42%/55%/68% marched up into the 64px bar and faded the frost out
  behind the nav items themselves (at a 74px box, 42% is 31px — inside the bar).
  The four px values are those percentages resolved at the full 164px box, so
  full-bleed rendering is unchanged.
- Written once on the root and guarded on its last value: `updateScrollEffects`
  runs every scroll frame and this invalidates a `backdrop-filter`.
**The inversion is PROGRESSIVE (`--dark-mix`, 2026-08-31).** It was one binary
flip at `contact.top <= 64` with a 0.35s cross-fade. At 1440×900 that line *is
the scroll floor* — Contact is sized `100dvh − nav − footer`, so its top comes to
rest exactly on the nav line and the blue never travels under the bar at all —
so the whole palette changed after the page had already stopped moving.
**THE PANEL RUNS UP BEHIND THE NAV (2026-08-31), and that is what makes the rest
of this simple.** `#contact` carries the nav's height as extra top padding and
its box is `100dvh − footer` (not minus the nav as well), so the colour reaches
y=0 and the bar sits *inside* the section rather than on top of it.
- **It removes a boundary instead of patching one.** With the panel stopping at
  the nav line there was an edge directly under the bar, and every artifact on it
  had to be chased separately: a sub-pixel gap (Contact's top rests at **64.27**,
  not 64), the bleed mask's ramp landing on it, and `backdrop-filter`'s blur
  sampling cream from above it. Over one continuous colour none of them have
  anything to act on.
- The click sends the box's top to **0**, not to the nav line (`topAlignedFor`,
  `Math.ceil` so a fractional edge lands a hair past rather than short).

**The tint is HOW MUCH OF THE BAR HAS BLUE BEHIND IT**, divided by
`DARK_FULL_AT` — `(invertLine − contact.top) / invertLine / 0.6`, clamped. 0
when the panel's top is at the bar's bottom, 1 once **60%** of the bar is
covered. Linear, because it reports a coverage fraction rather than performing a
transition.
- **`DARK_FULL_AT` is below 1 on purpose.** Reporting coverage literally left the
  bar visibly *lighter than the section it was sitting inside* for the whole
  pass, with the labels stuck dark — `DARK_TEXT_AT` was only reachable at the
  very end, because white needs a nearly-fully-blue strip to be legible. At 0.6
  the strip commits early: the labels switch at **51% coverage** (mix reaches
  `DARK_TEXT_AT` 0.85 when coverage reaches 0.85 × 0.6) instead of 85%, and the
  change finishes ~38px into the 64px pass rather than trailing to its end.
  ⚠️ This entry said 59% / 26px and the bullet above it said 51%; 51% is the one
  the shipped constants produce.
- ⚠️ **This replaced a guessed window, retuned twice and still wrong.** It was an
  arbitrary run-up of scroll — 260px, then 100px — ending at the bar's bottom
  edge, so the strip started colouring while the panel was still well below it
  and nothing blue was behind the bar at all: a wash over cream. It also needed
  an easing curve to hold the tint back, and a 1px fudge to stop the ramp
  finishing at 0.99 on a fractional edge. **None of that survives** once the
  quantity measured is the real one. If the tint ever needs "reducing" again,
  the answer is not a new constant — it is that this is measuring the wrong
  thing.
- **The fill is the FIRST background layer of `.intro-bar::before`**, painted
  over the cream frost in the same element. It needs `--color-accent-rgb`
  (global.css) because `rgba()` takes components and a hex token cannot be
  part-way transparent; **keep that triplet in sync with `--color-accent`,
  nothing enforces it.**
  - ⚠️ **IT CANNOT LIVE ON `.intro-bar`.** That was tried and shipped, and it
    silently did nothing: within the bar's stacking context the element's own
    background paints FIRST and negative-z children paint after it, so `::before`
    (which carries `z-index: -1`) covered the accent with cream while the labels,
    being in-flow content, painted above the frost and inverted anyway — **white
    labels on a cream bar.**
  - ⚠️ **`getComputedStyle` IS NO TEST FOR THIS.** The bar's `background-color`
    read `rgb(74, 69, 255)` the whole time it was invisible. A value being set is
    not the same as it being painted, and a stale preview pane will not show you
    the difference. Check paint order by reasoning about the stacking context, or
    look at a real browser.
  - **`::before` extends 2px past the bleed, and both pixels earn it.** The first
    is OVERLAP: Contact's top does not land on a whole pixel — measured at
    1440×900 the bar's bottom is 64 and the panel's top is **64.2734375**, a
    0.27px gap (0.55 device px at dpr 2) showing the cream page through as a
    hairline. The panel's position is the sum of everything above it, much of it
    fractional, so it cannot be rounded away; the bar has to paint past its own
    box. The second is the mask's RAMP: with a bare `--bar-bleed` of 0 its two
    stops land on the same position, and that degenerate gradient leaves an
    anti-aliased row. Given its own pixel below the overlap it sits over the
    panel, where it cannot be seen.
    ⚠️ **Moving the BAR down instead re-opens the same gap at the top of the
    viewport** once it docks. Paint lower, don't sit lower.
  - **The frost fades out with the mix too** — `blur()` and `saturate()` both
    scale by `1 - --dark-mix`. A blur samples a radius around every pixel, so at
    the element's bottom edge it reached above Contact's top and pulled cream
    down into the blue. At full mix the accent is opaque and there is nothing
    left to frost, so `blur(0) saturate(1)` is correct as well as artifact-free.
  - **Three separate causes drew that one hairline**, and each fix revealed the
    next: the degenerate mask stop, the fill being painted over by its own frost,
    and the blur sampling across the seam — plus this sub-pixel gap underneath
    them all. If a line ever returns, check them in that order.
    ⚠️ **IT IS FOUR NOW, and the fourth is the soft ledge's (2026-09): the bar's
    accent layer and the page's ledge painting the SAME ramp on top of each
    other.** The pattern is the point — this seam has produced a new line every
    single time something was added to it, and each fix exposed the next. Budget
    for that before touching it again.
- ⚠️ **THE LABEL FLIP IS NO LONGER `mix >= DARK_TEXT_AT` — that test is now the
  FALLBACK for a hard edge (`--contact-ledge: 0`) only.** 0.85 was calibrated
  when `--dark-mix` meant "the fraction of the bar covered by OPAQUE blue"; with
  a ledge it means "the mean alpha of a soft ramp", which is a different
  quantity. Same constant, different meaning, wrong moment — measured, the flip
  fired at Contact's edge **140**, where the backdrop under the glyphs is
  `rgb(160,158,252)` and **white reads 2.40:1**, under AA for ~75px of scroll.
  ⚠️ **This is the trap to remember: a constant whose NAME still fits after the
  thing it measures has changed underneath it.** The bar's fill is a gradient
  now, so no single number describes "what the labels sit on".
  The shipped test takes the alpha at the **glyphs' own mid-line** against the
  derived black/white crossover — `L = sqrt(1.05 * 0.05) - 0.05 = 0.1791`, which
  on this ramp is **alpha 0.86, where both colours measure 4.58:1**. Derived, not
  tuned: re-derive only if `--color-accent` or `--color-bg` move.
- **The LABELS switch once and must not fade** — the rule below still holds, and
  the ledge gave it a number. A half-faded black-to-white label is grey, and at
  the crossover **mid-grey measures 1.16:1**, four times worse than either
  endpoint. **0.15s is the ceiling, not a starting point**; the 0.35s case is
  what read as "the nav takes a second to transition". ⚠️ If the flip ever looks
  abrupt, the fault is almost certainly its TIMING, not the fade's length — that
  is exactly what the 2.40:1 regression above felt like from the outside.
  The original measurement, on the pre-ledge flat strip: white **4.51:1** and
  black **4.66:1**, crossing at 0.85, both clearing AA. At mix 1 black would be
  3.59, so switching earlier is what keeps black off the full blue.
- `is-over-dark` is now **the text state only**. It no longer paints the glass;
  its one remaining job on `::before` is forcing the glass visible in the case
  where the bar is over Contact without having docked.
- Grain thins on the same curve (`opacity: calc(1 - var(--dark-mix))`), replacing
  the old binary `is-over-dark::after { opacity: 0 }`.
- ⚠️ **NOTHING SCROLL-LINKED MAY CARRY A TRANSITION — and the ONE exception is
  GONE (2026-09), which is better than the compromise it replaced.**
  `.intro-bar::after`'s grain used to put the `--dark-mix` thinning and the
  docking fade on the SAME `opacity`, so one transition had to serve both. Those
  two want opposite things: the thinning is scroll-linked and must not ease (at
  0.35s the grain trailed the page by a third of a second), while the docking
  fade is a state change that SHOULD ease — and at the 0.15s compromise it
  snapped, out of step with `::before`'s 0.35s glass. **Grain and glass arriving
  on different clocks is what made the pin read as a snap.**
  **The thinning moved to a second MASK LAYER** (`mask-composite: intersect`;
  webkit spells it `source-in`, both are needed), where it is untransitioned by
  construction, which frees `opacity` to be the docking fade alone at 0.35s.
  Verified: the two now fade frame-for-frame together, and a `--dark-mix` change
  moves the mask within 2 frames while `opacity` does not move at all.
  ⚠️ **If you ever need a scroll-linked value on a layer that also has a state
  transition, this is the move** — put the scroll-linked one on a mask. `--field-scroll` carries no transition
  at all and must not gain one. The tint is a background
  LAYER, so it was never in a transition list and always tracked the scroll — but
  the grain's opacity became scroll-linked when it started reading `--dark-mix`,
  and it still had the old 0.35s on it, so it trailed the page by a third of a
  second. `::before`'s `background-color` transition was left over from before
  the fill was a layer, and is gone. The remaining `opacity 0.35s` on `::before`
  is correct: it belongs to the DOCKING fade, which is a state change, not a
  scroll-linked value.
- **The label flip is 0.15s, not 0.35s.** It fires once, mid-scroll; a third of a
  second of cross-fade after it is what read as "the nav takes a second to
  transition". 150ms reads as immediate without being a hard cut.
- Both custom properties are written on the ROOT and guarded on their last value
  — this runs every scroll frame and repaints a backdrop-filtered layer. Project
  pages have no `#contact`, so neither is ever set and the CSS fallbacks (`0` and
  `100px`) give exactly the old bar.

### About's parallax (`--about-peek`, 2026-09)

About's content lags the section and settles to 0 as it centres. **The anchor is
its own resting position, not an arriving edge** — About is cream on cream and is
reached from both directions, so there is no panel edge to hang it on.
⚠️ **THE OFFSET FLIPS SIGN, which is what lets one position-only rule serve both
directions** — down, it lags downward; up from Contact, upward. No direction term
anywhere, the same property that makes Contact's peek symmetric.
- **Smoothstep, and NOT Contact's curve** — the geometry differs, so the curve
  does. Contact's window is built so its extreme coincides with first sight; About's
  extremes are where it is OFF-screen, so a cubic spends the motion in the wrong
  place (7.5px at half the span where smoothstep gives 30, and pinned at the cap
  for over half the traverse). Smoothstep is also flat at both ends, so it eases
  into rest *and* into the clamp; a cubic reaches the cap at full slope and kinks.
- ⚠️ **`max` IS BOUNDED BY `--gap-section`.** The transform moves the CONTENT while
  the section's box stays put, so the content eats its own padding. Past 96px it
  crosses into a neighbouring section.
- ⚠️ **AS CONTACT ARRIVES, ABOUT'S COPY IS PUSHED TOWARD THE LEDGE** (`push`,
  40px) rather than left to its own lag — it leans INTO the top of the dissolve,
  which is what closes that seam. Bounded by contrast and there is room: the copy
  lands on the ledge's first third, **black 11.2:1 at 40px** (20.4 on bare cream,
  still 9.0 at 48). The binding constraint is taste, not legibility. The blend
  runs on Contact's own approach, so it is symmetric — scrolling up to About,
  Contact recedes and the push relaxes back into the lag.
- ⚠️ **TAPERING THE LAG TO ZERO WAS THE FIRST FIX AND ONLY GOT BACK TO 96.**
  The push is what goes further. Kept below because the failure it names is real:
- ⚠️ **IT MUST YIELD TO CONTACT'S ARRIVAL, and without that it is a REGRESSION
  rather than an addition.** About leaves upward, so its offset is negative exactly
  while Contact approaches — which lifts About's copy off the panel and opens bare
  cream above the ledge. Measured at Contact's edge 300: the visible gap went
  **96 → 156**, widened by the whole peek, and **the ledge cannot absorb it**
  because it is sized from OFFSETS (transform-blind) and stays 96 while the gap
  grows. The taper is full parallax while Contact is off-screen, zero by the time
  it is half a viewport up. Scrolling the other way, Contact recedes first, so the
  parallax engages behind it.
- ⚠️ **GENERAL LESSON: a transform-driven parallax on one section can silently
  undo a measured spacing decision in its neighbour**, because measurements taken
  from offsets do not see transforms. Check the seam, not just the section.

### The ledge travels on the way up (`--contact-ledge-lift`, 2026-09)

Scrolling up, the ledge's **top descends** — its bottom stays welded to the panel
and the height shortens, so the blue's leading edge sits lower: **96 → 80**, eased
in over ~250px of the reader's own travel by the same `peekDir` blend, and back to
96 on the way down.

⚠️ **"PULL IT DOWN" AND "MAKE IT SOFTER" ARE OPPOSITE INSTRUCTIONS HERE, and this
was built both ways before that was clear.** The bottom is welded, so the only
thing that can move is the TOP, and the height is the only thing that can carry
it. That gives exactly two options and no third:
- **shorten** → the top DESCENDS (blue lower) and the ramp compresses (harder edge)
- **stretch** → the ramp LENGTHENS (softer) and the top RISES, washing up over
  About's photo and copy

**There is no setting that does both.** If both are asked for, say so rather than
alternating — this flipped three times before the trade was named.

⚠️ **NEVER A TRANSLATE, whichever way the height goes.** The gradient reaches
alpha 1 at its own bottom, so moving that bottom below the panel's top leaves the
ramp part-way when it meets solid blue — **40 code values of step at 24px, 66 at
32**, against the 54-value seam this whole change exists to remove.

⚠️ **THE CAP IS BOUNDED BY ABRUPTNESS, NOT BANDING.** 25 stops hold the spacing
under 4px at every length in range, so the ramp is never under-sampled; what
fails is the dissolve starting to read as a cut, somewhere below ~56px. At 16 the
ramp holds 80px with About's copy 39px clear of its top.

⚠️ **EVERYTHING DOWNSTREAM MUST TAKE THE LIVE LEDGE, NOT THE TOKEN** — the bar's
fill, the coverage rule and the label flip all do. The bar's fill is a *window
onto* this ramp; feed it the token while the ramp is a different length and the
21% seam comes straight back.
- ⚠️ **The ledge geometry is HOISTED above the coverage rule for that reason**, and
  it was a TDZ error first (`Cannot access 'liveLedge' before initialization`) —
  which throws every frame inside `updateScrollEffects` and silently strands
  `--dark-mix`, `--bar-bleed` and the rest at their last values.

### The landing bar's cream fade (2026-09)

`.intro-bar::before`'s cream now **holds full to the lowest nav item and eases to
0 across the rest of the box** — 0.95 to **50px** (the "Say hello" pill's bottom,
measured; the wordmark ends at 47 and the links at 44), then a smoothstep to 0 at
**166** (64 bar + 100 bleed + 2).

⚠️ **IT USED TO HOLD ~FULL TO 69px — NINETEEN PIXELS BELOW THE TYPE — then drop
0.92 → 0 in 43px.** That is what read as the cream "ending on a line": full
strength level with nothing, then a short steep ramp. The fix is where the fade
STARTS, not how long it is.

⚠️ **AND IT IS A SMOOTHSTEP IN 17 STOPS, not the old four.** Those four were
piecewise LINEAR, so the profile had slope corners at 69 and 90, and the eye
reads a slope discontinuity as an edge — the same finding as the Contact ledge's
ramp and the mobile header's scrim. Three separate surfaces on this site have now
hit it.

⚠️ **`CONTACT.frost` IN js/main.js HAD TO MOVE WITH IT** — the bar's compensated
fill repairs what the frost hides, so it needs the frost's real profile and a
gradient cannot be read back out of CSS. It is a sampled version of the same
curve.
- ⚠️ **THE PLATEAU POINT AT 50 IS LOAD-BEARING.** Without it the first segment
  interpolates straight from 0 to the first curve sample and skips the flat hold,
  putting the JS **8 code values** under the CSS right at the nav item's bottom —
  the one place the two must agree, since that is where the fill is repairing the
  most opaque part of the frost. With it, worst disagreement is **2.6 code
  values**, in the tail where the frost is at alpha 0.04 and the repair barely
  matters.
- **Check them against each other after any change** by parsing the computed
  `background-image` and comparing to `contactFrostAt` — nothing enforces it.

### The mobile header's scrim (`--header-bleed`, 2026-09)

`.site-header`'s frost now **bleeds to full transparency** instead of ending on a
hard line. It was a flat `background-color: rgba(251,252,248,0.9)` plus
`blur(4px)` ON THE ELEMENT — the landing's `.intro-bar` got the bleed treatment
and this one never did, so its cream simply stopped.

Same construction as `.intro-bar::before`: a `::before` that extends
`--header-bleed` (96px) past the box, masked out across it so **the cream and the
blur fade together**. A blur that stops abruptly is as visible as a fill that does.

⚠️ **THE SOLID RUN ENDS AT THE NAV ITEM, NOT AT THE HEADER'S BOX — and getting
that wrong still reads as a demarcation even with the bleed in place.** The box is
the wordmark plus `--space-sm` of padding top and bottom, so masking from
`100% - --header-bleed` holds the cream at full strength for 16px BELOW the
wordmark and only then starts to fade; the cream appears to end on a line level
with nothing. The ramp starts on the type's own bottom edge instead, spanning
`--header-bleed + --space-sm` (112px). Measured at 390: fade runs 52 → 164, and
the wordmark's bottom is 49 — the 3px being line-height leading.

⚠️ **48px WAS TOO SHORT AND STILL READ AS A BAND, even though the mask was
feathering correctly.** Don't assume a visible boundary means the mask is broken:
verified by raising the bleed to 200 and watching the ENTIRE scrim move with it,
which proves the mask does feather the `backdrop-filter` too. The boundary was
just the fade being too abrupt to disappear over a photo.
⚠️ **The ceiling is VEILING, not smoothness.** At 128 the wash reaches the Work
card's title; at 200 it washes the title and metadata outright. 96 clears inside
the card image's own area. Longer is not automatically better here.

⚠️ **THE MASK IS A SMOOTHSTEP, NOT THE TWO-STOP LINEAR `.intro-bar` USES.** That
bar can afford two stops because its cream is *also* a shaped gradient, so the two
compose; here the fill is flat and the mask is the only thing shaping the falloff.
A straight alpha line has a slope discontinuity at each end and the eye reads
those corners as edges — the same finding as the ledge's ramp.

⚠️ **THE ≤680 BARE-AT-TOP RULE HAD TO MOVE WITH IT.** It killed
`background-color` and `backdrop-filter` on the ELEMENT; with the frost on
`::before` that would silently do nothing and the bar would stay frosted at the
top of the page — precisely what the rule exists to prevent. It targets
`::before`'s **opacity** now, which takes the blur with it. `is-over-dark`'s
accent fill moved for the same reason: on the element it would paint *under* the
glass and never show.

⚠️ **`.site-header` IS THE HOMEPAGE'S MOBILE NAV ONLY.** The project pages dropped
it in 2026-08 for the shared `.intro-bar`, and `body:has(.intro) .site-header` is
`display: none` above 680 — so this element is reachable at ≤680 on `index.html`
and nowhere else. Verify changes there; a desktop project page shows nothing.

### Contact's panel: the grain, the trim, and the floor (2026-09)

**THE PANEL CARRIES THE FIELD'S GRAIN.** It was the ONE coloured surface on the
site without any — the hero field, the nav's frost and the ledge all have it, so
the dissolve came out of a grained surface, through a grained ramp, and landed on
bare flat colour.

⚠️ **"IT FEELS TOO LONG" WAS A MATERIAL PROBLEM, NOT A LENGTH ONE, and four
rounds were spent shortening things before that was measured.** At rest the HERO
has MORE empty colour than Contact — **66% of the viewport against 44%**, and
281px above its headline against 184px here. What differs is uniformity: the
field varies everywhere and gives the eye something to read, while 819px of
unvarying `rgb(74,69,255)` does not. **Measure both ends of a comparison before
tuning either.**

⚠️ **THERE ARE TWO GRAINS ON THIS SITE AND THEY ARE NOT INTERCHANGEABLE** — an
earlier note here claimed one. The nav's is `baseFrequency 0.55` with a smooth
transfer, built for frosted cream. The field's is `1.3` with a **discrete**
transfer (what makes it sharp speckle rather than fine mush) under `overlay`
(modulates the colour instead of laying grey on it). The panel takes the FIELD's,
because it is a large coloured surface. Baked into the rect's opacity rather than
a layer, since both of this element's pseudo-elements are spent on the ledge.

**`--contact-trim` (48px)** shortens the panel below a full frame. The footer is
also `--color-accent`, so panel + footer fill the viewport exactly and trimming is
the only thing that actually reduces blue on screen.

⚠️ **THE NAV'S INVERSION WAS TRADED FOR THE SHORTER PANEL (2026-09, deliberate),
AND THE TRADE IS TOTAL RATHER THAN PARTIAL.** The panel used to rest with its top
at y=0 because it was a full frame minus the footer, which is what put solid
accent behind the docked bar. `--contact-trim: 144px` takes it to its content
height (819 → 675) and its top now rests at 145.

**The consequence is the thing to understand before touching this.** A section's
RESTING top is its HIGHEST position — the page has no more scroll — so a bar that
is not inverted at rest is **never inverted at any scroll position**. Measured
across the whole approach: `--dark-mix` peaks at **0.01**, the labels never flip,
and `is-over-dark` is unreachable on the homepage. `DARK_TEXT_AT`,
`DARK_TEXT_ALPHA` and the whole label-flip rule are now dead code there — kept
because the project pages and any future full-frame panel still need them.
- **What still earns its place:** the ledge's dissolve, and the bar's compensated
  fill, which keeps painting the ramp behind the docked bar (the gate is
  `edge − ledge < barHeight + BAR_BLEED + 2`, satisfied at rest). Only the END
  STATE changed.
- **Measured at rest, the viewport is** 49 cream + 96 ledge + 675 panel + 81
  footer. About's copy sits 40px into the ramp at **11.22:1** for black, clear of
  the bar. Gap below the copy halved, 192 → 96.
- **The floor is now the content**: 160 padding-top + 419 copy + 96
  padding-bottom. Past `--contact-trim: 144` the trim does nothing.

**`--contact-lift` IS RETIRED** (it was a bottom margin of 2× itself, which under
`center` shifts the item up by half). It was correct while the panel had slack;
`--contact-trim` closed that slack, after which the margin moved nothing and only
inflated the box — **96px of panel height and 96px of empty run below the copy,
for no positional gain**. The panel is `justify-content: flex-start` now, which
gives the identical position (gap above = padding-top = 160) with none of it.
⚠️ **A mechanism that redistributes SLACK becomes dead weight the moment
something else removes the slack.** Check the two together.

### Contact's soft leading edge (`--contact-ledge`, 2026-09)

**THE PROBLEM WAS THE UNUSED RUNWAY, NOT THE EDGE.** Measured at 1280×720,
Contact's top travels a FULL VIEWPORT from the fold to its resting place — and
the panel comes to rest exactly at `maxScroll`, so that runway is real. Until
this, **91% of the screen went blue before anything else moved**: the whole
inversion was crammed into the last 64px. A viewport of approach, 9% of it used.
Diagnose it that way — "the transition feels abrupt" is a TIMING report here, not
a request for a longer fade.

⚠️ **THIS REVERSES A DELIBERATE DECISION.** The hard edge was architecture, and
`--bar-bleed` exists to stop the frost veiling it. Reverse it knowingly.

**Three mechanisms, and they are not independent — each one broke the next.**

**1. THE LEDGE** (`.contact-section::before`, sections.css). Blue bleeds up out
of the panel over `--contact-ledge`.

⚠️ **THE ROOM IS A CEILING, NOT A TARGET** — `min(var(--contact-ledge-length),
var(--contact-gap))`. It was `clamp(90px, var(--contact-gap), 300px)`, which made
the ledge GROW to fill whatever space happened to sit above the panel. That space
is not a constant and is not just section padding: **About carries its own
min-height, so on a tall window its internal slack lands in the gap.** Measured
room: 96px at 768, 103 at 1024, and **461 at 1800×1000** — where the ledge pinned
to its 300px ceiling and read as a long blue band.
The dissolve wants a LENGTH of its own (120px); the room only says how much it
may take. Verified across forced gaps of 461/235/120/96/64: the ledge is 120
wherever there is room and clamps to the room when there is not, never
overlapping. ⚠️ **This is a different rule from `--field-fade`'s**, which really
does spend its whole gap — do not "restore the symmetry". **It shipped at a flat 220px and that was wrong**: the room is only ~96,
so the ramp ran 124px INTO About and washed blue across the photo and the last
lines of copy. **The ledge paints OVER the section above** (Contact is
positioned, so its pseudo-elements sit above a non-positioned sibling), so every
pixel it overshoots is a pixel of someone else's content obscured.
`--contact-gap` is published by `measureContactArrival`.
- **It is not just `--gap-section` in disguise** — measured 96px at 768 and
  **103px at 1024**, because About's last block lays out differently there. A
  hard-coded 96 would overshoot by 7px at the landscape-tablet tier.
- ⚠️ **A FACTOR OF 1.0 IS THE CEILING**, same as the field: the ramp starts where
  the content ends and never touches it. The "a smoothstep is near alpha 0 for
  its first eighth, so it could start higher for free" argument is a measured
  REGRESSION on the field. Don't reclaim it here either.
- **A smoothstep in 25 stops**, for the three reasons the hero field's dissolve
  already documents: a linear ramp reads as a BAND (slope discontinuity at each
  end), an ease-in ramp compresses into a narrow strip however long it is, and
  the stop COUNT is how faithfully the curve is drawn.
  ⚠️ **It went 17 → 25 BECAUSE the ledge got shorter, which is the field's rule
  applied in the direction that actually comes up**: the room is a hard ceiling,
  so length is not available and resampling is the only lever. At 96px, 17 stops
  land 6.0px apart (largest alpha step 0.093); 25 stops land **4.0px** apart
  (0.062), matching the field's target. ⚠️ **More stops before more length.**
- ⚠️ **Ramps accent-alpha-1 → accent-alpha-0, NEVER to `transparent`** — that is
  `rgba(0,0,0,0)`, which drags every stop toward black and rings the ledge with a
  grey halo. Same trap as the field.
- **Grain (`::after`) is the nav's own feTurbulence, byte for byte.** One grain
  on the site. ⚠️ **Its profile PEAKS MID-RAMP and is zero at both ends**
  (`4a(1−a)`): the panel below has no grain and the cream above has none, so a
  profile reaching full at either end trades the gradient seam for a MATERIAL
  seam. It also dithers the curve's steepest point (~1.7 code values/px, just
  above the visible floor).

**2. THE BAR PAINTS THE SAME RAMP** (`--bar-fill`, hero.css + main.js). The bar
is `position: sticky; top: 0`, so its `::before` box top **IS viewport 0** — the
same space the ledge paints in. That is the whole trick: the bar becomes a WINDOW
onto the ramp rather than an average of it. Step at its bottom edge: **21.3% →
0%** at every scroll position.
- ⚠️ **THE FILL IS NOT A COPY OF THE RAMP — it is the REPAIR for what the frost
  hides, which is a different function.** `a = r·f / (1 − r + r·f)`, where `f` is
  the frost's alpha at that y and `r` the ledge's. It reduces correctly at every
  corner: no frost → `a=0`; opaque frost → `a=r`; full blue → `a=1`. **Measured
  deviation from the page: 0 everywhere.**
- ⚠️ **BOTH OBVIOUS VERSIONS ARE WORSE, and the second is much worse.**
  `a = r` across the whole box double-coats the bleed (**63** code values
  over-blue, a soft bulge). `a = r` confined to the bar's own height kills the
  double-coat but leaves the cream frost bleeding 112px with no blue over it —
  a **186**-value CLIFF at the bar's edge. Confining it looks like the tidy fix
  and is the trap.
- **Rebuilt per frame** (~24 stops) because `r` moves with scroll, and it cannot
  be static CSS: the alphas depend non-linearly on the edge's position and
  `calc()` cannot express that. Guarded, and only built while the ledge is within
  reach of the bar.
- ⚠️ **js/main.js READS THE LEDGE'S PAINTED HEIGHT, NOT THE TOKEN, and it must.**
  `--contact-ledge` is a `clamp()`, and an unregistered custom property computes
  to its TOKEN STREAM rather than to a length: `getPropertyValue` returns the
  literal string `"clamp(90px, 96px, 300px)"` and `parseFloat` gives **NaN**.
  That fails silently and expensively — `contactLedge` falls to 0, `buildBarFill`
  never runs, and the bar drops back to the flat tint, quietly restoring the 21%
  step this whole change exists to remove **while the ledge itself still looks
  right**. Reading `getComputedStyle(contactSection, '::before').height` gets the
  resolved value and is also the very thing the bar must match, so the two cannot
  disagree. Caught in review, not in the browser.
- ⚠️ **`CONTACT.frost` in main.js TRANSCRIBES hero.css's frost gradient**, because
  a background gradient cannot be read back out of CSS. Keep the four pairs in
  sync — nothing enforces it, same standing hazard as
  `--color-accent` / `--color-accent-rgb`.

**3. THE PARALLAX PEEK** (`--contact-peek`). The copy is offset downward and the
offset shrinks as the panel rises, so it travels UP faster than the panel and is
revealed into place.
- ⚠️ **SMOOTHSTEP, NOT the hero tuck's cubic — and that departure is forced.**
  It was the hero's curve (deliberately, for one motion system), until the brief
  became "keep moving the copy up until the nav meets the section's top". A cubic
  ease-out is **flat by two-thirds of its window by construction** — measured
  80 → 19 over the first third and ~0 after — so that requirement cannot be
  expressed with it at ANY window length. Smoothstep spends the travel evenly and
  is still flat at both ends. The hero tuck's front-loading is right THERE because
  its window opens on the reader's first gesture, and wrong here for the same
  reason. **The two parallaxes no longer share a curve; that is the trade.**
- ⚠️ **EXACTLY 0 AT REST**, so the settled composition is byte-identical.
- ⚠️ **THE OFFSET IS NEGATIVE ON THE WAY IN — the copy is pulled UP and settles
  DOWN.** It lagged downward at first, which is backwards for this section: the
  copy already sits **232px** below the panel's top at rest (64 nav + 96 padding
  + 72 centring slack), so a downward lag ADDED to the emptiest part of the
  arrival. Measured at Contact's edge 300, the gap above the copy was 266 — 232
  of composition plus 34 of peek working against it; now 218.
  ⚠️ **The peek is the SMALL term in that gap.** If "too wide" comes up again the
  lever is the 232 — `--contact-pad` and the centring slack — not this.
  It still reveals upward: the panel rises faster than the copy settles.
- ⚠️ **THIS IS THE ONLY DIRECTION-DEPENDENT MOTION ON THE SITE (2026-09), and it
  is a deliberate exception.** Everything else — `--field-scroll`, `--dark-mix`,
  `--about-peek`, the ledge — is a pure function of POSITION, which is what makes
  them symmetric and reproducible from one sample. Here the copy **lags going
  down** (pulled up, closing the gap) and **leads going up** (pushed down,
  dropping away). Measured over 700px of panel travel: copy 632 down, 791 up.
  ⚠️ **THE SIGN BLENDS OVER SCROLL DISTANCE, NOT TIME** (`flipOver`, 250px), and
  that distinction is load-bearing. Flipping outright snaps the copy by twice the
  peek the instant the reader reverses; a time-based ease fixes that and is
  exactly the transition on a scroll-linked value the standing rule forbids.
  Blending per pixel scrolled keeps it a function of the reader's own motion with
  no clock in it. Magnitude is 0 at rest, so the sign can never snap there.
- ⚠️ **THE WINDOW IS ANCHORED TO THE COPY, NOT TO THE PANEL'S EDGE.** The copy
  sits `contactCopyOffset` (**232px** at 1440×900) BELOW the panel's top, so a
  window that starts when the EDGE crosses the fold starts it while the copy is
  still a quarter-screen below. Measured: **58% of the peek was spent before the
  heading appeared** (80 → 34 with it still off-screen), down to 20 by the time
  it crossed. **This reads as a direction asymmetry and is not one** — the peek
  has no direction term, so up and down are identical at the same position; what
  differs is that scrolling UP you are watching the copy be pushed away, which is
  legible, while scrolling DOWN the motion has already finished off-screen.
  ⚠️ **So "I only see it in one direction" is a VISIBILITY report about the
  anchor, not a bug in the curve.** Anchored to the copy (and subtracting the
  peak, since the copy is displaced by it), only **16%** is spent before it is on
  screen: first sight at peek 67 of 80.
- ⚠️ **THE WINDOW ENDS AT THE NAV LINE** (floored at the panel's own resting edge,
  so a short page cannot ask for a position it can never reach). The copy rises
  for the whole approach and lands exactly as the panel docks. It previously
  stopped early so the panel carried settled copy the rest of the way up; that is
  superseded, and the paragraph below is kept for the floor rule it states.
- ⚠️ **The window used to END EARLY, and its floor is MEASURED.** Running it to the
  scroll floor leaves the copy still arriving while the panel already fills the
  screen; the floor is derived from the panel's resting edge rather than assumed
  to be 0, because on a page where Contact never reaches the top a hard-coded 0
  would strand the copy permanently offset.
- ⚠️ **CURVE AND WINDOW ARE COUPLED.** Stopping early is only safe because a cubic
  ease-out lands at zero velocity. An **ease-in** was tried at the user's request
  and is a trap here: it holds the offset near its peak for most of its run, so
  the copy sits pushed down exactly while the panel fills the screen — *it is what
  creates the "too much empty panel" complaint*, not the peak. It also arrived at
  **1.43** px of copy per px of scroll (outrunning the page as it stopped dead).

**`--dark-mix` IS THE SHIPPED RULE, GENERALISED — NOT A NEW ONE.** The old
expression `(invertLine − contact.top) / invertLine` IS the mean alpha of
Contact's fill over the bar's band; that was only true because a hard edge is
alpha 1 below and 0 above. With a ledge the same sentence holds and the integral
just has a ramp in it. So the bar tints early **because there is genuinely blue
behind it** — which is exactly what the shipped rule was written to guarantee.
⚠️ **Verified to reduce to the old expression with ZERO delta at `--contact-ledge:
0`.** Generalise, don't replace.

**Untouched, all verified:** project pages (no `#contact`, so nothing is
published and every CSS fallback is the previous bar), no-JS, reduced motion (the
ledge stays — it is a dissolve, not motion; only the parallax goes), and ≤480,
where Contact is `display: none` and the existing zero-height branch clears
everything.

⚠️ **OPEN, AND NOT MEASURED: a faint edge at the bar's `::before` box bottom
(y = 166 at the shipped bleed).** The ramp there is 0.86 code values per pixel —
below the dither floor — and the compensation is exact for COLOUR, but it does
not model the `backdrop-filter` blur, still ~13px at that point. That is cause
three of the hairline story all over again. Needs real pixels; if it is visible,
fade the blur on the ledge's alpha rather than on `--dark-mix`.

**`lab/contact-morph.html`** is the tuning harness (excluded from the build, on
the `lab/field-shader.html` precedent): live controls for the ledge height, grain
profile, bar-fill mode, nav rule and every peek parameter, with contrast and
seam-step readouts. ⚠️ **It loads the REAL `.intro-bar` in its docked state, and
that is deliberate** — an earlier hand-rolled stand-in drifted far enough to stop
being evidence. ⚠️ **Below 680 the bar is `display: none`, so the harness reports
`offsetHeight 0` and every bar measurement silently degenerates while still
returning plausible numbers.** It prints a red warning; heed it.

## Where each page area lives
| Area on page | CSS file | HTML location |
|---|---|---|
| Header / nav (≤480 homepage only) | `header.css` | top of `index.html` (`<header>`) |
| Landing hero (field bg, statement, divider, frosted band, bottom bar) | `hero.css` | `.page-field` img + `.page-field-canvas` + `.page-field-grain` + `<section class="intro">` |
| Selected Work | `sections.css` | `#work-section` |
| About | `sections.css` | `#about` |
| Public footprints (per project; **not on the homepage** — see below) | `sections.css` (link list) + `project-overview.css` (its one spacing rule) | end of `#impact` in each `work/*.html` |
| Contact (panel, soft leading edge, parallax peek) | `sections.css` | `#contact` |
| Footer / copyright | `footer.css` | `<footer class="site-footer">` |
| Any interaction/animation | `js/main.js` | — |
| Colors, spacing, fonts (tokens) | `global.css` (`:root`) | — |
| Anything mobile/tablet (any breakpoint) | `responsive.css` | — |
| Project Overview pages | `project-overview.css` | `work/*.html` |

## Project Overview Pages
The standard entry point for every project: an editorial executive summary a
recruiter can read in under a minute, sitting between a homepage Work card and
any deeper case study. **Four static pages, one shared structure** — the
homepage Work-card images link straight to them.

**ALL FOUR pages share one editorial cadence (2026-08):** Overview → **Approach**
→ **What changed**. Every page retired both "What I Shaped." and "Impact." as
headings — the first named a list of activities, the second named the section after
the author's contribution ("Standardized / Informed / Validated" reads as a
performance review) rather than after the reader's takeaway.

| | Approach holds | What changed | Closes on |
|---|---|---|---|
| Accessibility | one statement | **4** expandable rows | Full case study card |
| Messaging | one statement | **3** expandable rows | Full case study card |
| Loop | a statement **+ 3 named principles** (plain list, via `.about-body + .project-impact-list`) | **3** expandable rows | — nothing gated; the live product is an inline link in the Overview |
| Groups | a statement **+ 3 named principles** (same shape as Loop) | **3** expandable rows | — nothing gated |

**The cadence is shared; the row count and the Approach shape are not.** Never
manufacture a row to make pages match, and the principles list (`.about-body + .project-impact-list`) is Loop's and Groups' —
Accessibility and Messaging carry a statement alone, because their approach was one
shift rather than a set of rules.

**Section ids did NOT all follow the headings.** Accessibility and Messaging use
`#approach` (their old `#process-locked` had become a lie); Loop and Groups keep
`#process`, which is still true. Only the *heading* ids were renamed there
(`shaped-heading` → `approach-heading`). `#impact` is unchanged everywhere despite
the heading reading "What changed" — shared idiom plus inbound anchors.

**Never put an `<a>` inside `.impact-row-summary`.** A link there both navigates and
toggles the row, because the click bubbles to the summary's activation behaviour.
Loop is the page this bites: its four evidence links live in the expanded copy, and
"US Patent 12,277,305" is plain text in the evidence line while the patent link sits
on "patented model for shared dynamic objects" below it.

**A project page is ONE document, not stitched pages (2026-08).** This is the
governing idea, and two things enforce it. The homepage's sections are peer
destinations — one per nav item, where arriving at one means leaving another — so
its equal-weight headings and full-strength dividers are correct *there*. A
project page is a title and its chapters, one argument in sequence. Copying the
homepage's treatment claimed the opposite, three times per page.

| | Homepage | Project page |
|---|---|---|
| Section headings | `--section-title-size` 56/44/32 | **`--project-block-title-size` 40/36/32** — one notch under the H1 at every tier (converging at 32 on phones) |
| Divider between sections | **none as of 2026-08** — see below | **none** |
| Full-strength divider kept | between peer sections | **only before the Next Case pager** — the one real seam |

- **Headings:** `.project-block-left .section-title` carries the smaller token.
  That scope is load-bearing — `.section-title` is shared with the homepage (5
  uses — the four Work-card headings and About Me), every chapter `h2` sits in a
  `.project-block-left`, and every `h1` sits in `.project-masthead-head`. **Never fix this on the token.** Before the change
  the outline read 56 (h1) = 56 (h2) → 13 (h3): no hierarchy at the top and a 4.3×
  cliff below. It now reads **56 → 40 → 13** over 18px body.
**The HOMEPAGE now has no hairlines at all (2026-08).** `.page-section` still
carries `border-bottom` in global.css, but all three homepage sections opt out:
Contact via `:last-of-type`, About via `:has(+ .contact-section)` (the blue
panel's own edge already closes that seam), and Work via `border-bottom: none` in
sections.css. Work's was the last one and went when the sections began settling
composed under the nav — a rule landing mid-viewport read as a lid on the
carousel rather than a join, and the 240px across that seam (144 + 96) separates
them on its own. **Leave the base rule in place**: it is shared with the project
pages, which is where the table below still applies.

**Contact's padding YIELDS so the footer stays in frame (2026-08-31).** The
footer is a child of `<body>`, **outside `<main>` and outside `#contact`** — and
it must stay there: `role="contentinfo"` is only exposed as the page footer when
it is not nested inside another landmark, so moving it into the section would
quietly demote it. The sizing relationship is expressed instead: Contact reserves
the footer's measured height in its `min-height`, so the two fill the space under
the nav exactly. But `min-height` is a FLOOR, and at a short window the copy plus
a fixed 96px either side outgrew it — at 1440×700, content 447 + 192 = 639
against a 555 floor, pushing the footer 83px below the fold.
`padding-block` is now a `clamp()` asking for half of whatever room is left once
the nav, the footer and the copy have taken theirs, capped at `--gap-section` and
floored at 24px. `--contact-content` is published by `initSectionGeometry`
alongside `--footer-height`.
- **It is INERT on tall windows, and that is the point.** The section centres its
  content, so at 1440×900 the `min-height` already gives 154px of air either side
  while the padding is only 96 — the clamp resolves to the cap and nothing moves.
  The shrink only ever happens where the alternative was an overflow.
- Measured: **900** → pad 96, footer at the fold (unchanged) · **700** → pad 54,
  Contact exactly its 555 min-height, footer at the fold (was 83 under) · **620**
  → pad hits the 24 floor, footer 19 under (was 164). It degrades rather than
  failing.
- No feedback loop: the published span is the inner block's own height, which
  does not depend on the section's padding. It does depend on WIDTH, so it
  re-measures on resize. The `0px` fallback yields `--gap-section`, so no-JS is
  today's value.

**The scroll-spy reads the SAME resting positions** (`updateScrollEffects`): the
active section is the last one whose resting position the page has reached. It
compared section TOPS against the nav line until sections began settling centred
— after which About's top rests ~130px below that line and never satisfied the
test, so clicking About scrolled correctly and then left Work highlighted. Settle,
anchors and spy now all read one definition of "arrived at this section"; change
it in one place and they cannot disagree. It also retired the old "page bottom
counts as arriving" special case for the final section, which existed only because
Contact's top could never climb to the nav line. A marker-based FALLBACK remains
for ≤480 and reduced motion, where nothing settles and no resting position is
published.

- **Dividers:** `main:has(.next-case-section)` in project-overview.css §0a — only
  project pages have a pager, so it can't reach the homepage, and no page needs a
  new class. The restore rule is written against *the section before the pager*,
  not `#impact` by name. That was originally because Loop closed on an "Explore the
  live product" step; that section is gone, so it now resolves to `#impact` on all
  four pages — **keep the general form anyway**, it costs nothing and survives the
  next page that closes on something else. It must stay both later **and** more
  specific (0,3,1 vs 0,2,1) than the blanket removal.
- **Keep the 96px `--gap-section`.** With the rules gone the air is the primary
  separator; removing both signals would run the chapters together.
- The weight was previously **inverted**: 100% black between chapters that belong
  together, 12% (`--color-border-light`) between the genuinely peer items inside
  the Impact list. If you add a new separator here, check it against that.

**The insight band is GONE (`.project-insight`, built and removed 2026-08).** It
was a full-bleed `--color-accent` band between Approach and What changed, carrying
the design question "What does someone need to understand to know what applies and
what to do next?". All of its CSS is deleted; don't reintroduce it.

**The question is no longer anywhere on the page.** It had already been lifted OUT
of the Approach paragraph when the band was built, so removing the band removed the
line. If that copy is ever wanted back, put the sentence back in the paragraph
first — don't rebuild the band to hold it.

**Floating section pills (`.section-pills`) — PHONE ONLY (≤480, 2026-08).**
Hidden by default in project-overview.css §8 and switched on in the responsive.css
480 tier. **Above 480 there is no floatie on any page.** It was dropped on desktop
because the page carries its own structure there (~4 screens, each chapter opening
with a 40px heading) and the bar could only ever name 3 of the 6 places a reader
might jump to — the Full case study card and the pager have no ids. At ≤480 it earns its place instead: `.intro-bar--page` has collapsed to
wordmark + "Say hello", so the floatie is the only in-page nav a phone reader has.
**A 4th pill does not fit at 375 at any label length** (measured: +84px for "Full
case study", +20px even for "More"), so extending the bar is not an option —
re-measure in the 480 tier before changing any label. Each project page carries a
frosted "floatie" pill bar fixed at the bottom centre that jumps between its own
sections. The target sections have ids: `#overview` (masthead), `#process` (the
`#process` is Loop's and Groups' **Approach** section — the id stayed because it is still true on both), `#impact`. All four pages show a
3-pill bar (Overview/Process/Impact). **Pill labels track the page's own
headings, ids don't:** Accessibility now reads Overview / **Approach** / **What
changed** — both renamed with their headings. Its middle id was renamed to
**`#approach`** to match (2026-08); `#impact` keeps its name — shared idiom +
inbound anchors. **Renaming an id is the exception, not the habit:** only when the
old name has become a lie *and* nothing outside the page points at it. That held
here — `#process-locked` described a section that is now a readable statement, and
its only referrer was this page's own pill (no sitemap / `llms.txt` / cross-page
anchors). Messaging keeps its `#process-locked`; that page's section really is
just the panel. **Re-measure the ≤480 bar after any label
change** — see the note on `.section-pills a` padding in responsive.css; that
tier has no slack left, and Accessibility's labels are the longest on the site.
On Loop/Groups the Process pill links to `#process`. **No page uses a locked chip
any more** — Accessibility dropped it in 2026-08 and Messaging followed, so
`.section-pill-locked` / `.section-pill-lock` have been **deleted** from §8.

**A pill is locked when its SECTION is — not when something the section links to
is.** Accessibility's middle pill dropped the chip in 2026-08: once that section
carried a readable Approach statement, a lock on the pill claimed the section was
gated when only the case study was, and the glyph moved to where it's true (the
"Full case study" label on the locked card). Reach for the locked variant only
when a pill leads to nothing but an access panel — and never link a *normal* pill
to a section that isn't there. **The CSS is gone**, so reinstating one means
rewriting it. The markup is static `<a>` links (works with no JS); the `sectionPills` array +
the spy block in `updateScrollEffects` (js/main.js) add the active state,
`aria-current`, and tuck the bar away once the footer is in view.

**The homepage DOES have a `.section-pills`** — the `--site-nav` variant (Work /
About), also ≤480 only. Both of its targets resolve, so `sectionPills` has length 2
there and the spy really runs; an older note here (and in js/main.js) claimed the
homepage had none and the JS was a no-op, which is wrong and would make any
"homepage can't reach this" assumption unsafe. The JS is indifferent to the CSS
hiding: above 480 it keeps spying on hidden elements, which is harmless.

Styles live in project-overview.css §8; the reveal and all phone tuning in the
responsive.css 480 tier. The bar carries **no `data-reveal`** — like the footer, it
is never faded in by the motion system.

| Page | Closes with |
|---|---|
| `work/microsoft-loop.html` | Approach → What changed → **Next Case Study pager** |
| `work/facebook-groups.html` | Impact → **Next Case Study pager** |
| `work/accessibility.html` | Approach → Impact *(closing with the outlined **Full case study** card)* → **Next Case Study pager** |
| `work/messaging.html` | Approach → What changed *(closing with the outlined **Full case study** card)* → **Next Case Study pager** |

**Every page closes with a Next Case Study pager** (`.next-case`,
project-overview.css §9): a full-width link — the next project's homepage card
title + description, no image, a right arrow (`&rarr;`) — that follows the
homepage Work order and **wraps** (Groups → back to Messaging) so every page
has a next.

**The TITLE matches the matching `.work-card` on `index.html` exactly — the
DESCRIPTION deliberately does not (2026-08).** The pager keeps a short 11–19 word
teaser ("Each community had a sense of place. Moving between them didn't.") while
the card carries the longer 29–32 word first-person account of the work. Both
read well where they are: a card has a column to fill, a pager has one line
across a wide box, and a 32-word paragraph sits badly there.

This entry used to say "keep them in sync", and that had been false on ALL FOUR
pages since the card copy was rewritten — the pagers were never updated. Keeping
the shorter teasers is the deliberate call; the rule is what changed to match.
**So: rename a project and update all five titles. Rewrite a card's description
and leave the pagers alone.**
It's a normal page link (not a `#` anchor), so no JS is involved; it reveals like
a section (`data-reveal`) and sits inside `<main>` as the last section, above the
always-visible footer. Built from `<span>`s (not `<p>`/`<h2>`) so the whole block
is one valid `<a>`.

**The pager steps on tokens, not one-off overrides.** Both live in `global.css`
`:root` with a value per tier in each `responsive.css` `:root` — the same
mechanism as `--section-title-size`, so all the per-breakpoint numbers sit
together instead of scattering down the tiers:
- `--next-case-title-size` — **32 → 28 (≤1024) → 28 (≤480, held)**. It is one notch
  under **`--project-block-title-size`** (40/36/32), NOT under `--section-title-size`:
  what a card title has to stay subordinate to is the chapter heading directly above
  it. It governs **both** cards — the pager and the locked Full-case-study card.
  - It was 40/36/32, identical to `--project-block-title-size`. That was only
    correct while chapter headings were 56px; taking those down to 40 silently made
    the two equal, so card titles carried the same weight as real section headings
    and ≤480 flattened to a single 32px for H1, H2 and both card titles. **This is
    why the two tokens stay separate even when their numbers match** — alias them
    and the same drift recurs invisibly.
  - It does **not** step again at ≤480: it also has to stay above the 18px
    description *inside its own card*, and 24px would leave a 6px gap there. Not
    every type token has to move at every tier.
- `--next-case-radius` — 60 → 48 (≤1024) → 32 (≤768) → 24 (≤480). Steps at
  **every** tier because it's a shape, not a line of type. This is why the card
  is deliberately NOT in the `.work-card-image-link` / `.project-figure` radius
  group in the 768 tier, which still jumps 60 → 24 in one move.

Padding stays on `--gap-group` (60/48/40) rather than taking a fourth set of
values — it's the site's spacing scale, and the card has no reason to leave it.

**Optional card treatment (`.next-case--image`).** A page can put the
destination's own gradient behind the pager, turning it into a card on the
Work-card system. The art is
a **CSS background**, not an `<img>` — one shared modifier plus a per-project
one-liner setting `--next-case-image` (project-overview.css §9). Assets are
2660×830 like the Work cards (`images/<next-page>-next.jpg`, q70 per the image
recipe) and are named for the page linked **to**. `background-size: cover` is
load-bearing: the pager box is much wider than the asset's 3.2:1, so the crop
takes the middle band and drops the asset's own baked-in rounded corners — which
sit on light grey and would otherwise show as wedges against the cream. **All
four pages now carry art**, so the chain reads messaging → accessibility → loop
→ groups → messaging (rewired 2026-08-31 when Messaging took the lead card).
Text stays `--color-text` / `--color-text-70` throughout. **Re-measured
2026-08-31** at 1440, worst pixel under the glyphs, on the 1328×240 card that is
the tightest crop `cover` produces:

| art | title | description |
|---|---|---|
| `messaging-next` | 12.36 | 6.54 |
| `accessibility-next` | 11.84 | 6.37 |
| `groups-next` | 11.39 | 6.24 |
| **`loop-next`** | **10.73** | **6.00** ← the floor |

The floor is `loop-next.jpg`, which the reorder moved onto **Accessibility's**
pager. This entry previously claimed 4.65:1 on `accessibility-next.jpg` at
Groups — wrong on the number, the image and the page, and it made the margin
look far thinner than it is. 6.00 against AA's 4.5 is real headroom, but
re-measure if any gradient is re-exported darker. A dark destination colour
would need the text inverted for that page, not the image dimmed.

The `.project-continue` hand-off is gone from Loop and Groups — Jenna is writing
high-level case-study content to sit inline below Impact rather than link out.
The `.project-continue*` CSS has been **deleted** (project-overview.css + the
responsive.css 480 tier); don't reintroduce it.

**The Conversation Invitation is gone and is not coming back by accident.** Its
note + locked-case-study button moved up into the masthead lockup (before
Overview — the primary action can't wait for a panel that reads as a footer).
Both pages now run Overview → Process (locked) → Impact, then the shared Next
Case Study pager — the Conversation Invitation is not part of that. All of its
code has been **deleted**: the `.conversation-invite-*` CSS (project-overview.css
+ responsive.css 1024 / 480 tiers) and the `.conversation-invite` fallback in
`darkPanel` (js/main.js). `darkPanel` is now just `getElementById('contact')`.
`.invite-button` and `.project-locked` are both **deleted** (2026-08) — see the
gating rules below.

**Shared structure (identical in all four):** hero visual → title + metadata →
Overview (description) → **Contribution/Process** → Impact *(whose column closes
on that project's **Public footprints** block — see the rules below)* → *then*
the **Next Case Study pager** (`.next-case`). (Loop used to keep a "The Way In" explore-product
step between Impact and the pager — REMOVED 2026-08; the live product is now a plain
inline link on "Microsoft Loop" in Loop's Overview paragraph, because that page has
nothing gated and so has no primary action for a card to carry. Accessibility closes Impact with the outlined
**Full case study** card *inside* that section — see the gating rules below; it is
the one page whose Impact section ends on a card.)
`work/microsoft-loop.html` is the canonical skeleton — copy it when adding a project.

Contribution sits **between Overview and Impact**, in the same `.page-section` as
both. There is no separate "Role & Contribution" section (it was removed); the
masthead metadata still carries the short `Role` row.

**Contribution is optional — drop it when it only abstracts Impact.**
Accessibility has no Contribution block for exactly that reason: its three
clauses were a table of contents for three Impact bullets, which say the same
thing with numbers. Blocks are per-page, not mandatory; the structure is shared,
the presence of any one block is an editorial call. A summary page should also
not spend the framing that the full case study is there to reveal.

**The "Say hello" trigger is site-wide below 680 (2026-09).** All five pages'
mobile trigger carries the landing's label and its solid black pill
(`.mobile-menu-toggle` in mobile-menu.css, on the BASE rule so both page types
get it). The project pages' button used to read "Menu".
- **Sized by PADDING (8 + 20 + 8 = 36px), not `height`.** A rule that set
  `display: inline-flex` to centre the label would have to be scoped
  (`.site-header .mobile-menu-toggle`, 0,2,0), and that outranks the 680 tier's
  `.mobile-menu-toggle { display: block }` (0,1,0) — the button would never
  appear at all. Keep the pill on the base rule so `display` stays at one
  specificity and responsive.css (imported last) still wins.
- ⚠️ **The LABEL is shared; the PANEL is not.** The homepage's overlay is
  connect-only (`aria-label="Contact"`) because its floatie carries Work/About.
  The project pages' overlay carries **Work / About + connect** and is the ONLY
  route to those two sections below 680, since project pages have no site-nav
  floatie. **Do not trim it to match the label.**
  - Its accessible name is **`aria-label="Navigation and contact"`** — it names
    BOTH halves. It read "Site menu", which was true until the trigger became
    "Say hello" (2026-09): activating a button named for contact and landing in
    a dialog announced as a menu hid the fact that this panel is also the only
    way to reach Work and About. **The homepage's stays "Contact"** — there the
    panel really is connect-only, so a compound name would be a lie.
- The trigger does NOT morph — `initNavMorph` is scoped to `.intro-bar`, and
  there is no hover at this tier.
- Inversion (white pill, black label) is `.site-header` only, and that is not an
  oversight: project pages have no `#contact`, so `contactSection` is null and
  `updateScrollEffects` skips the whole inversion block — `.intro-bar--page`
  never receives `is-over-dark`.
- The project bar grew 58px → **64px** at this tier as a result, matching the
  desktop bar's own 64px.

**Top nav (2026-08).** These pages no longer carry the old `.site-header`. They
share the landing's own bar — `<nav class="intro-bar intro-bar--page">` — so the
site has ONE nav. Same markup as the homepage's, with the links resolved back to
`../index.html#…` and the wordmark an `<a>` home instead of a `<p>`. The
`--page` modifier (project-overview.css §0) is what changes: no hero to rest in,
so the pull-up margins and the entrance animation are neutralized and the glass
is forced on — the bar is pinned from the first pixel, with JS off too. At ≤480
it collapses to wordmark + "Say hello" (responsive.css 680 tier) and the `.mobile-menu`
overlay is unchanged. **This bar is the SITE nav; `.section-pills` is the IN-PAGE
nav.** Two different jobs — don't merge them.

**Rules:**
- **Content is Jenna's, not the model's.** Every content slot ships as a labeled
  `[Placeholder]`. Never write, expand, summarize, or invent project copy —
  including "reasonable" filler for a missing timeline or team.
- **Omit, don't fabricate.** If a metadata row (Timeline / Role / Area / Scope)
  or a detail block has no information, delete it. Never leave it blank or guess.
- **Impact rows can expand (`.project-impact-list--expandable`, all four pages,
  2026-08).** Each row is a native `<details>`: the `<summary>` carries the
  outcome (18px/**500**, full black) **and an evidence line** (13px/400 at
  **`--color-text-70`**), and only the explanation collapses.
  - **Never move a metric into the collapsed half.** The whole reason the split
    exists is that the numbers are the strongest proof on the page — an accordion
    that hides them trades the page's evidence for tidiness. Summary = outcome +
    proof; detail = why.
  - **The claim's weight and the evidence's colour are ONE decision — change them
    together.** The outcome was 600 (inherited from `.project-impact-list strong`)
    with the evidence at full black. That works on the plain lists, where the
    emphasis is a lead clause *inside* a sentence; here the whole line is the claim,
    so 600 applied to every word of four stacked 18px lines and read as a wall of
    bold. Dropping to 500 fixed that but left two full-black elements with no focal
    point, so the evidence went to 70%. **Undo in that order:** if the numbers ever
    need to fight for attention again, put the claim back to 600 *before* putting
    the evidence back to full black — two blacks was the problem, not the mute.
  - The evidence line still takes **`.project-meta-row dd`'s size and tracking**
    (13px, normal tracking) — same material as the masthead's Timeline / Role / Team
    values. Only the colour departs, and only because there is no muted `dt` label
    beside it here to do the contrast work. At 70% it is 8.4:1 — not fine print.
  - **500 is the floor for the claim.** At 400 it would be identical to the 18px/400
    explanation that opens underneath, and an expanded row would collapse into one
    undifferentiated block of body copy.
  - **`.impact-row-detail` declares NO type at all** — only padding. It inherits
    the 18px/-0.02em/1.4 full black from `.project-impact-list li`, which is what
    these paragraphs were before they became collapsible and the same body text
    the Approach statement uses. **Expanding a row reveals the site's body copy,
    not a smaller quieter variant of it.** Don't add a font-size here; a component
    that invents its own reading size is the bug this rule exists to prevent.
  - **One open at a time** comes from the shared `name="impact-row"` — the
    platform's exclusive-accordion behaviour, **not** a script. Keep the name
    identical across all four; a typo silently un-groups that row. Browsers
    without it (pre-2024) simply allow several open, which is the old behaviour
    rather than a broken one.
  - **No JavaScript, deliberately** — the browser owns the toggle. `js/main.js` is
    shared by every page (a TypeError there blanks one), and the "readable with JS
    off" rule means a scripted accordion would hide all four explanations from the
    AI crawlers that don't run JS. `<details>` also gives keyboard, focus, and the
    expanded/collapsed announcement for free. Keep it that way. **This is why
    one-at-a-time used `name` rather than a click handler** — the obvious reach
    for JS, avoided.
  - Rules are scoped to the modifier; the plain `.project-impact-list` is
    untouched. Only Loop and Groups still have one — it holds their three named
    principles under Approach, not their outcomes. Messaging has no plain list.
  - **The open/close motion is Motion Primitives' accordion, rebuilt in CSS
    (2026-09).** That library's `<AccordionContent>` animates one motion.div
    between `{height: 0, opacity: 0}` and `{height: 'auto', opacity: 1}` inside an
    overflow-hidden item, under `AnimatePresence` — so the CLOSE animates too. Its
    chevron demo runs that at `{duration: 0.2, ease: 'easeInOut'}` with the icon
    rotating 180° over 200ms, which is the preset adopted here **because this row
    already had that chevron verbatim**; the only missing half was the box itself
    growing. `::details-content` is the native equivalent of its motion.div: the
    browser still owns the state, the CSS owns the curve, and **the no-JS rule
    above is untouched** — the library is React + Motion and none of it is loaded.
    - It needs `interpolate-size: allow-keywords` (`height: auto` is otherwise not
      an interpolable endpoint, and the row just snaps). Scoped to
      `.project-impact-list--expandable`, **not `:root`** — it changes how `auto`
      behaves in every transition it reaches.
    - `content-visibility` is in the transition list with
      `transition-behavior: allow-discrete`, or the closing half never renders.
    - **The old text-only fade is the FALLBACK and must stay.** The whole block
      sits behind `@supports (interpolate-size: allow-keywords) and
      selector(::details-content)`, which switches the `impact-row-open` keyframe
      off; a browser missing either feature keeps exactly the previous behaviour
      (snap open, text fades). Both conditions are required — with
      `::details-content` but no `interpolate-size` the height would snap while
      clipped, which is worse than either.
    - The docs page's other preset, `{type: 'spring', stiffness: 120, damping: 20}`,
      is **not** used: that spring is underdamped (ratio 0.91) and overshoots, so it
      needs a `linear()` approximation rather than a bezier, and it would bounce
      the page below the row.
- **Gating states that the work can't be shown publicly and points to the locked
  case study.** No AI conversation. **Two treatments exist — pick by whether the
  page has an Approach statement to carry:**
  - **`.next-case--locked` + `.next-case--outline` (Accessibility, 2026-08)** — the
    gate is a CARD on the shared `.next-case` shape, sitting at the **end of
    `#impact`**, after the four outcomes:

        ┌────────────────────────────────────────────────┐
        │ 🔒 FULL CASE STUDY                             │
        │ Go deeper into the work                     →  │
        │ Need access? Request the password at <email>   │
        └────────────────────────────────────────────────┘
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ← the project ends
        NEXT CASE STUDY · Creating Continuity…       →     (art card)

    **Position is the argument, and it has moved twice — don't move it again
    without reading why.** It began under the Approach statement (~58% page depth),
    which asked the reader to email for a password before a single number had
    landed. It then sat *below* the full-strength rule, stacked on the pager, where
    two identical cards 96px apart read as peers while saying opposite things
    ("stay, there's more of this" vs "move on"). It now sits **above** that rule,
    because the rule means *the project ends here* and going deeper into this
    project is not leaving it.
    - **Don't promote it to its own `<section>`.** The divider targets whatever
      section precedes the pager (`:has(+ .next-case-section)`), so a new section
      would take the rule off `#impact` and leave the card floating ~192px below the
      evidence with no divider — the drift the move was meant to fix. `.page-section`
      padding is a fixed 96px either side, so it can't be tightened without a
      special case.
    - **This card is a DESTINATION, not a hinge** — that's why it belongs at the
      end of what earns it rather than floating between sections.
    - **Spacing is asymmetric on purpose:** `--gap-group` above (via
      `.project-block + .next-case`), ~193px + the rule below. Tight above binds the
      card to its evidence; loose below separates it from the hand-off. Equalising
      it would make the card read as its own section without being one.
    - **`.next-case--outline`, not `.next-case--image`.** The pager keeps the
      destination gradient; this card takes a hairline. That difference is the second
      thing keeping the two cards legible as different offers — **don't give this one
      art**. Border is full-black `--color-border`, not the 12% used by the Impact
      rows above it: those are dividers *between* peers, this is an enclosure *around*
      one thing, and at 12% a line around a card this wide stops reading (the same
      finding recorded on `.project-locked`).
    - **It is a `<div>`, not an `<a>` — forced by content, not preference.** It
      carries a SECOND link (the mailto, the only route to the password) and anchors
      cannot nest. The title holds the real link and stretches an invisible `::after`
      across the card (`.next-case-link::after`); `.next-case-aside-link` is lifted
      back above that overlay with `z-index`. Click anywhere → Figma, click the
      address → mail, zero nested anchors. **If the mailto is ever dropped, this can
      go back to a plain `<a>` like the pager** — hit-test either way.
    - **The stretch needs the CARD as its containing block.** `--outline` supplies
      `position: relative` for exactly that; any future treatment carrying
      `--locked` must too. This bit once: `--image` sets `position: relative` on the
      card's *children*, which made `.next-case-body` the nearest positioned ancestor,
      so the overlay sized itself to the body (116px of a 251px card) and left the
      eyebrow and padding dead to the click. `.next-case--locked > *` and the
      `:focus-within` zoom are both **dormant while the card is outlined** and kept
      only so re-adding `--image` can't silently reintroduce that bug or drop
      keyboard parity.
    - **The lock is on the eyebrow** — on the label of the thing that's locked,
      never on the action.
    - **The public-work link is not here** — it lives at the bottom of the fourth
      Impact row's explanation, with the outcome it evidences.
    - `.next-case-stack` and all `.project-gate*` CSS are **deleted**; don't
      reintroduce either.
  - **Messaging uses the SAME card, in the SAME place** (2026-08). There is one
  locked-case-study object on the site, and on both pages it closes `#impact`, above
  the page's one full-strength rule. Messaging gained a real Approach section at the
  same time, so `#process-locked` is gone there too.
- **`.project-locked`, `.project-locked-*` and `.invite-button` are DELETED**
  (2026-08). Loop was the last holdout — its "Explore the live product" panel is
  gone, and the live product is linked inline from the Overview paragraph instead.
  **There is now ONE "go somewhere" component on these pages:** `.next-case`, with
  `--image` for the pager and `--outline` (+ `--locked`) for a gated case study.
  Anything else is a plain inline link. Don't reintroduce a third pattern.
- **The HOMEPAGE signposts the gate too (`.work-card-lock`, 2026-08-31).** The
  Work cards for **Accessibility and Messaging** open their meta row with a
  circular lock badge — lock → `SHIPPED ↗` → `Meta · 2026`, so the gate qualifies
  everything after it rather than trailing the provenance as a footnote. Loop and
  Groups have nothing gated and **must not** get one; the badge's presence is the
  same fact as the `--locked` card on that project's page, so the two move
  together.
  - **It reuses the `.next-case-lock` padlock verbatim** — same 24-unit viewBox,
    same 1.5 stroke. ONE padlock on the site; don't draw a second.
  - **The circle is the pill's box restated** (`1.5em` line + `0.8em` padding +
    2px hairlines = its exact 31.9px height, same `rgba(0,0,0,0.22)` rule), so it
    stands level with `SHIPPED ↗` and follows it if that type ever moves tier.
    Spelled out as its parts on purpose — don't hard-code 31.9px.
  - ⚠️ **It is the one place the lock does NOT name the thing it sits on.** The
    card links to a project overview page that is fully public; the gate is one
    step further in. That is why the accessible name is **"Full case study
    locked"**, not "Locked" — the badge and its label are one unit, and splitting
    them would make the card claim to be gated when it isn't. Compare the section
    pill that lost its chip in 2026-08 for the same error made the other way.
- **The lock lives on the DESTINATION, never in this page.** Set the Figma file's
  share access to **"Anyone with password"** — *not* "Anyone with the link",
  which has no lock at all and would make the "locked" label a lie while
  broadcasting a confidential URL. Figma checks the password server-side; the
  password is shared by email. **Never put a password (or any secret) in these
  pages** — the site is static, so anything checked here runs in the browser and
  is readable in View Source. A client-side check is not a gate. Only the URL
  belongs here, and only once the password is on.
  - **Both gated pages point at ONE deck** (`GnRGdDvtKA6itBaqeNaMwd`,
    2026-09), at different slides via `node-id` — Accessibility `37-622`,
    Messaging `2146-581`. So the password is set once, on that single file, and
    covers both. The previous per-page deck (`yyBb74Gk…`, titled "DRAFT") is
    gone.
  - **Figma's "Copy link" appends a `t=` parameter**, and it ships in the href.
    ⚠️ VERIFY THE GATE, DON'T REASON ABOUT THE URL: paste the full link into a
    private window and confirm it prompts for a password. Checked 2026-09 — it
    prompts, so `t` conveys no access and the password is the only way in. Any
    new deck needs that test again, because the risk is not the parameter, it is
    a share setting quietly left on "Anyone with the link" — which would make
    the "Full case study locked" label a lie while broadcasting the URL.
  - **`&` in these hrefs must be written `&amp;`** — the deck links carry six
    query parameters, and a bare `&` in an attribute is invalid HTML.
- **Public footprints live HERE now, one set per project (2026-08).** The
  homepage's standalone `#footprints` section was **deleted** — section, nav
  item, `.footprints-layout` / `-left` / `-right`, and the `#footprints` entries
  in `navSections` / `introBarSections` in js/main.js. Each project page closes
  its **What changed** column with a `.footprint-group` (eyebrow "Public
  footprints" + `.footprint-list`) holding that project's third-party coverage:
  Loop 4 links, Accessibility 2, Groups 2, Messaging 1.
  - **Why the end of `#impact` and not a section of its own:** the links are
    *evidence*. The rows above are Jenna's account of what changed; this is the
    outside record of it. A section of its own would also steal the page's one
    full-strength divider, which targets whatever section precedes the pager.
  - **On Accessibility and Messaging it sits ABOVE the locked Full case study
    card**, which still closes `#impact`. Evidence, then the destination that
    evidence earns.
  - **Nothing is restyled per page.** `.footprint-group` / `.footprint-group-title`
    / `.footprint-list` survive in `sections.css` (imported first), so the block
    is the homepage's own material. The ONLY project-page rule is
    `.project-impact-list + .footprint-group { margin-top: var(--gap-group) }` in
    project-overview.css — written as a sibling relationship, matching both the
    plain and `--expandable` lists.
  - **No `data-reveal` on the block.** It sits inside `.project-block-right`,
    which already carries one; a nested target would be hidden by a group it
    isn't in.
  - **Four Microsoft links went with the deleted section** (Future of M365,
    Fluent Design, Simplified Ribbon, Power & Simplicity) — they belong to no
    project page and are off the site. Don't re-add them without a home.
  - Links are external sources, **not authored by Jenna**. Keep the eyebrow
    neutral and never fold them into the impact copy.
  - Adding a link here means adding it to that page's JSON-LD **`citation`**
    (never `sameAs` on the Person) and to `llms.txt`, which now groups the
    footprints under the project page each set lives on.
- **Messaging scope guardrail:** ownership was localized to Jenna's org and
  leadership, NOT Meta's messaging ecosystem. Don't let titles or Role copy
  widen into ecosystem-level claims.
- These pages set **`is-motion` only** in their inline `<head>` script — never
  `is-loading`. The scribble load-reveal is the homepage's alone.
- Pages live one directory down, so assets are `../style.css`, `../js/main.js`,
  `../images/…`, and nav links are `../index.html#work-section`. (The `@import`
  URLs in `style.css` resolve relative to `style.css`, so they work as-is.)

**`js/main.js` is shared by every page and is guarded accordingly.** Project
pages have no hero, no `#work-section`/`#about`/`#contact`, and no work cards.
`navSections` filters itself to the links that exist; `initHero()` returns early
without `.intro`; the cursor and scroll-effect code null-checks. **This matters:
`is-motion` hides every `[data-reveal]` pre-paint, so one TypeError in main.js
would leave a project page permanently blank.** Keep new page-specific code
behind a null check.
- `darkPanel` is the blue panel the header inverts over (`is-over-dark`) and the
  👋 cursor shows on: `#contact` on the homepage only. The project pages end on
  cream, so `darkPanel` is null there and both features simply stay off.

## Token / Lookup Rules
- **NEVER read `style.css` to find styles** — it only contains `@import` lines. Open the specific file in `css/components/` from the table above.
- **When editing HTML text/content only, do not read or analyze CSS files.**
- **Use line-range lookups (offset/limit) for `index.html`** rather than reading the whole file. Grep for a class or `id` first to find the range.
- To change a color/spacing/font used site-wide, edit the token in `global.css` `:root`, not the individual rules.

## Editing Responsive Breakpoints (mobile / tablet only)
When the request is about how the site looks/behaves at a **smaller screen size**
(mobile, tablet, "on phones", "when it stacks", a specific breakpoint):
- **Only open `css/components/responsive.css`. Do not read or edit any other CSS file, `index.html`, or `js/main.js`.**
- All width breakpoints live there, grouped by screen size (standard tiers):
  `1440px` (carries `.site-nav-bar { gap: 60px }` — not empty, despite the label) · `1024px` (landscape tablet — nav reflow, Work/About/Contact stack) ·
  **`680px` (NAV ONLY — the desktop bar hands over to the mobile header + floatie;
  put nothing else here, see "The nav hand-off at 680")** ·
  `768px` (portrait tablet — Work card images, hero/intro full width) ·
  `480px` (large phone — nav gap, work grid → 1 col, connect links wrap, footer
  stack, **and the only tier where `.section-pills` exists on any page**).
- To tweak an existing responsive rule, edit inside the matching `@media` block.
  To add a new one, put it in the correct block (create a new `@media` in
  largest→smallest order if the breakpoint doesn't exist yet).
- Desktop (≥1440px) base values are NOT here — changing those is a separate,
  non-responsive edit in the relevant component file.
- Suggested phrasing: **"in responsive.css, at [breakpoint], change [selector] [property]"**
  — e.g. *"in responsive.css, at 480px, add 20px side padding to the hero."*

## Horizontal Tracks (the Selected Work carousel, 2026-08)

Selected Work is a **looping horizontal track from 481 up, and a plain vertical
stack at ≤480**. Above the phone tier the cards run left→right, one
near-full-width card at a time with the next peeking in, and scrolling past the
last one brings the first round again in either direction. `.work-list` in
`sections.css`, `initWorkCarousel()` in `js/main.js`.

**The phone has no horizontal track, and switching that off takes BOTH halves.**
responsive.css's 480 tier reverts the layout (and must reset `.work-card`'s
`flex` — in a column container the basis applies to the main axis, so the
desktop `calc(100% - peek)` would set each card's *height*). `initWorkCarousel`
watches the same boundary and disables itself, restoring the authored card
order it captured at init. **That gate is correctness, not optimisation:** on a
column layout `scrollLeft` is pinned at 0, so the loop's "scroll back into the
buffer" branch is permanently true and re-prepends a card on every scroll event,
scrambling the running order of the projects. Move the breakpoint in one place
and you must move it in the other.

The gate runs off **two** triggers — `matchMedia` `change` *and* `resize`.
`change` is the precise one but a single point of failure, and it was measured
being dropped on a desktop→phone transition, which leaves the loop live over a
vertical stack: exactly the corrupting state above. `syncToTier` is idempotent,
so the redundancy is free.

**Specifying one of these — the five axes.** Name all five and there is nothing
left to guess:

| Axis | Options | Selected Work |
|---|---|---|
| Cards visible | one + peek · two-up · gallery | one + peek |
| Input model | native scroll · scroll-jacked/pinned · arrow buttons | native |
| Snap | free · snap to card · snap + **paging** | snap + paging |
| End behaviour | hard stop · rubber band · **loop** | loop |
| Travel per gesture | unlimited · **one card** · N cards | one card |

Shared vocabulary, all of which maps to something real in the code: **peek** (the
sliver of the next card — a token, `--work-peek`) · **snap** (lands on a card) vs
**paging** (can only ever advance one — a different declaration, see snap-stop
below) · **loop/infinite/circular** (endless both ways) vs **wraps** (forward
only) · **fling/momentum** (the trackpad tail after the fingers lift) ·
**scroll-jacking/pinned** (vertical scroll drives horizontal movement — a wholly
different build that breaks with JS off) · **flush to the grid** (a card rests on
the container line, not the screen edge).

**Choices that silently create a second decision** — name the pair together:
- **loop → what stops a fling.** A finite scroller kills momentum by running out
  of runway; a loop removes that floor. This is not theoretical, it shipped as a
  bug: see snap-stop below.
- **one card at a time → does the card's own layout still fit.** It did not here;
  `.work-card-left` / `.work-card-right` had to become shrinkable.
- **horizontal → what the phone does.** Usually a different answer; here it is
  "don't", and unwinding it needed a CSS revert *and* a JS gate.

### Pagination (`.work-pagination`, 2026-08-31)

Four dots on a frosted pill, drawn over the bottom of the **cover photo**, saying
which of the four projects is on screen. Same pill as `.project-carousel-dots` —
translucent black, backdrop blur, 10px dots, white when active — because it is
the same object in the same situation. Restated in `sections.css` rather than
shared, since that one is positioned for a masthead slide and this one is
anchored to a moving track.

**It is HELD STILL while the photos slide underneath**, which is the whole
reason it sits outside the track as ONE element rather than as four copies
riding inside the cards. A per-card version was built first and is genuinely
simpler — **it needs no JavaScript at all**, because card 3 can just pre-mark dot
3 and the visible photo is the answer — but it travels with its card, which is
exactly what this must not do. If that requirement ever relaxes, go back to it.

| Axis | How it is anchored |
|---|---|
| Horizontal | Pure CSS. The resting card is flush at the container's left edge and `100% - --work-peek` wide, so the centre is half of that. |
| Vertical | `--work-photo-bottom`, published by `initWorkCarousel`. |

**Why the vertical needs JS.** At ≥1025 the photo is the card's LAST element, so
the container's own bottom would serve — but at ≤768 it moves to the TOP, where
its height is a ratio of the card's **width**, and `top` percentages resolve
against **height**. One measured number covers every tier. The `100%` fallback in
the CSS is the desktop answer, so the bar is right before the first measurement
and if the script never runs.

- **Measured with `offsetTop`/`offsetHeight`, never `getBoundingClientRect`.**
  The photo carries `data-reveal`, so before its group animates in it is
  translated down by `REVEAL.distance` (16px) and the rect reports that. Measured
  at load, it put the bar 16px low — 8px inside the photo instead of 24. Offsets
  ignore transforms. `#work-section .site-container` must keep its
  `position: relative`: it is both the positioning context AND the photo's
  `offsetParent`, so the two numbers agree.
- **Dots index `authored`, not the live DOM.** The loop rotates children
  constantly, so dot 1 means "the first project in the document", never
  "whatever is first right now". `updateDots()` reads
  `Math.round(scrollLeft / step)` for the DOM position, then `authored.indexOf`
  to get back to the project.
- **`updateDots()` is called from the scroll listener directly**, not only via
  `normalize()` — that returns early while the damped run owns `scrollLeft` and
  again when a touch gesture has spent its rotation budget, and the track is
  still moving in both.
- **Clicking a dot moves ONE card, carried by the same spring a wheel gesture
  gets** (`stepToward`). It starts a damped run exactly the way `onWheel` does,
  with `dampSettling` true from the first frame — a wheel gesture has to wait to
  learn where the reader meant to go, a click said so outright.
  - **It steps rather than jumping, and that is FORCED, not preferred.** Landing
    on a distant project with only one card of travel would mean making it
    adjacent first, and it cannot be done: the loop reorders by ROTATION, which
    preserves the cycle, so the distance between two cards around the ring is
    invariant. The choice is one card of motion OR arriving in one click, never
    both. (The earlier build took the other side of that trade and landed
    instantly via `bringIntoView`.)
  - **With four projects it costs almost nothing:** from any card, two of the
    other three are one step away — one forward, one back — and only the opposite
    card needs a second click. Direction is the shorter way round the ring; a tie
    (the opposite card) goes forward.
  - Under `prefers-reduced-motion` it takes the same one-card move without the
    animation, via `bringIntoView` — the branch the wheel path takes at that
    point too.
  - A click during a live wheel run is IGNORED rather than retargeted: that run
    owns `scrollLeft`, and `endDamp` is what restores snap and the `damping`
    flag.
- **Hidden by `.work-list:not(.is-looping) ~ .work-pagination`** — one rule
  covering both JS-off and ≤480, since `.is-looping` lands only when the
  horizontal track is actually running. The sibling combinator is why the markup
  must stay next to the track. No `data-reveal` (it is in no reveal group, and
  one would leave it hidden for good).

### The vertical position locks while you work the carousel (2026-08)

Scrolling the carousel horizontally does not move the page vertically, and that
is the whole of it — there is no pinned section any more. `initWorkCarousel`'s
wheel handler `stopPropagation()`s any gesture it judges predominantly horizontal
so it never reaches Lenis on `window`; vertical gestures return before that line
and scroll the page normally. The Y position is therefore held for exactly as
long as the reader is working the carousel and not a moment longer. No state,
nothing to escape from, nothing to re-arm.

**⚠️ A PINNED WORK SECTION WAS BUILT FOUR TIMES AND REMOVED FOUR TIMES.** Read
this before building a fifth:
1. **settle on idle** — grabbed anyone who paused anywhere near the section;
2. **settle on idle, Work only** — same grab, just rarer;
3. **ease in on entry (1.1s, easeInOutCubic)** — took over the scroll as soon as
   the reader came close. Softening the curve does not help: the objection is to
   the takeover, not the motion;
4. **hold in place on entry** — moved nothing, which was closest, but still froze
   the page under someone only passing through, and needed an arming flag, a
   cooldown, a release accumulator and five escape hatches to stay survivable.
   Each of those existed to patch a symptom of the one underlying problem.

The `stopPropagation` above gets the "locked in" feeling with none of it, because
it is scoped to the gesture rather than to the section.

**`initSectionGeometry` is what survives**, and it scrolls nothing. It publishes
two things: each section's composed resting position — used by nav-link clicks
and by the scroll-spy, which is why About and Contact still land centred when
CLICKED — and the measured `--footer-height` that Contact's `min-height` reads.

### Damped horizontal motion (2026-08)

Card-to-card motion is **damped in JS**, adapted from the Codrops horizontal
gallery: wheel deltas accumulate into one `target`, and each frame `scrollLeft`
moves toward it (`onWheel` / `dampStep` in `initWorkCarousel`).

**The curve is a CRITICALLY DAMPED SPRING, not exponential decay** — this was
changed 2026-08 and the reason matters. Exponential decay
(`pos += (target − pos) * factor`) is ease-OUT only: peak velocity is on the
first frame and only falls. Measured at a 650ms setting it put 39% of the travel
in the first 50ms and half in 70ms, then spent the rest of the budget covering 4%
at under 8px/frame — invisible. So it launched hard, and the config number bore
little relation to any perceived duration, which is exactly why the dial was so
hard to tune: raising it lengthened a tail nobody can see and left the abrupt
start untouched. The spring starts from REST, accelerates, then settles without
overshoot (14% covered at 50ms, not 39%), and `dampVel` carries across a target
change so committing mid-run bends the motion instead of restarting it.
It is integrated with the **exact analytic solution** for critical damping, not
Euler steps, so it stays stable at the 50ms `dt` cap where a naive integrator
visibly overshoots.

| To change… | Edit |
|---|---|
| How long a card takes to land | `DAMP.arrival` (650ms — a duration, not a curve constant) |
| Where the motion stops crawling | `DAMP.settle` (2px) |
| How far you must push to pick a card | `DAMP.commit` (0.1 of a card) |
| How long the tail is swallowed for | `DAMP.quiet` (120ms of wheel silence) |

**`DAMP.arrival` IS the duration in milliseconds** — set it and you are done.
`dampStep` solves the exponential decay for it each frame, so there is no curve
constant to work out by hand. It was a per-frame ease fraction until 2026-08,
which needed the formula solved for every adjustment AND tied the speed to the
refresh rate. Two further wins from deriving it: the timing is identical at 60Hz
and 120Hz, and identical across breakpoints (a fixed ease made the smaller cards
at ≤1024 arrive sooner, since the same fraction of a shorter distance is less
travel).

Every value here was judged on real hardware — **rAF does not tick in the preview
pane, so this dial cannot be set there at all.** Rejected on the way: ~370ms too
fast, ~840ms laggy, ~540ms close. **650ms is the settled value.** `settle` matters as much as `ease`: at 0.5px the
last few pixels crawl for hundreds of ms while nothing visibly moves, which is
most of what "too slow" actually was.

**`ease` is normalised to elapsed TIME, not applied per frame.** A raw per-frame
fraction ties the speed to the refresh rate — the first version ran 1033ms on a
60Hz display and 517ms on a 120Hz one, from identical code. `dampStep` converts
via `dt / 16.67`, and caps `dt` so a stalled tab resuming cannot jump the whole
distance in a single frame.

**The accumulating target IS the design — never turn this back into a
fixed-duration animation per gesture.** That was built and reverted the same day:
a real flick keeps firing momentum wheel events for a second or more after the
fingers lift, so each one landing after an animation finished started another,
and one flick lurched through two or three cards. Deltas folding into a single
target cannot chain, because there is no discrete animation to re-trigger — and
delta *magnitude* matters again, so a gentle scroll moves a little.

- **COMMIT EARLY — never wait for the gesture to end to choose a destination.**
  It once did, via the quiet timer, and the track visibly lingered part-way and
  then jumped to the card: a trackpad keeps firing momentum for up to a second
  after the fingers lift, so "quiet" arrives long after the reader has stopped
  moving. `onWheel` now commits as soon as the push passes `DAMP.commit`
  (~67ms), and `onQuiet` only handles the undecided case — a small nudge that
  stops, which goes back where it came from.
- **The tail is handled by a LOCK, not by delaying the commit.** On landing,
  `endDamp` calls `relock()`; every further wheel event is swallowed and pushes
  the unlock out again, so the run cannot re-trigger until the tail has been
  silent for `DAMP.quiet`. This gates re-arming only, never the motion, so a
  mis-timed unlock costs a slightly delayed second flick rather than a runaway.
- **The CAP is the clamp, not gesture detection.** `dampTarget` is pinned to one
  card either side of `dampAnchor` (where the gesture began), so a hard flick's
  momentum tail keeps arriving and simply finds the target already pinned. This
  is the job `scroll-snap-stop` does on the native path, done here because snap
  is off during the run. `DAMP.quiet` only decides when to *re-arm*, so being
  slightly wrong costs a marginally delayed second card, never a runaway.
- **The Codrops version replaces native scroll** with a virtual value behind
  `overflow: hidden`. That is the one thing NOT copied: damping the real
  `scrollLeft` of a real scroll container is what keeps the track working with JS
  off, keeps native keyboard scrolling (which `flushFocusedCard` needs), and
  keeps touch.
- **Mandatory snap is off for the run's duration** — it re-snaps any programmatic
  `scrollLeft` and would flatten every frame. Restored in `endDamp`.
- **`normalize()` stands down while damping**, or the closing frames of a
  backward run trip the rotation mid-flight.
- **`endDamp` has a TIMER backstop, not a rAF one.** Mid-run the code owns
  snap-off and the `damping` flag; if the rAF chain stops before the last frame
  both stay that way and the carousel is dead until reload. rAF *stops* outright
  in a backgrounded tab; timers are only throttled, never stopped.
- **`deltaMode: 1` is handled** — real mouse wheels report LINES, not pixels, and
  without the conversion a mouse wheel barely moves the track.

### Invariants — break these and the loop breaks

- **TOUCH needs its own cap — snap-stop is not enough there.** A finger swipe has
  no wheel to intercept, so it falls straight through to native scroll, and the
  loop then hands the momentum fresh runway on every rotation: on an iPad the
  track spun through the whole carousel. iOS does not honour `scroll-snap-stop`
  reliably through momentum, and rewriting `scrollLeft` mid-flight can defeat the
  snap target the browser already picked. `normalize()` therefore allows at most
  `TOUCH.rotations` (1) per gesture; once spent it simply stops rotating, and the
  track runs out of its OWN finite runway and halts — the way a non-looping
  carousel kills a fling. The invariant is restored `TOUCH.settle` (180ms) after
  the scroll goes quiet, which is instant and pixel-preserving. **Not a clamp on
  `scrollLeft`** — writing to it against live momentum is a tug-of-war the reader
  sees as jitter. Withholding the rotation takes nothing away; it just stops
  giving.
- **`scroll-snap-stop: always` on `.work-card` is the fling cap ON THE WHEEL.** Without it a
  hard trackpad flick spun through the whole carousel, because every rotation
  hands the momentum another card of runway. **Never "fix" fling speed in JS** —
  only the browser can tell a momentum tail from a fresh deliberate flick, so a
  cooldown either fails to stop the momentum or blocks a real second flick. It
  also has to stay CSS so a long held two-finger drag can still cross several
  cards.
- **ROTATION, never cloning.** The four cards are moved, never duplicated: one
  DOM node per project is what lets `initScrollVideos`' IntersectionObservers and
  the reveal groups keep working (they hold element references) and keeps
  duplicate headings away from crawlers.
- **scrollLeft comes to REST at STEP**, with one card of buffer each side, but
  mid-gesture it roams freely across `(0, 2·STEP)`. Snap positions are exact
  multiples of STEP (the track's `scroll-padding-inline` matches its own
  `padding-inline`), which is why a whole ±STEP jump always lands on another snap
  position and scroll-snap never has to be toggled off around it.
- **Rotate ONLY at a boundary snap position — `2·STEP` forward, `0` back.** Never
  on merely leaving rest. The backward test was `scrollLeft < step`, true after
  ONE PIXEL of leftward travel, so a backward gesture teleported scrollLeft
  forward by a whole card in its first frames; the browser had already picked its
  snap target from the pre-jump position, so backward scrolling landed off the
  snap line while forward was fine. The backward test carries a 1px tolerance
  because a fractional `0.4` would never match `<= 0` and there is no runway left
  past 0 to retry on — it would dead-end at the left edge.
  ⚠️ **THE FORWARD TEST NEEDS THE SAME 1px TOLERANCE, and this entry used to say
  "Forward needs none." That was WRONG and it stranded the carousel.** The
  boundary is `step * 2`, and `step` is the CARD'S WIDTH plus the gap — which is
  fractional wherever `--width-right-column`'s clamp lands on a fraction.
  Measured in a **1396px** window: card 1175.3359375, step 1235.3359375, boundary
  **2470.671875** — but `scrollLeft` can only land on a device pixel, so it stops
  at **2470.5**, short by **0.17px**. `>=` is then false forever: `normalize()`
  never rotates, the track sits one step past rest, and the reader sees the
  PREVIOUS card hanging on the left with no next-card peek on the right. Mandatory
  snap then yanks the track on the next gesture, which is the "it harshly appears
  and pushes the card in view over" report.
  The two tests are now symmetric: **forward `scrollLeft >= step * 2 - 1`,
  backward `scrollLeft <= 1`.**
  ⚠️ **IT IS INVISIBLE AT 1440** — the design width makes the card exactly 1216 and
  every boundary a whole number. Reproducing this needs a width where the clamp
  produces a fraction; testing at 1440 will always pass.
  ⚠️ **GENERALISE THIS BEFORE TESTING ANY CAROUSEL GEOMETRY: 1440 IS THE ONE WIDTH
  WHERE THE ARITHMETIC IS EXACT.** `--width-right-column` is a clamp, so the card
  width — and therefore `step`, every snap position and every boundary — is
  fractional at most other widths. Anything comparing `scrollLeft` against a
  multiple of `step` needs a tolerance, and will pass at 1440 regardless.
- **Never move the FOCUSED card.** Moving a focused element resets the browser's
  sequential-focus starting point; measured, it sent Tab *backwards* through the
  projects. `flushFocusedCard` shuffles only the cards around it.
- **A claimed horizontal gesture must be `stopPropagation`'d, not just
  `preventDefault`'d.** preventDefault only cancels the browser's own scrolling;
  the event still bubbles to Lenis on `window`. A real trackpad swipe is never
  exactly deltaY 0 — measured, a horizontal flick carried deltaY 18 — so Lenis
  received the remainder and eased the PAGE up and down while the track moved
  sideways. That was the subtle vertical drift while scrolling the carousel, and
  it could only ever be reproduced on real hardware: a synthetic deltaY of 0
  never showed it, because Lenis discards those itself as an unknown gesture.
- **Do NOT add `data-lenis-prevent` to the track.** That is the other half of the
  same story and is still wrong: it would kill smooth VERTICAL scrolling over the
  whole section. The `stopPropagation` above is targeted — it fires only for
  gestures already judged predominantly horizontal, and vertical ones return
  before it and reach Lenis untouched.
- **The card's flex-basis is a PERCENTAGE of the track's content box**, so any
  `padding-inline-end` (e.g. a trailing spacer) shrinks every card by that amount.
- **`padding-block: 24px` / `margin-block: -24px` on the track is load-bearing.**
  `overflow-x: auto` forces `overflow-y` to `auto`, which would otherwise clip
  the reveal's 16px rise and the image's hover scale.
- Cards reveal all at once (they share a vertical position), and the video
  prebuffer's `rootMargin` is all four sides, not just top/bottom — cards now
  approach from the right.

## Refining Motion & Scrolling (read THIS, don't re-explore js/main.js)
The motion system is Lenis (smooth scroll) + Motion.dev (reveals), both loaded
from a CDN as ES modules inside `initMotion()` (`js/main.js`). It's progressive
enhancement: an inline `<head>` script adds `is-motion` pre-paint to hide reveal
targets; if the CDN fails OR the user prefers reduced motion, `is-motion` is
absent/removed and **all content just shows**. Never hide content in a way that
depends on JS succeeding.

**Where each knob lives — go straight here, no full-file read:**
*(The line numbers drift with every edit — every one of them was 6–16× off by
2026-08. The NAME in each row is the durable anchor: grep it.)*
| To change… | Open `js/main.js` at… | Edit |
|---|---|---|
| Reveal feel (rise distance, duration, stagger, easing) | `const REVEAL` (~line 2146) | `distance` px · `duration` s · `stagger` s (per item, 80ms) · `ease` cubic-bezier |
| When a reveal fires / resets (scroll thresholds) | `setupReveals` → `update()` (~line 2432) | reveal at `top < vh*0.85 && bottom > vh*0.15`; **reset only when fully off-screen** (`bottom<=0 || top>=vh`) — this is the anti-cut-out rule, keep the reset off-screen |
| Per-item order within a group / the stagger animation | `setupReveals` → `setVisible()` (~line 2394) | reads `data-reveal-order`, calls Motion `animate` |
| Smooth-scroll feel (weight, wheel, easing) | `setupLenis` (~line 2176) | Lenis `duration`, `easing`, `smoothWheel`; also routes `a[href^="#"]` clicks through `lenis.scrollTo` |
| Scroll-spy, header inversion/tint, bar bleed, the field tuck | `updateScrollEffects` (~line 1906) | these are **scroll-linked** (not reveals); separate system. ⚠️ The hero scroll-fade and the contact fade named here previously are both **retired** — the hero's went with the blob landing, and Contact now fades via the shared reveal system. Don't reintroduce either; a scroll-linked opacity would fight the reveal. Properties published here: `--dark-mix`, `--bar-bleed`, `--field-scroll`, `--field-gap`, `--contact-edge`, `--bar-fill`, `--contact-peek`, plus `is-at-page-top` / `is-tucked` / `is-docked`. The last three are Contact's arrival — see **Contact's soft leading edge**; `--bar-fill` is a per-frame GRADIENT rather than a number, and its layout-only inputs are measured in `measureContactArrival` (beside `measureFieldTuck`) precisely so the hot path stays free of `getComputedStyle` and `scrollHeight`. |
| Scribble load reveal sequence | `revealSite`/`revealRestOfSite` (~line 119) + `hero.css` keyframes | separate from viewport reveals |
| Pre-paint hidden state (initial opacity/translate) | `global.css` → `html.is-motion [data-reveal]` | keep its `translateY` roughly in sync with `REVEAL.distance` |

**Reveal markup (in `index.html`):** wrap a section container with `data-reveal-group`;
put `data-reveal` on each item that should fade in (typography first by DOM order).
Add `data-reveal-order="N"` to override sequence when DOM order ≠ visual order
(e.g. About: text is `order="0"`, photo `order="1"` though photo is first in DOM).
**Contact uses the reveal system** (`.contact-inner` is a `data-reveal-group`; the
heading then the two meta columns fade in). It has no scroll-linked opacity of its
own — don't reintroduce one in `updateScrollEffects` (the two would fight over opacity).
**The footer is intentionally NOT in the reveal system** — it stays always visible,
no motion; don't add `data-reveal` to it.

**Reveals replay bidirectionally:** a group resets to hidden once fully off-screen and
fades in again on every re-entry (scrolling up or down). Keep the reset off-screen only.

**Suggested phrasing:** *"in js/main.js, in the REVEAL constant, change distance to 16"*
· *"in setupReveals update(), reveal earlier — trigger at top < vh*0.9"* ·
*"in setupLenis, make scrolling lighter — lower Lenis duration to 0.9"*.

**Cache-bust after JS edits:** bump `main.js?v=NNN` in `index.html` (the JS has its
own version, separate from the `style.css?v=` / `@import` CSS bump below).

## Cascade Rules (do not break)
- `@import` order in `style.css` is: **global → header → hero → sections → footer → project-overview → mobile-menu → responsive.** `global.css` must stay first (tokens + reset); `responsive.css` must stay **last** so its media queries override the desktop base styles.
- **All width breakpoints live in `responsive.css`**, ordered largest → smallest max-width (1440 → 1024 → 768 → 680 → 480). Do not scatter width media queries back into the component files. Motion queries (`prefers-reduced-motion`) are the exception — they stay beside their animations in `global.css` / `hero.css`.

## Conventions
- **Titles carry no terminal period (2026-08).** Homepage Work-card titles, About
  Me, the project `h1`s, the **Approach** / **What changed** chapter headings, the
  Next Case pager titles and the Full case study card title all dropped theirs.
  A title is a label, not a sentence. **Sentences that happen to sit in a heading
  slot keep their punctuation** — the landing's "Making products make sense." and
  Contact's "If something here resonated, say hello." are statements, so the
  period stays. `.section-label` eyebrows and `.section-pills` labels never had one.
- **The Google Fonts `<link>` must stay byte-identical on all five pages.** One
  shared URL = one cached font CSS for the whole site; a page with its own variant
  refetches the entire stylesheet instead of reusing it. So when a face is added,
  add it **everywhere**, even to pages that don't use it — the `@font-face` rules
  cost ~1.7KB of CSS there and download no woff2, because a face is only fetched
  where it actually renders. Current request:
  `Hanken+Grotesk:wght@200;500;700` + `Inter:wght@400..700`.
  **The site loads ZERO italic faces.** So `font-style: italic` anywhere today
  renders as a browser-sheared oblique — obvious and ugly at display sizes. Before
  using italic, add the axis (`ital,wght@0,200;0,500;0,700;1,500` for Hanken —
  verified available) to **all five** links. A `1,500` face was added and then
  removed again in 2026-08 when the insight band dropped italic (and the band was
  later removed entirely); don't leave an unused face behind if italic is dropped
  again.
- ⚠️ **AFTER A DEPLOY, HARD-RELOAD BEFORE JUDGING ANYTHING.** `index.html` has no
  cache-buster of its own (correctly — see the `?v=` entry below), so a browser
  that already has the page keeps serving the OLD html, which still names the OLD
  `main.js?v=…` and `style.css?v=…`. The new hashes only take effect once the
  HTML naming them is re-fetched. This wasted a long debugging session: a fix was
  verified live by `curl` and simultaneously "still broken" in the browser, purely
  because the browser held a cached `index.html` pointing at the previous JS.
  **Verify a deploy with the served HTML (`curl -H 'Cache-Control: no-cache'`),
  and tell whoever is looking to hard-reload.** A `?anything=1` on the URL also
  bypasses it, which is the quickest way to check.
- The `?v=` cache-buster is **automatic** — a git `pre-commit` hook
  (`.githooks/pre-commit`) runs `scripts/bump-cache.sh` whenever a commit stages
  a change to a component stylesheet or `js/main.js`, re-stamping every `?v=`
  (the `<link>`/`<script>` on every HTML page + every `@import` in `style.css`)
  from a hash of the file content and folding the result into the same commit.
  You do **not** hand-edit `?v=` numbers, and normally don't run the script by
  hand either — just commit. (Run `./scripts/bump-cache.sh` manually only to
  preview the stamp before committing.) CSS and JS get **separate** hashes, so a
  CSS edit only refetches CSS and a JS edit only refetches `js/main.js`. Content
  hashing is deterministic (same content → same version, no spurious refetches),
  and any real cross-chat divergence surfaces as a git merge conflict on the
  `?v=` line instead of a silent overwrite. Image `?v=` (jpg/png/svg) are **not**
  touched — bump those by hand per the image recipe when you overwrite an asset.
  - **One-time per clone:** the hook is enabled with
    `git config core.hooksPath .githooks` (already set in this working copy, and
    shared across its worktrees). A *fresh* `git clone` must re-run that one line
    to arm the hook.
- **Cross-chat workflow:** one chat per **git worktree** so parallel sessions
  can't stomp each other's files. `./scripts/new-worktree.sh <name>` creates
  `../portfolio-<name>/` on its own branch; point a fresh chat there, merge to
  `main` when done, then `git worktree remove`. Overlapping edits then surface as
  merge conflicts, not silent overwrites.
- **Deploy exposure — the repo root IS the public site.** GitHub Pages deploys
  from the branch root (custom domain via `CNAME`), so every tracked file is
  served at `ammerallj.design/<path>` **unless `_config.yml` excludes it**. When
  you add any source-only or dev file/dir (docs, scripts, experiments), add it to
  the `exclude:` list in `_config.yml` or it goes public. Dotfiles/dot-dirs
  (`.git`, `.githooks`, `.claude`) are auto-excluded by Jekyll. Verify a file is
  hidden with `curl -I https://ammerallj.design/<path>` (want 404). In-page HTML
  comments are **not** stripped — the deploy is plain Jekyll, no build step — so
  keep secrets out of comments (the site is static; anything shipped is readable).
- The shared right column across sections is ONE token —
  `--width-right-column` in global.css:
  `clamp(368.75px, 41.667vw - 58.33px, 541.67px)`. The cap binds at **≥1440**,
  the floor at **≤1025**; between them it is fluid. **Reuse the token; never
  restate the number.**
  - **Every consumer now PAINTS the token** — verified 541.66 at 1440 for the
    hero bio, the Work-card descriptions and About Me alike, 475 at 1280, 400 at
    1100, 369.17 at the 1026 seam. That was not true until 2026-09, and this
    entry said "542px" through the whole period it wasn't: the two consumers
    inside a Work card (`.work-card-right` and the hero's `.intro-band-right`,
    both `flex: 0 1`) painted **529.13** while the other five painted 541.67.
  - **The fix was the PEEK, not the column.** `--work-peek` was a flat 140px,
    more than the grid leaves over, so a card was 1188 while its two columns
    asked for 1216 (654 + 20 + 541.67) and both gave back a proportional share.
    The peek is now one column plus one gutter, which makes the card exactly 11
    of the 12 — see the derivation on `--work-peek` in global.css. Widening the
    column instead would have taken the difference straight out of the card
    title, since the two share a fixed card width.
  - **The hero bio tracks the card description by construction.**
    `.intro-band` pads its right edge by `--page-gutter + --work-peek`, so the
    band's content box IS a card's width, and an empty `.intro-band-spacer`
    carries the title column's basis so the bio lands on the description's left
    edge. One token moves both; a plain `flex: 1 1 0` spacer would leave it 13px
    adrift.
- The layout uses **56px** horizontal page padding (`.site-container`). Reuse
  it, don't invent new values.
- Accent blue is the `--color-accent` token (`#4A45FF`).

## Discoverability (SEO + GEO) — the machine-readable layer
Five things make this site legible to search engines **and** to AI answer
engines (ChatGPT, Claude, Perplexity, AI Overviews). They are metadata only —
nothing here changes a pixel.

| File | Role |
|---|---|
| `robots.txt` | `User-agent: *` allow-all, **plus every AI crawler named explicitly** in two labeled groups: *answer engines* (OAI-SearchBot, Claude-SearchBot, PerplexityBot, …) and *training* (GPTBot, ClaudeBot, Google-Extended, CCBot, …). Naming them is a signal, not a functional change — the wildcard already allows them. To opt out of one, flip its `Allow: /` to `Disallow: /`. |
| `llms.txt` | Root-level markdown digest for LLMs ([llmstxt.org](https://llmstxt.org)) — summary, the four case studies with their Impact figures, toolkit, and the public footprints grouped **under the project page each set now lives on**. **Adoption is still partial**; it's cheap insurance, not the main lever. |
| `sitemap.xml` | The 4 project pages + homepage + the résumé PDF. Bump `lastmod` when content changes. |
| `index.html` JSON-LD | One `@graph`: `WebSite` → `ProfilePage` → `Person` → `ItemList` of the 4 case studies. |
| `work/*.html` JSON-LD | One `@graph`: `CreativeWork` + `BreadcrumbList`. |

**The `@id` coupling is the load-bearing part — do not break it.** Every node
carries a stable `@id`, and the pages reference each other by it:
- Person is `https://ammerallj.design/#jenna` (defined in `index.html`).
- Each case study is `…/work/<page>.html#case-study` — **defined** in that
  project page, **referenced** from the homepage `ItemList`.
- Each project page's `author` and `isPartOf` point back at `#jenna` / `#website`.

That cross-referencing is what merges five pages into one entity a crawler can
reason about ("who made this, what else have they done"). Rename an `@id` in one
place and you must rename it everywhere. To re-verify after any edit, parse every
`<script type="application/ld+json">` block and confirm each reference-only `@id`
is defined somewhere in the site.

**Rules:**
- **Structured data restates the page — it never adds to it.** Every `abstract`,
  `description`, and `creditText` is a copy of text already visible in the HTML.
  Never put a figure, credential, employer, or date in JSON-LD that a reader
  can't also see on the page. If the visible copy changes, change the schema.
  **"Senior" is the worked example, and it has now gone the other way (2026-08).**
  The landing first dropped the line carrying it, leaving the credential only in
  metadata — a rule violation. It was restored to the bio, then dropped again
  when the bio was rewritten. Rather than re-add it to the copy, the title came
  OUT of the schema: `jobTitle` is now "Product Designer", and the three meta
  descriptions, both JSON-LD `description`s and llms.txt all match. **There is no
  "senior" anywhere on the site** — check with
  `grep -rn -i senior index.html llms.txt work/*.html` before reintroducing it,
  and if you do, put it in the visible copy FIRST. `jobTitle` is exactly the kind
  of field that quietly outlives the sentence it came from.
- The `abstract` fields exist so an answer engine quotes **Jenna's own numbers**
  rather than paraphrasing. Keep them in sync with the Impact bullets.
- **Never add the locked case-study URL** (the Figma deck) to `llms.txt`, the
  sitemap, or JSON-LD. It's already in the page HTML by design, gated by Figma's
  password — don't widen its crawl surface beyond that.
- Employment status is deliberately **`alumniOf` only**. There is no `worksFor`
  because the site doesn't state a current employer. Don't infer one.
- Press links are **`citation` on the relevant `CreativeWork`**, never `sameAs`
  on the Person — those articles are about the work, not about Jenna.
  `sameAs` is identity profiles only (currently LinkedIn).
- **Content must stay readable with JS off.** Most AI crawlers don't run
  JavaScript, so they fetch raw HTML — where `is-motion` is absent and every
  `[data-reveal]` is at full opacity. This is why the motion system's
  progressive-enhancement rule matters for reach, not just accessibility. Never
  move real copy into JS-injected DOM.
- HTML has no cache-buster, so metadata edits need **no `?v=` bump**.

## Image compression (pass done — recipe for new images)
The site-wide compression pass is **done**. All 12 project-overview carousel
images (3 slides × 4 pages) and the 4 homepage Work-card images are compressed
JPEGs — together ~6.2 MB, down from ~18 MB. The overview images land 312–448 KB
each; the Work cards 295–430 KB each. **That figure is the PASS's scope, not the
directory**: all of tracked `images/` is ~20 MB, half of it the four `.mp4`s.
The five cursor PNGs are also still there and four are live — `.cursor-glow`
loads them in `global.css` — so "no PNGs" is not the rule; "no PNG
screenshots or collages" is.

**Recipe (use for any NEW image before committing it):**
- `sips -s format jpeg -s formatOptions 82 SRC.png --out images/name.jpg` — q82
  is the setting used for the whole set (overview screenshots and the gradient-
  heavy brand slides both hold up with no visible artifacts). `sips` ships with
  macOS, no extra tooling. Drop to ~70 for the wide 2660×830 Work cards, where
  q82 overshoots the ~400 KB sibling band.
- **PNG screenshots/collages → JPEG.** Don't ship PNGs; the one PNG that existed
  (`ax-overview1.png`) is gone — a q82 JPEG replaced it and the lossless source
  was removed too, so re-export from the design tool if the asset changes.
- Keep `width`/`height` attributes on every `<img>` — they reserve the box and
  stop layout shift while the image loads.
- **The Work card frame is PROPORTIONAL at every tier, never a fixed height
  (2026-08).** The artwork is 2660x830 = 3.2:1, and the desktop's 415px on a
  1328px card is exactly that ratio; ≤1024 states it as
  `aspect-ratio: 1328 / 415`, and ≤768 and ≤480 now inherit that rather than
  setting their own strip. Those two tiers used to force 220px and 201px, and a
  fixed height on a variable width is a CROP: at 343 wide, 201px made the frame
  1.71 against the artwork's 3.20, so `object-fit: cover` threw away **47% of the
  image's width**, keeping only the middle band. That is content, not padding —
  `work-accessibility.jpg` holds its UI in the left and right thirds, so the lead
  card rendered as an empty gradient. The 201 came from the Figma phone frame,
  which was drawn before these 3.2:1 exports existed. **If a taller phone card is
  ever wanted, export a crop at that ratio — don't put a shorter frame over a
  wide image.**
- Above-the-fold images must NOT get `loading="lazy"`; below-the-fold ones should.
  In each carousel, slide 1 is above the fold (no `lazy`); slides 2–3 are `lazy`.
- Bump the `?v=` cache-buster on an `<img src>` when you overwrite an existing
  file in place (e.g. the Work cards use `?v=N`), so browsers refetch it.

**The Work-card videos are all a native 2660×830 (fixed 2026-08-31).** They were
1330×416 for three of the four — a **1.79× upscale** against the 2376 device px a
1188px card needs on a 2× display — with only `work-loop` exported correctly. All
four are now 2.0s and 2.1–3.2 MB, and the `<video>` `width`/`height` attributes
finally describe the real frame rather than the poster's size.

- **They come out of FIGMA, not a desktop editor.** All four carry the
  `MediabunnyVideoHandler` string, which is Figma's video-export encoder — which
  is why nothing on the filesystem ever matched them. There is no local source to
  re-encode from: **the fix is a re-export at 2× from the Figma file**, and the
  originals live there, not in the repo.
- **Total payload did not grow.** Trimming paid for the resolution: 9.99 MB
  before (with a 30s Accessibility clip and an 8.6s Loop) against 10.0 MB now
  with everything at 2s.
- ⚠️ **NEVER CALL `play()` BEFORE `readyState >= 3`, and the Work track is why.**
  Asking an element that has only metadata to play does not queue the request —
  it stalls in `waiting`, and the next `pause` kills it permanently, because
  `initScrollVideos` has already spent the card's `armed` flag. Measured: play at
  rs=1, `waiting`, `pause` 170ms later, `canplay` 140ms after *that*, and the
  card sat on its poster until it left the frame and came back. That was the
  "the accessibility video doesn't always play" bug.
  **Rotation is what makes the prebuffer insufficient**: `normalize()` moves a
  card's node to the other end of the list, the media element re-runs resource
  selection, and a video that was `readyState` 4 drops back to 1 — so the 800px
  prebuffer having already run guarantees nothing by the time the 0.4 play
  threshold arrives. The largest file shows it most. The entry branch now waits
  on `canplay`, checks the card has not left in the meantime (the leave handler
  re-arms, which is the signal to abandon), and **re-arms on a rejected `play()`
  rather than swallowing it** — a spent flag with no playback is exactly the
  state that strands a card on its poster.
- ⚠️ **THE POSTERS NEED WARMING TOO, AND FORGETTING THEM MADE A CARD "HARSHLY
  APPEAR".** They are `loading="lazy"`, which is right for a vertical page and
  wrong for this track: the two buffer cards sit ~1220px and ~2600px off-screen
  SIDEWAYS, past the browser's own lazy threshold. **Measured at rest, both far
  cards reported `poster.complete === false` and naturalWidth 0** — genuinely
  BLANK boxes, with the image arriving fully formed and untransitioned as the
  card slid in. Nothing was resizing: verified every card holds 1216×596 through
  an advance with no size change anywhere.
  - `warmPosters()` flips `loading` to eager on any poster that has not loaded.
  - ⚠️ **It runs on IDLE, not on geometry.** Two gated versions were tried and
    both were wrong. A **1200px** section margin was MEASURED USELESS — Selected
    Work's top sits EXACTLY at the fold, so the gate was already satisfied at page
    load. A **200px** margin deferred correctly and was still TOO LATE: three
    ~400KB posters were arriving while the reader was already on the cards.
    A poster has no fade of its own — whenever it decodes it simply paints — so
    the only way it is not a pop is for it to be there first.
  - The markup keeps `loading="lazy"` so no-JS and crawlers are unchanged, and
    `preload="none"` still keeps the 10MB of VIDEO out of the initial load.
- ⚠️ **`PLAY_AT` IS A NAMED CONSTANT AND MUST STAY ONE.** It is the intersection
  ratio at which a card plays and crossfades (**0.4**), and it is read in TWO
  places: the `intersectionRatio >=` comparison AND the observer's `threshold`
  array. An IntersectionObserver only delivers a callback when a **listed**
  threshold is crossed, so raising the comparison without raising the array means
  the qualifying callback never arrives and **no card ever plays**. They were two
  loose `0.4` literals; a single constant is what makes that unfixable.
  - ⚠️ **It went to 0.6 and came back.** Raised chasing cards that "appeared with
    no fade", which the ROTATION BUG below explained in full. Once that was fixed
    0.6 was pure cost: ~45ms later on every advance (ratio 0.4 is crossed at
    ~85ms, 0.6 at ~130ms) for nothing.
- **The poster crossfade is `0.25s`, down from 0.45s** (`.work-card-poster` in
  sections.css). It is a fraction of a **2.03s clip**, not a page transition: the
  reveal only starts once `play()` resolves, itself ~350–400ms into the damped
  advance, and at 0.45s the fade then ate 22% of the clip. ⚠️ **Do not take it to
  0** — the poster and the first frame are close but not identical (mean channel
  delta 12–16), so a hard cut flickers.
- ⚠️ **THE PREBUFFER MUST KEEP OBSERVING — it used to `unobserve` after one hit
  ("buffer once; keep it") and that premise is FALSE IN A LOOP.** The track
  rotates, so a card that sat two steps away and was never reached has no route
  back to buffered once its observer is gone. **Measured on the live site: two of
  the four videos sat at `readyState 0` with `networkState` IDLE at any moment** —
  always the two far buffer positions.
  - **This is why it failed PARTWAY through a loop rather than immediately**, which
    is exactly how it was reported ("doesn't quite load the next card in a full
    loop"). At rest the next card is warm, so the FIRST advance is instant; after
    one rotation the card that becomes "next" is the one that was two away, and
    it is cold.
  - **The cost is 672ms** from `load()` to `canplay` for a 2.03MB clip, and the
    play path deliberately waits on `canplay` — so that is 672ms of poster ON TOP
    of `DAMP.arrival`'s 650ms of travel. That is the "delay".
  - ⚠️ **An IntersectionObserver DOES re-fire when a node is MOVED** in the DOM
    (verified: re-appending a target produced one extra callback). That is
    precisely the signal rotation generates, and `unobserve` was discarding it.
  - ⚠️ **The two guards are load-bearing**: `readyState >= 3 || !paused` before
    `load()`. Calling `load()` on an element already holding data throws the
    buffer away and refetches; on a PLAYING element it stops playback dead.
  - **Page weight is unchanged.** `preload="none"` still means nothing fetches
    until a card is within 800px; verified 0 media requests at the top of the
    page. The extra clips load progressively as the reader goes round, not up
    front. Verified after a full loop: 0 cold cards, next card warm at every
    advance.
- **The card now rests on the video's LAST FRAME.** Nothing runs on `ended` any
  more. `initScrollVideos` used to swap the poster back in, but that was a
  workaround for the upscale: the soft last frame was worse than the 2660×830
  JPG. At native resolution the last frame is exactly as sharp, so the swap
  bought nothing and cost a visible jump — the poster is *close* to the final
  frame but not identical (measured mean channel delta 12–16, mostly q70 JPEG
  compression), and that showed as a flicker the instant playback stopped.
  **Bring it back only if a clip is ever re-exported small again — and fix the
  export first.** The poster still does its real jobs: the no-JS/crawler
  placeholder, and the image shown before playback starts.
