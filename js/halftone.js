// Halftone field. A grid of rings whose size follows a slow, drifting shape; moving the
// pointer (or dragging a finger) paints into it and the paint fades back out. Any element
// with data-halftone gets one. "hero" keeps the shape off to the right of the text,
// "band" spreads it across a wide strip.
//
// On a wide hero the field also draws a picture for each phrase the subtitle types out: a
// chip, a neural network, a robot arm, an eagle. The picture is revealed in step with the
// typing and dissolves as the phrase is deleted.
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

  // ── Pictures, drawn in a 100 x 100 box. Alpha is ink: 1 is a full ring, less is a smaller one.
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  function line(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.stroke(); }
  function poly(g, p) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fill(); }
  function cut(g, alpha, fn) { g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = alpha; fn(); g.restore(); }

  // In phrase order: Computer Engineering, Machine Learning, Robotics, Eagle Scout.
  // seed is where the drawing starts; outlineFirst traces the edge before filling it in.
  const PICTURES = [
    { // a chip, its die knocked back so the package reads as two layers
      seed: [50, 50], outlineFirst: true,
      draw(g) {
        for (let i = 0; i < 4; i++) {
          const p = 32 + i * 12;
          g.fillRect(p - 3, 5, 6, 18); g.fillRect(p - 3, 77, 6, 18);
          g.fillRect(5, p - 3, 18, 6); g.fillRect(77, p - 3, 18, 6);
        }
        rr(g, 20, 20, 60, 60, 5); g.fill();
        cut(g, 0.62, () => { rr(g, 34, 34, 32, 32, 3); g.fill(); });
        cut(g, 1, () => dot(g, 27, 27, 2.6));
      },
    },
    { // a small network; thin links come out as dotted lines, and it fills in left to right
      seed: [0, 50], outlineFirst: false,
      draw(g) {
        const pos = [[3, 12], [4, 37], [4, 63], [2, 88]]
          .map(([n, x]) => Array.from({ length: n }, (_, i) => [x, 50 + (i - (n - 1) / 2) * 22]));
        g.lineWidth = 1.4; g.globalAlpha = 0.55;
        for (let l = 0; l < pos.length - 1; l++) for (const a of pos[l]) for (const b of pos[l + 1]) line(g, [...a, ...b]);
        g.globalAlpha = 1;
        pos.flat().forEach(([x, y]) => dot(g, x, y, 6));
        cut(g, 0.6, () => pos.flat().forEach(([x, y]) => dot(g, x, y, 2.4)));
      },
    },
    { // a robot arm, built up from its base
      seed: [40, 100], outlineFirst: false,
      draw(g) {
        g.lineCap = 'round'; g.lineJoin = 'round';
        rr(g, 16, 86, 46, 9, 2.5); g.fill();
        poly(g, [27, 86, 51, 86, 47, 72, 31, 72]);
        g.lineWidth = 12; line(g, [39, 70, 54, 34]);
        g.lineWidth = 9.5; line(g, [54, 34, 78, 44]);
        dot(g, 39, 70, 9); dot(g, 54, 34, 7.5); dot(g, 78, 44, 6);
        cut(g, 0.6, () => { dot(g, 39, 70, 3.6); dot(g, 54, 34, 3); });
        g.lineWidth = 6; line(g, [78, 44, 82, 54]);
        line(g, [72, 56, 92, 53]);
        line(g, [73, 56, 71, 70]); line(g, [91, 53, 93, 67]);
      },
    },
    { // an eagle with raised wings; each feather notch is wider than a grid step so it survives
      seed: [50, 46], outlineFirst: true,
      draw(g) {
        const wing = [47, 46, 38, 33, 24, 20, 9, 9, 11, 17, 5, 21, 15, 26, 8, 31, 19, 34, 12, 40,
                      24, 41, 19, 48, 31, 47, 30, 54, 41, 52, 46, 57];
        poly(g, wing);
        poly(g, wing.map((v, i) => (i % 2 ? v : 100 - v)));
        g.beginPath(); g.ellipse(50, 51, 9, 14, 0, 0, Math.PI * 2); g.fill();
        g.lineWidth = 9; g.lineCap = 'round'; line(g, [50, 42, 51, 27]);
        dot(g, 51, 22, 7);
        poly(g, [56, 18, 67, 22, 57, 27]);
        poly(g, [43, 61, 57, 61, 64, 77, 57, 73, 50, 80, 43, 73, 36, 77]);
        cut(g, 1, () => dot(g, 53, 20, 1.8));
      },
    },
  ];

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
    // The self-drawn stroke paints into its own layer: it glows, where a hand scratches a picture.
    let glow = new Float32Array(0);
    // The contact strip is a closing echo of the hero, so it runs well under it.
    const STRENGTH = kind === 'band' ? 0.42 : 0.8;
    let visible = false, raf = 0, last = 0, t = 0, inkLive = false;
    let grow = 0;             // 0 to 1 as the shape swells in on first sight
    let ghost = null;         // a self-drawn stroke: the intro, then again when the page sits idle
    let idleAt = 0;           // time of the last real pointer or touch
    const hand = { x: null, y: null };

    // Picture state. box is where pictures go (null when there is no room beside the text).
    let box = null, pic = -1, typed = 0, shown = 0, doneAt = -1e9;
    let S = null, O = null, R = null, W = null;   // coverage, reveal order, reveal now, blob hold-back

    function size() {
      const r = host.getBoundingClientRect();
      w = Math.round(r.width); h = Math.round(r.height);
      box = kind === 'hero' ? placeBox(r) : null;
      // Pictures need a finer grid to hold their detail; elsewhere the coarser one is calmer.
      gap = box ? 12 : w < 600 ? 13 : 16;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
      cols = Math.ceil(w / gap) + 1; rows = Math.ceil(h / gap) + 1;
      ink = new Float32Array(cols * rows); glow = new Float32Array(cols * rows);
      clearing();
      buildPicture();
      draw();
    }

    // The square to the right of the words: from where the text ends to the edge, as tall as it
    // can be without crowding the nav or the scroll cue. Too small and pictures are skipped.
    function placeBox(r) {
      const parts = ['.hero-name', '.hero-subtitle', '.hero-bio', '.hero-actions']
        .map(sel => host.querySelector(sel)).filter(Boolean);
      if (!parts.length) return null;
      // The theme hint nudges the text down for a moment; measure where it settles.
      const inner = host.querySelector('.hero-inner');
      const shift = inner ? new DOMMatrixReadOnly(getComputedStyle(inner).transform).m42 : 0;
      let right = 0, top = Infinity, bottom = 0;
      for (const el of parts) {
        const range = document.createRange(); range.selectNodeContents(el);
        const b = range.getBoundingClientRect();
        right = Math.max(right, b.right - r.left);
        top = Math.min(top, b.top - r.top - shift); bottom = Math.max(bottom, b.bottom - r.top - shift);
      }
      const left = right + 56, avail = w - 40 - left;
      const s = Math.min(avail, h * 0.62, 560);
      if (s < 250) return null;
      const cx = left + avail / 2;
      const cy = Math.max(140 + s / 2, Math.min((top + bottom) / 2, h - 90 - s / 2));
      return { x: cx - s / 2, y: cy - s / 2, s };
    }

    // How far the drifting blob gives way around the picture spot, so the spinner and the
    // pictures read on clean paper.
    function clearing() {
      W = null;
      if (!box) return;
      W = new Float32Array(cols * rows);
      const ccx = box.x + box.s / 2, ccy = box.y + box.s / 2;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const d = Math.hypot(i * gap - ccx, j * gap - ccy) / box.s;
        W[j * cols + i] = d < 0.55 ? 1 : d > 0.95 ? 0 : 1 - (d - 0.55) / 0.4;
      }
    }

    function buildPicture() {
      S = O = R = null;
      if (!box || pic < 0) return;
      const shape = PICTURES[pic], n = cols * rows;
      // Coverage per grid cell, sampled 4 x 4 inside it, so edges come out as smaller rings.
      const sub = gap / 4, m = Math.ceil(box.s / sub) + 8;
      const c = document.createElement('canvas'); c.width = c.height = m;
      const g = c.getContext('2d');
      g.translate(4, 4); g.scale((m - 8) / 100, (m - 8) / 100);
      g.fillStyle = g.strokeStyle = '#000';
      shape.draw(g);
      const img = g.getImageData(0, 0, m, m).data;
      S = new Float32Array(n); O = new Float32Array(n).fill(2); R = new Float32Array(n);
      const sx0 = box.x + shape.seed[0] / 100 * box.s, sy0 = box.y + shape.seed[1] / 100 * box.s;
      let maxd = 1;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i, x = i * gap, y = j * gap;
        const px = Math.round((x - box.x) / sub) + 4, py = Math.round((y - box.y) / sub) + 4;
        if (px < 2 || py < 2 || px > m - 3 || py > m - 3) continue;
        let a = 0;
        for (let v = -2; v < 2; v++) for (let u = -2; u < 2; u++) a += img[((py + v) * m + px + u) * 4 + 3];
        S[k] = a / (16 * 255);
        if (S[k] > 0.08) maxd = Math.max(maxd, Math.hypot(x - sx0, y - sy0));
      }
      // When each cell appears, 0 to 1: the outline then the fill for solid pictures, or a growth
      // front from the seed. A little noise keeps the front from looking ruled.
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i; if (!(S[k] > 0.08)) continue;
        const d = Math.hypot(i * gap - sx0, j * gap - sy0) / maxd;
        const hash = ((Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 1 + 1) % 1;
        const edge = S[k] < 0.75 || !(S[k - 1] > 0.08) || !(S[k + 1] > 0.08) || !(S[k - cols] > 0.08) || !(S[k + cols] > 0.08);
        O[k] = shape.outlineFirst ? (edge ? 0.02 + d * 0.5 : 0.42 + d * 0.5) + hash * 0.05 : d * 0.9 + hash * 0.07;
      }
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
      const picPaths = Array.from({ length: LEVELS }, () => new Path2D());
      const maxR = gap * 0.46;
      const hold = W ? shown : 0;
      // A pulse runs out from the middle once the phrase finishes typing.
      const since = t - doneAt, pulseR = since * 0.42, pulseOn = since < 1600;
      const ccx = box ? box.x + box.s / 2 : 0, ccy = box ? box.y + box.s / 2 : 0;
      inkLive = false;
      for (let j = 0; j < rows; j++) {
        const y = j * gap;
        for (let i = 0; i < cols; i++) {
          const x = i * gap;
          const k = j * cols + i;
          let v = 0;
          for (const [bx, by, br] of bs) {
            const dx = x - bx, dy = y - by;
            v += Math.exp(-(dx * dx + dy * dy) / (br * br));
          }
          v *= 0.72 + 0.28 * Math.sin(x * 0.011 - y * 0.007 + s * 0.7);
          // Ease the tails off to nothing so the shape has an edge instead of a haze.
          v = v < 0.22 ? 0 : v > 0.95 ? 1 : (v - 0.22) / 0.73;
          v = v * v * (3 - 2 * v) * grow;
          let pv = 0;
          if (hold) {
            v *= 1 - 0.92 * hold * W[k];
            if (S && R[k] > 0.002) {
              // Lit a touch more toward the bottom right, and a slow sheen crosses it once drawn.
              const shade = 0.84 + 0.16 * ((x - box.x) + (y - box.y)) / (2 * box.s);
              const sheen = 0.9 + 0.1 * Math.sin((x + y) * 0.018 - s * 2.4);
              pv = S[k] * R[k] * shade * sheen;
              if (pulseOn) {
                const d = Math.hypot(x - ccx, y - ccy) - pulseR;
                pv *= 1 - 0.55 * Math.exp(-d * d / 900) * (1 - since / 1600);
              }
            }
          }
          const p = ink[k], q = glow[k];
          if (p > 0.004) inkLive = true; else ink[k] = 0;
          if (q > 0.004) inkLive = true; else glow[k] = 0;
          // Over the picture the pointer scratches it away and it heals; elsewhere it paints.
          const onPic = pv > 0.04;
          if (onPic) { v = Math.max(pv * (1 - 0.8 * Math.min(1, p * 1.6)), q); }
          else { v = Math.max(v, pv) + p * (hold ? 1 - 0.85 * hold * W[k] : 1) + q; }
          if (v < 0.03) continue;
          v = Math.min(v, 1);
          const r = 0.6 + (maxR - 0.6) * v;
          // The picture and the spinner are the subject, so they take the heavier ink.
          const path = (onPic || (box && q > 0.25) ? picPaths : paths)[Math.min(LEVELS - 1, (v * LEVELS) | 0)];
          path.moveTo(x + r, y);
          path.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      paths.forEach((path, l) => {
        ctx.globalAlpha = (0.1 + 0.55 * ((l + 1) / LEVELS)) * STRENGTH;
        ctx.stroke(path);
      });
      // The picture is the subject, so it gets full ink and a slightly heavier line.
      ctx.lineWidth = 1.25;
      picPaths.forEach((path, l) => {
        ctx.globalAlpha = 0.22 + 0.78 * ((l + 1) / LEVELS);
        ctx.stroke(path);
      });
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
    }

    // Each cell eases toward how revealed it should be for the text typed so far.
    function stepPicture(dt) {
      if (!W) return;
      if (S) {
        const P = typed * 1.12, ease = 1 - Math.pow(0.78, dt / 16.7);
        for (let k = 0; k < S.length; k++) {
          if (!S[k]) continue;
          const target = Math.max(0, Math.min(1, (P - O[k]) / 0.12));
          R[k] += (target - R[k]) * ease;
        }
      }
      // The blob gives way while the spinner runs and while a phrase is up, and comes back
      // in the pause between phrases.
      const want = ghost || (S && typed > 0) ? 1 : 0;
      shown += (want - shown) * (1 - Math.pow(want ? 0.9 : 0.96, dt / 16.7));
    }

    // Paint along the segment since the last event, so a fast flick leaves a full stroke.
    function paint(x, y, from = hand, amt = 0.28, layer = ink, brush = BRUSH) {
      if (reduce.matches) return;
      const px = from.x, py = from.y;
      const steps = px === null ? 1 : Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / (gap * 2)));
      for (let n = 1; n <= steps; n++) {
        const cx = px === null ? x : px + (x - px) * n / steps;
        const cy = px === null ? y : py + (y - py) * n / steps;
        const i0 = Math.max(0, Math.floor((cx - brush) / gap)), i1 = Math.min(cols - 1, Math.ceil((cx + brush) / gap));
        const j0 = Math.max(0, Math.floor((cy - brush) / gap)), j1 = Math.min(rows - 1, Math.ceil((cy + brush) / gap));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const d = Math.hypot(i * gap - cx, j * gap - cy) / brush;
          if (d >= 1) continue;
          const k = j * cols + i, a = (1 - d * d) * amt;
          layer[k] = Math.min(1, layer[k] + a);
        }
      }
      from.x = x; from.y = y;
      kick();
    }

    // The self-drawn stroke: in from the lower left on a wave, then once around the shape.
    // With pictures on, the stroke is a loading spinner: in on a wave, a turn and a half around
    // the spot the first picture will draw in, then a spiral into its middle, where the picture
    // starts. It runs as long as the subtitle reads Loading.
    function ghostAt(u) {
      const [bx, by] = blobs()[0], m = Math.min(w, h);
      if (box) {
        const cx = box.x + box.s / 2, cy = box.y + box.s / 2, R0 = box.s * 0.34;
        if (u < 0.3) {
          const a = u / 0.3, e = a * a * (3 - 2 * a);
          return [-0.05 * w + (cx - R0 + 0.05 * w) * e,
                  h * 0.86 + (cy - h * 0.86) * e + h * 0.08 * Math.sin(a * Math.PI * 3) * (1 - a)];
        }
        const a = (u - 0.3) / 0.7;
        const th = Math.PI + a * Math.PI * 2 * 1.85;
        const r = a < 0.72 ? R0 : R0 * (1 - 0.9 * ((a - 0.72) / 0.28) ** 1.4);
        return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
      }
      const cx = Math.min(bx, w * 0.84), cy = Math.min(by, h * 0.82), R0 = m * (w < 760 ? 0.22 : 0.2);
      if (u < 0.5) {
        const a = u / 0.5;
        return [-0.05 * w + (cx - R0 + 0.05 * w) * a,
                h * 0.84 + (cy - h * 0.84) * a + h * 0.07 * Math.sin(a * Math.PI * 3) * (1 - a)];
      }
      const th = Math.PI + ((u - 0.5) / 0.5) * Math.PI * 2;
      return [cx + R0 * Math.cos(th), cy + R0 * Math.sin(th)];
    }
    function startGhost(amt) { ghost = { at: t, dur: box ? 2850 : 2600, amt, x: null, y: null }; idleAt = t; }

    function frame(now) {
      raf = -1;               // mid-frame: a paint from inside it must not schedule a second loop
      const dt = Math.min(64, now - (last || now));
      last = now;
      t += dt;
      if (grow < 1) grow = Math.min(1, grow + dt / 1400);
      if (kind === 'hero') {
        // With pictures on, they are the motion; the idle stroke would only crowd them.
        if (!ghost && !box && t - idleAt > 8000) startGhost(0.16);
        if (ghost) {
          const u = Math.min(1, (t - ghost.at) / ghost.dur);
          // The spinner keeps an even pace; the plain stroke eases in and out.
          const e = box ? u : u * u * (3 - 2 * u);
          paint(...ghostAt(e), ghost, box ? 0.42 : ghost.amt, glow, box ? 54 : BRUSH);
          if (u >= 1) ghost = null;
        }
        stepPicture(dt);
      }
      // The spinner's tail is short so it reads as a moving head, not a smear.
      const fade = Math.pow(0.975, dt / 16.7), gfade = Math.pow(box ? 0.95 : 0.975, dt / 16.7);
      for (let k = 0; k < ink.length; k++) { if (ink[k]) ink[k] *= fade; if (glow[k]) glow[k] *= gfade; }
      draw();
      raf = visible && !document.hidden && !reduce.matches ? requestAnimationFrame(frame) : 0;
    }
    function kick() {
      if (reduce.matches) { grow = 1; draw(); return; }
      if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); }
    }

    if (kind === 'hero') {
      document.addEventListener('hero:typing', ({ detail }) => {
        if (reduce.matches) return;
        if (detail.index !== pic) { pic = detail.index; buildPicture(); }
        if (detail.progress >= 1 && typed < 1) doneAt = t;
        typed = detail.progress;
      });
      // The text box is measured, so measure again once the webfonts have settled its width.
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    }

    const local = (cx, cy) => { const r = host.getBoundingClientRect(); return [cx - r.left, cy - r.top]; };
    // A real hand takes over from the self-drawn stroke straight away.
    const touch = (x, y) => { ghost = null; idleAt = t; paint(...local(x, y)); };
    host.addEventListener('pointermove', e => touch(e.clientX, e.clientY), { passive: true });
    host.addEventListener('touchmove', e => { const p = e.touches[0]; touch(p.clientX, p.clientY); }, { passive: true });
    const lift = () => { hand.x = hand.y = null; };
    host.addEventListener('pointerleave', lift);
    host.addEventListener('touchend', lift, { passive: true });

    let seen = false;
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !seen) { seen = true; if (kind === 'hero') startGhost(0.3); }
      if (visible) kick();
    }).observe(host);
    new ResizeObserver(size).observe(host);
    document.addEventListener('visibilitychange', kick);
    reduce.addEventListener('change', kick);
    // Repaint now rather than on the next frame, so a theme swap never shows the old colour.
    fields.push(() => { draw(); kick(); });
  });
})();
