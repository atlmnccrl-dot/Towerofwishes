// Bannerborn — the team field. The team screen opens onto the land the campaign is in (the next stage's region and
// ground), and the heroes in the formation live on it: each keeps to their place in the formation, and between rests
// they train on straw dummies (enchanted weapons show their trait), spar with each other, wander over to chat, stretch,
// and try out their signature. Loaded after battle.js and traits.js; main.js builds the scene, screens.js draws the
// formation rings over it.
(function () {
  const BB = window.BB, B = BB.Battle.prototype, TAU = Math.PI * 2, hyp = Math.hypot;
  const R = Math.random, pick = (a) => a[Math.floor(R() * a.length)];

  // the land to show: the stage about to be played, else the next one not yet cleared
  BB.drillStage = function (S, idx) {
    if (idx !== null && idx !== undefined && BB.MISSIONS[idx]) return BB.MISSIONS[idx];
    const i = BB.MISSIONS.findIndex((m) => !S.cleared[m.id]);
    return BB.MISSIONS[i < 0 ? BB.MISSIONS.length - 1 : i];
  };
  BB.drillKey = (S, idx) => { const M = BB.drillStage(S, idx); return M.id; };

  // ---------------------------------------------------------------- build
  BB.buildDrillScene = async function (S, idx) {
    const M = BB.drillStage(S, idx), region = BB.REGIONS.find((r) => r.id === M.region) || BB.REGIONS[0];
    await Promise.all([BB.loadEnv(region.biome), BB.loadEnv('vale'), BB.loadEnv('ground')]);
    const map = BB.buildMap(M.layout, region.biome, BB.hashStr(M.id) % 9000 + 1, { night: !!region.night, floor: region.floor });
    BB.renderGround(map);
    const sc = new BB.Battle({ map, heroes: [], peaceful: true, save: S, seed: 5 });
    sc.drill = { stage: M, region, centre: { x: map.w / 2, y: map.h / 2 }, cleared: '', dummies: [], lastIds: '', dragId: null };
    sc.cam = { x: map.w / 2, y: map.h / 2, zoom: 1 };
    sc.npcs = [];
    return sc;
  };

  // place the camera so the field's centre sits in the middle of the board, and work out where each hero's place is on
  // the ground. places: [{ id, fx, fy }] in fractions of the board; clear: points of the board nothing may grow on
  B.drillLayout = function (board, W, H, dpr, places, dummies, clear, camp) {
    const D = this.drill; if (!D || !board) return;
    const z = this.cam.zoom * dpr, cs = BB.iso(D.centre.x, D.centre.y);
    const bx = board.x + board.w * 0.5, by = board.y + board.h * 0.52;
    const want = { x: cs.x - (bx - W / 2) / z, y: cs.y - (by - H / 2 + 20 * z) / z };
    const c = BB.unIso(want.x, want.y); this.cam.x = c.x; this.cam.y = c.y;
    const ox = W / 2 - want.x * z, oy = H / 2 - want.y * z - 20 * z;
    const toW = (px, py) => BB.unIso((px - ox) / z, (py - oy) / z);
    D.spots = places.map((s) => Object.assign(toW(board.x + s.fx * board.w, board.y + s.fy * board.h), { id: s.id }));
    D.dummyAt = dummies.map((s) => toW(board.x + s.fx * board.w, board.y + s.fy * board.h));
    if (!D.dummies.length) D.dummies = D.dummyAt.map((p) => ({ x: p.x, y: p.y, wob: 0, wv: 0, flash: 0, buffs: {} }));
    else D.dummies.forEach((d, i) => { d.x = D.dummyAt[i].x; d.y = D.dummyAt[i].y; });
    const key = Math.round(board.w) + 'x' + Math.round(board.h) + '@' + z.toFixed(2);
    if (D.cleared !== key) { // nothing grows where the heroes train
      D.cleared = key;
      const pts = (clear || []).map((s) => toW(board.x + s.fx * board.w, board.y + s.fy * board.h)).concat(D.dummyAt);
      if (camp) { // the team's fire and banner at the rear of the field
        const f = toW(board.x + camp.fire.fx * board.w, board.y + camp.fire.fy * board.h), bn = toW(board.x + camp.banner.fx * board.w, board.y + camp.banner.fy * board.h);
        pts.push(f, bn);
        if (!D.fire) {
          D.fire = { x: f.x, y: f.y };
          D.fireAnim = { key: 'fire', x: f.x + 0.03, y: f.y + 0.03, sc: 0.7, t: 0, fps: 14 }; this.map.anims.push(D.fireAnim);
          D.fireLight = { x: f.x, y: f.y, rad: 3.4, col: '255,160,70' }; this.map.lights.push(D.fireLight);
          if (BB.envHas && BB.envHas('vale', 'Misc B8_S')) { D.fireProp = { name: 'Misc B8_S', biome: 'vale', x: f.x, y: f.y, r: 0.3, sc: 1 }; this.map.props.push(D.fireProp); }
          this.map.bannerProp = { x: bn.x, y: bn.y, banner: (this.save && this.save.banner) || { color: '#b3242c', sigil: 'crown', trim: '#e8c66a' } };
        }
        D.fire.x = f.x; D.fire.y = f.y; D.fireAnim.x = f.x + 0.03; D.fireAnim.y = f.y + 0.03; D.fireLight.x = f.x; D.fireLight.y = f.y; this.map.bannerProp.x = bn.x; this.map.bannerProp.y = bn.y;
        if (D.fireProp) { const sp = BB.iso(f.x, f.y); Object.assign(D.fireProp, { x: f.x, y: f.y, depth: f.x + f.y, sx: sp.x, sy: sp.y }); this.map.props.sort((a, b) => a.depth - b.depth); }
      }
      this.map.props = this.map.props.filter((p) => p === D.fireProp || !pts.some((q) => hyp(p.x - q.x, p.y - q.y) < 1.5 + (p.r || 0)));
      this.map.anims = this.map.anims.filter((a) => a === D.fireAnim || !pts.some((q) => hyp(a.x - q.x, a.y - q.y) < 1.6));
    }
  };

  // keep the scene's heroes in step with the team: who is on the field, and where each one's place is
  B.drillSync = function (S) {
    const D = this.drill; if (!D || !D.spots) return;
    const want = D.spots.filter((q) => q.id);
    for (const q of want) {
      const e = this.heroList.find((x) => x.hero.id === q.id); if (!e) continue;
      e.home = { x: q.x, y: q.y };
      if (D.dragId === q.id) { e.x = q.x; e.y = q.y; e.z = 0.32; e.held = true; if (e.act && e.act.with) e.act.with.act = null; e.act = null; e.wander = null; e.drillT = 1.5; if (e.state !== 'attack') { e.state = 'idle'; this.setClip(e, 'Idle'); } } // carried by the finger
      else if (e.held) { e.held = false; e.z = 0; this.addFx('buff3', e.x, e.y, { sc: 0.4, add: true }); for (const d of D.dummies) d.wv += 1.5; }
    }
    const key = want.map((q) => q.id).join(',');
    if (key === D.lastIds) return;
    // heroes taken out leave; new ones step in at their place
    for (const e of this.heroList.slice()) if (!want.some((q) => q.id === e.hero.id)) { this.ents.splice(this.ents.indexOf(e), 1); this.heroList.splice(this.heroList.indexOf(e), 1); for (const o of this.heroList) if (o.act && o.act.with === e) o.act = null; }
    let missing = false;
    for (const q of want) {
      if (this.heroList.some((x) => x.hero.id === q.id)) continue;
      const h = S.heroes.find((x) => x.id === q.id); if (!h) continue;
      if (!BB.heroLayers(h).every((l) => BB.A.chars[l.key])) { missing = true; if (!D.loading) { D.loading = true; BB.loadHeroes([h]).then(() => { D.loading = false; D.lastIds = ''; }); } continue; }
      const e = this.spawnHero(h, BB.heroStats(h), q.x, q.y);
      if (!this.ents.includes(e)) this.ents.push(e); if (!this.heroList.includes(e)) this.heroList.push(e);
      e.home = { x: q.x, y: q.y }; e.drillT = 0.5 + R() * 2; e.dir = 1; e.spawnT = 0.4;
      this.addFx('buff3', e.x, e.y, { sc: 0.5, add: true });
    }
    if (!missing) D.lastIds = key;
  };
  // where a hero stands on the screen right now, in main-canvas pixels (for picking them up)
  B.drillScreen = function (id) {
    const e = this.heroList.find((x) => x.hero.id === id), v = this.view; if (!e || !v) return null;
    const s = BB.iso(e.x, e.y); return { x: s.x * v.z + v.ox, y: s.y * v.z + v.oy, sc: (e.sc || 1) * v.z };
  };

  // ---------------------------------------------------------------- what the heroes do between battles
  const ACTS = ['rest', 'train', 'train', 'spar', 'chat', 'show', 'wander', 'stretch', 'fire', 'fire', 'mend'];
  const EMO = ['…', '!', '?', '♪', '★', '♥']; // signs, not words
  function play(b, e, clip, slow) {
    const key = b.artKey(e); if (!BB.hasClip(key, clip)) clip = BB.hasClip(key, 'Attack1') ? 'Attack1' : 'Idle';
    e.state = 'attack'; e.lock = b.clipLen(e, clip) / (slow ? 11 : 16); e.atkDur = e.lock; e.hitAt = 99; e.hitDone = true; b.setClip(e, clip, true);
    return e.lock;
  }
  function say(e, txt, dur) { e.emote = { txt, t: 0, dur: dur || 1.6 }; }
  B.drillAI = function (e, dt) {
    const D = this.drill;
    e.drillT = (e.drillT || 0) - dt;
    const A = e.act;
    if (A) {
      A.t += dt;
      const tgt = A.with && !A.with.dead && this.ents.includes(A.with) ? A.with : null;
      if (A.kind === 'train') {
        const d = A.dummy;
        if (!A.there) { if (this.moveToward(e, d.x - 0.75, d.y + 0.45, dt, 0.6)) A.there = true; return; }
        this.face(e, d.x, d.y);
        if (A.hits < A.max) { A.hits++; const C = BB.CALLINGS[e.calling], basic = C.basic || ['Attack1']; play(this, e, basic[A.hits % basic.length]);
          this.later(0.16, () => { d.wv += (R() < 0.5 ? -1 : 1) * 7; d.flash = 0.2; if (e.ench && this.onTrait) this.onTrait(e, d, e.ench, 10, A.hits === A.max); e.swingT = e.ench ? 0.28 : 0; e.swingN = A.hits; e.atkTgt = d; BB.sfx && BB.save && UI_on() && BB.sfx('hit'); });
          return; }
        if (R() < 0.5) say(e, pick(['!', '★', '♪']), 1.2);
        e.act = null; return;
      }
      if (A.kind === 'shoot') { // practise from where they stand: a shot at the dummy, the dummy rocks when it lands
        const d = A.dummy; this.face(e, d.x, d.y);
        if ((A.next = (A.next === undefined ? 0.2 : A.next) - dt) > 0) return;
        if (A.hits >= A.max) { e.act = null; return; }
        A.hits++; A.next = 1.25; const C = BB.CALLINGS[e.calling]; play(this, e, (C.basic || ['Attack1'])[0]);
        this.later(0.22, () => { if (!this.ents.includes(e)) return; const dist = hyp(d.x - e.x, d.y - e.y), sp = { arrow: 13, bolt: 9, light: 10 }[C.proj] || 9, el = e.ench || (C.proj === 'bolt' ? BB.heroElem(e.hero) : null);
          this.shoot(e, d.x, d.y, C.proj || 'bolt', 1, { life: dist / sp, elem: el, hue: el ? BB.ELEMENTS[el].hue : undefined });
          this.later(dist / sp, () => { d.wv += (R() < 0.5 ? -1 : 1) * 6; d.flash = 0.2; if (el && this.onTrait) this.onTrait(e, d, el, 10, A.hits === A.max); else this.addFx('buff9', d.x, d.y, { sc: 0.22, add: true }); }); });
        return;
      }
      if (A.kind === 'fire') { // a while by the fire
        if (!A.there) { if (this.moveToward(e, A.x, A.y, dt, 0.5)) { A.there = true; A.t = 0; } else if (A.t > 6) e.act = null; return; }
        this.face(e, D.fire.x, D.fire.y); e.state = 'idle'; this.setClip(e, 'Idle');
        if ((A.next = (A.next || 1.2) - dt) <= 0) { A.next = 2 + R() * 2; if (R() < 0.5) say(e, pick(['♪', '…', '♥']), 1.4); }
        if (A.t > A.dur) e.act = null;
        return;
      }
      if (A.kind === 'spar' || A.kind === 'chat') {
        if (!tgt) { e.act = null; return; }
        const mx = (e.home.x + tgt.home.x) / 2, my = (e.home.y + tgt.home.y) / 2, side = A.lead ? -1 : 1, gap = A.kind === 'spar' ? 0.55 : 0.6;
        if (!A.there) { if (this.moveToward(e, mx + side * gap * 0.7, my - side * gap * 0.7, dt, 0.55)) A.there = true; return; }
        this.face(e, tgt.x, tgt.y);
        if (A.t > A.dur) { e.act = null; return; }
        if (A.kind === 'spar') { if ((A.next = (A.next || (A.lead ? 0.2 : 0.75)) - dt) <= 0) { A.next = 1.1 + R() * 0.5; play(this, e, pick((BB.CALLINGS[e.calling].basic) || ['Attack1']));
          this.later(0.16, () => { if (!this.ents.includes(tgt)) return; const s = { x: (e.x + tgt.x) / 2, y: (e.y + tgt.y) / 2 }; this.addFx('buff9', s.x, s.y, { sc: 0.25, add: true }); BB.sfx && UI_on() && BB.sfx('guard'); }); } }
        else if ((A.next = (A.next || (A.lead ? 0.1 : 0.9)) - dt) <= 0) { A.next = 1.6 + R(); say(e, pick(EMO), 1.3); if (R() < 0.3) play(this, e, 'Taunt', true); }
        if (e.state !== 'attack') this.setClip(e, 'Idle');
        return;
      }
      if (A.kind === 'wander') { if (this.moveToward(e, A.x, A.y, dt, 0.4) || A.t > 4) e.act = null; return; }
    }
    // home: rest a while, then pick something to do
    if (hyp(e.x - e.home.x, e.y - e.home.y) > 0.15) { this.moveToward(e, e.home.x, e.home.y, dt, 0.55); return; }
    this.face(e, e.home.x + 2, e.home.y - 2); // towards where the enemy will be
    e.state = 'idle'; this.setClip(e, 'Idle');
    if (e.drillT > 0) return;
    e.drillT = 2.5 + R() * 4;
    const mates = this.heroList.filter((x) => x !== e && !x.act && !x.dead);
    let k = pick(ACTS);
    const C0 = BB.CALLINGS[e.calling], ranged = !!C0.ranged, healer = e.calling === 'warpriest';
    if (k === 'mend' && (!healer || !mates.length)) k = healer ? 'show' : 'train';
    if (k === 'fire' && !D.fire) k = 'wander';
    if ((k === 'spar' || k === 'chat') && !mates.length) k = 'train';
    if (k === 'spar' && ranged) k = 'shoot';
    if (k === 'train' && ranged) k = 'shoot';
    if ((k === 'train' || k === 'shoot') && !D.dummies.length) k = 'show';
    if (k === 'train') { const dm = D.dummies.reduce((a, d) => (hyp(d.x - e.x, d.y - e.y) < hyp(a.x - e.x, a.y - e.y) ? d : a)); e.act = { kind: 'train', dummy: dm, hits: 0, max: 3 + Math.floor(R() * 3), t: 0 }; }
    else if (k === 'spar' || k === 'chat') { const m = pick(mates); const dur = k === 'spar' ? 4 + R() * 2 : 3.5 + R() * 2; e.act = { kind: k, with: m, lead: true, t: 0, dur }; m.act = { kind: k, with: e, lead: false, t: 0, dur }; }
    else if (k === 'wander') { const a = R() * TAU; e.act = { kind: 'wander', x: e.home.x + Math.cos(a) * 1.4, y: e.home.y + Math.sin(a) * 1.4, t: 0 }; }
    else if (k === 'stretch') play(this, e, 'Taunt', true);
    else if (k === 'shoot') { const dm = D.dummies.reduce((a, d) => (hyp(d.x - e.x, d.y - e.y) < hyp(a.x - e.x, a.y - e.y) ? d : a)); e.act = { kind: 'shoot', dummy: dm, hits: 0, max: 3 + Math.floor(R() * 2), t: 0 }; }
    else if (k === 'fire') { const a = R() * TAU; e.act = { kind: 'fire', x: D.fire.x + Math.cos(a) * 0.95, y: D.fire.y + Math.sin(a) * 0.95, t: 0, dur: 3.5 + R() * 3.5 }; }
    else if (k === 'mend') { const m = pick(mates); this.face(e, m.x, m.y); play(this, e, 'Special1', true); this.later(0.3, () => { if (this.ents.includes(m) && this.onHeal) { m.healFxT = 0; this.onHeal(m, 1); this.addFx('buff1', m.x, m.y, { sc: 0.45, add: true, hue: -160 }); } }); }
    else if (k === 'show') { // try out the signature: its clip, and a burst of its colour
      play(this, e, 'Special1', true);
      const I = BB.identityOf ? BB.identityOf(e.hero) : null, cls = I ? BB.CLASSES[I.cls] : null;
      this.later(0.16, () => { if (!this.ents.includes(e)) return; this.addFx(pick(['buff3', 'buff1', 'buff10', 'levelup']), e.x, e.y, { sc: 0.6, add: true });
        if (e.ench && this.onTrait) this.onTrait(e, { x: e.x + 0.6, y: e.y - 0.6, buffs: {} }, e.ench, 10, true);
        if (R() < 0.4) say(e, '★', 1.2); void I; void cls; });
    }
  };
  const UI_on = () => BB.UI && BB.UI.current === 'team';

  // ---------------------------------------------------------------- updates and drawing
  B.updateDrill = function (dt) {
    const D = this.drill; if (!D) return;
    for (const d of D.dummies) { d.wv += -d.wob * 60 * dt - d.wv * 6 * dt; d.wob += d.wv * dt; d.flash = Math.max(0, d.flash - dt); }
    for (const e of this.heroList) if (e.emote) { e.emote.t += dt; if (e.emote.t > e.emote.dur) e.emote = null; }
  };
  // a training dummy: a post, a crossbar, a straw body that rocks when struck
  B.drawDummy = function (g, d) {
    const s = BB.iso(d.x, d.y);
    g.save(); g.translate(s.x, s.y);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(0, 0, 8, 3.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#5a3d22'; g.fillRect(-1.2, -30, 2.4, 30);
    g.rotate(d.wob * 0.06); g.translate(0, -18);
    g.fillStyle = '#6b4a2a'; g.fillRect(-9, -9, 18, 2);
    g.fillStyle = d.flash > 0 ? '#fff4d0' : '#c9a35a'; g.beginPath(); g.ellipse(0, -2, 5.5, 8, 0, 0, TAU); g.fill();
    g.fillStyle = d.flash > 0 ? '#fff' : '#b48a44'; g.fillRect(-5, -2, 10, 1.2); g.fillRect(-5, 2, 10, 1.2);
    g.fillStyle = d.flash > 0 ? '#fff4d0' : '#d8b46a'; g.beginPath(); g.arc(0, -13, 3.6, 0, TAU); g.fill();
    g.strokeStyle = '#7a2a20'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, -2, 2.4, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, -2, 0.8, 0, TAU); g.stroke();
    g.restore();
  };
  // a small floating word over a hero's head: what they are saying
  B.drawDrillEmotes = function (g) {
    for (const e of this.heroList) {
      if (!e.emote) continue;
      const s = BB.iso(e.x, e.y), k = e.emote.t / e.emote.dur, a = Math.min(1, k * 6, (1 - k) * 4), y = s.y - 50 * (e.sc || 1) - k * 4;
      g.save(); g.globalAlpha = a; g.font = '700 7px Outfit, sans-serif'; g.textAlign = 'center';
      const w = g.measureText(e.emote.txt).width + 7;
      g.fillStyle = 'rgba(12,14,20,0.82)'; g.beginPath(); g.roundRect ? g.roundRect(s.x - w / 2, y - 7, w, 10, 4) : g.rect(s.x - w / 2, y - 7, w, 10); g.fill();
      g.beginPath(); g.moveTo(s.x - 2, y + 3); g.lineTo(s.x, y + 5.5); g.lineTo(s.x + 2, y + 3); g.fill();
      g.fillStyle = '#ffe7a3'; g.fillText(e.emote.txt, s.x, y + 0.5);
      g.restore();
    }
  };
})();
