/*
 * Tower of Wishes — world layer: ground, trees, rocks, the fallen trunk,
 * light and atmosphere.
 *
 * API (called by core.js):
 *   drawBackdrop(s)        everything flat under the scene (sky, ground, road, grass)
 *   items(s) -> [{d, f}]   depth-sorted standing objects; core sorts them with fighters
 *   drawAtmosphere(s, dt)  screen-wide light, fog, grain, vignette, drawn over the scene
 *   resize()               optional; canvas size changed
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  function create(V) {
    const { ctx, Sim } = V;
    const P = V.P;
    const R = Sim.makeRng(11);

    // Static decoration, generated once.
    const tufts = [];
    for (let i = 0; i < 260; i++) {
      const a = R() * Math.PI * 2, k = Math.sqrt(R()) * 1.05;
      tufts.push({ x: Math.cos(a) * Sim.ARENA.rx * k, y: Math.sin(a) * Sim.ARENA.ry * k, s: 0.5 + R() * 0.8, c: R() });
    }
    const ring = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + R() * 0.08;
      const k = 1.18 + R() * 0.45;
      const x = Math.cos(a) * Sim.ARENA.rx * k, y = Math.sin(a) * Sim.ARENA.ry * k;
      if (Math.hypot(x - Sim.ARENA.exit.x, y - Sim.ARENA.exit.y) < 3.2) continue; // keep the road open
      ring.push({ x, y, r: 0.9 + R() * 0.8, h: 3.4 + R() * 1.6, c: R() });
    }

    function drawBackdrop() {
      const W = V.W, H = V.H, cam = V.cam;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0d1712'); g.addColorStop(1, '#16241a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // Clearing
      const A = Sim.ARENA;
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const p = P(Math.cos(a) * A.rx * 1.08, Math.sin(a) * A.ry * 1.08, 0);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      const c0 = P(0, 0, 0);
      const rg = ctx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, A.rx * cam.sc * 1.1);
      rg.addColorStop(0, '#5d7a3e'); rg.addColorStop(0.7, '#48663a'); rg.addColorStop(1, '#2c4429');
      ctx.fillStyle = rg; ctx.fill();

      // Road toward the exit
      const e = A.exit;
      const pth = [[6.5, -3.4], [9.5, -5.2], [e.x + 3, e.y - 2.4]];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [w, col] of [[1.9, '#6f6447'], [1.4, '#86795a']]) {
        ctx.beginPath();
        pth.forEach(([x, y], i) => { const p = P(x, y, 0); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
        ctx.strokeStyle = col; ctx.lineWidth = w * cam.sc * 0.75; ctx.stroke();
      }

      // Grass tufts
      for (const t of tufts) {
        const p = P(t.x, t.y, 0);
        if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
        const h = t.s * cam.sc * 0.18;
        ctx.strokeStyle = t.c < 0.5 ? '#6f8f47' : '#3d5a30';
        ctx.lineWidth = Math.max(1, cam.sc * 0.03);
        ctx.beginPath();
        ctx.moveTo(p.x - h * 0.4, p.y); ctx.lineTo(p.x - h * 0.6, p.y - h);
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + h * 0.1, p.y - h * 1.2);
        ctx.moveTo(p.x + h * 0.4, p.y); ctx.lineTo(p.x + h * 0.7, p.y - h * 0.9);
        ctx.stroke();
      }
    }

    function drawTree(t, fade) {
      const sc = V.cam.sc;
      V.shadow(t.x + 0.4, t.y + 0.3, t.r * 1.5, 0.28);
      const b = P(t.x, t.y, 0), top = P(t.x, t.y, t.h * 0.62);
      ctx.strokeStyle = '#2f2219'; ctx.lineCap = 'butt';
      ctx.lineWidth = t.r * 0.42 * sc;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.globalAlpha = fade;
      const cols = t.c < 0.5 ? ['#1e3a24', '#28492c', '#335a35'] : ['#1b3322', '#244229', '#2f5232'];
      for (let i = 0; i < 3; i++) {
        const p = P(t.x + (i - 1) * 0.25 * t.r, t.y - (i - 1) * 0.2, t.h * (0.7 + i * 0.13));
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(p.x, p.y, t.r * (1.5 - i * 0.28) * sc, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawBush(t) {
      const p = P(t.x, t.y, 0.25), sc = V.cam.sc;
      ctx.fillStyle = t.c < 0.5 ? 'rgba(20,38,25,0.9)' : 'rgba(26,46,30,0.9)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, t.r * 1.3 * sc, t.r * 0.55 * sc, 0, Math.PI, 0);
      ctx.fill();
    }

    function drawRock(o) {
      const sc = V.cam.sc;
      V.shadow(o.x + 0.15, o.y + 0.1, o.r * 1.15, 0.3);
      const p = P(o.x, o.y, o.r * 0.45);
      ctx.fillStyle = '#6d726c';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, o.r * sc, o.r * sc * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8d928a';
      ctx.beginPath();
      ctx.ellipse(p.x - o.r * sc * 0.2, p.y - o.r * sc * 0.25, o.r * sc * 0.55, o.r * sc * 0.35, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawTrunkPiece(o, t0, t1) {
      const sc = V.cam.sc;
      const x0 = o.ax + (o.bx - o.ax) * t0, y0 = o.ay + (o.by - o.ay) * t0;
      const x1 = o.ax + (o.bx - o.ax) * t1, y1 = o.ay + (o.by - o.ay) * t1;
      const a = P(x0, y0, o.r), b = P(x1, y1, o.r);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3b2a1e'; ctx.lineWidth = o.r * 2 * sc;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = '#5a4130'; ctx.lineWidth = o.r * 1.1 * sc;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - o.r * sc * 0.35); ctx.lineTo(b.x, b.y - o.r * sc * 0.35); ctx.stroke();
      ctx.fillStyle = '#4f7a3c';
      const m = P((x0 + x1) / 2, (y0 + y1) / 2, o.r * 1.8);
      ctx.beginPath(); ctx.ellipse(m.x, m.y, o.r * sc * 0.5, o.r * sc * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    }

    function items(s) {
      const out = [];
      for (const t of ring) {
        const p = P(t.x, t.y, 0);
        // Trees between the camera and the arena become low undergrowth so
        // they never hide the fight.
        out.push({ d: p.d, f: () => (p.d > -1 ? drawBush(t) : drawTree(t, 0.95)) });
      }
      for (const o of Sim.ARENA.obstacles) {
        if (o.kind === 'trunk') {
          for (let i = 0; i < 6; i++) {
            const t0 = i / 6, t1 = (i + 1) / 6;
            const m = P(o.ax + (o.bx - o.ax) * (t0 + t1) / 2, o.ay + (o.by - o.ay) * (t0 + t1) / 2, 0);
            out.push({ d: m.d, f: () => drawTrunkPiece(o, t0, t1) });
          }
        } else if (o.kind === 'rock') {
          out.push({ d: P(o.x, o.y, 0).d, f: () => drawRock(o) });
        } else {
          const t = { x: o.x, y: o.y, r: o.r * 1.6, h: 4.6, c: 0.3 };
          const p = P(o.x, o.y, 0);
          // Fade the canopy when a fighter is behind it.
          const behind = s.units.some((u) => {
            if (!Sim.alive(u)) return false;
            const q = P(u.x, u.y, 0);
            return q.d < p.d && Math.abs(q.x - p.x) < V.cam.sc * 2.2 && p.d - q.d < 5;
          });
          out.push({ d: p.d, f: () => drawTree(t, behind ? 0.4 : 0.92) });
        }
      }
      return out;
    }

    function drawAtmosphere() { /* none yet */ }

    return { drawBackdrop, items, drawAtmosphere };
  }

  NS.world = { create };
})();
