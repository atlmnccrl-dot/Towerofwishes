// EMBERFALL — the scene player. Filmed beats on a place: actors walk, act and speak; lines float
// beside the speaker; letterbox bars; title cards; a tap hurries the beat, a button skips the scene.
(function () {
  const EF = window.EF; const D = EF.DATA; const S = EF.STORY; const R = EF.R;
  const DIRA = d => d * Math.PI / 4; // 0 E, 2 S, 4 W, 6 N

  class ScenePlayer {
    constructor(scene, party) {
      this.scene = scene; this.place = scene.place; this.actors = {}; this.beat = -1; this.t = 0; this.done = false; this.wait = 0; this.line = null; this.card = null; this.fx = []; this.shake = 0; this.flash = null; this.lineT = 0;
      this.cam = { x: R.WORLD.w / 2, y: R.WORLD.h / 2, zoom: 1 }; this.camTarget = { x: this.cam.x, y: this.cam.y, zoom: 1 }; this.fade = 1;
      for (const [who, [x, y, dir]] of Object.entries(scene.actors)) this.addActor(who, x * R.WORLD.sx, y * R.WORLD.sy, DIRA(dir || 0));
      this.next();
    }
    look(who) { const h = D.HEROES[who]; if (h) return { name: h.name, set: h.sceneSet || h.set, color: h.color, scale: h.scale || 1 }; const x = S.EXTRAS[who]; return x ? { name: x.name, set: x.set, color: x.color, scale: x.scale || 1 } : { name: who, set: 'ashgate_m1', color: '#ccc', scale: 1 }; }
    addActor(who, x, y, facing) { const l = this.look(who); this.actors[who] = { who, name: l.name, set: l.set, color: l.color, scale: l.scale, x, y, facing, clip: 'Idle', animT: Math.random() * 2, hold: false, walk: null, visible: true }; return this.actors[who]; }
    next() {
      this.beat++; const b = this.scene.beats[this.beat]; this.line = null; this.card = null; this.wait = 0;
      if (!b) { this.done = true; return; }
      if (b.card !== undefined) { this.card = b; this.cardT = 0; return; }
      if (b.t !== undefined) { this.line = b; this.lineT = 0; const a = this.actors[b.who]; if (a) { if (!a.hold && !a.walk) { a.clip = b.k === 'shout' ? 'Idle2' : 'Idle'; } this.camTarget = { x: a.x, y: a.y - 10, zoom: b.k === 'shout' ? 1.35 : b.k === 'soft' ? 1.3 : 1.2 }; if (b.k === 'shout') this.shake = 0.35; } return; }
      const a = this.actors[b.who];
      switch (b.do) {
        case 'walk': if (a) { a.walk = { x: b.x * R.WORLD.sx, y: b.y * R.WORLD.sy, run: b.run }; a.hold = false; a.clip = b.run ? 'Run' : 'Walk'; } this.wait = 0.05; this.waitWalk = a; return;
        case 'face': if (a) a.facing = DIRA(b.dir); break;
        case 'anim': if (a) { a.clip = b.clip; a.animT = 0; a.hold = b.hold; } this.wait = b.hold ? 0.2 : EF.clipLen(b.clip); return;
        case 'fx': this.fx.push({ name: b.name, x: b.x * R.WORLD.sx, y: b.y * R.WORLD.sy, t: 0, scale: b.scale }); break;
        case 'enter': { const na = this.addActor(b.who, b.fromX != null ? b.fromX * R.WORLD.sx : b.x * R.WORLD.sx, b.fromY != null ? b.fromY * R.WORLD.sy : b.y * R.WORLD.sy, DIRA(b.dir)); if (b.fromX != null) { na.walk = { x: b.x * R.WORLD.sx, y: b.y * R.WORLD.sy }; na.clip = 'Walk'; this.wait = 0.05; this.waitWalk = na; return; } break; }
        case 'leave': if (a) a.visible = false; break;
        case 'wait': this.wait = b.s; return;
        case 'shake': this.shake = b.s; this.wait = 0.3; return;
        case 'flash': this.flash = { c: b.c, t: 0 }; this.wait = 0.25; return;
        case 'cam': this.camTarget = { x: b.x * R.WORLD.sx, y: b.y * R.WORLD.sy, zoom: b.zoom }; break;
      }
      this.next();
    }
    tap() {
      if (this.done) return; if (this.card) { if (this.cardT > 0.4) this.next(); return; }
      if (this.line) { if (this.lineT > 0.15) this.next(); return; }
      // hurry a stage direction
      if (this.waitWalk) { const a = this.waitWalk; if (a.walk) { a.x = a.walk.x; a.y = a.walk.y; a.walk = null; a.clip = 'Idle'; } this.waitWalk = null; this.wait = 0; this.next(); return; }
      this.wait = 0; this.next();
    }
    skip() { this.done = true; }
    update(dt) {
      this.t += dt; if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 1.5);
      for (const a of Object.values(this.actors)) {
        a.animT += dt;
        if (a.walk) { const dx = a.walk.x - a.x, dy = a.walk.y - a.y; const d = Math.hypot(dx, dy); const sp = a.walk.run ? 110 : 60; if (d < sp * dt) { a.x = a.walk.x; a.y = a.walk.y; a.walk = null; a.clip = 'Idle'; } else { a.x += dx / d * sp * dt; a.y += dy / d * sp * dt; a.facing = Math.atan2(dy, dx); } }
        else if (!a.hold && !D.CLIP_LOOP[a.clip] && EF.clipDone(a.clip, a.animT)) { a.clip = 'Idle'; a.animT = 0; }
      }
      for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < Math.max(1.2, EF.fxLen(f.name)) || (EF.fxInfo(f.name) && EF.fxInfo(f.name).loop && f.t < 2.5));
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.2); if (this.flash) { this.flash.t += dt; if (this.flash.t > 0.35) this.flash = null; }
      const ct = this.camTarget; this.cam.x += (ct.x - this.cam.x) * 0.05; this.cam.y += (ct.y - this.cam.y) * 0.05; this.cam.zoom += (ct.zoom - this.cam.zoom) * 0.04;
      // keep the camera inside the world
      const vw = R.W / this.cam.zoom, vh = R.H / this.cam.zoom; this.cam.x = Math.max(vw / 2, Math.min(R.WORLD.w - vw / 2, this.cam.x)); this.cam.y = Math.max(vh / 2, Math.min(R.WORLD.h - vh / 2, this.cam.y));
      if (this.card) { this.cardT += dt; return; }
      if (this.line) { this.lineT += dt; return; }
      if (this.waitWalk) { if (!this.waitWalk.walk) { this.waitWalk = null; this.next(); } return; }
      if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) this.next(); }
    }
    draw(ctx) {
      const cam = { ...this.cam }; if (this.shake > 0) { cam.x += (Math.random() - 0.5) * this.shake * 8; cam.y += (Math.random() - 0.5) * this.shake * 6; }
      R.sky(ctx, this.place);
      const drawables = [];
      for (const a of Object.values(this.actors)) if (a.visible) drawables.push({ y: a.y, draw: g => { R.shadow(g, a.x, a.y, 9 * a.scale); EF.drawActor(g, a.set, a.clip, EF.frameAt(a.clip, a.animT), a.facing, Math.round(a.x), Math.round(a.y), a.scale); } });
      for (const f of this.fx) drawables.push({ y: f.y + 5, draw: g => EF.drawFx(g, f.name, f.t, f.x, f.y, f.scale) });
      R.drawWorld(ctx, this.place, cam, drawables, this.t);
      R.weather(ctx, S.PLACES[this.place].weather, this.t, R.W, R.H, 0.9); R.fogOverlay(ctx, this.place, 0.4);
      // letterbox
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, 22); ctx.fillRect(0, R.H - 22, R.W, 22);
      if (this.line) this.drawLine(ctx, cam);
      if (this.flash) { ctx.save(); ctx.globalAlpha = Math.max(0, 1 - this.flash.t / 0.35) * 0.8; ctx.fillStyle = this.flash.c; ctx.fillRect(0, 0, R.W, R.H); ctx.restore(); }
      if (this.card) this.drawCard(ctx);
      if (this.fade > 0) { ctx.save(); ctx.globalAlpha = this.fade; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, R.H); ctx.restore(); }
      R.text(ctx, 'SKIP', R.W - 8, R.H - 8, 7, 'rgba(255,255,255,0.6)', 'right');
      if (!this.card) R.text(ctx, this.line ? 'TAP' : '', R.W / 2, R.H - 8, 6, 'rgba(255,255,255,0.4)', 'center');
    }
    drawLine(ctx, cam) {
      const b = this.line; const a = this.actors[b.who]; const l = this.look(b.who); const size = b.k === 'shout' ? 11 : b.k === 'soft' ? 7 : 8;
      const maxW = 170; const lines = R.wrap(ctx, b.t, size, maxW); const lh = size + 3; const h = lines.length * lh + 14; const w = Math.min(maxW, Math.max(...lines.map(s => { ctx.font = R.font(size); return ctx.measureText(s).width; }))) + 12;
      let sx = R.W / 2, sy = R.H - 30 - h, left = true;
      if (a && a.visible) { sx = (a.x - cam.x) * cam.zoom + R.W / 2; sy = (a.y - cam.y) * cam.zoom + R.H / 2 - 50 * a.scale * cam.zoom; left = sx < R.W / 2; }
      else { sx = 30; sy = R.H - 60 - h; left = false; }
      let x = left ? sx + 14 : sx - 14 - w; x = Math.max(4, Math.min(R.W - w - 4, x)); let y = Math.max(26, Math.min(R.H - 26 - h, sy - h));
      const shakeX = b.k === 'shout' ? (Math.random() - 0.5) * 2 : 0; const alpha = b.k === 'soft' ? 0.85 : 1;
      ctx.save(); ctx.globalAlpha = alpha * Math.min(1, this.lineT * 5);
      ctx.fillStyle = 'rgba(8,6,12,0.72)'; ctx.fillRect(x + shakeX, y, w, h);
      ctx.fillStyle = l.color; ctx.fillRect(left ? x - 2 + shakeX : x + w + shakeX, y, 2, h);
      R.text(ctx, l.name.toUpperCase(), x + 6 + shakeX, y - 3, 6, l.color, 'left', { bold: true });
      lines.forEach((s, i) => R.text(ctx, s, x + 6 + shakeX, y + 11 + i * lh + (b.k === 'shout' ? 2 : 0), size, b.k === 'shout' ? '#ffe0b0' : b.k === 'soft' ? '#d0c8c0' : '#fff', 'left', { bold: b.k === 'shout' }));
      ctx.restore();
    }
    drawCard(ctx) {
      const c = this.card; const a = Math.min(1, this.cardT * 2); ctx.save(); ctx.globalAlpha = 0.92 * a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, R.H); ctx.globalAlpha = a;
      R.text(ctx, c.card, R.W / 2, R.H / 2 - 4, c.card.length > 30 ? 10 : 16, '#ffe0a0', 'center', { bold: true });
      if (c.sub) { const ls = R.wrap(ctx, c.sub, 8, 360); ls.forEach((s, i) => R.text(ctx, s, R.W / 2, R.H / 2 + 16 + i * 12, 8, '#d0c8c0', 'center')); }
      ctx.restore();
    }
  }
  EF.ScenePlayer = ScenePlayer;
})();
