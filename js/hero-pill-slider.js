/*!
 * Grafik Kanzlei – Hero Pill Slider
 * Purpose: Infinite vertical pill slider with active center & pause
 * Author: Thomas Rohmberger
 * Version: 1.0.0
 */

(() => {
  const S = {
    viewport: '.hero_bottom_slider',
    track: '.hero_bottom_track',
    item: '.hero_bottom_pill'
  };

  const SETTINGS = {
    pauseMs: 1500,
    moveMs: 520,
    // bouncy move (Track): easeOutBack
    easing: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    minCloneSets: 4,
    activeClass: 'is-active',
    respectReducedMotion: true,
    pauseOnHover: true
  };

  const viewport = document.querySelector(S.viewport);
  const track = document.querySelector(S.track);
  if (!viewport || !track) return;

  if (SETTINGS.respectReducedMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setActivePill();
    return;
  }

  let originals = [];
  let step = 0;
  let setHeight = 0;
  let y = 0;
  let centerOffset = 0;

  let paused = false;
  let phase = 'pause';
  let phaseStart = 0;
  let startY = 0;
  let targetY = 0;

  function outerHeight(el) {
    const cs = getComputedStyle(el);
    const mt = parseFloat(cs.marginTop) || 0;
    const mb = parseFloat(cs.marginBottom) || 0;
    return el.offsetHeight + mt + mb;
  }

  function clearClones() {
    Array.from(track.children).forEach(el => {
      if (el.dataset.clone === '1') el.remove();
    });
  }

  function rebuild() {
    clearClones();

    originals = Array.from(track.querySelectorAll(S.item)).filter(el => el.dataset.clone !== '1');
    if (!originals.length) return;

    const vpH = viewport.getBoundingClientRect().height;

    // step = "eine Zeile" (Pill inkl. margin)
    step = outerHeight(originals[0]);

    // setHeight = Summe aller Original-Pills inkl. margin
    setHeight = originals.reduce((sum, el) => sum + outerHeight(el), 0);

    // Center Offset: sorgt dafür, dass die aktive Pill mittig sitzt
    const pillVisualH = originals[0].offsetHeight; // ohne margin
    centerOffset = Math.max(0, (vpH - pillVisualH) / 2);

    // Clone sets
    const frag = document.createDocumentFragment();
    for (let i = 0; i < SETTINGS.minCloneSets; i++) {
      originals.forEach(item => {
        const c = item.cloneNode(true);
        c.dataset.clone = '1';
        frag.appendChild(c);
      });
    }
    track.appendChild(frag);

    y = normalizeY(y);
    applyY(y);
    setActivePill();
  }

  function normalizeY(val) {
    if (!setHeight) return 0;
    while (val <= -setHeight) val += setHeight;
    while (val > 0) val -= setHeight;
    return val;
  }

  function applyY(val) {
    // Center Offset addieren + pixel-snapping
    const snapped = Math.round(val + centerOffset);
    track.style.transform = `translate3d(0, ${snapped}px, 0)`;
  }

  function setActivePill() {
    const items = Array.from(track.querySelectorAll(S.item));
    const vp = viewport.getBoundingClientRect();
    const centerY = vp.top + vp.height / 2;

    let best = null;
    let bestDist = Infinity;

    for (const it of items) {
      const r = it.getBoundingClientRect();
      const c = r.top + r.height / 2;
      const d = Math.abs(c - centerY);
      if (d < bestDist) { bestDist = d; best = it; }
    }

    for (const it of items) it.classList.remove(SETTINGS.activeClass);
    if (best) best.classList.add(SETTINGS.activeClass);
  }

  function nextStep() {
    startY = y;
    targetY = y - step;

    // unsichtbarer wrap
    if (setHeight && targetY <= -setHeight) {
      targetY += setHeight;
      startY += setHeight;
      y += setHeight;
    }

    phase = 'move';
    phaseStart = performance.now();
  }

  function tick(t) {
    if (paused) {
      requestAnimationFrame(tick);
      return;
    }

    if (!phaseStart) phaseStart = t;

    if (phase === 'pause') {
      applyY(y);
      setActivePill();

      if (t - phaseStart >= SETTINGS.pauseMs) {
        phaseStart = t;
        nextStep();
      }
    } else {
      const p = Math.min(1, (t - phaseStart) / SETTINGS.moveMs);
      const eased = SETTINGS.easing(p);
      const current = startY + (targetY - startY) * eased;

      applyY(current);
      setActivePill();

      if (p >= 1) {
        y = normalizeY(targetY);
        applyY(y);
        phase = 'pause';
        phaseStart = t;
      }
    }

    requestAnimationFrame(tick);
  }

  if (SETTINGS.pauseOnHover) {
    viewport.addEventListener('mouseenter', () => paused = true);
    viewport.addEventListener('mouseleave', () => { paused = false; phaseStart = 0; });
    viewport.addEventListener('touchstart', () => paused = true, { passive: true });
    viewport.addEventListener('touchend', () => { paused = false; phaseStart = 0; }, { passive: true });
  }

  window.addEventListener('resize', () => setTimeout(rebuild, 120));

  rebuild();
  requestAnimationFrame(tick);
})();

