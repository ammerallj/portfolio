# Project: Single-Page Portfolio Site Architecture

Static site — plain HTML, modular CSS, and one vanilla-JS file. No build step,
no framework, no dependencies. Served as static files.

## File Map
- **Main HTML:** `index.html` (~260 lines) — structure/content only. A tiny inline `<script>` in `<head>` sets `is-motion` + `is-loading` pre-paint (both only when JS runs, so no-JS visitors aren't left on a blank page); ends with a single `<script src="js/main.js" defer>`.
- **JavaScript:** `js/main.js` (~340 lines) — all interactions: nav scroll-spy, site load reveal (scribble draw + fades), hero scroll effects, header-over-Contact color inversion, custom cursors, **plus the motion system** (Lenis smooth scroll + Motion.dev viewport reveals). See **Motion & Scrolling** below for the exact knobs — don't re-read the whole file.
- **CSS entry:** `style.css` (~6 lines) — **@import list only, no rules.** Do not add styles here.
- **CSS components:** `css/components/`
  - `global.css` (~345) — reset, design tokens (`:root` custom properties), base typography, focus/skip-link, `.site-container` layout, `.page-section` structure, custom cursor, `.visually-hidden`, **motion reveal initial state** (`html.is-motion [data-reveal]`) + Lenis classes (`html.lenis`)
  - `header.css` (~92) — `.site-header`, `.site-nav-bar`, nav links, `.is-over-dark` inversion state
  - `hero.css` (~214) — `.intro` section, headline/body, `.intro-divider` scribble, site-load-reveal keyframes/states
  - `sections.css` (~390) — `.page-section` content: Selected Work, Public Footprints, Contact, About, case-study placeholder
  - `footer.css` (~28) — `.site-footer`
  - `responsive.css` (~110) — **ALL width breakpoints, site-wide.** Organized by screen size (1000 → 768 → 700 → 600px). Imported last so it overrides desktop styles.

## Where each page area lives
| Area on page | CSS file | HTML location |
|---|---|---|
| Header / nav | `header.css` | top of `index.html` (`<header>`) |
| Hero / intro / scribble | `hero.css` | `<section class="intro">` |
| Selected Work | `sections.css` | `#work-section` |
| Public Footprints | `sections.css` | footprints section |
| About | `sections.css` | `#about` |
| Contact | `sections.css` | `#contact` |
| Footer / copyright | `footer.css` | `<footer class="site-footer">` |
| Any interaction/animation | `js/main.js` | — |
| Colors, spacing, fonts (tokens) | `global.css` (`:root`) | — |
| Anything mobile/tablet (any breakpoint) | `responsive.css` | — |

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
  `1440px` (reserved, empty) · `1024px` (landscape tablet — nav reflow, Work/Footprints/About/Contact stack) ·
  `768px` (portrait tablet — Work card images, hero/intro full width) ·
  `480px` (large phone — nav gap, work grid → 1 col, connect links wrap, footer stack).
- To tweak an existing responsive rule, edit inside the matching `@media` block.
  To add a new one, put it in the correct block (create a new `@media` in
  largest→smallest order if the breakpoint doesn't exist yet).
- Desktop (≥1440px) base values are NOT here — changing those is a separate,
  non-responsive edit in the relevant component file.
- Suggested phrasing: **"in responsive.css, at [breakpoint], change [selector] [property]"**
  — e.g. *"in responsive.css, at 600px, add 20px side padding to the hero."*

## Refining Motion & Scrolling (read THIS, don't re-explore js/main.js)
The motion system is Lenis (smooth scroll) + Motion.dev (reveals), both loaded
from a CDN as ES modules inside `initMotion()` (`js/main.js`). It's progressive
enhancement: an inline `<head>` script adds `is-motion` pre-paint to hide reveal
targets; if the CDN fails OR the user prefers reduced motion, `is-motion` is
absent/removed and **all content just shows**. Never hide content in a way that
depends on JS succeeding.

**Where each knob lives — go straight here, no full-file read:**
| To change… | Open `js/main.js` at… | Edit |
|---|---|---|
| Reveal feel (rise distance, duration, stagger, easing) | `const REVEAL` (~line 154) | `distance` px · `duration` s · `stagger` s (per item, 80ms) · `ease` cubic-bezier |
| When a reveal fires / resets (scroll thresholds) | `setupReveals` → `update()` (~line 259) | reveal at `top < vh*0.85 && bottom > vh*0.15`; **reset only when fully off-screen** (`bottom<=0 || top>=vh`) — this is the anti-cut-out rule, keep the reset off-screen |
| Per-item order within a group / the stagger animation | `setupReveals` → `setVisible()` (~line 238) | reads `data-reveal-order`, calls Motion `animate` |
| Smooth-scroll feel (weight, wheel, easing) | `setupLenis` (~line 182) | Lenis `duration`, `easing`, `smoothWheel`; also routes `a[href^="#"]` clicks through `lenis.scrollTo` |
| Hero scroll-fade, contact fade, scroll-spy, header inversion | `updateScrollEffects` (~line 72) | these are **scroll-linked** (not reveals); separate system |
| Scribble load reveal sequence | `revealSite`/`revealRestOfSite` (~line 44) + `hero.css` keyframes | separate from viewport reveals |
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
- `@import` order in `style.css` is: **global → header → hero → sections → footer → responsive.** `global.css` must stay first (tokens + reset); `responsive.css` must stay **last** so its media queries override the desktop base styles.
- **All width breakpoints live in `responsive.css`**, ordered largest → smallest max-width (1440 → 1024 → 768 → 480). Do not scatter width media queries back into the component files. Motion queries (`prefers-reduced-motion`) are the exception — they stay beside their animations in `global.css` / `hero.css`.

## Conventions
- After changing **CSS**, bump the cache-buster **in two places, to the same number**: the stylesheet link in `index.html` (`style.css?v=NNN`) **and** the `?v=NNN` on every `@import` in `style.css`. Bumping only the `<link>` does **not** refetch the component files — browsers cache `@import` URLs independently by their own URL, so a change to `sections.css` etc. stays stale until its import version changes too.
- After changing **`js/main.js`**, bump `main.js?v=NNN` on its `<script>` in `index.html`. This is a **separate** version from the CSS one — a JS edit needs only the JS bump, a CSS edit only the CSS bump.
- The shared right column across sections is **542px** (the site's "5 grid columns"); the layout uses **56px** horizontal page padding (`.site-container`). Reuse these, don't invent new values.
- Accent blue is the `--color-accent` token (`#4A45FF`).
