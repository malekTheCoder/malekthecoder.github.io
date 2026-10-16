// Halftone field. A grid of rings whose size follows a slow, drifting shape; moving the
// pointer (or dragging a finger) paints into it and the paint fades back out. Any element
// with data-halftone gets one. "hero" keeps the shape off to the right of the text,
// "band" spreads it across a wide strip.
(function () {
  const hosts = document.querySelectorAll('[data-halftone]');
  if (!hosts.length || !window.HTMLCanvasElement) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  let accent = '';
  const readColor = () => { accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#888'; };
  readColor();

  const fields = [];
  // Themes swap by attribute and class on <html>; one observer repaints every field.
  new MutationObserver(() => { readColor(); fields.forEach(f => f()); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  hosts.forEach(host => {
    const kind = host.dataset.halftone;
    const canvas = document.createElement('canvas');
    canvas.className = 'halftone halftone-' + kind;
    canvas.setAttribute('aria-hidden', 'true');
    host.prepend(canvas);
    const ctx = canvas.getContext('2d');

    const BRUSH = 110;       // px radius the pointer paints
    const LEVELS = 6;        // alpha buckets, so each frame is a handful of strokes
    let gap, w = 0, h = 0, dpr = 1, cols = 0, rows = 0, ink = new Float32Array(0);
    let visible = false, raf = 0, last = 0, t = 0, px = null, py = null, inkLive = false;

    function size() {
      const r = host.getBoundingClientRect();
      w = Math.round(r.width); h = Math.round(r.height);
      gap = w < 600 ? 13 : 16;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
      cols = Math.ceil(w / gap) + 1; rows = Math.ceil(h / gap) + 1;
      ink = new Float32Array(cols * rows);
      draw();
    }

    // The shape: a few soft blobs on slow looping paths, rippled by a travelling wave.
    function blobs() {
      const m = Math.min(w, h), s = t * 0.001;
      if (kind === 'band') return [
        [w * (0.22 + 0.10 * Math.sin(s * 0.21)), h * (0.55 + 0.20 * Math.sin(s * 0.31)), m * 0.75],
        [w * (0.78 + 0.08 * Math.cos(s * 0.17)), h * (0.45 + 0.25 * Math.cos(s * 0.27)), m * 0.85],
      ];
      // Phones have no room beside the text, so the shape sits in the bottom corner instead.
      if (w < 760) return [
        [w * (1.02 + 0.05 * Math.sin(s * 0.23)), h * (0.80 + 0.05 * Math.cos(s * 0.19)), m * 0.55],
        [w * (0.00 + 0.05 * Math.cos(s * 0.17)), h * (1.00 + 0.02 * Math.sin(s * 0.29)), m * 0.40],
      ];
      return [
        [w * (0.80 + 0.06 * Math.sin(s * 0.19)), h * (0.48 + 0.12 * Math.sin(s * 0.23)), m * 0.48],
        [w * (0.93 + 0.04 * Math.cos(s * 0.29)), h * (0.86 + 0.06 * Math.cos(s * 0.17)), m * 0.30],
        [w * (0.06 + 0.04 * Math.sin(s * 0.13)), h * (0.92 + 0.04 * Math.sin(s * 0.31)), m * 0.24],
      ];
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bs = blobs(), s = t * 0.001;
      const paths = Array.from({ length: LEVELS }, () => new Path2D());
      const maxR = gap * 0.46;
      inkLive = false;
      for (let j = 0; j < rows; j++) {
        const y = j * gap;
        for (let i = 0; i < cols; i++) {
          const x = i * gap;
          let v = 0;
          for (const [bx, by, br] of bs) {
            const dx = x - bx, dy = y - by;
            v += Math.exp(-(dx * dx + dy * dy) / (br * br));
          }
          v *= 0.72 + 0.28 * Math.sin(x * 0.011 - y * 0.007 + s * 0.7);
          // Ease the tails off to nothing so the shape has an edge instead of a haze.
          v = v < 0.22 ? 0 : v > 0.95 ? 1 : (v - 0.22) / 0.73;
          v = v * v * (3 - 2 * v);
          const k = j * cols + i, p = ink[k];
          if (p > 0.004) { v += p; inkLive = true; } else ink[k] = 0;
          if (v < 0.03) continue;
          v = Math.min(v, 1);
          const r = 0.6 + (maxR - 0.6) * v;
          const path = paths[Math.min(LEVELS - 1, (v * LEVELS) | 0)];
          path.moveTo(x + r, y);
          path.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      paths.forEach((path, l) => {
        ctx.globalAlpha = 0.12 + 0.6 * ((l + 1) / LEVELS);
        ctx.stroke(path);
      });
      ctx.globalAlpha = 1;
    }

    // Paint along the segment since the last event, so a fast flick leaves a full stroke.
    function paint(x, y) {
      if (reduce.matches) return;
      const steps = px === null ? 1 : Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / (gap * 2)));
      for (let n = 1; n <= steps; n++) {
        const cx = px === null ? x : px + (x - px) * n / steps;
        const cy = px === null ? y : py + (y - py) * n / steps;
        const i0 = Math.max(0, Math.floor((cx - BRUSH) / gap)), i1 = Math.min(cols - 1, Math.ceil((cx + BRUSH) / gap));
        const j0 = Math.max(0, Math.floor((cy - BRUSH) / gap)), j1 = Math.min(rows - 1, Math.ceil((cy + BRUSH) / gap));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const d = Math.hypot(i * gap - cx, j * gap - cy) / BRUSH;
          if (d >= 1) continue;
          const k = j * cols + i, a = (1 - d * d) * 0.28;
          ink[k] = Math.min(1, ink[k] + a);
        }
      }
      px = x; py = y;
      kick();
    }

    function frame(now) {
      raf = 0;
      const dt = Math.min(64, now - (last || now));
      last = now;
      t += dt;
      const fade = Math.pow(0.975, dt / 16.7);
      for (let k = 0; k < ink.length; k++) if (ink[k]) ink[k] *= fade;
      draw();
      if (visible && !document.hidden && !reduce.matches) raf = requestAnimationFrame(frame);
    }
    function kick() {
      if (reduce.matches) { draw(); return; }
      if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); }
    }

    const local = (cx, cy) => { const r = host.getBoundingClientRect(); return [cx - r.left, cy - r.top]; };
    host.addEventListener('pointermove', e => paint(...local(e.clientX, e.clientY)), { passive: true });
    host.addEventListener('touchmove', e => { const p = e.touches[0]; paint(...local(p.clientX, p.clientY)); }, { passive: true });
    const lift = () => { px = py = null; };
    host.addEventListener('pointerleave', lift);
    host.addEventListener('touchend', lift, { passive: true });

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(host);
    new ResizeObserver(size).observe(host);
    document.addEventListener('visibilitychange', kick);
    reduce.addEventListener('change', kick);
    // Repaint now rather than on the next frame, so a theme swap never shows the old colour.
    fields.push(() => { draw(); kick(); });
  });
})();
