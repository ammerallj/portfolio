# Project: Portfolio Site Architecture

Static site — plain HTML, modular CSS, and one vanilla-JS file. No build step,
no framework, no dependencies. Served as static files.

The homepage is one page; each project also has a **Project Overview page** in
`work/` (see **Project Overview Pages** below). `js/main.js` and `style.css` are
shared by all of them.

## File Map
- **Project overview pages:** `work/*.html` (4) — see **Project Overview Pages** below.
- **Main HTML:** `index.html` (~260 lines) — structure/content only. A tiny inline `<script>` in `<head>` sets `is-motion` + `is-loading` pre-paint (both only when JS runs, so no-JS visitors aren't left on a blank page); ends with a single `<script src="js/main.js" defer>`.
- **JavaScript:** `js/main.js` (~340 lines) — all interactions: nav scroll-spy, site load reveal (scribble draw + fades), hero scroll effects, header-over-Contact color inversion, custom cursors, **plus the motion system** (Lenis smooth scroll + Motion.dev viewport reveals). See **Motion & Scrolling** below for the exact knobs — don't re-read the whole file.
- **CSS entry:** `style.css` (~6 lines) — **@import list only, no rules.** Do not add styles here.
- **CSS components:** `css/components/`
  - `global.css` (~345) — reset, design tokens (`:root` custom properties), base typography, focus/skip-link, `.site-container` layout, `.page-section` structure, custom cursor, `.visually-hidden`, **motion reveal initial state** (`html.is-motion [data-reveal]`) + Lenis classes (`html.lenis`)
  - `header.css` (~92) — `.site-header`, `.site-nav-bar`, nav links, `.is-over-dark` inversion state
  - `hero.css` (~214) — `.intro` section, headline/body, `.intro-divider` scribble, site-load-reveal keyframes/states
  - `sections.css` (~390) — `.page-section` content: Selected Work, Public Footprints, Contact, About, case-study placeholder
  - `footer.css` (~28) — `.site-footer`
  - `project-overview.css` (~290) — the shared Project Overview template: `.project-hero`, `.project-masthead` (title + metadata `<dl>`), `.project-block` (description / impact / role), `.project-continue`, and the reusable `.conversation-invite`. Imported after `sections.css` (it leans on `.section-label`, `.about-body`, `.contact-connect-links`) and before `responsive.css`.
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
| Project Overview pages | `project-overview.css` | `work/*.html` |

## Project Overview Pages
The standard entry point for every project: an editorial executive summary a
recruiter can read in under a minute, sitting between a homepage Work card and
any deeper case study. **Four static pages, one shared structure** — the
homepage Work-card images link straight to them.

| Page | Ends with |
|---|---|
| `work/microsoft-loop.html` | Impact — **no closing section** (content pending) |
| `work/facebook-groups.html` | Impact — **no closing section, by design** |
| `work/accessibility.html` | Impact — **no closing section, by design** |
| `work/messaging.html` | Impact — **no closing section, by design** |

**All four pages end on Impact.** The `.project-continue` hand-off is gone from
Loop and Groups — Jenna is writing high-level case-study content to sit inline
below Impact rather than link out. `.project-continue*` (project-overview.css 7a
+ responsive.css 480 tier) is **dead code, marked for deletion** — remove it as
one unit, same as the earlier `.conversation-invite` removal.

**The Conversation Invitation is gone and is not coming back by accident.** Its
note + locked-case-study button moved up into the masthead lockup (before
Overview — the primary action can't wait for a panel that reads as a footer),
which left the panel holding an orphaned heading and the Connect links. Both
pages now end on Impact with **no closing step** — deliberate, not an omission.
The `.conversation-invite-*` CSS (project-overview.css 7b + responsive.css 1024
/ 480 tiers) and the `.conversation-invite` fallback in `darkPanel` (js/main.js)
are **dead code, marked for deletion** — remove them together, they're one
component.

**Shared structure (identical in all four):** hero visual → title + metadata →
Overview (description) → **Contribution** → Impact → *then* either the project-
details/Continue tail or the Conversation Invitation.
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

**Rules:**
- **Content is Jenna's, not the model's.** Every content slot ships as a labeled
  `[Placeholder]`. Never write, expand, summarize, or invent project copy —
  including "reasonable" filler for a missing timeline or team.
- **Omit, don't fabricate.** If a metadata row (Timeline / Role / Area / Scope)
  or a detail block has no information, delete it. Never leave it blank or guess.
- **The Conversation Invitation states that the work can't be shown publicly and
  offers the existing connect links.** No AI conversation. Keep the two copies
  (Accessibility / Messaging) in sync.
- **`.invite-unlock` is the locked-case-study link.** An `<a>`, never a
  `<button>` — it navigates, so Cmd-click / open-in-new-tab must work and a
  screen reader must hear "link". `href` is `[Locked Case Study URL]` until the
  Figma share link is pasted in.
- **The lock lives on the DESTINATION, never in this page.** Set the Figma file's
  share access to **"Anyone with password"** — *not* "Anyone with the link",
  which has no lock at all and would make the "locked" label a lie while
  broadcasting a confidential URL. Figma checks the password server-side; the
  password is shared by email. **Never put a password (or any secret) in these
  pages** — the site is static, so anything checked here runs in the browser and
  is readable in View Source. A client-side check is not a gate. Only the URL
  belongs here, and only once the password is on.
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
  👋 cursor shows on: `#contact` on the homepage, `.conversation-invite` on the
  Accessibility / Messaging pages. Loop and Facebook Groups have neither, so it's
  null there and both features stay off.

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
