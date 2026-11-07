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
      const c = st.clearing, u = Object.values(st.units).find(x => x.leader);
      const far = { x: (c.x - 26) * TS, y: (c.y - 18) * TS };
      R.fogTarget = 0; R.fogA = 0;
      return { speed: 1, keepCam: true, onEnd: () => { R.fogTarget = 1; }, shots: [
        { dur: 0.01, to: { x: far.x, y: far.y, z: 1.1 }, fade: [1, 1] },
        { dur: 5.5, to: { x: far.x + 9 * TS, y: far.y + 3 * TS, z: 1.15 }, fade: [1, 0], text: '' },
        { dur: 6, to: { x: (c.x - 6) * TS, y: (c.y - 10) * TS, z: 1.0 }, title: 'HOLDFAST', sub: 'Ninety years after the Fall' },
        { dur: 5, to: { x: (c.x - 2) * TS, y: (c.y - 2) * TS, z: 1.2 }, text: 'The old world is bones under the trees.' },
        { dur: 5, to: { x: u.x, y: u.y - 20, z: 2.1 }, text: () => u.name.split(' ')[0] + ' has walked for eleven days.', at: () => { u.task = { t: 'move', x: c.x - 4, y: c.y + 3, manual: true }; } },
        { dur: 4, to: { x: (c.x - 2) * TS, y: (c.y + 1) * TS, z: 1.8 }, text: 'No roof. No fire. No one.', at: () => { R.fogTarget = 1; } },
      ] };
    },
    fire(st, e) { const b = st.buildings[e.bid]; if (!b) return null; const x = (b.x + 2.5) * TS, y = (b.y + 1.5) * TS; return { speed: 0.4, shots: [{ dur: 2.2, to: { x, y, z: 2.6 }, text: 'Fire.' }, { dur: 1.6, to: { x, y, z: 2.2 }, text: 'Something to come back to.' }] }; },
    firstNight(st) { const h = S.heart(st) || { x: st.clearing.x, y: st.clearing.y, w: 5, h: 3 }; const x = (h.x + 2.5) * TS, y = (h.y + 1.5) * TS; return { speed: 0.5, shots: [{ dur: 3, to: { x, y: y - 40, z: 1.0 }, title: 'Night One' }, { dur: 2.5, to: { x: x + 120, y: y - 60, z: 1.1 }, text: 'Stay close to the fire.' }] }; },
    dawn1(st) { const h = S.heart(st); if (!h) return null; return { speed: 0.6, shots: [{ dur: 3.2, to: { x: (h.x + 2.5) * TS, y: (h.y + 1.5) * TS, z: 1.5 }, title: 'Dawn', sub: 'You are still alive.' }] }; },
    stranger(st, e) { const u = st.units[e.uid]; if (!u) return null; return { speed: 0.6, shots: [{ dur: 2.2, to: { x: u.x, y: u.y - 20, z: 2.0 }, text: 'Someone is coming.' }, { dur: 1.4, to: { x: u.x, y: u.y - 20, z: 2.2 } }] }; },
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
    held(st) { const h = S.heart(st); if (!h) return null; return { speed: 0.5, shots: [{ dur: 3, to: { x: (h.x + 2.5) * TS, y: (h.y + 1.5) * TS, z: 1.3 }, title: 'The camp holds' }] }; },
  };
  function raidScene(st, e, title, text) {
    const foes = S.foes(st); if (!foes.length) return null;
    let mx = 0, my = 0; for (const f of foes) { mx += f.x; my += f.y; } mx /= foes.length; my /= foes.length;
    for (const f of foes) S.reveal(st, Math.floor(f.x / TS), Math.floor(f.y / TS), 4);
    return { speed: 0.25, shots: [{ dur: 1.6, to: { x: mx, y: my, z: 1.6 }, at: () => { HF.AU && HF.AU.sfx('horn'); R.shake = 1; } }, { dur: 2.2, to: { x: mx, y: my - 20, z: 1.9 }, title, sub: text }] };
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
  C.skip = function () { if (!C.active) return; const a = C.active; if (a.id === 'opening') { const last = a.shots[a.shots.length - 1]; R.cam.x = last.to.x; R.cam.y = last.to.y; R.cam.z = last.to.z; for (const s of a.shots) if (s.at && a.shots.indexOf(s) > a.i) s.at(); } end(true); };
  C.update = function (dt, st) {
    if (!C.active && C.queue.length) start(st);
    if (C.returnTo) { const r = C.returnTo; r.t += dt / 0.9; const k = ease(Math.min(1, r.t)); R.cam.x = r.from.x + (r.to.x - r.from.x) * k; R.cam.y = r.from.y + (r.to.y - r.from.y) * k; R.cam.z = r.from.z + (r.to.z - r.from.z) * k; if (r.t >= 1) C.returnTo = null; }
    R.letter += ((C.active ? 1 : 0) - R.letter) * Math.min(1, dt * 4);
    const a = C.active; if (!a) return;
    const s = a.shots[a.i]; if (!s) { end(false); return; }
    a.t += dt; const k = ease(Math.min(1, a.t / s.dur));
    R.cam.x = a.from.x + (s.to.x - a.from.x) * k; R.cam.y = a.from.y + (s.to.y - a.from.y) * k; R.cam.z = a.from.z + (s.to.z - a.from.z) * k;
    if (s.fade) R.fade = s.fade[0] + (s.fade[1] - s.fade[0]) * Math.min(1, a.t / s.dur); else R.fade = Math.max(0, (R.fade || 0) - dt);
    if (a.t >= s.dur) { if (a.i >= a.shots.length - 1) end(false); else next(); }
  };
})();
