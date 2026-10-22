/*
 * Tower of Wishes — the cinematic layer over every staged story scene (2026-10-22).
 *
 * The camera keeps the helicopter view (AGENTS.md); what makes a scene read like film is
 * drawn here, per place (arena theme) or per scene (def.mood):
 *   grade      a colour wash in soft-light, and a vignette
 *   rays       slow light shafts from above (sun, lanterns, the formation)
 *   fog        low drifting bands of mist
 *   fx         ambient particles from the effect packs (embers, fireflies, snow, ash, motes,
 *              leaves, sparkles, rain), drifting through the frame in world space
 *   fg         dark foreground silhouettes at the frame's edges, sliding with the camera (depth)
 *
 *   NS.cine.create(V) -> { draw(ctx, W, H, s, dt, mood) }   called by stage.js after the world
 * mood: a theme key, or an object overriding the theme's preset.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  const MOODS = {
    forest: { grade: [255, 214, 150, 0.16], rays: [255, 230, 170, 0.1], fx: ['motes', 'leaves'], fg: 'trees', vig: 0.42 },
    summit: { grade: [170, 60, 80, 0.2], fog: [60, 20, 30, 0.18], rays: [255, 220, 230, 0.07], fx: ['embers', 'ash'], vig: 0.4 },
    hill: { grade: [255, 200, 140, 0.14], rays: [255, 220, 160, 0.08], fx: ['motes'], fg: 'trees', vig: 0.4 },
    cave: { grade: [40, 60, 120, 0.22], fog: [20, 24, 40, 0.25], fx: ['motes'], vig: 0.62 },
    road: { grade: [255, 210, 150, 0.14], rays: [255, 232, 180, 0.08], fx: ['leaves', 'motes'], fg: 'trees', vig: 0.4 },
    ruins: { grade: [210, 180, 140, 0.14], fog: [180, 170, 150, 0.12], fx: ['motes', 'leaves'], fg: 'ruins', vig: 0.45 },
    yard: { grade: [255, 220, 170, 0.12], rays: [255, 236, 190, 0.07], fx: ['motes'], vig: 0.38 },
    deep: { grade: [30, 50, 100, 0.24], fog: [12, 16, 30, 0.28], fx: ['motes'], vig: 0.66 },
    tavern: { grade: [255, 160, 70, 0.22], rays: [255, 190, 110, 0.1], fx: ['motes'], vig: 0.5 },
    grassland: { grade: [255, 225, 160, 0.14], rays: [255, 240, 200, 0.08], fx: ['leaves'], fg: 'grass', vig: 0.38 },
    rooftops: { grade: [255, 160, 120, 0.2], rays: [255, 190, 140, 0.1], fx: ['motes'], vig: 0.32 },
    guildhall: { grade: [255, 190, 110, 0.16], rays: [255, 220, 160, 0.09], fx: ['motes'], vig: 0.45 },
    square: { grade: [190, 120, 200, 0.18], rays: [255, 190, 120, 0.06], fx: ['fireflies', 'motes'], vig: 0.48 },
    shadowcity: { grade: [60, 70, 140, 0.24], fog: [30, 30, 50, 0.24], fx: ['ash'], vig: 0.6 },
    farmland: { grade: [255, 200, 120, 0.16], rays: [255, 220, 160, 0.08], fx: ['leaves', 'motes'], fg: 'grass', vig: 0.4 },
    nightcamp: { grade: [40, 60, 140, 0.26], fog: [20, 24, 48, 0.2], fx: ['fireflies', 'embers'], fg: 'trees', vig: 0.6 },
    frosthall: { grade: [150, 190, 255, 0.2], fog: [200, 220, 240, 0.16], fx: ['snow'], vig: 0.5 },
    calamity: { grade: [200, 60, 50, 0.2], fog: [40, 10, 10, 0.2], fx: ['embers', 'ash'], vig: 0.6 },
    offering: { grade: [255, 210, 120, 0.18], rays: [255, 230, 160, 0.1], fx: ['sparkles', 'motes'], vig: 0.5 },
  };
  const FG = { trees: ['tree_dark_a', 'pine_a', 'tree_a', 'tree_dark_b'], ruins: ['ruin_pillar', 'pillar_broken', 'tree_dark_a'], grass: ['bush_a', 'tree_a', 'bush_d'] };

  function create(V) {
    const parts = [];
    let lastMood = null;
    const sil = new Map(); // tree sprite -> its dark silhouette canvas
    function silhouette(name) {
      if (sil.has(name)) return sil.get(name);
      const T = NS.tiles, s = T && T.sprite && T.sprite(name);
      if (!s) return null;
      const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
      const g = c.getContext('2d'); g.drawImage(s.img, s.x, s.y, s.w, s.h, 0, 0, s.w, s.h);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = '#07050a'; g.fillRect(0, 0, s.w, s.h);
      sil.set(name, c);
      return c;
    }
    let seed = 99;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    function draw(ctx, W, H, s, dt, moodIn) {
      const theme = s && s.arena && s.arena.theme;
      const M = Object.assign({}, MOODS[theme] || {}, typeof moodIn === 'object' ? moodIn : MOODS[moodIn] || {});
      if (moodIn === 'none') return;
      const t = V.time || 0, cam = V.cam;
      ctx.save();
      // ---- particles from the effect packs, drifting in world space round the camera
      const PX = V.fxApi && V.fxApi.pxfx && V.fxApi.pxfx();
      const key = (M.fx || []).join(',') + theme;
      if (key !== lastMood) { parts.length = 0; lastMood = key; }
      if (PX && M.fx && M.fx.length) {
        const span = Math.max(W, H) / cam.sc; // metres across the view
        const want = Math.min(10, 4 + Math.round(span * 0.6));
        while (parts.length < want) parts.push({ name: M.fx[parts.length % M.fx.length], x: cam.x + (rnd() - 0.5) * span * 1.3, y: cam.y + (rnd() - 0.5) * span * 0.9, z: 0.6 + rnd() * 2.2, ph: rnd() * 10, vx: (rnd() - 0.3) * 0.25, vy: (rnd() - 0.5) * 0.12 });
        for (const p of parts) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (Math.abs(p.x - cam.x) > span * 0.8 || Math.abs(p.y - cam.y) > span * 0.6) { p.x = cam.x + (rnd() - 0.5) * span * 1.2; p.y = cam.y + (rnd() - 0.5) * span * 0.8; }
          PX.drawAt(p.name, t + p.ph, p.x, p.y, p.z, { scale: 0.8, alpha: 0.7, add: p.name !== 'leaves' && p.name !== 'ash' });
        }
      }
      // ---- low fog banks
      if (M.fog) {
        const [r, g, b, a] = M.fog;
        for (let i = 0; i < 2; i++) {
          const y = H * (0.62 + i * 0.16), off = Math.sin(t * 0.07 + i * 2) * W * 0.08;
          const gr = ctx.createLinearGradient(0, y - H * 0.12, 0, y + H * 0.12);
          gr.addColorStop(0, `rgba(${r},${g},${b},0)`); gr.addColorStop(0.5, `rgba(${r},${g},${b},${a})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = gr; ctx.save(); ctx.translate(off, 0); ctx.fillRect(-W * 0.2, y - H * 0.12, W * 1.4, H * 0.24); ctx.restore();
        }
      }
      // ---- light shafts from above
      if (M.rays) {
        const [r, g, b, a] = M.rays;
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const x0 = W * (0.12 + i * 0.24) + Math.sin(t * 0.15 + i) * W * 0.03, w = W * (0.05 + (i % 2) * 0.04), sway = W * 0.22;
          const k = a * (0.6 + 0.4 * Math.sin(t * 0.4 + i * 1.7));
          const gr = ctx.createLinearGradient(x0, 0, x0 + sway, H);
          gr.addColorStop(0, `rgba(${r},${g},${b},${k.toFixed(3)})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(x0, -10); ctx.lineTo(x0 + w, -10); ctx.lineTo(x0 + w + sway, H); ctx.lineTo(x0 + sway - w * 0.5, H); ctx.closePath(); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // ---- colour grade (soft light) and vignette
      if (M.grade) {
        const [r, g, b, a] = M.grade;
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, a * 2.2)})`; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
      if (M.vig) {
        const vg = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.72);
        vg.addColorStop(0, 'rgba(6,4,8,0)'); vg.addColorStop(1, `rgba(6,4,8,${M.vig})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }
      // ---- foreground silhouettes at the edges (wide shots only, so they never cover a face)
      const names = M.fg && FG[M.fg];
      if (names && cam.sc < Math.min(W, H) / 5.5) {
        const par = (cam.x * cam.sc * 0.35) % (W * 1.5);
        for (let i = 0; i < 2; i++) {
          const img = silhouette(names[i % names.length]);
          if (!img) continue;
          const h = H * (0.75 + 0.15 * i), w = (img.width / img.height) * h;
          const x = i === 0 ? -w * 0.62 - (par * 0.15) % (w * 0.2) : W - w * 0.38 + (par * 0.15) % (w * 0.2);
          ctx.globalAlpha = 0.92; ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, x, H - h * 0.92, w, h);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    return { draw, MOODS };
  }
  NS.cine = { create, MOODS };
})();
