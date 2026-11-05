// Scroll-perf HUD. Load on the running page from the DevTools console:
//   import('/lab/perf-hud.js')
// Shows live FPS + worst frame, and toggles suspects so you can feel which one fixes it.
(() => {
  if (window.__perfHud) return;
  const css = {
    'Lenis smooth-scroll': null, // handled in JS below
    'Backdrop blur': '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
    'Grain + blend': '.page-field-grain,.intro-bar::after,.site-header::after,.contact-bg,.contact-section::after,.intro-bar-feather{display:none!important}',
    'Hero field (canvas+img)': '.page-field,.page-field-canvas,.page-field-grain{display:none!important}',
    'Masks': '*,*::before,*::after{-webkit-mask-image:none!important;mask-image:none!important}',
    'Work media': '.work-card video,.work-card-hover,.work-card-media img{visibility:hidden!important}',
    'Reveal transforms': '[data-reveal]{transform:none!important;filter:none!important;will-change:auto!important}',
    'Custom cursor': '.cursor-glow,[class*="cursor"]{display:none!important}',
  };
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;font:12px/1.4 ui-monospace,monospace;background:#000c;color:#fff;padding:10px 12px;border-radius:10px;min-width:210px';
  const stat = document.createElement('div');
  stat.style.cssText = 'font-size:14px;margin-bottom:6px';
  box.appendChild(stat);
  const styles = {};
  Object.keys(css).forEach(k => {
    const l = document.createElement('label');
    l.style.cssText = 'display:block;cursor:pointer';
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.style.marginRight = '6px';
    c.onchange = () => {
      if (k === 'Lenis smooth-scroll') {
        const L = window.__lenis;
        if (L) c.checked ? L.stop() : L.start();
        document.documentElement.classList.toggle('lenis-off', c.checked);
        return;
      }
      if (c.checked) {
        const s = document.createElement('style');
        s.textContent = css[k];
        document.head.appendChild(s);
        styles[k] = s;
      } else if (styles[k]) { styles[k].remove(); delete styles[k]; }
    };
    l.append(c, 'OFF: ' + k);
    box.appendChild(l);
  });
  document.body.appendChild(box);
  let last = performance.now(), frames = 0, worst = 0, t0 = last;
  (function f(n) {
    frames++; worst = Math.max(worst, n - last); last = n;
    if (n - t0 >= 500) {
      const fps = Math.round(frames * 1000 / (n - t0));
      stat.textContent = fps + ' fps · worst ' + Math.round(worst) + 'ms';
      stat.style.color = fps >= 55 ? '#7f7' : fps >= 40 ? '#fd5' : '#f77';
      frames = 0; worst = 0; t0 = n;
    }
    requestAnimationFrame(f);
  })(last);
  window.__perfHud = box;
})();
