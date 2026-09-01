# Project: Portfolio Site Architecture

Static site — plain HTML, modular CSS, and one vanilla-JS file. No build step,
no framework, no dependencies. Served as static files.

The homepage is one page; each project also has a **Project Overview page** in
`work/` (see **Project Overview Pages** below). `js/main.js` and `style.css` are
shared by all of them.

## File Map
- **Project overview pages:** `work/*.html` (4) — see **Project Overview Pages** below.
- **Main HTML:** `index.html` — structure/content only. A tiny inline `<script>` in `<head>` sets `is-motion` + `is-loading` pre-paint (both only when JS runs, so no-JS visitors aren't left on a blank page); ends with a single `<script src="js/main.js" defer>`.
- **JavaScript:** `js/main.js` — all interactions: nav scroll-spy, the landing header tuck (`is-tucked` while the hero's `.intro-bar` is on screen), page load reveal, header-over-Contact color inversion, custom cursors, the About tab view (`initAboutTabs`), the looping Work carousel (`initWorkCarousel` — see **Horizontal Tracks** below), **plus the motion system** (Lenis smooth scroll + Motion.dev viewport reveals). The blob-hero engine (BLOBS morph, hover push, paragraph cycling) retired 2026-08 — archived copy in `archive/blob-hero-2026-08/js/main.js`. See **Motion & Scrolling** below for knobs — don't re-read the whole file.
- **CSS entry:** `style.css` — **@import list only, no rules.** Do not add styles here.
- **CSS components:** `css/components/`
  - `global.css` — reset, design tokens (`:root` custom properties), base typography, focus/skip-link, `.site-container` layout, `.page-section` structure, custom cursor, `.visually-hidden`, **motion reveal initial state** (`html.is-motion [data-reveal]`) + Lenis classes (`html.lenis`)
  - `header.css` — `.site-header`, `.site-nav-bar`, nav links, `.is-over-dark` inversion state. **Now the ≤480 homepage only** — it's `display:none` over the landing at desktop and the project pages dropped it (2026-08) for the shared `.intro-bar`. Don't build new nav on it.
  - `hero.css` — the **landing** (2026-08, Figma 339:3745): `.page-field` full-page gradient image, `.intro` stage (statement / divider / frosted band / `.intro-bar` bottom nav), the divider-mask load reveals, and the `is-loading` page hold. The previous blob hero is archived in `archive/blob-hero-2026-08/`.
  - `sections.css` — `.page-section` content: Selected Work (the horizontal `.work-list` track — see **Horizontal Tracks**), Contact, About, case-study placeholder. It also still owns the **footprint link list** (`.footprint-group` / `.footprint-group-title` / `.footprint-list` + the `↗`), whose only consumer is now the project pages — see **Public Footprints** below.
  - `footer.css` — `.site-footer`
  - `project-overview.css` — the shared Project Overview template: §0 `.intro-bar--page` (the landing's nav bar pinned to the top of these pages), `.project-hero`, `.project-masthead` (title + metadata `<dl>`), `.project-block` (description / impact / role), §0a the section-seam rules, `.next-case` (§9) with its two treatments — `--image` (destination art, the pager) and `--outline` + `--locked` (the hairline Full-case-study card) — (`.project-locked` / `.invite-button` were deleted 2026-08), the `.project-carousel` masthead crossfade, and `.section-pills`. Imported after `sections.css` (it leans on `.section-label`, `.about-body`, `.contact-connect-links`) and before `responsive.css`.
  - `mobile-menu.css` — the ≤480 `.mobile-menu` overlay (the connect-only panel
    behind the header's "Menu" / "Contact" trigger) on every page.
  - `responsive.css` — **ALL width breakpoints, site-wide.** Organized by screen size (1440 → 1024 → 768 → 480px). Imported last so it overrides desktop styles.

## Landing (2026-08) — "Making products make sense."
The homepage hero is the Figma 339:3745 landing: `images/hero-bkg.jpg` laid as
a PAGE background at `z:-1` inside `main` (a stacking context — body's own
background otherwise paints over negative-z elements). **The field is never clipped**: whatever
extends past the hero fold bleeds behind Selected Work and dissolves into the
cream on its own. The hero stage: statement (top half, 96px Hanken) →
full-width hairline divider at the exact center → frosted band (bottom half,
backdrop-blur) with the bio in its right column → `.intro-bar` along the
bottom (wordmark hard left; Work·About with the header's chip hover states +
the solid-black "Say hello" pill grouped hard right, one `--gap-group` apart —
see **The landing nav bar** below). Load: the divider "emits" headline up + bio
down (masked by each region's overflow, 64px travel over a 40px gap,
REVEAL.ease), then the bar fades in — all CSS, reduced-motion exempt. The
sticky header stays in the DOM, tucked above the viewport over the hero
(js/main.js) and sliding in past the fold; at ≤480 the tuck is neutralized,
the `.intro-bar` is hidden, and the floatie pill + header Contact trigger
carry mobile nav. **At ≤480 the header is `position: fixed` and FLOATS over the
hero** so the field reaches the top of the screen — it is bare while the page
rests at the top (`html.is-at-page-top`, a third pre-paint flag set in
index.html's inline script beside `is-motion`/`is-loading` and maintained in
`updateScrollEffects` ABOVE its `is-loading` return) and takes back the frosted
cream glass on scroll. The BARE state is the added one, so no-JS keeps the
legible bar. Because the header left the flow there, `.intro`'s phone height is
`100dvh - 184px`, not `- 246px` — the 62px it used to eat came back off; both
numbers preserve the same ~120px Work-card peek. The phone tier also
art-directs the field (a 15% narrower crop, nudged +50px right / +40px down)
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
220dvh, 117.27vw)`, 2026-08-31). The frozen px width is a desktop assumption: it
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
soft gradient but the reason not to push the ratio higher. **The hero is sized in `svh`, never `dvh` (2026-08-31).** `.intro`'s height,
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
the one the page uses. The `<img>`'s `width`/`height` are the asset's real
pixels — re-derive them on a re-export, and re-check the `1.6377` aspect that
hero.css's `--field-bottom` is derived from.

### The landing nav bar (`.intro-bar`)
**Wordmark left, then Work · About · "Say hello" as ONE group on the right**, at a
single repeating `--gap-group` interval (60 desktop → 48). `.intro-bar-name` takes
`margin-right: auto` and everything else is content-width.

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

## Where each page area lives
| Area on page | CSS file | HTML location |
|---|---|---|
| Header / nav (≤480 homepage only) | `header.css` | top of `index.html` (`<header>`) |
| Landing hero (field bg, statement, divider, frosted band, bottom bar) | `hero.css` | `.page-field` img + `<section class="intro">` |
| Selected Work | `sections.css` | `#work-section` |
| About | `sections.css` | `#about` |
| Public footprints (per project; **not on the homepage** — see below) | `sections.css` (link list) + `project-overview.css` (its one spacing rule) | end of `#impact` in each `work/*.html` |
| Contact | `sections.css` | `#contact` |
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
wordmark + "Menu", so the floatie is the only in-page nav a phone reader has.
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
homepage Work order and **wraps** (Groups → back to Accessibility) so every page
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
four pages now carry art**, so the chain reads accessibility → messaging → loop
→ groups → accessibility. Text stays `--color-text` / `--color-text-70`
throughout: measured on each image's darkest visible pixel, the title clears
10.6:1 and the description **4.65:1** at worst. That worst case is
`accessibility-next.jpg` on **Groups'** pager (Groups is the page that links to
Accessibility). Still past AA (4.5:1), but there is little headroom left:
re-measure if that gradient is ever re-exported darker. A
dark destination colour would need the text inverted for that page, not the
image dimmed.

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

**Top nav (2026-08).** These pages no longer carry the old `.site-header`. They
share the landing's own bar — `<nav class="intro-bar intro-bar--page">` — so the
site has ONE nav. Same markup as the homepage's, with the links resolved back to
`../index.html#…` and the wordmark an `<a>` home instead of a `<p>`. The
`--page` modifier (project-overview.css §0) is what changes: no hero to rest in,
so the pull-up margins and the entrance animation are neutralized and the glass
is forced on — the bar is pinned from the first pixel, with JS off too. At ≤480
it collapses to wordmark + "Menu" (responsive.css 480 tier) and the `.mobile-menu`
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
    principles under Approach, not their outcomes. Messaging has no plain list. The `<details>` height itself is **not** animated —
    that isn't portable; only the detail text fades in.
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
  `1440px` (reserved, empty) · `1024px` (landscape tablet — nav reflow, Work/About/Contact stack) ·
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
  past 0 to retry on — it would dead-end at the left edge. Forward needs none.
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
| Reveal feel (rise distance, duration, stagger, easing) | `const REVEAL` (~line 1196) | `distance` px · `duration` s · `stagger` s (per item, 80ms) · `ease` cubic-bezier |
| When a reveal fires / resets (scroll thresholds) | `setupReveals` → `update()` (~line 1413) | reveal at `top < vh*0.85 && bottom > vh*0.15`; **reset only when fully off-screen** (`bottom<=0 || top>=vh`) — this is the anti-cut-out rule, keep the reset off-screen |
| Per-item order within a group / the stagger animation | `setupReveals` → `setVisible()` (~line 1375) | reads `data-reveal-order`, calls Motion `animate` |
| Smooth-scroll feel (weight, wheel, easing) | `setupLenis` (~line 1226) | Lenis `duration`, `easing`, `smoothWheel`; also routes `a[href^="#"]` clicks through `lenis.scrollTo` |
| Hero scroll-fade, contact fade, scroll-spy, header inversion | `updateScrollEffects` (~line 1024) | these are **scroll-linked** (not reveals); separate system |
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
- **All width breakpoints live in `responsive.css`**, ordered largest → smallest max-width (1440 → 1024 → 768 → 480). Do not scatter width media queries back into the component files. Motion queries (`prefers-reduced-motion`) are the exception — they stay beside their animations in `global.css` / `hero.css`.

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
- The shared right column across sections is **542px** (the site's "5 grid columns"); the layout uses **56px** horizontal page padding (`.site-container`). Reuse these, don't invent new values.
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

**⚠️ THREE OF THE FOUR WORK-CARD VIDEOS ARE HALF-RESOLUTION.** Measured 2026-08:
`work-accessibility` / `work-messaging` / `work-communities` are encoded at
**1330×416**, while the card renders 1188 CSS px — 2376 device px on a 2× display,
a **1.79× upscale**. `work-loop` is the outlier at 2308×720 (1.03×) and is
visibly crisper; compare them if you want to see the difference. The `<video>`
`width`/`height` attributes all say 2660×830, which is the POSTER's size, not the
encoded frame's — so the markup does not reveal this. The posters are all a
genuine 2660×830.

`initScrollVideos` restores the poster on `ended`, so a card at REST shows the
sharp JPG rather than the soft last frame. That is a mitigation, not the fix:
while a clip is playing it is still an upscaled 1330-wide source. **The real fix
is re-exporting those three at 2660 wide** — the repo holds only the derivatives,
so it needs the originals. If you re-cut any clip, re-check that its poster still
matches the END state (see the note at that handler).
