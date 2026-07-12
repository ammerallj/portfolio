# Portfolio — Jenna Ammerall

Personal portfolio site for Jenna Ammerall, product designer. A single-page,
editorial scroll experience highlighting selected work at Microsoft and Meta.

**Live:** https://ammerallj.github.io/portfolio/ <!-- update to your custom domain once configured -->

## Tech

Static site — plain HTML, modular CSS, and one vanilla-JS file. **No build step,
no framework, no dependencies.** Served as static files. Smooth scrolling (Lenis)
and viewport reveals (Motion.dev) load from a CDN as ES modules and degrade
gracefully — if they fail, or the visitor prefers reduced motion, all content
still shows.

## Structure

```
index.html            Structure & content (single page)
style.css             @import list only — no rules
css/components/       Modular CSS
  global.css            Reset, design tokens, layout, motion reveal state
  header.css            Header / nav + over-Contact inversion
  hero.css              Intro / scribble / load reveal
  sections.css          Selected Work, Footprints, About, Contact
  footer.css            Footer
  responsive.css        All width breakpoints (imported last)
js/main.js            All interactions + the motion system
images/               Optimized work previews (JPEG)
```

See [CLAUDE.md](CLAUDE.md) for the full architecture notes and conventions.

## Local development

No tooling required — serve the folder with any static server:

```sh
python3 -m http.server 3456
# then open http://localhost:3456
```

## Deployment

Hosted on GitHub Pages (deploy from `main`, root). After editing CSS, bump the
`?v=` cache-buster on the `<link>` in `index.html` and on every `@import` in
`style.css` to the same number; after editing `js/main.js`, bump its own
`main.js?v=` in `index.html`.

---

Human directed. AI built.
