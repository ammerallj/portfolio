// main.js — site interactions: nav scroll-spy, load reveal, hero scroll effects, custom cursors

const navWork = document.getElementById('nav-work');

// Clicking the name/logo smooth-scrolls back to the top (hero).
// Prefer Lenis when it's running so the motion matches the rest of the page.
document.getElementById('site-name').addEventListener('click', (e) => {
  e.preventDefault();
  if (window.__lenis) {
    window.__lenis.scrollTo(0);
  } else {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
});

// Scroll-spy: each nav link and the section it points to
const navSections = [
  { link: navWork, el: document.getElementById('work-section') },
  { link: document.querySelector('.site-nav-bar a[href="#about"]'), el: document.getElementById('about') },
  { link: document.querySelector('.site-nav-bar a[href="#contact"]'), el: document.getElementById('contact') },
];
const siteHeader = document.querySelector('.site-header');
const contactSection = document.getElementById('contact');
const contactInner = document.querySelector('.contact-inner');
const intro = document.querySelector('.intro');
const introHeadline = document.querySelector('.intro-headline');
const introBody = document.querySelector('.intro-body');
const scrollIndicator = document.querySelector('.scroll-indicator');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// The rest of the site stays hidden while the scribble draws itself
// in place. The paragraph fades in first, then the rest follows.
const html = document.documentElement;
const scribblePath = document.querySelector('.intro-divider .scribble-path');
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
  setTimeout(revealRestOfSite, 400);
}

if (reducedMotion.matches) {
  html.classList.add('is-text-revealed');
  revealRestOfSite();
} else {
  scribblePath.addEventListener('animationend', revealSite, { once: true });
  setTimeout(revealSite, 2000);
}

const heroFadeScrollRange = 320;
const scrollEffectDelay = 40;
const scrollIndicatorFadeRange = 50;

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

  // Invert the sticky bar to blue/white once the Contact panel slides
  // beneath it; stays inverted through the (also-blue) footer to page end
  // Invert once Contact reaches the scroll-anchor line (CSS scroll-padding-top,
  // where an anchor-clicked section rests) so clicking the Contact nav link flips
  // the bar on arrival, not after scrolling further in. Read here (not at init)
  // because the @import'd CSS may not be applied when the deferred script runs.
  const contactTop = contactSection.getBoundingClientRect().top;
  const scrollAnchorTop = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
  const invertLine = Math.max(scrollAnchorTop, siteHeader.offsetHeight);
  siteHeader.classList.toggle('is-over-dark', contactTop <= invertLine + 1);

  if (reducedMotion.matches) {
    introHeadline.style.opacity = '';
    introBody.style.opacity = '';
    scrollIndicator.style.opacity = '';
    contactInner.style.opacity = '';
    return;
  }

  // The one hero scroll accent: the headline and paragraph fade out
  // together as the reader scrolls down. Clamped to 1 so it settles.
  const fade = easeIn(Math.min(scrollEffectRatio(heroFadeScrollRange), 1));
  const opacity = 1 - fade;
  introHeadline.style.opacity = opacity;
  introBody.style.opacity = opacity;

  // Scroll indicator has done its job the moment you scroll — fade it
  // out quickly right away, no delay.
  scrollIndicator.style.opacity = 1 - Math.min(window.scrollY / scrollIndicatorFadeRange, 1);

  // Contact is the last section, so its content sits at the page bottom. Tie the
  // fade to how close the reader is to the bottom (not the section's top, which
  // scrolls off well before the Connect / On My Mind row comes into view).
  // A "hold zone" keeps it fully readable within ~0.75 viewport of the bottom so
  // small scroll-ups don't dim it; past that it fades out over ~0.6 viewport.
  // Scroll-linked and reversible, the same feel as the hero.
  const maxScroll = html.scrollHeight - window.innerHeight;
  const distanceFromBottom = Math.max(0, maxScroll - window.scrollY);
  const contactHoldZone = window.innerHeight * 0.75;
  const contactFadeRange = window.innerHeight * 0.6;
  const contactFadeDistance = Math.max(0, distanceFromBottom - contactHoldZone);
  contactInner.style.opacity = 1 - Math.min(contactFadeDistance / contactFadeRange, 1);
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
  distance: 20,   // px of translate — a clear but composed rise
  duration: 0.8,  // s — long enough to read on the way in, in either direction
  stagger: 0.08,  // s between items in a group (80ms)
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
  const headerOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -headerOffset });
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
      } else if (r.top < vh * 0.85 && r.bottom > vh * 0.15) {
        // Meaningfully in view → fade in (typography first). Wide gap from the
        // reset condition gives hysteresis, so there's no flicker at the edges.
        setVisible(group, true);
      }
      // Partially on screen but not past the reveal line yet: hold current state.
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  if (window.__lenis) window.__lenis.on('scroll', update);
  update();
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

document.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  waveCursor.style.left = e.clientX + 'px';
  waveCursor.style.top = e.clientY + 'px';
});

// Show the 👋 cursor over the Contact section — desktop (mouse) only
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  contactSection.addEventListener('mouseenter', () => waveCursor.classList.add('is-visible'));
  contactSection.addEventListener('mouseleave', () => waveCursor.classList.remove('is-visible'));
}

cardImages.forEach(img => {
  img.addEventListener('mouseenter', () => cursor.classList.add('is-visible'));
  img.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
});

msLabels.forEach(label => {
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
