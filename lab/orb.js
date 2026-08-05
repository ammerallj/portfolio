// ==============================================================
// GRAIN ORB — lab/orb.js
// A grainy, mouse-interactive orb hero (Figma 311:2 experiment).
//
// LAYERED: each layer has exactly one job.
//   1. BASE   — a smooth radial gradient orb. It owns the whole
//               color story: the solid heart, the falloff, the
//               dissolve into cream. No grain involved.
//   2. DOTS   — grain as texture RIDING ON the base: cream sparkle
//               scattered across the body (fading out as the body
//               does) plus stray blue dust around the fringe. The
//               dots decorate the gradient; they never carry it.
//   3. MOVERS — a sparse layer of real particles sampled from the
//               same dot distribution, which scatter from the
//               cursor (particles.js-style repulse) and spring
//               back home. The interactive layer.
//
// Interactivity (fine pointers only): cursor parallax on the whole
// orb + the mover scatter. Reduced motion: one static frame, no
// listeners. Hidden tab: the rAF loop pauses. Resize: the grain
// pass is debounced.
//
// Standalone by design — no dependency on js/main.js. If the
// experiment graduates to the homepage, fold this into initHero()
// behind the same guards the blob uses today.
// ==============================================================
(function () {
  'use strict';

  // ---- Tuning knobs --------------------------------------------------------
  const ORB = {
    centerX: 0.5,      // orb center, fraction of viewport width
    centerY: 0.51,     // orb center, fraction of viewport height
    radius: 0.58,      // orb radius, fraction of min(vw, vh)
  };
  const COLORS = {
    accent: [74, 69, 255],    // #4A45FF — core + dust
    halo: [143, 178, 255],    // mid-falloff tint
    cream: [251, 252, 248],   // page background / sparkle dots
  };

  // LAYER 1 — the base gradient. Drawn out to radius × extent; stops are
  // fractions of that extended radius. Long, gentle tail — the base alone
  // must dissolve into the page with no visible rim.
  // LAYER 1 — the base gradient. Its falloff OVERLAPS the whole particle
  // zone: extent (× radius) reaches past the dot cutoff, so dots always sit
  // ON gradient, never beyond its end. Stops are GENERATED from a smooth
  // curve (zero slope entering and leaving the fade) — a hand-authored stop
  // list always leaves a slope kink somewhere, and the eye reads any kink
  // as a ring (Mach banding). No kinks, no band.
  const BASE = {
    extent: 1.15,          // gradient reach, × radius (≥ GRAIN_OPTS.cutoff)
    hold: 0.3,             // fraction of the extent held at full alpha
    colorBlend: [0.35, 0.9], // accent → halo across this span of the extent
    fadeToBg: [0.78, 1],   // halo → cream across the tail, so the veil's last
                           // trace is cream-on-cream — a clean landing on the
                           // page with no lingering blue haze
    stopCount: 24,
  };

  // LAYER 2 — the dots: ONE continuous density curve (flat over the body,
  // a boost at the rim, then a smooth fade to nothing) whose dots crossfade
  // COLOR through the rim — cream dots over the blue body, blue dots over
  // the cream fringe. Density can never dip, so no banding.
  const DOTS = {
    bodyDensity: 0,             // NO texture on the body — the gradient stays
                                // clean; dots live only at the dissolve rim
    rimBoost: 0.28,             // extra coverage where the dissolve is busiest
    // The band starts at the solid body's edge (the gradient's falloff
    // shoulder, ~0.57) and spans the whole dissolve — not just the far rim.
    rimMu: 0.75, rimSigma: 0.18,
    fadeStart: 0.9, fadeEnd: 1.05, // where the baseline coverage dies out
    flipStart: 0.7, flipEnd: 0.95, // cream dots → blue dots across this band
    alphaCream: [60, 150],
    alphaBlue: [90, 190],       // strong enough to read on the pale rim veil
    accentShare: 0.75,          // blue dots skew accent — visible on BOTH the
                                // milky veil and the cream (halo dots aren't)
  };
  const GRAIN_OPTS = {
    cutoff: 1.05,         // no dots beyond this radius fraction — clean cream
    blurPx: 0,            // optional feathering baked into the layer
    fineness: 3,          // VERY fine — sub-device-pixel dots render as a soft
                          // micro-spray (2 = film grain, 1 = chunky CSS px)
  };

  // LAYER 3 — the movers.
  const MOVERS = {
    count: 4200,
    repelRadius: 190,  // cursor influence, CSS px
    repelForce: 2.6,   // px/frame² at the cursor, falling off to the rim
    springK: 0.015,    // pull back toward home
    damping: 0.88,     // velocity decay (lower = snappier settle)
    jitter: 0.06,      // constant brownian shimmer
    alpha: [0.35, 0.8],
  };
  const MOUSE = {
    parallax: 0.03,    // orb drift toward cursor (fraction of offset)
    parallaxEase: 0.06,
  };

  // ---- Setup ---------------------------------------------------------------
  const canvas = document.getElementById('orb');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  let W, H, DPR, R, CX, CY;
  const grain = document.createElement('canvas'); // offscreen dot layer
  const gctx = grain.getContext('2d');

  const rgba = (name, a) => `rgba(${COLORS[name]}, ${a})`;
  const lerpIn = (range) => range[0] + Math.random() * (range[1] - range[0]);

  function bell(x, mu, sigma) {
    const d = (x - mu) / sigma;
    return Math.exp(-0.5 * d * d);
  }
  function smoothstep(t) {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  }

  // ---- The shared dot sampler ----------------------------------------------
  // One distribution for BOTH the baked dot layer and the movers, so the
  // interactive particles are indistinguishable from the texture at rest.
  // Returns {c, a} (color array, alpha 0-255) or null for "no dot here".
  function sampleDot(frac) {
    if (frac > GRAIN_OPTS.cutoff) return null;
    // ONE continuous density curve: baseline over the body (fading out past
    // the rim) plus a rim boost. A sum of a monotone fade and one bump has
    // no dip — that's what keeps the transition band-free.
    const fade = 1 - smoothstep((frac - DOTS.fadeStart) / (DOTS.fadeEnd - DOTS.fadeStart));
    const p = DOTS.bodyDensity * fade + DOTS.rimBoost * bell(frac, DOTS.rimMu, DOTS.rimSigma);
    if (Math.random() >= p) return null;
    // Color crossfade: cream dots over the blue body flip to blue dots over
    // the cream fringe, gradually across the flip band.
    const creamShare = 1 - smoothstep((frac - DOTS.flipStart) / (DOTS.flipEnd - DOTS.flipStart));
    if (Math.random() < creamShare) {
      return { c: COLORS.cream, a: lerpIn(DOTS.alphaCream) };
    }
    return { c: Math.random() < DOTS.accentShare ? COLORS.accent : COLORS.halo, a: lerpIn(DOTS.alphaBlue) };
  }

  // ---- LAYER 2 build (once per resize) -------------------------------------
  function buildGrain() {
    const res = GRAIN_OPTS.fineness;
    const GW = W * res, GH = H * res;
    grain.width = GW;
    grain.height = GH;
    const img = gctx.createImageData(GW, GH);
    const px = img.data;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const frac = Math.hypot(x - CX * res, y - CY * res) / (R * res);
        const dot = sampleDot(frac);
        if (dot) {
          const i = (y * GW + x) * 4;
          px[i] = dot.c[0];
          px[i + 1] = dot.c[1];
          px[i + 2] = dot.c[2];
          px[i + 3] = dot.a;
        }
      }
    }
    if (GRAIN_OPTS.blurPx > 0) {
      const temp = document.createElement('canvas');
      temp.width = GW;
      temp.height = GH;
      temp.getContext('2d').putImageData(img, 0, 0);
      gctx.clearRect(0, 0, GW, GH);
      gctx.filter = `blur(${GRAIN_OPTS.blurPx * res}px)`;
      gctx.drawImage(temp, 0, 0);
      gctx.filter = 'none';
    } else {
      gctx.putImageData(img, 0, 0);
    }
  }

  // ---- LAYER 3 build (once per resize) -------------------------------------
  let movers = [];
  function buildMovers() {
    movers = [];
    let tries = 0;
    while (movers.length < MOVERS.count && tries < MOVERS.count * 40) {
      tries++;
      const x = CX + (Math.random() * 2 - 1) * R * GRAIN_OPTS.cutoff;
      const y = CY + (Math.random() * 2 - 1) * R * GRAIN_OPTS.cutoff;
      const frac = Math.hypot(x - CX, y - CY) / R;
      const dot = sampleDot(frac);
      if (!dot) continue; // rejection sampling — movers live where dots live
      movers.push({
        hx: x, hy: y,      // home
        x: x, y: y,
        vx: 0, vy: 0,
        c: dot.c,
        a: lerpIn(MOVERS.alpha),
        // Fractional sizes render antialiased — sub-pixel specks that sit
        // naturally among the very fine baked grain.
        s: Math.random() < 0.9 ? 0.75 : 1.25,
      });
    }
  }

  function build() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    R = Math.min(vw, vh) * ORB.radius;
    // ZERO-CROP BY CONSTRUCTION: the canvas is a square sized to the orb's
    // full reach (gradient tail + dot cutoff) with the orb dead-center, and
    // the square is anchored at the orb's viewport position. The drawing can
    // never touch its own canvas edge, at any viewport size or stage scale —
    // only the real viewport ever crops it. (Everything painted lives within
    // the reach, so the canvas doesn't need to cover the whole viewport.)
    const reach = Math.ceil(R * Math.max(BASE.extent, GRAIN_OPTS.cutoff));
    const size = reach * 2 + 8;
    W = size;
    H = size;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.style.left = (ORB.centerX * 100) + '%';
    canvas.style.top = (ORB.centerY * 100) + '%';
    canvas.width = size * DPR;
    canvas.height = size * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = size / 2;
    CY = size / 2;
    buildGrain();
    buildMovers();
  }

  // ---- Per-frame draw ------------------------------------------------------
  const mouse = { x: -1e4, y: -1e4, active: false };
  let orbOx = 0, orbOy = 0; // eased parallax offset

  // Precomputed smooth stops: alpha holds at 1 through BASE.hold, then eases
  // to exactly 0 at the extent via smoothstep (C1-continuous — zero slope at
  // both ends), while the color lerps accent → halo. Sampled densely enough
  // that the per-segment linear interpolation is indistinguishable from the
  // curve.
  const baseStops = (() => {
    const stops = [];
    const [b0, b1] = BASE.colorBlend;
    const [f0, f1] = BASE.fadeToBg;
    for (let i = 0; i <= BASE.stopCount; i++) {
      const t = i / BASE.stopCount;
      const a = t <= BASE.hold ? 1 : 1 - smoothstep((t - BASE.hold) / (1 - BASE.hold));
      const k = smoothstep((t - b0) / (b1 - b0));
      // accent → halo through the falloff, then halo → cream through the
      // tail, so the fading veil converges on the page color itself.
      const kBg = smoothstep((t - f0) / (f1 - f0));
      const c = COLORS.accent.map((v, ch) => {
        const mid = v + (COLORS.halo[ch] - v) * k;
        return Math.round(mid + (COLORS.cream[ch] - mid) * kBg);
      });
      stops.push([t, `rgba(${c}, ${a.toFixed(4)})`]);
    }
    return stops;
  })();

  function baseGradient(cx, cy) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * BASE.extent);
    for (const [t, color] of baseStops) g.addColorStop(t, color);
    return g;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const tx = mouse.active ? (mouse.x - CX) * MOUSE.parallax : 0;
    const ty = mouse.active ? (mouse.y - CY) * MOUSE.parallax : 0;
    orbOx += (tx - orbOx) * MOUSE.parallaxEase;
    orbOy += (ty - orbOy) * MOUSE.parallaxEase;
    const cx = CX + orbOx, cy = CY + orbOy;

    // LAYER 1 — the base gradient orb.
    ctx.fillStyle = baseGradient(cx, cy);
    ctx.beginPath();
    ctx.arc(cx, cy, R * BASE.extent, 0, Math.PI * 2);
    ctx.fill();

    // LAYER 2 — the dot texture, riding the same parallax.
    ctx.drawImage(grain, orbOx, orbOy, W, H);

    // LAYER 3 — the movers: scatter from the cursor, spring home, shimmer.
    for (const p of movers) {
      if (mouse.active) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < MOVERS.repelRadius && d > 0.001) {
          const f = MOVERS.repelForce * (1 - d / MOVERS.repelRadius);
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
      p.vx += (p.hx - p.x) * MOVERS.springK + (Math.random() - 0.5) * MOVERS.jitter;
      p.vy += (p.hy - p.y) * MOVERS.springK + (Math.random() - 0.5) * MOVERS.jitter;
      p.vx *= MOVERS.damping;
      p.vy *= MOVERS.damping;
      p.x += p.vx;
      p.y += p.vy;
      ctx.fillStyle = `rgba(${p.c}, ${p.a})`;
      ctx.fillRect(p.x + orbOx, p.y + orbOy, p.s, p.s);
    }
  }

  // ---- Loop + lifecycle ----------------------------------------------------
  let rafId = 0, running = false;
  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    draw();
  }
  function play() {
    if (!running && !reduced) {
      running = true;
      rafId = requestAnimationFrame(frame);
    }
  }
  function pause() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  build();
  // Lab-only debug handle (inspect scatter/settle from the console).
  window.__orbMovers = () => movers;
  if (reduced) {
    draw(); // one static frame; no listeners, no loop
    return;
  }
  if (finePointer) {
    window.addEventListener('pointermove', (e) => {
      // Unproject through the canvas rect so the mapping stays exact even
      // when the stage is CSS-scaled (the scroll entrance shrinks it).
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      mouse.x = (e.clientX - r.left) * (W / r.width);
      mouse.y = (e.clientY - r.top) * (H / r.height);
      mouse.active = true;
    });
    window.addEventListener('pointerleave', () => { mouse.active = false; });
  }
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(build, 150); // the grain pass is heavy — debounce
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  play();
})();
