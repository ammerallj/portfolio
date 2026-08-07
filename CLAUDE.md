# Project: Portfolio Site Architecture

Static site — plain HTML, modular CSS, and one vanilla-JS file. No build step,
no framework, no dependencies. Served as static files.

The homepage is one page; each project also has a **Project Overview page** in
`work/` (see **Project Overview Pages** below). `js/main.js` and `style.css` are
shared by all of them.

## File Map
- **Project overview pages:** `work/*.html` (4) — see **Project Overview Pages** below.
- **Main HTML:** `index.html` (~260 lines) — structure/content only. A tiny inline `<script>` in `<head>` sets `is-motion` + `is-loading` pre-paint (both only when JS runs, so no-JS visitors aren't left on a blank page); ends with a single `<script src="js/main.js" defer>`.
- **JavaScript:** `js/main.js` — all interactions: nav scroll-spy, the landing header tuck (`is-tucked` while the hero's `.intro-bar` is on screen), page load reveal, header-over-Contact color inversion, custom cursors, the About tab view (`initAboutTabs`), **plus the motion system** (Lenis smooth scroll + Motion.dev viewport reveals). The blob-hero engine (BLOBS morph, hover push, paragraph cycling) retired 2026-08 — archived copy in `archive/blob-hero-2026-08/js/main.js`. See **Motion & Scrolling** below for knobs — don't re-read the whole file.
- **CSS entry:** `style.css` (~6 lines) — **@import list only, no rules.** Do not add styles here.
- **CSS components:** `css/components/`
  - `global.css` (~345) — reset, design tokens (`:root` custom properties), base typography, focus/skip-link, `.site-container` layout, `.page-section` structure, custom cursor, `.visually-hidden`, **motion reveal initial state** (`html.is-motion [data-reveal]`) + Lenis classes (`html.lenis`)
  - `header.css` (~92) — `.site-header`, `.site-nav-bar`, nav links, `.is-over-dark` inversion state. **Now the ≤480 homepage only** — it's `display:none` over the landing at desktop and the project pages dropped it (2026-08) for the shared `.intro-bar`. Don't build new nav on it.
  - `hero.css` (~230) — the **landing** (2026-08, Figma 339:3745): `.page-field` full-page gradient image, `.intro` stage (statement / divider / frosted band / `.intro-bar` bottom nav), the divider-mask load reveals, and the `is-loading` page hold. The previous blob hero is archived in `archive/blob-hero-2026-08/`.
  - `sections.css` (~390) — `.page-section` content: Selected Work, Contact, About (incl. the `.about-tabs` Design toolkit / Public footprints tab view), case-study placeholder
  - `footer.css` (~28) — `.site-footer`
  - `project-overview.css` (~275) — the shared Project Overview template: §0 `.intro-bar--page` (the landing's nav bar pinned to the top of these pages), `.project-hero`, `.project-masthead` (title + metadata `<dl>`), `.project-block` (description / impact / role), `.project-locked` + `.invite-button` (locked case study), the `.project-carousel` masthead crossfade, and `.section-pills`. Imported after `sections.css` (it leans on `.section-label`, `.about-body`, `.contact-connect-links`) and before `responsive.css`.
  - `responsive.css` (~110) — **ALL width breakpoints, site-wide.** Organized by screen size (1000 → 768 → 700 → 600px). Imported last so it overrides desktop styles.

## Landing (2026-08) — "Making products make sense."
The homepage hero is the Figma 339:3745 landing: `images/hero-bkg-web.jpg` (a
compressed derivative of the 18MB+ source `images/hero-bkg.jpg` — regenerate
with `sips --resampleWidth 3600 -s formatOptions 78` and bump its `?v=` when
the source changes; never ship the source) laid as a PAGE background at
`z:-1` inside `main` (a stacking context — body's own background otherwise
paints over negative-z elements). **The field is never clipped**: whatever
extends past the hero fold bleeds behind Selected Work and dissolves into the
cream on its own. The hero stage: statement (top half, 96px Hanken) →
full-width hairline divider at the exact center → frosted band (bottom half,
backdrop-blur) with the bio in its right column → `.intro-bar` along the
bottom (wordmark / Work·Footprints·About with the header's chip hover states /
solid-black "Say hello" pill). Load: the divider "emits" headline up + bio
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
(desktop composition, tighter insets) pending frames. The previous blob-hero landing is archived, fully
self-contained, in `archive/blob-hero-2026-08/`.

## Where each page area lives
| Area on page | CSS file | HTML location |
|---|---|---|
| Header / nav (≤480 homepage only) | `header.css` | top of `index.html` (`<header>`) |
| Landing hero (field bg, statement, divider, frosted band, bottom bar) | `hero.css` | `.page-field` img + `<section class="intro">` |
| Selected Work | `sections.css` | `#work-section` |
| About | `sections.css` | `#about` |
| Design toolkit / Public footprints (tab view at the bottom of About; no standalone Footprints section any more) | `sections.css` (`.about-tabs`) + `js/main.js` (`initAboutTabs`) | inside `#about` |
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

**Floating section pills (`.section-pills`).** Each project page carries a
frosted "floatie" pill bar fixed at the bottom centre that jumps between its own
sections. The target sections have ids: `#overview` (masthead), `#process` (the
"What I Shaped" section — Loop/Groups only), `#impact`. All four pages show a
3-pill bar (Overview/Process/Impact). **Pill labels track the page's own
headings, ids don't:** Accessibility renamed its third section to "What changed",
so its heading *and* its third pill read that, while the section id stays
`#impact` (shared idiom + inbound anchors). Rename the pill with the heading;
never rename the id. On Loop/Groups the Process pill links to
`#process`. On Accessibility/Messaging the Process content is confidential, so
its pill is a **locked chip** (`.section-pill-locked`): a muted lock-glyph
`Process` that keeps the three-part story whole but links to the access panel
(`#process-locked`, the "Full case study access" section) where the reader can
request the password. On those two pages that panel is the **Process step**: it
sits between Overview and Impact (DOM order `#overview → #process-locked →
#impact`) so the page order matches the pills and closes on Impact — it is no
longer the after-Impact tail it started as. Because it maps to a real section,
the locked chip **is in the scroll-spy** like every pill (built with plain `a`),
so selecting it works — its active state takes the same solid fill as the others,
just keeping the lock glyph (muted-but-filled; see `.section-pill-locked.is-active`
in project-overview.css §8). Never link a normal pill to a section that isn't
there — use the locked variant when the content is
gated. The markup is static `<a>` links (works with no JS); the `sectionPills` array +
the spy block in `updateScrollEffects` (js/main.js) add the active state,
`aria-current`, and tuck the bar away once the footer is in view. Homepage has no `.section-pills`,
so the JS is a guarded no-op there. Styles live in project-overview.css §8;
phone tuning in responsive.css 480 tier. The bar is **always visible (no
`data-reveal`)**, like the footer.

| Page | Closes with |
|---|---|
| `work/microsoft-loop.html` | Impact → "The Way In" (explore live product) → **Next Case Study pager** |
| `work/facebook-groups.html` | Impact → **Next Case Study pager** |
| `work/accessibility.html` | Process (locked) → Impact → **Next Case Study pager** |
| `work/messaging.html` | Process (locked) → Impact → **Next Case Study pager** |

**Every page closes with a Next Case Study pager** (`.next-case`,
project-overview.css §9): a full-width link — the next project's homepage card
title + description, no image, a right arrow (`&rarr;`) — that follows the
homepage Work order and **wraps** (Groups → back to Accessibility) so every page
has a next. The title/description are the same teaser as the matching
`.work-card` on `index.html`; **keep them in sync** if the card copy changes.
It's a normal page link (not a `#` anchor), so no JS is involved; it reveals like
a section (`data-reveal`) and sits inside `<main>` as the last section, above the
always-visible footer. Built from `<span>`s (not `<p>`/`<h2>`) so the whole block
is one valid `<a>`.

**The pager steps on tokens, not one-off overrides.** Both live in `global.css`
`:root` with a value per tier in each `responsive.css` `:root` — the same
mechanism as `--section-title-size`, so all the per-breakpoint numbers sit
together instead of scattering down the tiers:
- `--next-case-title-size` — 40 → 36 (≤1024) → 32 (≤480). Same *stepper* as
  `--section-title-size` (56/44/32), one notch below it at each tier so the
  pager stays subordinate to the page's own heading; they converge at 32 on
  phones, where a further gap would read as small type rather than hierarchy.
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
10.6:1 and the description 6.0:1 at worst (loop's lavender is the tightest). A
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
The locked-case-study button that survived the removal is `.invite-button` (with
`.invite-button-icon` for the lock), living in `.project-locked-action` — see
below.

**Shared structure (identical in all four):** hero visual → title + metadata →
Overview (description) → **Contribution/Process** → Impact → *then* the **Next
Case Study pager** (`.next-case`). (Loop also keeps a "The Way In" explore-product
step between Impact and the pager.)
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
- **The locked panel (`.project-locked` on Accessibility / Messaging) states that
  the work can't be shown publicly and points to the locked case study.** No AI
  conversation. Keep the two copies in sync.
- **`.invite-button` is the locked-case-study link** (`.invite-button-icon` is its
  inline lock; Loop reuses the same pill without the icon for its live-product
  link). An `<a>`, never a `<button>` — it navigates, so Cmd-click / open-in-new-tab
  must work and a screen reader must hear "link". `href` is `[Locked Case Study URL]`
  until the Figma share link is pasted in.
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
| `llms.txt` | Root-level markdown digest for LLMs ([llmstxt.org](https://llmstxt.org)) — summary, the four case studies with their Impact figures, toolkit, public footprints. **Adoption is still partial**; it's cheap insurance, not the main lever. |
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
  ("Senior" was briefly an exception — the 2026-08 landing dropped the line
  carrying it, leaving the word only in metadata. The hero bio now opens "As a
  senior product designer…", so it's visible again and the rule above applies
  to it with no carve-out.)
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
The site-wide compression pass is **done**. All 13 project-overview carousel
images and the 4 homepage Work-card images are compressed JPEGs; there are no
PNGs left in `images/`. Total image payload is ~6 MB (was ~18 MB). The overview
images land 312–448 KB each; the Work cards 296–568 KB each.

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
- Above-the-fold images must NOT get `loading="lazy"`; below-the-fold ones should.
  In each carousel, slide 1 is above the fold (no `lazy`); slides 2–3 are `lazy`.
- Bump the `?v=` cache-buster on an `<img src>` when you overwrite an existing
  file in place (e.g. the Work cards use `?v=N`), so browsers refetch it.
