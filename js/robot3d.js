// The DECODE robot (FTC Team 369), drawn in dots and turning in 3D. The robot is built by hand
// from its photos as a cloud of surface points, each with a normal, an albedo and the part that
// moves it: 0 the chassis, 1 the turret, 2 the transfer, 3 the intake. Each frame the cloud is turned, the
// nearest point in every dot cell wins, and the cell prints as a dot: a light tone for the
// surface and heavy dots at silhouettes, creases and where one material meets another.
(function () {
  const host = document.querySelector('[data-robot3d]');
  if (!host || !window.HTMLCanvasElement) return;

  const Robot3D = (() => {
    const A = {              // albedo: how much light each material sends back (0 black .. 1 white)
      maroon: 0.3, silver: 0.8, grey: 0.55, dark: 0.18, black: 0.06, blue: 0.22, white: 1, tube: 0.78, amber: 0.74, steel: 0.62,
    };
    const TZ = 1.0;          // turret axis
    const IN = { y: 4.45, z: -9.1 };  // intake shaft, high across the front: balls go in under it
    const TR = { y: 5.6, z: -3.3 };   // transfer shaft, under the front of the turret
    const TT = 7.9;          // top of the turntable

    function build(step = 0.11) {
      const P = [];
      const add = (x, y, z, nx, ny, nz, a, f) => P.push(x, y, z, nx, ny, nz, a, f);

      // ── primitives ─────────────────────────────────────────────────────────────────────────
      function rect(o, u, v, n, a, f = 0, skip = null, both = false) {
        const lu = Math.hypot(...u), lv = Math.hypot(...v);
        const nu = Math.max(1, Math.ceil(lu / step)), nv = Math.max(1, Math.ceil(lv / step));
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
          const s = i / nu, t = j / nv;
          if (skip && skip(s * lu, t * lv)) continue;
          const x = o[0] + u[0] * s + v[0] * t, y = o[1] + u[1] * s + v[1] * t, z = o[2] + u[2] * s + v[2] * t;
          add(x, y, z, n[0], n[1], n[2], a, f);
          if (both) add(x, y, z, -n[0], -n[1], -n[2], a, f);
        }
      }
      function box(x0, x1, y0, y1, z0, z1, a, f = 0, faces = 'xXyYzZ') {
        if (faces.includes('x')) rect([x0, y0, z0], [0, 0, z1 - z0], [0, y1 - y0, 0], [-1, 0, 0], a, f);
        if (faces.includes('X')) rect([x1, y0, z0], [0, 0, z1 - z0], [0, y1 - y0, 0], [1, 0, 0], a, f);
        if (faces.includes('y')) rect([x0, y0, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], [0, -1, 0], a, f);
        if (faces.includes('Y')) rect([x0, y1, z0], [x1 - x0, 0, 0], [0, 0, z1 - z0], [0, 1, 0], a, f);
        if (faces.includes('z')) rect([x0, y0, z0], [x1 - x0, 0, 0], [0, y1 - y0, 0], [0, 0, -1], a, f);
        if (faces.includes('Z')) rect([x0, y0, z1], [x1 - x0, 0, 0], [0, y1 - y0, 0], [0, 0, 1], a, f);
      }
      // A cylinder from p0 to p1 of radius r, any direction; caps optional.
      function tube(p0, p1, r, a, f = 0, caps = false, capA = a) {
        const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], L = Math.hypot(...d);
        const w = d.map(v => v / L), h = Math.abs(w[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
        const u = [w[1] * h[2] - w[2] * h[1], w[2] * h[0] - w[0] * h[2], w[0] * h[1] - w[1] * h[0]];
        const ul = Math.hypot(...u); u[0] /= ul; u[1] /= ul; u[2] /= ul;
        const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
        const n = Math.max(8, Math.ceil(2 * Math.PI * r / step)), m = Math.max(1, Math.ceil(L / step));
        for (let i = 0; i < n; i++) {
          const t = i / n * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t);
          const nn = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
          for (let j = 0; j <= m; j++) {
            const k = j / m;
            add(p0[0] + d[0] * k + nn[0] * r, p0[1] + d[1] * k + nn[1] * r, p0[2] + d[2] * k + nn[2] * r, ...nn, a, f);
          }
        }
        if (!caps) return;
        const rings = Math.max(1, Math.ceil(r / step));
        for (const [p, sg] of [[p0, -1], [p1, 1]]) for (let q = 0; q <= rings; q++) {
          const rr = r * q / rings, cnt = Math.max(1, Math.ceil(2 * Math.PI * rr / step));
          for (let i = 0; i < cnt; i++) {
            const t = i / cnt * 2 * Math.PI, c = Math.cos(t) * rr, s = Math.sin(t) * rr;
            add(p[0] + u[0] * c + v[0] * s, p[1] + u[1] * c + v[1] * s, p[2] + u[2] * c + v[2] * s, w[0] * sg, w[1] * sg, w[2] * sg, capA, f);
          }
        }
      }
      // A flat plate in the plane x = const, cut to a polygon given in (z, y), minus holes.
      function plateX(x, poly, a, f = 0, hole = null) {
        let z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const [z, y] of poly) { z0 = Math.min(z0, z); z1 = Math.max(z1, z); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        for (let z = z0; z <= z1; z += step) for (let y = y0; y <= y1; y += step) {
          if (!inPoly(poly, z, y) || (hole && hole(z, y))) continue;
          add(x, y, z, 1, 0, 0, a, f); add(x, y, z, -1, 0, 0, a, f);
        }
      }
      function inPoly(poly, px, py) {
        let c = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i], [xj, yj] = poly[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
        }
        return c;
      }

      // ── chassis ────────────────────────────────────────────────────────────────────────────
      // Maroon side walls cut with clusters of lightening holes, an aluminium extrusion along the
      // top and bottom of each, a back wall, and an open front for the intake.
      const WALL0 = 0.9, WALL1 = 7.3;
      const wallHoles = (s, t) => {                    // s along the wall, t up it
        const H = WALL1 - WALL0;
        if (s < 0.55 || s > 17.45 || t < 0.5 || t > H - 0.45) return false;
        // a row of small holes under the top extrusion and above the bottom one
        if (t < 0.85 || t > H - 0.8) { const c = (s % 0.6) - 0.3; return c * c + ((t < 0.85 ? t - 0.67 : t - (H - 0.62)) ** 2) < 0.012; }
        // through the middle, diamond clusters of round holes on a 0.75" grid
        if (t < 1.3 || t > H - 1.2) return false;
        const gi = Math.round(s / 0.75), gj = Math.round((t - 1.3) / 0.75);
        const cx = s - gi * 0.75, cy = (t - 1.3) - gj * 0.75;
        const ci = ((gi % 6) + 6) % 6, cj = gj % 4;
        const inCluster = Math.abs(ci - 2.5) + Math.abs(cj - 1.5) < 2.6;
        return inCluster && cx * cx + cy * cy < 0.05;
      };
      for (const sx of [-1, 1]) {
        const x = 9 * sx;
        rect([x, WALL0, -9], [0, 0, 18], [0, WALL1 - WALL0, 0], [sx, 0, 0], A.maroon, 0, wallHoles);
        rect([x - sx * 0.2, WALL0, -9], [0, 0, 18], [0, WALL1 - WALL0, 0], [-sx, 0, 0], A.maroon, 0, wallHoles);
        box(Math.min(x, x + sx * 0.45), Math.max(x, x + sx * 0.45), 0.35, 0.95, -9.2, 9.2, A.silver);   // bottom extrusion
        box(Math.min(x, x + sx * 0.45), Math.max(x, x + sx * 0.45), 7.2, 7.75, -9.2, 9.2, A.silver);    // top extrusion
        // two grooves in each extrusion, so it reads as a profile
        rect([x + sx * 0.46, 0.62, -9.2], [0, 0, 18.4], [0, 0.06, 0], [sx, 0, 0], A.dark);
        rect([x + sx * 0.46, 7.45, -9.2], [0, 0, 18.4], [0, 0.06, 0], [sx, 0, 0], A.dark);
      }
      rect([-9, WALL0, 9], [18, 0, 0], [0, WALL1 - WALL0, 0], [0, 0, 1], A.maroon, 0, wallHoles);
      rect([-9, WALL0, 8.8], [18, 0, 0], [0, WALL1 - WALL0, 0], [0, 0, -1], A.maroon);
      box(-9.2, 9.2, 0.35, 0.95, 9.0, 9.45, A.silver, 0, 'yYZ');
      box(-9.2, 9.2, 7.2, 7.75, 9.0, 9.45, A.silver, 0, 'yYZ');

      // 369 number plate on the right wall, toward the back: blue, white seven-segment digits
      const seg = { a: [0, 1, 1, 1], b: [1, 1, 1, 0.5], c: [1, 0.5, 1, 0], d: [0, 0, 1, 0], e: [0, 0.5, 0, 0], f: [0, 1, 0, 0.5], g: [0, 0.5, 1, 0.5] };
      const digits = { 3: 'abgcd', 6: 'afgedc', 9: 'abcdfg' };
      const onDigit = (s, t) => {
        const W = 1.35, H = 2.1, gapW = 0.55, x0 = 0.5, y0 = 0.45;
        for (let k = 0; k < 3; k++) {
          const ox = x0 + k * (W + gapW);
          for (const sg of digits['369'[k]]) {
            const [a0, b0, a1, b1] = seg[sg];
            const ax = ox + a0 * W, ay = y0 + b0 * H, bx = ox + a1 * W, by = y0 + b1 * H;
            const q = Math.max(0, Math.min(1, ((s - ax) * (bx - ax) + (t - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
            if ((s - (ax + (bx - ax) * q)) ** 2 + (t - (ay + (by - ay) * q)) ** 2 < 0.045) return true;
          }
        }
        return false;
      };
      for (let s = 0; s <= 6.3; s += step * 0.6) for (let t = 0; t <= 3.0; t += step * 0.6) {
        const edge = s < 0.15 || s > 6.15 || t < 0.15 || t > 2.85;
        add(9.25, 2.6 + t, 1.4 + (6.3 - s), 1, 0, 0, edge ? A.silver : onDigit(s, t) ? A.white : A.blue, 0);
      }

      // deck, electronics and the turret's bearing column, seen over the walls
      rect([-8.8, 4.3, -5.4], [17.6, 0, 0], [0, 0, 14.2], [0, 1, 0], A.grey);
      box(-8.2, -4.0, 4.3, 4.95, 3.6, 8.3, A.silver);                     // control hub
      for (let i = 0; i < 6; i++) box(-7.9 + i * 0.62, -7.55 + i * 0.62, 4.95, 5.15, 3.9, 4.5, A.black);   // its ports
      box(4.6, 8.3, 4.3, 6.2, 2.4, 7.9, A.black);                         // battery
      tube([-8.3, 5.4, -3.6], [-5.6, 5.4, -3.6], 0.75, A.steel, 0, true, A.black);   // drive motors along the walls
      tube([8.3, 5.4, -3.6], [5.6, 5.4, -3.6], 0.75, A.steel, 0, true, A.black);
      tube([0, 4.3, TZ], [0, 7.5, TZ], 3.2, A.dark, 0, false);             // turret bearing column

      // ── transfer ───────────────────────────────────────────────────────────────────────────
      // Under the front of the turret, behind the clear plate: a grey shaft with wider grey collars;
      // through each collar go two straight lengths of surgical tubing at right angles, a "+", each
      // cross turned 45 degrees from the next, so they read as alternating X's. Each arm has a fat
      // bulge partway out. It spins (part 2).
      tube([-4.3, TR.y, TR.z], [4.3, TR.y, TR.z], 0.3, A.grey, 2, true, A.silver);
      for (let i = 0; i < 5; i++) {
        const x = -3.6 + i * 1.8;
        tube([x - 0.24, TR.y, TR.z], [x + 0.24, TR.y, TR.z], 0.5, A.grey, 2, true, A.grey);     // collar
        for (const ph of [i * Math.PI / 4, i * Math.PI / 4 + Math.PI / 2]) {
          const dy = Math.cos(ph), dz = Math.sin(ph), P = (r) => [x, TR.y + dy * r, TR.z + dz * r];
          for (const sg of [-1, 1]) {
            tube(P(sg * 0.4), P(sg * 0.75), 0.15, A.tube, 2);
            tube(P(sg * 0.75), P(sg * 1.35), 0.22, A.tube, 2, true);                          // the bulge
            tube(P(sg * 1.35), P(sg * 1.85), 0.15, A.tube, 2, true);
          }
        }
      }
      for (const x of [-4.55, 4.55]) plateX(x, [[-5.4, 3.5], [-1.2, 3.5], [-1.2, 7.4], [-4.6, 7.4], [-5.4, 6.2]], A.grey);   // its side guides

      // ── intake ─────────────────────────────────────────────────────────────────────────────
      // Surgical tubing stretched the full width between a hub at each end of a shaft: a cage
      // roller across the front, high enough that balls are pulled in underneath it. On the robot
      // it spins fast enough to look like a solid gold cylinder; here it turns slowly enough to see
      // the tubes (part 3).
      tube([-8.7, IN.y, IN.z], [8.7, IN.y, IN.z], 0.25, A.steel, 3, true);
      for (const x of [-8.35, 8.35]) tube([x - 0.2, IN.y, IN.z], [x + 0.2, IN.y, IN.z], 1.3, A.dark, 3, true, A.dark);
      // the tubing as it looks running: a smooth amber cylinder, each tube a darker stripe on it
      {
        const R = 1.15, n = Math.ceil(2 * Math.PI * R / step);
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
          const stripe = Math.abs(((a / (Math.PI * 2 / 10)) % 1) - 0.5) > 0.37;
          for (let x = -8.15; x <= 8.15; x += step) add(x, IN.y + c * R, IN.z + sn * R, 0, c, sn, stripe ? A.black : A.amber, 3);
        }
      }
      // bearing plates holding the intake shaft, and a ramp from the intake up to the transfer
      for (const sx of [-1, 1]) plateX(8.75 * sx, [[-10.3, 3.2], [-6.0, 3.2], [-6.0, 6.0], [-9.6, 6.0], [-10.3, 5.3]], A.silver, 0,
        (z, y) => (z - IN.z) ** 2 + (y - IN.y) ** 2 < 0.25 || ((z + 7.0) ** 2 + (y - 4.0) ** 2 < 0.15));
      rect([-8.6, 1.0, -5.4], [17.2, 0, 0], [0, 3.3, 3.0], [0, 0.67, -0.74], A.grey);
      // the perforated channel across the top of the front, with a white label on it
      {
        const holes = (s, t) => { const cx = (s % 0.63) - 0.315, cy = t - 0.75; return cx * cx + cy * cy < ((Math.floor(s / 0.63) % 2) ? 0.06 : 0.025); };
        rect([-9.2, 6.0, -9.25], [18.4, 0, 0], [0, 1.5, 0], [0, 0, -1], A.silver, 0, (s, t) => holes(s, t) || (s > 11.2 && s < 13.6 && t > 0.3 && t < 1.2));
        rect([-9.2 + 11.2, 6.3, -9.27], [2.4, 0, 0], [0, 0.9, 0], [0, 0, -1], A.white);
        box(-9.2, 9.2, 7.5, 7.6, -9.25, -7.8, A.silver, 0, 'yY');
        box(-9.2, 9.2, 5.9, 6.0, -9.25, -7.8, A.silver, 0, 'yY');
      }

      // ── turret ─────────────────────────────────────────────────────────────────────────────
      // A geared turntable; two maroon truss plates; a flywheel on an axle across the middle with
      // a motor on each end outside the plates; a ribbed silver hood wrapping round the back of the
      // wheel and over it to a black exit frame, with a maroon cage behind it; a perforated
      // channel across the front; the Limelight 3A on top, facing the way it shoots.
      const T = (z) => z + TZ;
      tube([0, TT - 0.4, TZ], [0, TT, TZ], 5.3, A.silver, 1, true, A.silver);
      for (let i = 0; i < 84; i++) {                                   // gear teeth round the rim
        const t = i / 84 * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        const r0 = 5.3, r1 = 5.55, hw = 0.1;
        const o = [c * r0, TT - 0.35, TZ + s * r0];
        rect([o[0] - s * hw, o[1], o[2] + c * hw], [c * (r1 - r0), 0, s * (r1 - r0)], [0, 0.3, 0], [s, 0, -c], A.silver, 1);
        rect([o[0] + s * hw, o[1], o[2] - c * hw], [c * (r1 - r0), 0, s * (r1 - r0)], [0, 0.3, 0], [-s, 0, c], A.silver, 1);
        rect([c * r1 - s * hw, TT - 0.35, TZ + s * r1 + c * hw], [2 * s * hw, 0, -2 * c * hw], [0, 0.3, 0], [c, 0, s], A.steel, 1);
      }
      const AXY = TT + 4.0, AXZ = T(0);                                 // flywheel axle
      const R = 5.0, TH0 = -50 * Math.PI / 180, TH1 = 72 * Math.PI / 180, HW = 2.9;
      const at = (r, th) => [AXZ + Math.cos(th) * r, AXY + Math.sin(th) * r];   // th from back (+z) toward up

      // the hood: shell, ribs on the inside, rims on both edges
      for (let th = TH0; th <= TH1; th += step / R) {
        const c = Math.cos(th), s = Math.sin(th);
        for (let x = -HW; x <= HW + 1e-6; x += step) {
          add(x, AXY + s * R, AXZ + c * R, 0, -s, -c, A.silver, 1);                     // inside
          add(x, AXY + s * (R + 0.2), AXZ + c * (R + 0.2), 0, s, c, A.grey, 1);         // outside
        }
      }
      for (let th = TH0 + 0.12; th < TH1 - 0.05; th += 0.95 / R) {          // a rib every 0.95"
        const c = Math.cos(th), s = Math.sin(th), w = 0.11 / R, h = 0.3;
        for (let x = -HW; x <= HW; x += step) {
          for (let r = R - h; r <= R; r += step * 0.6) {
            add(x, AXY + Math.sin(th - w) * r, AXZ + Math.cos(th - w) * r, 0, Math.cos(th), -Math.sin(th), A.steel, 1);
            add(x, AXY + Math.sin(th + w) * r, AXZ + Math.cos(th + w) * r, 0, -Math.cos(th), Math.sin(th), A.steel, 1);
          }
          add(x, AXY + s * (R - h), AXZ + c * (R - h), 0, -s, -c, A.white, 1);
        }
      }
      for (const sx of [-1, 1]) for (let th = TH0; th <= TH1; th += step / R) for (let r = R - 0.6; r <= R + 0.35; r += step) {
        add(sx * (HW + 0.12), AXY + Math.sin(th) * r, AXZ + Math.cos(th) * r, sx, 0, 0, A.silver, 1);
        add(sx * (HW - 0.02), AXY + Math.sin(th) * r, AXZ + Math.cos(th) * r, -sx, 0, 0, A.silver, 1);
      }
      // maroon lattice cage on the back of the hood: curved ribs, and cross braces between them
      for (const xr of [-2.55, 0, 2.55]) for (let th = TH0 + 0.05; th <= TH1 - 0.02; th += step / (R + 0.6)) {
        const c = Math.cos(th), s = Math.sin(th);
        for (let r = R + 0.2; r <= R + 0.9; r += step) for (const sg of [-1, 1])
          add(xr + sg * 0.14, AXY + s * r, AXZ + c * r, sg, 0, 0, A.maroon, 1);
        for (let x = -0.14; x <= 0.14; x += step * 0.7) add(xr + x, AXY + s * (R + 0.9), AXZ + c * (R + 0.9), 0, s, c, A.maroon, 1);
      }
      for (let k = 0; k < 6; k++) {                                       // diagonal braces, alternating
        const th0 = TH0 + 0.12 + k * (TH1 - TH0 - 0.3) / 6, th1 = th0 + (TH1 - TH0 - 0.3) / 6;
        for (const [xa, xb] of [[-2.55, 0], [0, 2.55]]) {
          const flip = (k + (xa < 0 ? 0 : 1)) % 2;
          const tA = flip ? th1 : th0, tB = flip ? th0 : th1, rr = R + 0.62;
          tube([xa, AXY + Math.sin(tA) * rr, AXZ + Math.cos(tA) * rr], [xb, AXY + Math.sin(tB) * rr, AXZ + Math.cos(tB) * rr], 0.13, A.maroon, 1);
        }
      }
      // the hood's end at the top, square to the shot: a silver plate with a dark opening the ball
      // leaves through, and two white guides standing off it
      {
        const c = Math.cos(TH1), s = Math.sin(TH1), tz = -s, ty = c;
        for (let r = R - 3.0; r <= R + 0.4; r += step * 0.7) for (let x = -3.1; x <= 3.1; x += step * 0.7) {
          const open = Math.abs(x) < 1.3 && r > R - 2.5 && r < R - 0.45;
          const a = open ? A.black : A.silver;
          add(x, AXY + s * r, AXZ + c * r, 0, ty, tz, a, 1);
          add(x, AXY + s * r - ty * 0.5, AXZ + c * r - tz * 0.5, 0, -ty, -tz, A.silver, 1);
        }
        for (const sx of [-1, 1]) for (let r = R - 3.0; r <= R + 0.4; r += step * 0.7) for (let q = 0; q <= 0.5; q += step * 0.7)
          add(sx * 3.1, AXY + s * r - ty * q, AXZ + c * r - tz * q, sx, 0, 0, A.silver, 1);
        for (const sx of [-1, 1]) {
          const [z0, y0] = at(R + 0.4, TH1);
          box(sx * 2.15 - 0.17, sx * 2.15 + 0.17, y0 - 0.3, y0 + 1.6, z0 - 0.45, z0 - 0.1, A.white, 1);
        }
      }
      // flywheel: two wheels with black treads and silver hubs, on a steel axle
      for (const [x0, x1] of [[-1.45, -0.12], [0.12, 1.45]]) {
        tube([x0, AXY, AXZ], [x1, AXY, AXZ], 1.9, A.black, 1, true, A.dark);
        tube([x0 - 0.02, AXY, AXZ], [x1 + 0.02, AXY, AXZ], 0.95, A.silver, 1, true, A.silver);
      }
      tube([-3.6, AXY, AXZ], [3.6, AXY, AXZ], 0.28, A.steel, 1, true);
      // truss side plates, the axle through them, and a motor outboard of each
      const tri = (pts) => (z, y) => inPoly(pts.map(([a, b]) => [T(a), TT + b]), z, y);
      const pockets = [
        tri([[-3.0, 0.6], [-0.7, 0.6], [-3.0, 3.0]]), tri([[0.4, 0.6], [4.2, 0.6], [4.2, 2.6]]),
        tri([[1.3, 2.4], [4.1, 3.7], [2.7, 6.3]]), tri([[-2.4, 4.8], [-1.1, 5.4], [-0.7, 6.9]]),
        tri([[0.7, 5.4], [2.2, 6.5], [0.4, 7.0]]),
      ];
      const plateHole = (z, y) => pockets.some(p => p(z, y)) || (z - AXZ) ** 2 + (y - AXY) ** 2 < 0.36;
      const plate = [[-3.6, 0], [4.8, 0], [4.8, 3.2], [2.9, 7.2], [-0.2, 7.6], [-2.7, 5.9], [-3.6, 3.6]].map(([a, b]) => [T(a), TT + b]);
      for (const sx of [-1, 1]) {
        plateX(sx * 3.45, plate, A.maroon, 1, plateHole);
        box(sx > 0 ? 3.55 : -4.45, sx > 0 ? 4.45 : -3.55, AXY - 0.85, AXY + 0.85, AXZ - 0.85, AXZ + 0.85, A.grey, 1);   // gearbox
        tube([sx * 4.45, AXY, AXZ], [sx * 6.5, AXY, AXZ], 0.75, A.steel, 1, true, A.dark);                  // motor can
        tube([sx * 6.5, AXY, AXZ], [sx * 7.15, AXY, AXZ], 0.8, A.black, 1, true, A.black);                  // encoder cap
        box(sx > 0 ? 3.55 : -4.25, sx > 0 ? 4.25 : -3.55, AXY - 2.4, AXY - 1.3, AXZ - 0.6, AXZ + 0.6, A.maroon, 1);  // bearing block
      }
      // the perforated channel across the front of the turret, and the stop block under it
      {
        const z0 = T(-2.45);
        const holes = (s, t) => { const cx = (s % 0.63) - 0.315, cy = t - 0.75; return cx * cx + cy * cy < ((Math.floor(s / 0.63) % 3 === 1) ? 0.07 : 0.022); };
        rect([-3.45, TT + 1.6, z0], [6.9, 0, 0], [0, 1.5, 0], [0, 0, -1], A.silver, 1, holes);
        box(-3.45, 3.45, TT + 1.5, TT + 1.6, z0, z0 + 0.6, A.silver, 1, 'yY');
        box(-3.45, 3.45, TT + 3.1, TT + 3.2, z0, z0 + 0.6, A.silver, 1, 'yY');
        box(-1.6, 1.6, TT, TT + 1.0, T(-3.4), T(-2.45), A.maroon, 1);
      }
      // Limelight 3A: a flat black anodised box, 2.84 x 1.89 x 0.66 in, its round lens centred
      // across and a little above middle, two small status windows beside it, holes in the
      // corners. On a bracket on top of the exit frame, lens forward.
      {
        const [fz, fy] = at(R + 0.4, TH1);
        const W = 2.84 * 1.2, H = 1.89 * 1.2, D = 0.66 * 1.2, y0 = fy + 0.15, z1 = fz - 0.2, z0 = z1 - D;
        box(-0.3, 0.3, fy - 0.2, y0, z1 - 0.5, z1, A.silver, 1);                 // bracket
        box(-W / 2, W / 2, y0, y0 + H, z0, z1, A.black, 1, 'xXyYZ');
        const lx = 0, ly = y0 + H * 0.6, face = z0;
        for (let x = -W / 2; x <= W / 2; x += step * 0.6) for (let y = y0; y <= y0 + H; y += step * 0.6) {
          const dl = Math.hypot(x - lx, y - ly);
          if (dl < 0.38) continue;                                                 // the lens boss sits here
          const corner = [[-1, -1], [1, -1], [-1, 1], [1, 1]].some(([cx, cy]) => Math.hypot(x - cx * (W / 2 - 0.2), y - (y0 + H / 2 + cy * (H / 2 - 0.2))) < 0.11);
          const status = Math.hypot(x - 0.55, y - (ly + 0.12)) < 0.07 || Math.hypot(x - 0.55, y - (ly - 0.25)) < 0.07;
          add(x, y, face, 0, 0, -1, corner ? A.dark : status ? A.white : A.black, 1);
        }
        tube([lx, ly, face], [lx, ly, face - 0.16], 0.38, A.dark, 1, false);       // lens boss
        for (let r = 0; r <= 0.38; r += step * 0.4) for (let a = 0; a < Math.PI * 2; a += step * 0.5 / Math.max(r, 0.05))
          add(lx + Math.cos(a) * r, ly + Math.sin(a) * r, face - 0.16, 0, 0, -1, r > 0.29 ? A.silver : r > 0.12 ? A.black : A.blue, 1);
      }

      return { pts: new Float32Array(P), TZ, IN, TR, height: 20 };
    }

    return { build, A };
  })();

  // Turn the point cloud, keep the nearest point per dot cell, then print: a light halftone tone
  // for each surface and strong dots at silhouettes, creases and material changes.
  // The model's projected extent over a full turn, so it is framed once and never jumps.
  // A miniature DECODE goal in front of the robot, fixed to the view rather than the robot, so
  // the turret has something to lock onto while the robot turns. A blue wedge, its sloped face
  // toward the robot carrying an AprilTag, a dark basket opening on top. Points: x, y, z in view
  // space before the tilt, then the normal, then albedo.
  const GOAL = { x: 8.5, z: 13.5 };
  function buildGoal(step) {
    const P = [], add = (x, y, z, nx, ny, nz, a) => P.push(x, y, z, nx, ny, nz, a);
    const ux = -GOAL.x, uz = -GOAL.z, ul = Math.hypot(ux, uz), u = [ux / ul, uz / ul], r = [-u[1], u[0]];
    const W = 7, D = 5, Hh = 7.5, SL = 1.6;                      // across, deep, tall, how far the face leans
    const at = (a, b, y) => [GOAL.x + r[0] * a - u[0] * b, y, GOAL.z + r[1] * a - u[1] * b];
    const blue = 0.24, black = 0.05, white = 1;
    const tag = ['10110100', '01001101', '11010010', '00101101', '10110010', '01101001'];   // 6 x 6 inner bits, padded
    // sloped front face, with the tag on its upper half
    const fl = Math.hypot(SL, Hh), fn = [u[0] * Hh / fl, SL / fl, u[1] * Hh / fl];
    for (let a = -W / 2; a <= W / 2 + 1e-6; a += step) for (let q = 0; q <= 1 + 1e-6; q += step / fl) {
      let al = blue;
      const ta = (a + 1.7) / 3.4, tq = (q - 0.42) / (3.4 / fl);
      if (ta >= 0 && ta < 1 && tq >= 0 && tq < 1) {
        const ci = Math.floor(ta * 8), cj = 7 - Math.floor(tq * 8);
        al = ci === 0 || cj === 0 || ci === 7 || cj === 7 ? black : tag[cj - 1][ci - 1] === '1' ? white : black;
      }
      add(...at(a, q * SL, q * Hh), ...fn, al);
    }
    // top, with the basket opening
    for (let a = -W / 2; a <= W / 2 + 1e-6; a += step) for (let b = SL; b <= D + 1e-6; b += step)
      add(...at(a, b, Hh), 0, 1, 0, Math.abs(a) < W / 2 - 0.8 && b > SL + 0.6 && b < D - 0.6 ? black : blue);
    // the two sides, and the back
    for (const sg of [-1, 1]) for (let b = 0; b <= D + 1e-6; b += step) for (let y = 0; y <= Hh + 1e-6; y += step) {
      if (b < y / Hh * SL) continue;
      add(...at(sg * W / 2, b, y), r[0] * sg, 0, r[1] * sg, blue);
    }
    for (let a = -W / 2; a <= W / 2 + 1e-6; a += step) for (let y = 0; y <= Hh + 1e-6; y += step)
      add(...at(a, D, y), -u[0], 0, -u[1], blue);
    return { pts: new Float32Array(P), aim: at(0, (SL + D) / 2, Hh) };
  }

  function fitRobot(model, pitch, f = 60) {
    const P = model.pts, cp = Math.cos(pitch), sp = Math.sin(pitch);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let a = 0; a < 16; a++) {
      const yaw = a / 16 * Math.PI * 2, c = Math.cos(yaw), s = Math.sin(yaw);
      for (let i = 0; i < P.length; i += 8 * 37) {
        const x = P[i], y = P[i + 1] - 9.6, z = P[i + 2];
        const X = x * c - z * s, Z1 = x * s + z * c, Y = y * cp - Z1 * sp, Z = y * sp + Z1 * cp, k = f / (f - Z);
        x0 = Math.min(x0, X * k); x1 = Math.max(x1, X * k); y0 = Math.min(y0, -Y * k); y1 = Math.max(y1, -Y * k);
      }
    }
    if (model.goal) for (let i = 0; i < model.goal.pts.length; i += 7 * 5) {
      const G = model.goal.pts, y = G[i + 1] - 9.6, Y = y * cp - G[i + 2] * sp, Z = y * sp + G[i + 2] * cp, k = f / (f - Z);
      x0 = Math.min(x0, G[i] * k); x1 = Math.max(x1, G[i] * k); y0 = Math.min(y0, -Y * k); y1 = Math.max(y1, -Y * k);
    }
    return { w: x1 - x0 + 1.2, h: y1 - y0 + 1.2, mx: (x0 + x1) / 2, my: (y0 + y1) / 2 };
  }
  function render(ctx, W, H, model, o) {
    const { yaw, pitch, tyaw, spin = 0, ispin = spin, gap, color, zoom = 1 } = o;
    const cols = Math.ceil(W / gap) + 1, rows = Math.ceil(H / gap) + 1, n = cols * rows;
    const depth = new Float32Array(n).fill(-1e9), tone = new Float32Array(n);
    const NX = new Float32Array(n), NY = new Float32Array(n), NZ = new Float32Array(n), AL = new Float32Array(n), MY = new Float32Array(n);
    const fit = o.fit || (o.fit = fitRobot(model, pitch));
    const f = 60, scale = Math.min(W / fit.w, H / fit.h) * zoom, cx = W / 2 - fit.mx * scale, cy = H / 2 - fit.my * scale;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const ct = Math.cos(tyaw), st = Math.sin(tyaw), cs2 = Math.cos(spin), ss2 = Math.sin(spin), cs3 = Math.cos(ispin), ss3 = Math.sin(ispin);
    const TZ = model.TZ;
    const L = [-0.5, 0.72, 0.48], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    function splat(x1, y, z1, mx, ny, mz, albedo, height) {
      const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const my = ny * cp - mz * sp, mz2 = ny * sp + mz * cp;
      if (mz2 < -0.05) return;
      const k = f / (f - z2), sx = cx + x1 * scale * k, sy = cy - y1 * scale * k;
      const gx = Math.round(sx / gap), gy = Math.round(sy / gap);
      if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;
      const c = gy * cols + gx;
      if (z2 <= depth[c]) return;
      depth[c] = z2; NX[c] = mx; NY[c] = my; NZ[c] = mz2; AL[c] = albedo; MY[c] = height;
      const b = Math.max(0, mx * L[0] + my * L[1] + mz2 * L[2]);
      tone[c] = 0.04 + 0.3 * (1 - albedo) * (0.6 + 0.4 * (1 - b)) + 0.08 * (1 - b);
    }
    const P = model.pts;
    for (let i = 0; i < P.length; i += 8) {
      let x = P[i], y = P[i + 1], z = P[i + 2], nx = P[i + 3], ny = P[i + 4], nz = P[i + 5];
      const part = P[i + 7];
      if (part === 1) {
        const zz = z - TZ, x2 = x * ct - zz * st; z = x * st + zz * ct + TZ; x = x2;
        const n2 = nx * ct - nz * st; nz = nx * st + nz * ct; nx = n2;
      } else if (part >= 2) {
        const ax = part === 2 ? model.TR : model.IN, cs = part === 2 ? cs2 : cs3, ss = part === 2 ? ss2 : ss3;
        const yy = y - ax.y, zz = z - ax.z, y2 = yy * cs - zz * ss; z = yy * ss + zz * cs + ax.z; y = y2 + ax.y;
        const n2 = ny * cs - nz * ss; nz = ny * ss + nz * cs; ny = n2;
      }
      splat(x * cyw - z * syw, y - 9.6, x * syw + z * cyw, nx * cyw - nz * syw, ny, nx * syw + nz * cyw, P[i + 6], P[i + 1]);
    }
    if (model.goal) {
      const G = model.goal.pts;
      for (let i = 0; i < G.length; i += 7) splat(G[i], G[i + 1] - 9.6, G[i + 2], G[i + 3], G[i + 4], G[i + 5], G[i + 6], G[i + 1]);
    }
    const out = new Float32Array(tone);
    for (let gy = 1; gy < rows - 1; gy++) for (let gx = 1; gx < cols - 1; gx++) {
      const c = gy * cols + gx; if (depth[c] < -1e8) continue;
      let e = 0;
      for (const q of [c - 1, c + 1, c - cols, c + cols]) {
        if (depth[q] < -1e8) { e = 1; break; }
        if (depth[c] - depth[q] > 0.7) { e = Math.max(e, 0.95); continue; }
        if (Math.abs(depth[c] - depth[q]) > 0.7) continue;
        if (NX[c] * NX[q] + NY[c] * NY[q] + NZ[c] * NZ[q] < 0.8) e = Math.max(e, 0.82);
        if (Math.abs(AL[c] - AL[q]) > 0.15) e = Math.max(e, 0.72);
      }
      if (e) out[c] = Math.max(out[c], e);
    }
    // Dots never touch (radius tops out short of half the spacing), so it always reads as dots.
    // With o.collect it hands back the dots, each with the height of the part it shows, instead
    // of drawing them.
    const LV = 5, list = o.collect ? [] : null, paths = list ? null : Array.from({ length: LV }, () => new Path2D());
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
      const c = gy * cols + gx, v = out[c]; if (v < 0.07) continue;
      const r = gap * 0.4 * Math.sqrt(Math.min(1, v)), x = gx * gap, y = gy * gap, l = Math.min(LV - 1, (v * LV) | 0);
      if (list) { list.push([x, y, r, l, MY[c]]); continue; }
      paths[l].moveTo(x + r, y); paths[l].arc(x, y, r, 0, Math.PI * 2);
    }
    if (list) return list;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color;
    paths.forEach((p, l) => { ctx.globalAlpha = 0.28 + 0.72 * ((l + 1) / LV) ** 1.3; ctx.fill(p); });
    ctx.globalAlpha = 1;
  }

  // ── motion ───────────────────────────────────────────────────────────────────────────────
  // The first time the card is on screen the canvas is empty, and the robot assembles: every dot
  // of its first frame flows in on a curve, the base first and the Limelight last. Where the
  // practice clip sits right above, a dotted arrow first draws itself out of the clip, the dots
  // pour from its tip, and once the robot is whole the arrow dissolves into it. Elsewhere (on
  // phones the model sits after the bullets) the dots swirl in from all round instead.
  // Then it comes alive. The base turns slowly (or follows a drag); the turret holds its aim on a
  // fixed "goal" direction, the way the robot's vision tracking does, and when it runs out of
  // travel it swings round the other way; the transfer and the intake spin.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'robot3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const root = document.documentElement;
  let color = '';
  let paper = '#fff';
  const readColor = () => { const cs = getComputedStyle(root); color = cs.getPropertyValue('--accent').trim() || '#888'; paper = cs.getPropertyValue('--bg').trim() || '#fff'; };
  readColor();

  const PITCH = 0.3, AUTO = 0.32, BUILD = 3.0, FLIGHT = 0.95;
  // The turret's travel: 340 degrees, a 20 degree dead zone straight behind it.
  const LIMIT = (170 / 180) * Math.PI;
  // What it locks onto: the miniature goal, or with no goal, a fixed bearing a little off
  // straight at the viewer, so the shooter shows three quarters on.
  // (the goal is still being modelled; ?r3=goal previews it)
  const WITH_GOAL = new URLSearchParams(location.search).get('r3') === 'goal';
  const FACE = Math.PI - 0.42;
  let model = null, fitBox = null, W = 0, H = 0, dpr = 1, gap = 2;
  let visible = false, raf = 0, last = 0, t = 0;
  let stage = 'wait', flock = null, bt = 0, arrow = null;
  let yaw = Math.PI - 0.7, vel = 0, tyaw = 0, tvel = 0, spin = 0, ispin = 0;
  let drag = null, slow = 0;

  const opts = (extra) => ({ yaw, pitch: PITCH, tyaw, spin, ispin, gap, color, fit: fitBox, ...extra });
  function size() {
    W = Math.round(host.clientWidth); H = Math.round(W * 0.84);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    gap = dpr >= 2 ? 2.3 : 2.7;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    if (stage === 'build') { dropArrow(); flock = makeFlock(null); }
    if (stage === 'live') paint();
  }
  function paint() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render(ctx, W, H, model, opts());
  }

  // The dots of the first frame, each given a start, a bend and a moment to set off: lower parts
  // first, with some scatter, so it fills in like a crowd rather than a scan line. From the arrow
  // they leave its tip and fan out to their places; otherwise they start outside the frame and
  // all come in on the same swirl.
  const POUR = 0.55;                                // the arrow has drawn itself by then
  const ARROW_UNTIL = 1.5;                          // and starts dissolving here, mid-build
  function makeFlock(tip) {
    const dots = render(null, W, H, model, opts({ collect: true }));
    let y0 = 1e9, y1 = -1e9;
    for (const d of dots) { y0 = Math.min(y0, d[4]); y1 = Math.max(y1, d[4]); }
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H) * 0.6;
    return dots.map(([x, y, r, l, my]) => {
      const at = (my - y0) / (y1 - y0 || 1) * (BUILD - FLIGHT - 0.3) + Math.random() * 0.3;
      if (tip) {
        const dx = x - tip[0], dy = y - tip[1], len = Math.hypot(dx, dy) || 1, bend = (Math.random() - 0.5) * 0.8 * len;
        return { x, y, r, l, sx: tip[0] + (Math.random() - 0.5) * 3, sy: tip[1] + (Math.random() - 0.5) * 3,
          qx: tip[0] + dx * 0.45 - dy / len * bend, qy: tip[1] + dy * 0.45 + dx / len * bend, at: POUR + at };
      }
      const a = Math.random() * Math.PI * 2, rr = R * (0.9 + Math.random() * 0.45);
      const b = a + 1.25, cr = rr * 0.5;
      return { x, y, r, l, sx: cx + Math.cos(a) * rr, sy: cy + Math.sin(a) * rr,
        qx: cx + Math.cos(b) * cr, qy: cy + Math.sin(b) * cr, at };
    });
  }
  function drawFlock() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const LV = 5, paths = Array.from({ length: LV }, () => new Path2D());
    let done = true;
    for (const d of flock) {
      let u = (bt - d.at) / FLIGHT;
      if (u < 1) done = false;
      if (u <= 0) continue;
      u = Math.min(1, u);
      const e = 1 - Math.pow(1 - u, 3), m = 1 - e;
      const x = m * m * d.sx + 2 * e * m * d.qx + e * e * d.x, y = m * m * d.sy + 2 * e * m * d.qy + e * e * d.y;
      const r = d.r * (0.45 + 0.55 * e);
      paths[d.l].moveTo(x + r, y); paths[d.l].arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = color;
    paths.forEach((p, l) => { ctx.globalAlpha = 0.28 + 0.72 * ((l + 1) / LV) ** 1.3; ctx.fill(p); });
    ctx.globalAlpha = 1;
    return done;
  }

  // ── the arrow ──────────────────────────────────────────────────────────────────────────
  // A dotted arrow that never crosses the clip: it starts at the clip's left edge level with the
  // robot (which sits shooting on the left), runs down the gutter beside the clip and the caption,
  // and sweeps into the drawing. It draws on like a pen, pulses while the dots pour, and dissolves
  // from the robot end soon after, without waiting for the drawing to finish.
  const START_Y = 0.6;                    // the robot's height in the clip frame
  const body = host.parentElement, clip = body.querySelector('.timeline-video-wrap');
  function makeArrow() {
    if (!clip) return null;
    const b = body.getBoundingClientRect(), c = clip.getBoundingClientRect(), m = canvas.getBoundingClientRect();
    const across = Math.min(c.right, m.right) - Math.max(c.left, m.left);
    // only where the drawing sits right under the clip, with a gutter to its left to run down
    if (m.top - c.bottom < 0 || m.top - c.bottom > 160 || across < m.width * 0.5 || c.left - b.left < 30) return null;
    const left = Math.min(c.left, m.left) - 34, top = c.top;
    const w = Math.max(c.right, m.right) + 8 - left, h = m.top - top + H * 0.13;
    const ov = document.createElement('canvas');
    ov.className = 'robot3d-arrow';
    ov.setAttribute('aria-hidden', 'true');
    ov.style.cssText = `left:${left - b.left}px;top:${top - b.top}px;width:${w}px;height:${h}px`;
    ov.width = Math.ceil(w * dpr); ov.height = Math.ceil(h * dpr);
    body.append(ov);
    const cx0 = c.left - left, cy0 = c.top - top, ch = c.height, cb = cy0 + ch;
    const capB = (body.querySelector('.timeline-media figcaption') || clip).getBoundingClientRect().bottom - top;
    // two joined curves: down the gutter left of the clip and its caption, then into the drawing
    const P0 = [cx0 - 6, cy0 + START_Y * ch], Q = [cx0 - 18, Math.max(cb, capB) + 14], P3 = [m.left - left + W * 0.5, h - 4];
    const segs = [
      [P0, [cx0 - 20, P0[1] + 12], [cx0 - 20, cb - 10], Q],
      [Q, [cx0 - 18, Q[1] + (P3[1] - Q[1]) * 0.7], [P3[0] - W * 0.22, P3[1] - 6], P3],
    ];
    const bez = ([a, b, c2, d], u) => { const v = 1 - u; return [0, 1].map(k => v * v * v * a[k] + 3 * v * v * u * b[k] + 3 * v * u * u * c2[k] + u * u * u * d[k]); };
    const P2 = segs[1][2];
    const pts = [[...P0, 0]]; let prev = P0, run = 0, len = 0;
    const raw = [];
    for (const sg of segs) for (let i = 1; i <= 160; i++) { const p = bez(sg, i / 160); const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]); len += d; run += d; prev = p; if (run >= 6.5) { raw.push([...p, len]); run = 0; } }
    for (const [x, y, l] of raw) pts.push([x, y, l / len]);
    const d = [P3[0] - P2[0], P3[1] - P2[1]], dl = Math.hypot(...d), ux = d[0] / dl, uy = d[1] / dl;
    for (const sg of [-1, 1]) {
      const an = Math.atan2(-uy, -ux) + sg * 0.6;
      for (const L of [4.5, 9, 13.5]) pts.push([P3[0] + Math.cos(an) * L, P3[1] + Math.sin(an) * L, 1]);
    }
    return { ov, g: ov.getContext('2d'), w, h, pts, gone: null, tip: [P3[0] + left - m.left, P3[1] + top - m.top + 3] };
  }
  function drawArrow() {
    const a = arrow, g = a.g, dots = new Path2D(), halo = new Path2D();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, a.w, a.h);
    const wave = (bt - POUR) * 1.15 % 1.25 - 0.12;                     // where the pulse is, 0..1
    let alive = false, front = -1, lead = null;
    for (const [x, y, f] of a.pts) {
      let s = Math.max(0, Math.min(1, (bt - f * 0.5) / 0.1));          // drawn on in order
      if (s > 0 && s < 1 && f > front) { front = f; lead = [x, y]; }
      if (bt > POUR && a.gone == null) s *= 1 + 0.7 * Math.max(0, 1 - Math.abs(f - wave) * 7);
      if (a.gone != null) s *= Math.max(0, 1 - (a.gone - f * 0.3) / 0.18);
      if (s <= 0.02) continue;
      alive = true;
      const r = (1.25 + 0.6 * f) * s;
      dots.moveTo(x + r, y); dots.arc(x, y, r, 0, Math.PI * 2);
      halo.moveTo(x + r + 1.6, y); halo.arc(x, y, r + 1.6, 0, Math.PI * 2);
    }
    if (lead && bt < 0.65) { dots.moveTo(lead[0] + 2.8, lead[1]); dots.arc(lead[0], lead[1], 2.8, 0, Math.PI * 2); }
    g.fillStyle = paper; g.globalAlpha = 0.85; g.fill(halo);
    g.fillStyle = color; g.globalAlpha = 0.95; g.fill(dots); g.globalAlpha = 1;
    return alive || a.gone == null;
  }
  function dropArrow() { if (arrow) { arrow.ov.remove(); arrow = null; } }

  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  // The turret angle (relative to the robot) that points the shooter at the target for this yaw.
  // The shooter faces -z on the robot, which lands on view direction (sin a, -cos a) at a = tyaw + yaw.
  function aimFor(yw) {
    let a = FACE;
    if (model && model.goal) {
      const g = model.goal.aim, px = -model.TZ * Math.sin(yw), pz = model.TZ * Math.cos(yw);
      a = Math.atan2(g[0] - px, -(g[2] - pz));
    }
    return wrap(a - yw);
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const t0 = performance.now();
    if (stage === 'build') {
      bt += dt;
      if (arrow) { if (arrow.gone == null && bt > ARROW_UNTIL) arrow.gone = 0; else if (arrow.gone != null) arrow.gone += dt; if (!drawArrow()) dropArrow(); }
      // the last dot lands on exactly the frame the live view starts from, so nothing jumps
      if (drawFlock()) { stage = 'live'; flock = null; paint(); if (arrow && arrow.gone == null) arrow.gone = 0; }
    } else {
      if (arrow) { arrow.gone += dt; if (!drawArrow()) dropArrow(); }
      t += dt;
      if (!drag) { vel += (AUTO - vel) * Math.min(1, dt * 1.2); yaw += vel * dt; }
      // Hold the aim. While the target is inside the turret's travel it tracks it exactly; when the
      // target passes into the dead zone it waits at the end stop, and once the target comes out on
      // the far side it swings the long way round (it cannot pass through the stop) and locks on.
      const want = aimFor(yaw);
      const target = Math.abs(want) <= LIMIT ? want : Math.sign(tyaw || 1) * LIMIT;
      // a motor: velocity toward the error, capped in speed and acceleration
      const err = target - tyaw, vWant = Math.max(-5.5, Math.min(5.5, err * 9));
      tvel += Math.max(-dt * 32, Math.min(dt * 32, vWant - tvel)); tyaw += tvel * dt;
      tyaw = Math.max(-LIMIT, Math.min(LIMIT, tyaw));
      spin += dt * 6; ispin += dt * 3.2;
      paint();
    }
    // on slow devices, drop to every other frame
    slow = slow * 0.9 + (performance.now() - t0) * 0.1;
    if (visible && !document.hidden && !reduce.matches) {
      raf = requestAnimationFrame(slow > 14 ? () => { raf = requestAnimationFrame(frame); } : frame);
    }
  }
  function kick() {
    if (!model || stage === 'wait') return;
    if (reduce.matches) { if (stage === 'build') { stage = 'live'; flock = null; dropArrow(); } paint(); return; }
    if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); }
  }

  // drag to turn, once it is built; vertical swipes still scroll the page on touch screens
  canvas.addEventListener('pointerdown', e => {
    if (stage !== 'live') return;
    drag = { x: e.clientX, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x;
    // the near side follows the pointer
    yaw -= dx * 0.011;
    vel = -dx * 0.011 / Math.max(0.016, (now - drag.t) / 1000);
    drag.x = e.clientX; drag.t = now;
    if (reduce.matches || !raf) paint();
  });
  const release = () => {
    if (!drag) return;
    drag = null; canvas.classList.remove('is-dragging'); vel = Math.max(-4, Math.min(4, vel)); kick();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // Build the point cloud while the card is still a little way off, so it is ready in time.
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || model) return;
    const lean = W < 340 || (navigator.hardwareConcurrency || 8) <= 4;
    model = Robot3D.build(lean ? 0.12 : 0.1);
    if (WITH_GOAL) model.goal = buildGoal(lean ? 0.12 : 0.1);
    fitBox = fitRobot(model, PITCH);
    tyaw = aimFor(yaw);
    maybeStart();
  }, { rootMargin: '400px 0px' }).observe(host);
  // Start the assembly once a good part of it is actually on screen.
  let ratio = 0;
  function maybeStart() {
    if (stage !== 'wait' || !model || ratio < 0.45) return;
    if (reduce.matches) stage = 'live';
    else { stage = 'build'; arrow = makeArrow(); flock = makeFlock(arrow && arrow.tip); bt = 0; }
    kick();
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting; ratio = e.intersectionRatio;
    maybeStart();
    if (visible) kick();
  }, { threshold: [0, 0.45, 1] }).observe(canvas);
  new ResizeObserver(size).observe(host);
  document.addEventListener('visibilitychange', kick);
  reduce.addEventListener('change', kick);
  new MutationObserver(() => { readColor(); if (stage === 'live') paint(); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] });
})();
