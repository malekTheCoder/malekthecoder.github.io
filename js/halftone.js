// Halftone field. A grid of rings whose size follows a slow, drifting shape; moving the
// pointer (or dragging a finger) paints into it and the paint fades back out. Any element
// with data-halftone gets one. "hero" keeps the shape off to the right of the text,
// "band" spreads it across a wide strip, and "page" is a faint field fixed behind the rest of
// the site that fades in as the hero scrolls away.
//
// On a wide hero the field also draws a picture for each phrase the subtitle types out: a
// chip, a neural network, a humanoid, the Scouting fleur-de-lis. The picture is revealed in step with the
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
  // Path builders, for pictures assembled from separately outlined parts.
  function capsule(p, x0, y0, x1, y1, w0, w1) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, a = Math.atan2(dy, dx);
    p.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); p.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
    p.arc(x1, y1, w1 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
    p.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); p.arc(x0, y0, w0 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
    p.closePath();
  }
  function rrect(p, x, y, w, h, r) {
    p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
  }
  function ell(p, x, y, rx, ry, rot = 0) { p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); p.closePath(); }
  // A stroke that tapers from r0 to r1 along a cubic curve.
  function taper(g, p0, p1, p2, p3, r0, r1) {
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, u = 1 - t;
      dot(g, u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
             u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1], r0 + (r1 - r0) * t);
    }
  }

  // In phrase order: Computer Engineering, Machine Learning, Robotics, Eagle Scout.
  // w and h are the drawing's own units (square unless given); seed is where the drawing
  // starts; outlineFirst traces the edge before filling it in.
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
    { // a humanoid like the one in the lab, drawn like an engineering drawing: silver shells in a
      // light fill, black actuators nearly solid, one bold contour round each limb with thin lines
      // between its parts, a dark egg of a head with a glowing ring round the face and a bar across
      // the eyes, joint motors as discs with a hub, a ground line and a height dimension
      w: 64, h: 100, seed: [30, 30], outlineFirst: true,
      draw(g) {
        const X = x => 60 - x, sides = fn => [x => x, X].forEach(fn), L = (X, x, w) => Math.min(X(x), X(x + w));
        const SILVER = 0.16, BLACK = 0.95;
        g.lineJoin = g.lineCap = 'round';
        // The part less a shifted copy of itself: a crescent along one side.
        const crescent = (p, dx, dy) => { const c = new Path2D(); c.rect(-9, -9, 90, 120); c.addPath(p, new DOMMatrix([1, 0, 0, 1, dx, dy])); return c; };
        // An assembly, back to front: clear a halo so it stands off what is behind, draw one contour
        // round the whole, then fill each part (silver darkens along its lower right, black catches
        // light on its upper left) with a thin line where it meets the next.
        const asm = (lw, ...list) => {
          const ps = list.map(([t, fn, more]) => { const p = new Path2D(); fn(p); return [t, p, more]; });
          const all = new Path2D(); ps.forEach(([, p]) => all.addPath(p));
          cut(g, 1, () => { g.lineWidth = 3.2; g.stroke(all); });
          g.save(); g.lineWidth = 2 * lw; g.stroke(all); g.restore();
          ps.forEach(([t, p, more]) => {
            cut(g, 1, () => g.fill(p));
            g.save(); g.globalAlpha = t; g.fill(p); g.clip(p);
            if (t < 0.5) { g.globalAlpha = 0.22; g.fill(crescent(p, -1.5, -1.2), 'evenodd'); }
            else cut(g, 0.3, () => g.fill(crescent(p, 1, 1), 'evenodd'));
            g.restore();
            g.save(); g.lineWidth = 0.55; g.stroke(p); if (more) more(p); g.restore();
          });
        };
        const S = (fn, more) => [SILVER, fn, more], B = (fn, more) => [BLACK, fn, more];
        const ring = (x, y, r, w) => { g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); };
        const groove = (y, x0, x1) => cut(g, 0.6, () => { g.lineWidth = 0.6; line(g, [x0, y, x1, y]); });
        // A black actuator face on: dark rim, paler face, solid hub.
        const motor = (x, y, r) => B(p => ell(p, x, y, r, r), () => { cut(g, 0.65, () => dot(g, x, y, r * 0.66)); dot(g, x, y, r * 0.32); });

        // waist actuator, pelvis with its grille, and the hip housings, behind the thighs
        asm(0.65, B(p => rrect(p, 26.6, 40.4, 6.8, 4.4, 0.8), () => groove(42.2, 26.8, 33.2)),
          B(p => rrect(p, 18.4, 44.4, 6.2, 5.8, 1.8)), B(p => rrect(p, 35.4, 44.4, 6.2, 5.8, 1.8)),
          B(p => { p.moveTo(23.2, 44.2); p.lineTo(36.8, 44.2); p.lineTo(37.6, 45.4); p.lineTo(37.6, 49.4); p.lineTo(35.4, 52.6);
            p.lineTo(24.6, 52.6); p.lineTo(22.4, 49.4); p.lineTo(22.4, 45.4); p.closePath(); },
            () => cut(g, 0.8, () => { g.lineWidth = 0.9; for (let x = 27.4; x < 33; x += 1.8) line(g, [x, 45.8, x, 48.6]); })));
        // legs: ankle, boot, shin, a big thigh shell with a round cap over the hip motor, and the
        // knee actuator on the inside of the knee
        sides(X => asm(0.65,
          B(p => rrect(p, L(X, 22.7, 2.4), 85.6, 2.4, 6, 0.6)),
          B(p => { p.moveTo(X(20.2), 95.4); p.lineTo(X(27.4), 95.4); p.bezierCurveTo(X(27.6), 93.2, X(26.6), 90.8, X(23.8), 90.6);
            p.bezierCurveTo(X(21), 90.8, X(20), 93.2, X(20.2), 95.4); p.closePath(); }, () => groove(94.1, X(20.6), X(27))),
          S(p => { p.moveTo(X(20.9), 67.4); p.lineTo(X(26.1), 67.4); p.bezierCurveTo(X(26.6), 72.4, X(25.8), 79.6, X(25.3), 86.4);
            p.lineTo(X(22.3), 86.4); p.bezierCurveTo(X(21.7), 79.6, X(20.4), 72.4, X(20.9), 67.4); p.closePath(); }),
          S(p => { p.moveTo(X(23.1), 48.4); p.bezierCurveTo(X(26.1), 48.4, X(27.3), 50.4, X(27.2), 53.6);
            p.bezierCurveTo(X(27.1), 58.6, X(26.5), 63.6, X(26.2), 68.6); p.lineTo(X(20.4), 68.6); p.bezierCurveTo(X(19.9), 63.6, X(18.9), 58.6, X(18.9), 53.6);
            p.bezierCurveTo(X(18.9), 50.4, X(20.1), 48.4, X(23.1), 48.4); p.closePath(); }, () => ring(X(23.1), 54.2, 2.6, 0.9)),
          motor(X(25.7), 69.2, 2.6)));
        // torso: a broad shell narrowing to the waist, side panels, a small mark, dimples, status lights
        asm(0.65, S(p => { p.moveTo(24, 18.6); p.lineTo(36, 18.6); p.bezierCurveTo(38.3, 18.6, 39.2, 19.6, 39.2, 22);
          p.bezierCurveTo(39.2, 27, 39.1, 30.5, 38.6, 33.5); p.bezierCurveTo(37.9, 38, 36.6, 41.6, 33.4, 41.6); p.lineTo(26.6, 41.6);
          p.bezierCurveTo(23.4, 41.6, 22.1, 38, 21.4, 33.5); p.bezierCurveTo(20.9, 30.5, 20.8, 27, 20.8, 22);
          p.bezierCurveTo(20.8, 19.6, 21.7, 18.6, 24, 18.6); p.closePath(); }, () => {
          g.lineWidth = 0.5; sides(X => line(g, [X(23.4), 23.2, X(23.5), 31]));
          poly(g, [28.9, 22.6, 31.1, 22.6, 30, 24.5]);
          [[26, 23.4], [34, 23.4], [27.6, 38.6], [32.4, 38.6]].forEach(([x, y]) => dot(g, x, y, 0.42));
          [28.6, 29.8, 31].forEach(y => dot(g, 37.4, y, 0.36));
        }));
        // neck and collar, and the head: a dark egg with a glowing ring round the glass face and a
        // light bar across the eyes
        asm(0.65, B(p => { p.moveTo(28.6, 13.6); p.lineTo(31.4, 13.6); p.lineTo(31.6, 16.4); p.bezierCurveTo(31.9, 17.5, 33.4, 18.1, 35, 18.4);
          p.lineTo(35, 19.4); p.lineTo(25, 19.4); p.lineTo(25, 18.4); p.bezierCurveTo(26.6, 18.1, 28.1, 17.5, 28.4, 16.4); p.closePath(); }),
          B(p => { p.moveTo(30, 1.8); p.bezierCurveTo(33.6, 1.8, 35.3, 4.1, 35.3, 7.5); p.bezierCurveTo(35.3, 11, 32.8, 14.8, 30, 14.8);
            p.bezierCurveTo(27.2, 14.8, 24.7, 11, 24.7, 7.5); p.bezierCurveTo(24.7, 4.1, 26.4, 1.8, 30, 1.8); p.closePath(); }, () => {
            const face = new Path2D(); face.moveTo(30, 3.9); face.bezierCurveTo(32.5, 3.9, 33.4, 5.2, 33.4, 7.5);
            face.bezierCurveTo(33.4, 10.6, 32.1, 13.2, 30, 13.2); face.bezierCurveTo(27.9, 13.2, 26.6, 10.6, 26.6, 7.5);
            face.bezierCurveTo(26.6, 5.2, 27.5, 3.9, 30, 3.9); face.closePath();
            cut(g, 0.3, () => g.fill(face));
            cut(g, 1, () => { g.lineWidth = 1.7; g.stroke(face); });
            cut(g, 1, () => { rr(g, 27.6, 6.5, 4.8, 1.6, 0.8); g.fill(); });
          }));
        // arms, hanging a little away from the body: shoulder cap, a dark band, upper arm, elbow
        // actuator, ribbed forearm, wrist housing, mitten hand
        sides(X => asm(0.35,
          S(p => capsule(p, X(16.8), 27.4, X(15.9), 33.6, 5, 4.8)),
          B(p => rrect(p, L(X, 14.1, 5.6), 26.6, 5.6, 1.5, 0.6)),
          S(p => ell(p, X(17), 22.6, 4.1, 4.2), () => ring(X(17), 22.6, 2.6, 0.85)),
          B(p => rrect(p, L(X, 13.1, 4.6), 37.6, 4.6, 3.4, 0.8), () => groove(39.3, X(13.3), X(17.5))),
          S(p => rrect(p, L(X, 12.85, 4.6), 40.8, 4.6, 6, 1.4)),
          motor(X(15.45), 35.4, 2.8),
          B(p => rrect(p, L(X, 13.6, 3), 46.6, 3, 1.6, 0.5)),
          B(p => { p.moveTo(X(13.3), 48); p.lineTo(X(16.5), 48); p.bezierCurveTo(X(17.3), 49.2, X(17.6), 50.8, X(17.3), 52.2);
            p.bezierCurveTo(X(17.1), 53.2, X(16.8), 53.6, X(16.7), 54.6); p.bezierCurveTo(X(16.6), 56.2, X(15.9), 57.6, X(15), 57.6);
            p.bezierCurveTo(X(14), 57.6, X(13.2), 56.6, X(13.1), 54.8); p.bezierCurveTo(X(12.9), 52.6, X(12.9), 49.8, X(13.3), 48); p.closePath(); })));

        // ground line, centre line and height dimension
        g.save(); g.globalAlpha = 0.6; g.lineWidth = 0.6; line(g, [14, 95.6, 46, 95.6]);
        g.globalAlpha = 0.45; g.lineWidth = 0.5; for (let x = 15; x < 46; x += 2.2) line(g, [x, 96, x - 1.6, 97.6]);
        g.globalAlpha = 0.5; g.lineWidth = 0.6; g.setLineDash([2.2, 1.6]);
        line(g, [30, 0, 30, 0.6]); line(g, [30, 53.4, 30, 99.6]); line(g, [37, 1.8, 59.4, 1.8]); line(g, [41.4, 95.4, 59.4, 95.4]);
        g.setLineDash([]); g.globalAlpha = 0.7; g.lineWidth = 0.75;
        line(g, [57, 1.8, 57, 95.4]); line(g, [55.7, 4.4, 57, 1.8, 58.3, 4.4]); line(g, [55.7, 92.8, 57, 95.4, 58.3, 92.8]);
        for (let y = 11.2; y < 93; y += 9.36) line(g, [56.1, y, 57.9, y]);
        g.restore();
      },
    },
    { // the Scouting fleur-de-lis: a tall centre petal, side petals curling out and back over,
      // a band across, and short stems below
      seed: [50, 62], outlineFirst: true,
      draw(g) {
        g.beginPath(); g.moveTo(42.5, 62); g.bezierCurveTo(36, 44, 41, 20, 50, 3); g.bezierCurveTo(59, 20, 64, 44, 57.5, 62); g.closePath(); g.fill();
        taper(g, [43, 59], [22, 58], [8, 42], [14, 28], 5.6, 4.2); taper(g, [14, 28], [19, 17], [31, 20], [29, 30], 4.2, 1.4);
        taper(g, [57, 59], [78, 58], [92, 42], [86, 28], 5.6, 4.2); taper(g, [86, 28], [81, 17], [69, 20], [71, 30], 4.2, 1.4);
        rr(g, 31, 57, 38, 9, 3); g.fill();
        poly(g, [45, 66, 55, 66, 52.5, 83, 50, 87, 47.5, 83]);
        taper(g, [44, 67], [37, 71], [30, 74], [24, 83], 3.6, 1.4); taper(g, [56, 67], [63, 71], [70, 74], [76, 83], 3.6, 1.4);
        cut(g, 0.45, () => { g.lineWidth = 1.8; line(g, [50, 15, 50, 55]); });
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

    const BRUSH = 95;        // px radius the pointer paints
    let pageOn = false;      // the page field: whether it is showing (see below)
    const LEVELS = 6;        // alpha buckets, so each frame is a handful of strokes
    let gap, w = 0, h = 0, dpr = 1, cols = 0, rows = 0, ink = new Float32Array(0);
    // The self-drawn stroke paints into its own layer: it glows, where a hand scratches a picture.
    let glow = new Float32Array(0);
    // The contact strip is a closing echo of the hero, so it runs well under it.
    const STRENGTH = kind === 'page' ? 0.5 : kind === 'band' ? 0.42 : 0.8;
    let visible = false, raf = 0, last = 0, t = 0, inkLive = false;
    let grow = 0;             // 0 to 1 as the shape swells in on first sight
    let ghost = null;         // a self-drawn stroke: the intro, then again when the page sits idle
    let idleAt = 0;           // time of the last real pointer or touch
    const hand = { x: null, y: null };

    // Picture state. box is where pictures go (null when there is no room beside the text).
    let box = null, pic = -1, typed = 0, shown = 0, doneAt = -1e9;
    // How much of the phrase has been typed, and when it started. A picture follows the typing but
    // never draws faster than DRAW ms, so a short word gets the same unhurried drawing as a long one.
    let charP = 0, phraseAt = 0;
    const DRAW = 1900;
    let S = null, O = null, R = null, W = null;   // coverage, reveal order, reveal now, blob hold-back
    let rect = null;          // where the current picture sits; tall pictures get a taller one

    function size() {
      const r = host.getBoundingClientRect();
      w = Math.round(r.width); h = Math.round(r.height);
      box = kind === 'hero' ? placeBox(r) : null;
      // Small dots throughout; finest where pictures are drawn, so they hold their detail.
      gap = box ? 7 : w < 600 ? 10 : 12;
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
      const mid = (top + bottom) / 2;
      const cy = Math.max(140 + s / 2, Math.min(mid, h - 90 - s / 2));
      return { x: cx - s / 2, y: cy - s / 2, s, avail, mid };
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

    // A square picture fills the box; a tall one stands as tall as the hero allows.
    function pictureRect(shape) {
      const pw = shape.w || 100, ph = shape.h || 100;
      if (pw === ph) return { x: box.x, y: box.y, w: box.s, h: box.s };
      const H = Math.min(h - 200, 720, box.avail * ph / pw), Wd = H * pw / ph;
      const cy = Math.max(120 + H / 2, Math.min(box.mid, h - 70 - H / 2));
      return { x: box.x + box.s / 2 - Wd / 2, y: cy - H / 2, w: Wd, h: H };
    }

    function buildPicture() {
      S = O = R = null; rect = null;
      if (!box || pic < 0) { clearing(); return; }
      const shape = PICTURES[pic], n = cols * rows, pw = shape.w || 100, ph = shape.h || 100;
      rect = pictureRect(shape);
      // Coverage per grid cell, sampled 4 x 4 inside it, so edges come out as smaller dots.
      const sub = gap / 4, mw = Math.ceil(rect.w / sub) + 8, mh = Math.ceil(rect.h / sub) + 8;
      const c = document.createElement('canvas'); c.width = mw; c.height = mh;
      const g = c.getContext('2d');
      g.translate(4, 4); g.scale((mh - 8) / ph, (mh - 8) / ph);
      g.fillStyle = g.strokeStyle = '#000';
      shape.draw(g);
      const img = g.getImageData(0, 0, mw, mh).data;
      S = new Float32Array(n); O = new Float32Array(n).fill(2); R = new Float32Array(n);
      // The blob gives way around the picture as well as around the spinner's spot.
      clearing();
      const rcx = rect.x + rect.w / 2, rcy = rect.y + rect.h / 2;
      const sx0 = rect.x + shape.seed[0] / pw * rect.w, sy0 = rect.y + shape.seed[1] / ph * rect.h;
      let maxd = 1;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i, x = i * gap, y = j * gap;
        const e = Math.hypot((x - rcx) / (rect.w / 2 + 70), (y - rcy) / (rect.h / 2 + 70));
        W[k] = Math.max(W[k], e < 0.85 ? 1 : e > 1.25 ? 0 : 1 - (e - 0.85) / 0.4);
        const px = Math.round((x - rect.x) / sub) + 4, py = Math.round((y - rect.y) / sub) + 4;
        if (px < 2 || py < 2 || px > mw - 3 || py > mh - 3) continue;
        let a = 0;
        for (let v = -2; v < 2; v++) for (let u = -2; u < 2; u++) a += img[((py + v) * mw + px + u) * 4 + 3];
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
      // Behind the whole page: big, slow shapes that wander the viewport, never covering much at once.
      if (kind === 'page') return [
        [w * (0.15 + 0.12 * Math.sin(s * 0.05)), h * (0.3 + 0.25 * Math.sin(s * 0.07)), m * 0.55],
        [w * (0.85 + 0.1 * Math.cos(s * 0.06)), h * (0.7 + 0.2 * Math.cos(s * 0.045)), m * 0.6],
        [w * (0.5 + 0.35 * Math.sin(s * 0.03 + 2)), h * (1.05 + 0.1 * Math.sin(s * 0.05)), m * 0.45],
      ];
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
      const ccx = rect ? rect.x + rect.w / 2 : box ? box.x + box.s / 2 : 0;
      const ccy = rect ? rect.y + rect.h / 2 : box ? box.y + box.s / 2 : 0;
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
              const shade = 0.84 + 0.16 * ((x - rect.x) + (y - rect.y)) / (rect.w + rect.h);
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
          // Over the picture the pointer only dents it a little; elsewhere it paints.
          const onPic = pv > 0.04;
          if (onPic) { v = Math.max(pv * (1 - 0.3 * Math.min(1, p)), q); }
          else { v = Math.max(v, pv) + p * (hold ? 1 - 0.85 * hold * W[k] : 1) + q; }
          if (v < 0.03) continue;
          v = Math.min(v, 1);
          // The picture and the spinner are the subject: solid dots whose area follows the ink,
          // like print halftone. The field around them stays in rings.
          const solid = onPic || (box && q > 0.25);
          const r = solid ? gap * 0.5 * Math.sqrt(v) : 0.6 + (maxR - 0.6) * v;
          const path = (solid ? picPaths : paths)[Math.min(LEVELS - 1, (v * LEVELS) | 0)];
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
      ctx.fillStyle = accent;
      picPaths.forEach((path, l) => {
        ctx.globalAlpha = 0.5 + 0.5 * ((l + 1) / LEVELS);
        ctx.fill(path);
      });
      ctx.globalAlpha = 1;
    }

    // Each cell eases toward how revealed it should be for the text typed so far.
    function stepPicture(dt) {
      if (!W) return;
      if (S) {
        const was = typed;
        typed = Math.min(charP, Math.max(0, (t - phraseAt) / DRAW));
        if (typed >= 1 && was < 1) doneAt = t;
        const P = typed * 1.12, ease = 1 - Math.pow(0.78, dt / 16.7);
        for (let k = 0; k < S.length; k++) {
          if (!S[k]) continue;
          const target = Math.max(0, Math.min(1, (P - O[k]) / 0.12));
          R[k] += (target - R[k]) * ease;
        }
      }
      // The blob gives way while the spinner runs and stays away for the whole cycle of phrases,
      // so the gap between two pictures is clean paper rather than a smudge swelling back in.
      const want = ghost || pic >= 0 ? 1 : 0;
      shown += (want - shown) * (1 - Math.pow(want ? 0.9 : 0.96, dt / 16.7));
    }

    // Paint along the segment since the last event, so a fast flick leaves a full stroke.
    function paint(x, y, from = hand, amt = 0.2, layer = ink, brush = BRUSH) {
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
      // The page field only drifts, so 20 frames a second is plenty, and a third of the work.
      if (kind === 'page' && last && now - last < 48) { raf = requestAnimationFrame(frame); return; }
      raf = -1;               // mid-frame: a paint from inside it must not schedule a second loop
      const dt = Math.min(kind === 'page' ? 120 : 64, now - (last || now));
      last = now;
      t += dt;
      if (grow < 1) grow = Math.min(1, grow + dt / 1400);
      if (kind === 'hero') {
        // With pictures on, they are the motion; the idle stroke would only crowd them.
        if (!ghost && !box && t - idleAt > 8000) startGhost(0.16);
        if (ghost) {
          // The loading spinner runs on the subtitle's clock (real time, not this loop's, which
          // stops while the hero is off screen), so it ends exactly when "Loading" does.
          const u = Math.min(1, ghost.sync ? (performance.now() - ghost.sync[0]) / ghost.sync[1] : (t - ghost.at) / ghost.dur);
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
        if (detail.index !== pic) { pic = detail.index; phraseAt = t; typed = 0; buildPicture(); }
        charP = detail.progress;
      });
      // The text box is measured, so measure again once the webfonts have settled its width.
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    }

    const local = (cx, cy) => { const r = host.getBoundingClientRect(); return [cx - r.left, cy - r.top]; };
    // A real hand takes over from the self-drawn stroke straight away.
    const touch = (x, y) => { ghost = null; idleAt = t; paint(...local(x, y)); };
    // The page field sits behind everything and takes no clicks, so it listens on the window;
    // it only paints while it is showing.
    const src = kind === 'page' ? window : host;
    const live = () => kind !== 'page' || pageOn;
    src.addEventListener('pointermove', e => { if (live()) touch(e.clientX, e.clientY); }, { passive: true });
    src.addEventListener('touchmove', e => { const p = e.touches[0]; if (live()) touch(p.clientX, p.clientY); }, { passive: true });
    const lift = () => { hand.x = hand.y = null; };
    src.addEventListener(kind === 'page' ? 'pointerout' : 'pointerleave', e => { if (kind !== 'page' || !e.relatedTarget) lift(); });
    src.addEventListener('touchend', lift, { passive: true });
    if (kind === 'page') addEventListener('scroll', lift, { passive: true });

    // The intro stroke on first sight. With pictures on it is the loading spinner and belongs to
    // the subtitle's "Loading": it plays only while that text is showing, so a hero first seen
    // later (after a reload half way down the page, say) never gets a spinner over a picture.
    function intro() {
      if (pic >= 0) return;
      if (!box) { startGhost(0.3); return; }
      const d = (document.getElementById('typed-text') || {}).dataset || {};
      const start = +d.loadingStart, total = +d.loadingMs;
      if (!total || performance.now() - start > total - 250) return;
      startGhost(0.3); ghost.sync = [start, total];
    }
    // The page field is fixed, so it is always "on screen"; it shows, and runs, only once the hero
    // is mostly scrolled away, fading in over the last part of it.
    if (kind === 'page') {
      const hero = document.querySelector('.hero');
      const onScroll = () => {
        const hh = hero ? hero.offsetHeight : innerHeight;
        const o = Math.max(0, Math.min(1, (scrollY - hh * 0.5) / (hh * 0.45)));
        host.style.opacity = o.toFixed(3);
        pageOn = o > 0; visible = pageOn;
        if (visible) kick();
      };
      addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    let seen = false;
    new IntersectionObserver(([e]) => {
      visible = kind === 'page' ? pageOn : e.isIntersecting;
      if (visible && !seen) { seen = true; if (kind === 'hero') intro(); }
      if (visible) kick();
    }).observe(host);
    new ResizeObserver(size).observe(host);
    document.addEventListener('visibilitychange', kick);
    reduce.addEventListener('change', kick);
    // Repaint now rather than on the next frame, so a theme swap never shows the old colour.
    fields.push(() => { draw(); kick(); });
  });
})();
