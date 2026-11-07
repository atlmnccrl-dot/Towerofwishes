// HOLDFAST - cinematics. In-engine camera moves over the live world, with letterbox bars and
// captions. Scenes: the opening, first fire, first night, the stranger, raids, first wall, the eras.
(function () {
  const HF = window.HF, D = HF.D, S = HF.Sim, R = HF.R;
  const TS = D.TILE;
  const C = HF.C = { active: null, queue: [], seen: {} };
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const capT = () => document.getElementById('cap-title'), capX = () => document.getElementById('cap-text');

  // Each scene returns shots: { dur, to: {x, y, z}, title, sub, text, fade: [from, to], at: fn }.
  const SCENES = {
    opening(st) {
      // A storm at night: the survivor runs from a raptor pack, reaches the clearing at dawn, and the
      // hunters (who only hunt at night) turn back. All of it on the real map, with the real sprites.
      const c = st.clearing, u = Object.values(st.units).find(x => x.leader);
      const S0 = { x: u.x, y: u.y };
      // Run in from the most open direction (fewest trees, rocks and water on the way).
      let best = null, bs = 1e9; const N = D.W;
      for (let k = 0; k < 16; k++) { const ang = k / 16 * Math.PI * 2; let sc = 0; for (let d = 2; d <= 15; d++) for (const w of [-1, 0, 1]) { const tx = Math.round(S0.x / TS + Math.cos(ang) * d - Math.sin(ang) * w), ty = Math.round(S0.y / TS + Math.sin(ang) * d + Math.cos(ang) * w); if (tx < 2 || ty < 2 || tx >= N - 2 || ty >= D.H - 2) { sc += 5; continue; } const i = ty * N + tx; if (st._.nodeAt[i]) sc += st.nodes[st._.nodeAt[i]].type === 'tree' ? 3 : 2; if (st.terrain[i] === D.T.WATER) sc += 6; } if (Math.abs(Math.sin(ang)) > 0.8) sc += 4; if (sc < bs) { bs = sc; best = ang; } }
      const A0 = { x: S0.x + Math.cos(best) * 15 * TS, y: S0.y + Math.sin(best) * 15 * TS };
      const sm = t => t * t * (3 - 2 * t), cl = (v, a, b) => v < a ? a : v > b ? b : v;
      const run = T => { const k = cl((T - 1.5) / 6.5, 0, 1); const e = 1 - Math.pow(1 - k, 1.6); return { x: A0.x + (S0.x - A0.x) * e, y: A0.y + (S0.y - A0.y) * e + Math.sin(T * 3) * 6 * (1 - k) }; };
      const hero = { set: u.set, clip: 'Idle', x: A0.x, y: A0.y, dir: 0, t0: 0 };
      const raps = [0, 1, 2].map(i => ({ set: 'dino_raptor', clip: 'Run', x: A0.x - 400, y: A0.y, dir: 0, alpha: 0, off: [-10, 34, -40][i], lag: 1.0 + i * 0.35 }));
      const flash = () => { R.flash = 0.85; HF.AU && HF.AU.thunder(); };
      let flashed = {};
      u.cineHide = true; st.weather.rain = true; st.hours = 3; R.fogTarget = 0; R.fogA = 0;
      R.actors = [hero, ...raps]; R.extraLights = [];
      HF.AU && HF.AU.set({ rain: true, night: true, menu: false });
      const cleanup = () => { u.cineHide = false; R.actors = []; R.extraLights = []; st.weather.rain = false; st.hours = 7; R.fogTarget = 1; R.flash = 0; R.cam.x = S0.x; R.cam.y = S0.y - 20; R.cam.z = 1.8; const ct = capT(); if (ct) ct.classList.remove('slam'); HF.AU && HF.AU.set({ rain: false, night: false }); };
      const tick = (T, dt) => {
        // the hero
        const p = run(T); const moving = T > 1.5 && T < 8;
        hero.dir = moving ? Math.atan2(p.y - hero.y, p.x - hero.x) || hero.dir : T > 9 && T < 11 ? best : hero.dir;
        hero.x = p.x; hero.y = p.y; hero.clip = T < 1.5 ? 'CrouchIdle' : moving ? 'Run' : T > 14.6 && T < 16.2 ? 'CrouchIdle' : 'Idle';
        // the pack: closes in behind, stops at the tree line as the sky lightens, then turns tail
        for (const r of raps) {
          if (T < 4) { r.alpha = 0; continue; }
          const back = best, px = -Math.sin(back), py = Math.cos(back);
          if (T < 8.4) { const q = run(T - r.lag); const nx = q.x + Math.cos(back) * 40 + px * r.off, ny = q.y + Math.sin(back) * 40 + py * r.off; r.dir = Math.atan2(ny - r.y, nx - r.x) || r.dir; r.x = nx; r.y = ny; r.alpha = Math.min(1, (T - 4) * 2); r.clip = 'Run'; }
          else if (T < 10.2) { r.clip = T < 9.4 ? 'Attack' : 'Idle'; r.dir = back + Math.PI; }
          else { r.clip = 'Run'; r.dir = back; r.x += Math.cos(back) * 170 * dt; r.y += Math.sin(back) * 170 * dt; r.alpha = Math.max(0, 1 - (T - 10.2) / 1.4); }
        }
        if (T > 4 && !flashed.s1) { flashed.s1 = 1; HF.AU && HF.AU.screech(raps[0].x, raps[0].y); }
        if (T > 8.6 && !flashed.s2) { flashed.s2 = 1; HF.AU && HF.AU.screech(raps[1].x, raps[1].y); }
        for (const ft of [1.0, 5.4, 7.3]) if (T > ft && !flashed[ft]) { flashed[ft] = 1; flash(); }
        // the sky
        st.hours = T < 8 ? 3 + T * 0.04 : T < 12.5 ? 3.32 + (T - 8) / 4.5 * 2.9 : Math.min(7, 6.22 + (T - 12.5) * 0.15);
        if (T > 11.2) { st.weather.rain = false; HF.AU && HF.AU.set({ rain: false, night: false }); }
        R.extraLights = st.hours < 5.5 ? [{ x: hero.x + 6, y: hero.y - 26, r: 3.4 * TS }] : [];
        if (T > 12.1 && !flashed.title) { flashed.title = 1; R.shake = 2.2; HF.AU && (HF.AU.play('blow_big', 0.9, 0.7), HF.AU.swell(4, 82)); const ct = capT(); if (ct) { ct.classList.remove('slam'); void ct.offsetWidth; ct.classList.add('slam'); } }
      };
      const follow = (z, dy) => () => ({ x: hero.x, y: hero.y - (dy || 20), z });
      return { speed: 0, keepCam: true, tick, onEnd: cleanup, shots: [
        { dur: 0.01, to: { x: A0.x, y: A0.y - 60, z: 1.0 }, fade: [1, 1] },
        { dur: 2.5, to: { x: A0.x, y: A0.y - 30, z: 1.2 }, fade: [1, 0.1] },
        { dur: 3.0, to: follow(1.75), text: 'Night. Rain. Something is hunting.' },
        { dur: 2.9, to: () => ({ x: hero.x + Math.cos(best) * 60, y: hero.y + Math.sin(best) * 60 - 10, z: 1.35 }), text: '' },
        { dur: 3.6, to: () => ({ x: hero.x + Math.cos(best) * 90, y: hero.y + Math.sin(best) * 90 - 20, z: 1.5 }), text: 'They only hunt at night.' },
        { dur: 3.4, to: { x: (c.x + 0.5) * TS - 40, y: (c.y - 1) * TS, z: 0.85 }, title: 'HOLDFAST', sub: 'Start with nothing. Build everything. Defend what you create.' },
        { dur: 2.6, to: follow(1.8), text: () => u.name.split(' ')[0] + ' survived the night. Now find shelter before the next one.' },
      ] };
    },
    fire(st, e) { const b = st.buildings[e.bid]; if (!b) return null; const x = (b.x + 2.5) * TS, y = (b.y + 1.5) * TS; return { speed: 0.4, shots: [{ dur: 2.2, to: { x, y, z: 2.6 }, text: 'Fire.' }, { dur: 1.6, to: { x, y, z: 2.2 }, text: 'Something to come back to.' }] }; },
    firstNight(st) { const h = S.heart(st) || { x: st.clearing.x, y: st.clearing.y, w: 5, h: 3 }; const x = (h.x + 2.5) * TS, y = (h.y + 1.5) * TS; return { speed: 0.5, shots: [{ dur: 3, to: { x, y: y - 40, z: 1.0 }, title: 'Night One' }, { dur: 2.5, to: { x: x + 120, y: y - 60, z: 1.1 }, text: 'The raptors come back at night. Stay close to the fire.' }] }; },
    dawn1(st) { const h = S.heart(st); if (!h) return null; return { speed: 0.6, shots: [{ dur: 3.2, to: { x: (h.x + 2.5) * TS, y: (h.y + 1.5) * TS, z: 1.5 }, title: 'Dawn', sub: 'You are still alive.' }] }; },
    stranger(st, e) { const u = st.units[e.uid]; if (!u) return null; S.reveal(st, Math.floor(u.x / TS), Math.floor(u.y / TS), 3); R.fogTarget = 0.35; return { speed: 0.6, onEnd: () => { R.fogTarget = 1; }, shots: [{ dur: 2.2, to: { x: u.x, y: u.y - 20, z: 2.0 }, text: u.side === 'n' ? 'A trader\'s cart on the track.' : 'Someone is coming.' }, { dur: 1.4, to: { x: u.x, y: u.y - 20, z: 2.2 } }] }; },
    firstWall(st, e) { const b = st.buildings[e.bid]; if (!b) return null; return { speed: 0.5, shots: [{ dur: 3, to: { x: (b.x + 0.5) * TS, y: (b.y + 0.5) * TS, z: 2.2 }, text: 'A wall. A line between us and the dark.' }] }; },
    firstRaid(st, e) { return raidScene(st, e, 'RAIDERS', 'Ash Raiders have come for your stores.'); },
    raid(st, e) { if (!e.boss && C.seen.raid && Math.random() < 0.6) return null; return raidScene(st, e, e.boss ? 'THE BONE WARLORD' : 'ATTACK', e.boss ? 'The dead march behind it.' : 'They are at the edge of camp.'); },
    era(st, e) {
      const h = S.heart(st); if (!h) return null; const x = (h.x + 2.5) * TS, y = (h.y + 1.5) * TS;
      return { speed: 0.3, shots: [
        { dur: 2.5, to: { x, y, z: 2.0 }, at: () => { for (let i = 0; i < 6; i++) R.addFx('sparkles', x + (Math.random() - 0.5) * 160, y + (Math.random() - 0.5) * 80, 1.5); HF.AU && HF.AU.swell(5, 98); } },
        { dur: 4, to: { x, y: y - 40, z: 0.85 }, title: D.ERAS[e.era].toUpperCase(), sub: 'The ' + D.ERAS[e.era - 1] + ' becomes a ' + D.ERAS[e.era] + '.' },
      ] };
    },
    bossfall(st, e) { return bossScene(e, 'THE TYRANT HAS FALLEN', 'The forest will remember this night.'); },
    bossflee(st, e) { return bossScene(e, 'THE TYRANT RETREATS', 'Wounded. It will be back.'); },
    held(st) { const h = S.heart(st); if (!h) return null; const x = (h.x + 2.5) * TS, y = (h.y + 1.5) * TS; return { speed: 0.4, shots: [{ dur: 1.4, to: { x, y, z: 1.4 }, at: () => HF.AU && HF.AU.swell(3.5, 110) }, { dur: 2.6, to: { x, y: y - 30, z: 0.85 }, title: 'THE CAMP HOLDS', sub: 'Count the living. Mend the walls.' }] }; },
  };
  function bossScene(e, title, sub) {
    return { speed: 0.12, shots: [
      { dur: 1.3, to: { x: e.x, y: e.y - 70, z: 2.2 }, at: () => { R.flash = 0.7; R.shake = 2.5; R.addFx('shockwave', e.x, e.y - 40, 3); R.addFx('explosion_fire', e.x, e.y - 30, 1.5); HF.AU && (HF.AU.roar(e.x, e.y), HF.AU.swell(4, 73)); } },
      { dur: 2.6, to: { x: e.x, y: e.y - 60, z: 1.5 }, title, sub },
    ] };
  }
  function raidScene(st, e, title, text) {
    const foes = S.foes(st); if (!foes.length) return null;
    let mx = 0, my = 0; for (const f of foes) { mx += f.x; my += f.y; } mx /= foes.length; my /= foes.length;
    for (const f of foes) S.reveal(st, Math.floor(f.x / TS), Math.floor(f.y / TS), 4);
    R.fogTarget = 0.4;
    return { speed: 0.25, onEnd: () => { R.fogTarget = 1; }, shots: [{ dur: 1.6, to: { x: mx, y: my, z: 1.6 }, at: () => { HF.AU && HF.AU.sfx('horn'); R.shake = 1; } }, { dur: 2.2, to: { x: mx, y: my - 20, z: 1.9 }, title, sub: text }] };
  }

  C.play = function (id, st, e) {
    if (C.skipAll && id !== 'opening') return;
    if (['firstNight', 'dawn1', 'fire', 'firstWall', 'firstRaid', 'stranger'].includes(id) && C.seen[id] && id !== 'stranger') return;
    if (id === 'stranger' && C.seen.stranger && Math.random() < 0.5) return;
    C.queue.push({ id, e: e || {} });
  };
  C.busy = () => !!C.active;
  C.speed = () => C.active ? C.active.speed : 1;
  function start(st) {
    const q = C.queue.shift(); const sc = SCENES[q.id] && SCENES[q.id](st, q.e); if (!sc) return;
    C.seen[q.id] = true;
    C.active = Object.assign({ id: q.id, i: -1, t: 0, back: { x: R.cam.x, y: R.cam.y, z: R.cam.z } }, sc);
    document.body.classList.add('cine');
    next();
  }
  function next() {
    const a = C.active; a.i++; a.t = 0;
    const s = a.shots[a.i]; if (!s) return;
    a.from = { x: R.cam.x, y: R.cam.y, z: R.cam.z };
    if (s.at) s.at();
    const title = s.title || '', sub = s.sub || '', text = typeof s.text === 'function' ? s.text() : (s.text || '');
    const ct = capT(), cx = capX();
    if (ct) { ct.innerHTML = title ? title + (sub ? '<small>' + sub + '</small>' : '') : ''; ct.classList.toggle('show', !!title); }
    if (cx) { cx.textContent = text; cx.classList.toggle('show', !!text); }
  }
  function end(skipped) {
    const a = C.active; C.active = null;
    document.body.classList.remove('cine');
    const ct = capT(), cx = capX(); if (ct) ct.classList.remove('show'); if (cx) cx.classList.remove('show');
    R.fade = 0;
    if (!a.keepCam) C.returnTo = { from: { x: R.cam.x, y: R.cam.y, z: R.cam.z }, to: a.back, t: 0 };
    if (a.onEnd) a.onEnd(skipped);
    if (C.onEnd) C.onEnd(a.id, skipped);
  }
  C.skip = function () { if (!C.active) return; end(true); };
  C.update = function (dt, st) {
    if (!C.active && C.queue.length) start(st);
    if (C.returnTo) { const r = C.returnTo; r.t += dt / 0.9; const k = ease(Math.min(1, r.t)); R.cam.x = r.from.x + (r.to.x - r.from.x) * k; R.cam.y = r.from.y + (r.to.y - r.from.y) * k; R.cam.z = r.from.z + (r.to.z - r.from.z) * k; if (r.t >= 1) C.returnTo = null; }
    R.letter += ((C.active ? 1 : 0) - R.letter) * Math.min(1, dt * 4);
    const a = C.active; if (!a) return;
    const s = a.shots[a.i]; if (!s) { end(false); return; }
    a.t += dt; a.T = (a.T || 0) + dt; if (a.tick) a.tick(a.T, dt);
    const k = ease(Math.min(1, a.t / s.dur)); const to = typeof s.to === 'function' ? s.to() : s.to;
    R.cam.x = a.from.x + (to.x - a.from.x) * k; R.cam.y = a.from.y + (to.y - a.from.y) * k; R.cam.z = a.from.z + (to.z - a.from.z) * k;
    if (s.fade) R.fade = s.fade[0] + (s.fade[1] - s.fade[0]) * Math.min(1, a.t / s.dur); else R.fade = Math.max(0, (R.fade || 0) - dt);
    if (a.t >= s.dur) { if (a.i >= a.shots.length - 1) end(false); else next(); }
  };
})();
