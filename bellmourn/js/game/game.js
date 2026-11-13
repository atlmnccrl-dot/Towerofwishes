// The game: title, story, districts with lamps, locked-gate fights and bosses, death and retry,
// upgrades, saving, the ending. Owns the World (simulation) and turns its events into effects.
import * as THREE from '../../vendor/three.module.min.js';
import { World, angTo } from './sim.js';
import { HERO } from './defs.js';
import { buildLevel, K } from '../world/level.js';
import { OPENING, SHARDS, ENDING, CREDITS, TIPS, DISTRICTS } from './story.js';
import { shared } from '../engine/materials.js';
import { COL } from '../engine/ui.js';
import { setTargetHeight } from '../engine/renderer.js';
const QUALITY = [{ label: 'SHARP', h: 200 }, { label: 'BALANCED', h: 175 }, { label: 'FAST', h: 150 }];
import LEVELS from '../world/levels/index.js';
import { makeAutoplay } from './autoplay.js';
import { BOSS_AI } from './ai.js';

const SAVE_KEY = 'bellmourn.save.v1', SET_KEY = 'bellmourn.settings.v1';
export function freshSave() { return { level: 'gate', lamp: null, cleared: {}, items: {}, bosses: {}, embers: 0, up: { hp: 0, blade: 0, tonic: 0 }, unlock: {}, deaths: 0, time: 0, done: false }; }
function load(key, def) { try { const s = JSON.parse(localStorage.getItem(key)); return s ? { ...def, ...s } : def; } catch (e) { return def; } }
function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } }

export const UPGRADES = [
  { id: 'hp', label: 'VITALITY', max: 10, cost: (n) => Math.round(40 * Math.pow(n + 1, 1.35)), desc: '+12 HEALTH' },
  { id: 'blade', label: 'BLADE', max: 10, cost: (n) => Math.round(50 * Math.pow(n + 1, 1.35)), desc: '+8% DAMAGE' },
  { id: 'tonic', label: 'TONIC', max: 3, cost: (n) => 120 * (n + 1), desc: '+1 TONIC FLASK' },
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const inZone = (e, z) => e && e.x >= z[0] && e.x <= z[2] && e.z >= z[1] && e.z <= z[3];

export class Game {
  constructor(sys) {
    Object.assign(this, sys); // r, atmos, fx, view, ui, input, sound
    this.save = load(SAVE_KEY, freshSave()); this.settings = load(SET_KEY, { sound: true, music: 0.55, shake: true, quality: 0 });
    this.applyQuality();
    this.sound.on = this.settings.sound; this.sound.musicVol = this.settings.music;
    this.state = 'boot'; this.t = 0; this.stateT = 0; this.sel = 0; this.camFocus = new THREE.Vector3(); this.zoom = 1; this.zoomTarget = 1;
    this.level = null; this.world = null; this.embersShown = this.save.embers; this.card = null;
    this.atmos.onThunder = (k) => this.sound.play('thunder', { delay: 0.3 + Math.random() * 0.9, vol: k, big: k > 0.9 });
  }

  // ------------------------------------------------------------------ levels
  heroStats() {
    const u = this.save.up;
    return { maxHp: HERO.maxHp + u.hp * 12, dmgMul: 1 + u.blade * 0.08, maxTonics: HERO.tonics + u.tonic, unlock: { ...this.save.unlock } };
  }

  async loadLevel(id, opts = {}) {
    const def = LEVELS[id]; if (!def) throw new Error('no level ' + id);
    this.loading = true;
    if (this.level) { this.r.scene.remove(this.level.group); }
    this.view.clear(); this.fx.clear();
    const L = await buildLevel(def);
    // lamps and chests are built by the game so they can change state
    const ctx = K.makeCtx(); L.lamps = (def.lamps || []).map((l) => ({ ...l, h: K.shrineLamp(ctx, l.x, l.z) }));
    L.chests = (def.items || []).map((it) => ({ ...it, h: K.chest(ctx, it.x, it.z, it.ry || 0) }));
    await K.finishCtx(ctx); L.group.add(ctx.group); L.solids.push(...ctx.solids); L.lights.push(...ctx.lights); L.anims.push(...L.chests.map((c) => c.h));
    for (const c of L.chests) if (this.save.items[id + ':' + c.id]) { c.h.open = true; c.h.t = 1; c.h.lidPivot.rotation.x = -1.9; c.h.lock.visible = false; }
    for (const l of L.lamps) l.h.set(this.save.lamp === id + ':' + l.id || !!(this.save.litLamps || {})[id + ':' + l.id]);
    this.r.scene.add(L.group); this.level = L; this.levelId = id;
    this.atmos.setLevel(def.ambience || {}, L.lights);
    this.sound.setRain(def.ambience?.rain ?? 1);
    this.r.post.dawn = 0;
    this.loading = false;
    this.spawnWorld(opts);
  }

  // (Re)populate the level: hero at the lamp or the start, foes, encounters reset unless cleared.
  spawnWorld(opts = {}) {
    const def = this.level.def; const L = this.level;
    this.view.clear(); this.fx.clear();
    const w = this.world = new World({ solids: L.solids, bounds: def.bounds, seed: 11 + this.save.deaths });
    // gates back to their starting state
    for (const [name, g] of Object.entries(L.marks)) if (g && g.set) { const startOpen = (def.gatesOpen || []).includes(name); g.set(startOpen); g.t = startOpen ? 1 : 0; g.update(0.0001); }
    let sx = def.start.x, sz = def.start.z, face = def.start.face ?? Math.PI;
    const lampKey = this.save.lamp && this.save.lamp.startsWith(this.levelId + ':') ? this.save.lamp.split(':')[1] : null;
    if (!opts.fromStart && lampKey) { const l = L.lamps.find((x) => x.id === lampKey); if (l) { sx = l.x + (l.sx ?? 0); sz = l.z + (l.sz ?? 1.3); face = l.face ?? Math.PI; } }
    const hero = w.spawnHero(sx, sz, { ...this.heroStats(), face });
    this.hpGhost = hero.hp;
    const tier = def.tier || 0;
    for (const f of def.foes || []) w.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, rise: false, face: f.face });
    // encounters
    this.encs = (def.encounters || []).map((e) => ({ ...e, state: this.save.cleared[this.levelId + ':' + e.id] ? 'done' : 'idle', wave: -1, mine: [], delay: 0 }));
    for (const e of this.encs) {
      if (e.state === 'done') { for (const g of e.opens || []) this.gate(g, true, true); continue; }
      if (e.waves[0] && e.waves[0].pre) { e.mine = e.waves[0].foes.map((f) => w.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, rise: false, face: f.face })); e.wave = 0; e.preSpawned = true; }
    }
    // boss
    this.boss = null; this.bossState = this.save.bosses[this.levelId] ? 'done' : 'idle';
    if (this.bossState === 'done') for (const g of def.boss?.opens || []) this.gate(g, true, true);
    this.hints = (def.hints || []).map((h) => ({ ...h, shown: false }));
    this.camFocus.set(hero.x, 0, hero.z); this.r.focus.copy(this.camFocus);
    this.deadT = 0; this.prompt = null;
  }

  gate(name, open, instant = false) {
    const g = this.level.marks[name]; if (!g) return;
    if (g.solid.open === open && !instant) return;
    g.set(open); if (instant) { g.t = open ? 1 : 0; g.update(0.0001); } else this.sound.play('gate');
  }

  persist() { store(SAVE_KEY, this.save); }
  saveSettings() { store(SET_KEY, this.settings); }

  // ------------------------------------------------------------------ state machine
  go(state) { this.state = state; this.stateT = 0; this.sel = 0; this.menuRects = []; }

  async start() {
    const q = new URLSearchParams(location.search);
    if (q.get('auto') && !this.auto) { this.auto = makeAutoplay(+q.get('auto') || 3); this.timeScale = +(q.get('speed') || 1); this.debug = { god: q.get('god') === '1' }; }
    if (q.get('level') && !this.debugDone) {
      // debug: ?level=id [&boss=1] [&god=1] [&lamp=id] — straight into a district
      this.debugDone = true; this.debug = { god: q.get('god') === '1' };
      if (q.get('lamp')) this.save.lamp = q.get('level') + ':' + q.get('lamp');
      await this.enterLevel(q.get('level'), !q.get('lamp'));
      if (q.get('boss') === '1' && this.level.def.boss) { const B = this.level.def.boss; const h = this.world.hero; h.x = (B.zone[0] + B.zone[2]) / 2; h.z = B.zone[3] - 0.5; }
      return;
    }
    await this.loadLevel('gate', { fromStart: true });
    this.titleScene();
    this.go('title');
  }

  // The title: the courtyard as it was first seen, the warden among the hushed in the rain.
  titleScene() {
    const w = this.world; w.ents = []; w.hero = null;
    const hero = w.spawnHero(-0.6, 1.6, { ...this.heroStats(), face: Math.PI * 0.82 });
    for (const [x, z] of [[1.4, -2.6], [3.6, -0.6], [4.9, -4.6]]) { const f = w.spawnFoe('hushed', x, z, { rise: false }); f.face = angTo(f, hero); }
    this.titleCam = 0;
  }

  update(dt) {
    this.t += dt; this.stateT += dt;
    const inp = this.input.frame();
    if (this.auto) this.autoInput(inp, dt);
    this.input.playing = this.state === 'play';
    this.ui.touchMode = inp.touch;
    if (inp.taps.length || inp.confirm || inp.attackPressed) this.sound.unlock();
    shared.time.value = this.t;
    const S = this.state;
    if (S === 'title') this.title(dt, inp);
    else if (S === 'story') this.story(dt, inp);
    else if (S === 'play') this.play(dt, inp);
    else if (S === 'pause') this.pauseMenu(dt, inp);
    else if (S === 'lamp') this.lampMenu(dt, inp);
    else if (S === 'dead') this.dead(dt, inp);
    else if (S === 'bossIntro') this.bossIntro(dt, inp);
    else if (S === 'ending') this.ending(dt, inp);
    else if (S === 'controls') this.controls(dt, inp);
    else if (S === 'settings') this.settingsMenu(dt, inp);
    else if (S === 'credits') this.credits(dt, inp);
    this.renderFrame(dt);
  }

  // test autoplay: drives menus and the hero
  autoInput(inp, dt) {
    const S = this.state;
    if (S === 'title' && this.stateT > 0.5) { this.save = freshSave(); this.persist(); this.embersShown = 0; this.enterLevel('gate', true); }
    else if (S === 'story') this.storyIdx = (this.storyLines || []).length;
    else if (S === 'lamp' && this.stateT > 0.3) this.go('play');
    else if (S === 'play' && this.world && !this.loading) Object.assign(inp, this.auto(this, dt), { pausePressed: false });
    else if (S === 'ending' && this.endT > 1.2) { this.endT = 0; this.endIdx++; }
  }

  // ------------------------------------------------------------------ title and menus
  menuInput(inp, items) {
    const n = items.length; let picked = -1;
    if (inp.up) { this.sel = (this.sel + n - 1) % n; this.sound.play('ui'); }
    if (inp.down) { this.sel = (this.sel + 1) % n; this.sound.play('ui'); }
    for (const tp of inp.taps) for (const r of this.menuRects || []) if (tp.x >= r.x && tp.x <= r.x + r.w && tp.y >= r.y && tp.y <= r.y + r.h) { this.sel = r.i; picked = r.i; }
    if (inp.confirm) picked = this.sel;
    if (picked >= 0 && items[picked] && items[picked].disabled) picked = -1;
    if (picked >= 0) this.sound.play('uiOk');
    return picked;
  }

  title(dt, inp) {
    this.sound.setMusic('title');
    const hasSave = !!(this.save.lamp || Object.keys(this.save.cleared).length || this.save.level !== 'gate' || this.save.done);
    this.titleItems = [hasSave ? { label: 'CONTINUE', id: 'cont' } : null, { label: 'NEW GAME', id: 'new' }, { label: 'CONTROLS', id: 'controls' }, { label: 'SETTINGS', id: 'settings' }, { label: 'CREDITS', id: 'credits' }].filter(Boolean);
    const p = this.menuInput(inp, this.titleItems);
    if (p >= 0) {
      const id = this.titleItems[p].id;
      if (id === 'new') { this.save = freshSave(); this.persist(); this.embersShown = 0; this.storyLines = OPENING; this.storyNext = 'enterGate'; this.go('story'); }
      else if (id === 'cont') this.enterLevel(this.save.level, false);
      else { this.back = 'title'; this.go(id); }
    }
  }

  story(dt, inp) {
    this.sound.setMusic('title');
    const idx = Math.floor(this.storyIdx || 0);
    if (this.stateT === dt) this.storyIdx = 0;
    const adv = inp.confirm || inp.taps.length || inp.attackPressed;
    if (inp.back) { this.storyIdx = this.storyLines.length; }
    else if (adv) { if (this.lineT < 0.6) this.lineT = 0.6; else { this.storyIdx = (this.storyIdx || 0) + 1; this.lineT = 0; } }
    this.lineT = (this.lineT || 0) + dt;
    if ((this.storyIdx || 0) >= this.storyLines.length) {
      const n = this.storyNext;
      if (n === 'enterGate') this.enterLevel('gate', true);
      else if (n === 'title') { this.storyNext = null; this.go('loading'); this.start(); }
      else if (n === 'credits') this.go('credits');
    }
  }

  async enterLevel(id, fromStart) {
    this.go('loading'); this.r.post.fade = 1;
    await this.loadLevel(id, { fromStart });
    this.save.level = id; this.persist();
    const def = LEVELS[id]; const n = DISTRICTS.indexOf(id);
    this.card = { t: 0, sup: 'DISTRICT ' + (ROMAN[n] || ''), title: def.name.toUpperCase(), line: def.tagline || '' };
    this.go('play'); this.fadeIn = 0;
  }

  controls(dt, inp) {
    if (inp.back || inp.confirm || inp.taps.length) { this.sound.play('ui'); this.go(this.back || 'title'); }
  }
  applyQuality() { const q = QUALITY[this.settings.quality || 0] || QUALITY[0]; setTargetHeight(q.h); this.r.resize(); }
  settingsMenu(dt, inp) {
    const s = this.settings;
    this.setItems = [{ label: 'SOUND: ' + (s.sound ? 'ON' : 'OFF') }, { label: 'MUSIC: ' + Math.round(s.music * 10) }, { label: 'SCREEN SHAKE: ' + (s.shake ? 'ON' : 'OFF') }, { label: 'PIXELS: ' + QUALITY[s.quality || 0].label }, { label: 'BACK' }];
    const p = this.menuInput(inp, this.setItems);
    if (p === 0) { s.sound = !s.sound; this.sound.setEnabled(s.sound); }
    if (p === 1 || (this.sel === 1 && (inp.left || inp.right))) { s.music = inp.left ? Math.max(0, s.music - 0.1) : (inp.right ? Math.min(1, s.music + 0.1) : (s.music >= 0.95 ? 0 : s.music + 0.1)); s.music = Math.round(s.music * 10) / 10; this.sound.setMusicVol(s.music); }
    if (p === 2) s.shake = !s.shake;
    if (p === 3) { s.quality = ((s.quality || 0) + 1) % QUALITY.length; this.applyQuality(); }
    if (p >= 0 && p < 4) this.saveSettings();
    if (p === 4 || inp.back) this.go(this.back || 'title');
  }
  credits(dt, inp) { if (this.stateT > 0.5 && (inp.back || inp.confirm || inp.taps.length)) { if (this.back === 'title') this.go('title'); else { this.go('loading'); this.start(); } } }

  pauseMenu(dt, inp) {
    this.pauseItems = [{ label: 'RESUME' }, { label: 'CONTROLS' }, { label: 'SETTINGS' }, { label: 'QUIT TO TITLE' }];
    const p = this.menuInput(inp, this.pauseItems);
    if (inp.pausePressed || inp.back || p === 0) { this.go('play'); return; }
    if (p === 1) { this.back = 'pause'; this.go('controls'); }
    if (p === 2) { this.back = 'pause'; this.go('settings'); }
    if (p === 3) { this.persist(); this.go('loading'); this.start(); }
  }

  lampMenu(dt, inp) {
    const items = UPGRADES.map((u) => { const n = this.save.up[u.id]; const c = u.cost(n); return { label: u.label + ' ' + (n >= u.max ? 'MAX' : n), note: n >= u.max ? '' : c + ' EMBERS', disabled: n >= u.max || this.save.embers < c, u }; });
    items.push({ label: 'LEAVE' }); this.lampItems = items;
    const p = this.menuInput(inp, items);
    if (inp.back || p === items.length - 1) { this.go('play'); return; }
    if (p >= 0 && items[p].u) {
      const u = items[p].u; const c = u.cost(this.save.up[u.id]);
      if (this.save.embers >= c) {
        this.save.embers -= c; this.save.up[u.id]++; this.persist(); this.sound.play('lamp');
        const h = this.world.hero; const st = this.heroStats(); h.maxHp = st.maxHp; h.hp = h.maxHp; h.stats = { ...h.stats, ...st }; h.tonics = st.maxTonics;
        this.ui.toast(u.label + ' RISES', { color: COL.gold });
      }
    }
  }

  dead(dt, inp) {
    this.world.update(dt, null);
    this.r.post.desat = Math.min(0.85, this.stateT * 0.5);
    if (this.stateT > 3.2 || (this.stateT > 1.2 && (inp.confirm || inp.taps.length))) {
      this.save.deaths++; this.persist(); this.r.post.desat = 0;
      this.spawnWorld(); this.go('play'); this.fadeIn = 0; this.ui.toast(TIPS[this.save.deaths % TIPS.length], { life: 4.5, color: COL.dim });
    }
  }

  // ------------------------------------------------------------------ play
  play(dt, inp) {
    const w = this.world; const hero = w.hero; const def = this.level.def;
    if (inp.pausePressed) { this.go('pause'); return; }
    this.save.time += dt;
    if (this.debug && this.debug.god) { w.hero.hp = w.hero.maxHp; }
    w.update(dt * (this.timeScale || 1), inp);
    this.handleEvents(w.drain());
    if (this.state !== 'play') return;
    // lamps, chests
    this.prompt = null; let near = null, nearChest = null;
    for (const l of this.level.lamps) if (Math.hypot(hero.x - l.x, hero.z - l.z) < 1.9) near = l;
    for (const c of this.level.chests) if (!c.h.open && Math.hypot(hero.x - c.x, hero.z - c.z) < 1.7) nearChest = c;
    const calm = !w.combat;
    if (near && calm) this.prompt = near.h.lit ? 'REST AT THE LAMP' : 'LIGHT THE LAMP';
    else if (nearChest) this.prompt = 'OPEN';
    if (inp.interactPressed && this.prompt) {
      if (near && calm) this.useLamp(near);
      else if (nearChest) this.openChest(nearChest);
    }
    // hints
    if (!this.card) for (const h of this.hints) if (!h.shown && inZone(hero, h.zone)) { h.shown = true; this.ui.toast(inp.touch && h.touch ? h.touch : h.text, { life: h.life || 4, color: COL.ice }); }
    // encounters
    for (const e of this.encs) this.runEncounter(e, dt);
    // boss
    const B = def.boss;
    if (B && this.bossState === 'idle' && inZone(hero, B.zone)) this.startBoss();
    // exit
    if (def.exit && inZone(hero, def.exit.zone) && (!def.exit.requires || this.bossState === 'done') && !this.leaving) {
      this.leaving = true; const to = def.exit.to;
      this.save.lamp = null; this.persist();
      setTimeout(() => { this.leaving = false; if (to === 'end') this.go('ending'); else this.enterLevel(to, true); }, 650);
      this.fadeOut = 0;
    }
    // music
    this.sound.setMusic(this.boss && !this.boss.dead ? 'boss' : (w.combat ? 'combat' : 'explore'));
    // footsteps
    if (hero.state === 'run' && (this.stepT = (this.stepT || 0) - dt) <= 0) { this.stepT = 0.27; this.sound.play('step'); if (Math.random() < 0.5) this.fx.splash(hero.x, hero.z, 3); }
  }

  useLamp(l) {
    const hero = this.world.hero;
    if (!l.h.lit) { l.h.set(true); this.sound.play('lamp'); this.fx.embers(l.x, 3.3, l.z, 30); this.ui.toast('LAMP LIT', { color: COL.gold, big: true, life: 2 }); this.save.litLamps = { ...(this.save.litLamps || {}), [this.levelId + ':' + l.id]: true }; }
    this.save.lamp = this.levelId + ':' + l.id; this.persist();
    hero.hp = hero.maxHp; hero.tonics = hero.stats.maxTonics; this.sound.play('heal');
    this.go('lamp');
  }

  openChest(c) {
    c.h.open = true; this.save.items[this.levelId + ':' + c.id] = true;
    const amt = c.amount || 60; this.sound.play('uiOk'); this.fx.embers(c.x, 0.8, c.z, 30, [3, 2, 0.6]);
    if (c.kind === 'tonic') { this.save.up.tonic = Math.min(UPGRADES[2].max, this.save.up.tonic + 1); const h = this.world.hero; h.stats.maxTonics = this.heroStats().maxTonics; h.tonics++; this.ui.toast('A TONIC FLASK', { color: COL.gold }); }
    else { this.save.embers += amt; this.ui.toast('+' + amt + ' EMBERS', { color: COL.gold }); }
    this.persist();
  }

  runEncounter(e, dt) {
    const w = this.world; const hero = w.hero;
    if (e.state === 'idle' && inZone(hero, e.zone)) {
      e.state = 'active'; for (const g of e.gates || []) this.gate(g, false);
      if (e.msg) this.ui.toast(e.msg, { color: COL.red });
      if (e.preSpawned) { for (const f of e.mine) { f.ai.aggro = true; f.ai.locked = true; } }
      else this.spawnWave(e, 0);
    }
    if (e.state !== 'active') return;
    if (e.mine.every((f) => f.dead)) {
      e.delay += dt; if (e.delay < 0.9) return; e.delay = 0;
      if (e.wave + 1 < e.waves.length) this.spawnWave(e, e.wave + 1);
      else {
        e.state = 'done'; this.save.cleared[this.levelId + ':' + e.id] = true; this.persist();
        for (const g of e.gates || []) this.gate(g, true); for (const g of e.opens || []) this.gate(g, true);
        this.ui.toast(e.done || 'THE WAY IS OPEN', { color: COL.gold });
      }
    }
  }
  spawnWave(e, i) {
    e.wave = i; const tier = this.level.def.tier || 0; const W = e.waves[i];
    e.mine = W.foes.map((f) => { const m = this.world.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, aggro: true }); m.ai.locked = true; return m; });
  }

  startBoss() {
    const B = this.level.def.boss; this.bossState = 'intro';
    for (const g of B.gates || []) this.gate(g, false);
    this.boss = this.world.spawnBoss(B.type, B.x, B.z, { face: B.face ?? 0, hpMul: B.hpMul || 1, dmgMul: B.dmgMul || 1 });
    this.boss.state = 'roar'; this.boss.anim = 'idle'; this.boss.t = -2; this.boss.iframes = 3.5;
    this.go('bossIntro'); this.sound.setMusic('none');
  }

  bossIntro(dt, inp) {
    const b = this.boss; const hero = this.world.hero;
    hero.anim = 'idle'; hero.state = 'idle';
    if (this.stateT > 1.0 && b.anim !== 'roar') { b.anim = 'roar'; b.animT = 0; this.sound.play('roar'); this.r.shake(0.5, 1.0); }
    b.animT += dt; hero.animT += dt;
    if (this.stateT > 3.6 || (this.stateT > 1.5 && (inp.confirm || inp.taps.length))) {
      b.state = 'idle'; b.anim = 'idle'; b.t = 0; b.iframes = 0; b.ai.cd = 1.2; this.bossState = 'fight';
      this.go('play'); this.sound.setMusic('boss');
    }
  }

  bossDown() {
    const B = this.level.def.boss; this.bossState = 'done'; this.save.bosses[this.levelId] = true;
    const shard = SHARDS[this.levelId];
    if (shard && shard.unlock) { this.save.unlock[shard.unlock] = true; this.world.hero.stats.unlock[shard.unlock] = true; }
    this.persist();
    for (const f of this.world.foes()) { f.hp = 0; this.world._kill(f, this.world.hero, {}); }
    this.sound.play('bigBell', { delay: 0.4 });
    setTimeout(() => {
      for (const g of B.opens || []) this.gate(g, true);
      if (shard && shard.gift) { this.ui.toast(shard.name, { color: COL.gold, big: true, life: 4 }); this.ui.toast(shard.gift + ': ' + shard.how, { color: COL.text, life: 6 }); }
      else if (shard) this.ui.toast(shard.name, { color: COL.gold, big: true, life: 4 });
    }, 1800);
  }

  // ------------------------------------------------------------------ ending
  ending(dt, inp) {
    const P = this.r.post;
    if (this.stateT === dt) { this.endIdx = 0; this.endT = 0; this.save.done = true; this.persist(); this.sound.play('bigBell'); this.sound.setMusic('dawn'); this.atmos.lightning = false; }
    P.dawn = Math.min(1, this.stateT / 8); this.atmos.rainOn = Math.max(0, 1 - this.stateT / 6); this.sound.setRain(this.atmos.rainOn);
    this.atmos.moon.intensity += (3.2 - this.atmos.moon.intensity) * dt * 0.3; this.atmos.moon.color.lerp(new THREE.Color(0xffc890), dt * 0.3);
    this.endT += dt;
    if (this.endT > 4 || (this.endT > 1 && (inp.confirm || inp.taps.length))) { this.endT = 0; this.endIdx++; }
    if (this.endIdx >= ENDING.length) { this.storyLines = CREDITS; this.storyNext = 'title'; this.go('story'); }
    if (this.world) { this.world.update(dt, null); this.handleEvents(this.world.drain()); }
  }

  // ------------------------------------------------------------------ events -> effects
  handleEvents(evs) {
    const fx = this.fx, snd = this.sound, r = this.r; const hero = this.world.hero;
    for (const ev of evs) {
      switch (ev.type) {
        case 'swing': if (ev.e === hero) snd.play(ev.atk.heavy ? 'swingHeavy' : 'swing'); else snd.play('swing', { vol: 0.6 }); break;
        case 'hit': {
          const d = ev.dst; const y = 1.0 * (d.def?.scale || 1);
          fx.sparks(d.x, y, d.z, ev.ang, ev.heavy ? 14 : 8);
          fx.blood(d.x, y, d.z, ev.ang, ev.heavy || ev.finisher ? 26 : 12);
          if (Math.random() < 0.6) fx.bloodPool(d.x, d.z, ev.heavy ? 1.2 : 0.8);
          if (ev.hero) { snd.play('heroHurt'); r.post.hurt = 0.7; }
          else snd.play(ev.heavy || ev.finisher ? 'hitHeavy' : 'hit');
          if (ev.special) fx.slashLine(d.x, 1.1, d.z, 2.6);
          if (ev.finisher) this.uiSlash = { t: 0.22, a: -0.5 + Math.random() * 0.3 };
          break;
        }
        case 'kill': {
          const e = ev.e; snd.play('kill'); snd.play('foeDie', { delay: 0.05 });
          fx.blood(e.x, 1, e.z, Math.random() * 6, 30); fx.mist(e.x, 0.8, e.z, 10, [0.15, 0.16, 0.2]); for (let i = 0; i < 3; i++) fx.bloodPool(e.x, e.z, 1.3);
          if (ev.drop) { this.save.embers += ev.drop; this.emberFly(e.x, e.z, ev.drop); }
          if (ev.boss) { this.bossDown(); r.shake(0.8, 1.2); this.zoomPunch = 1.3; fx.mist(e.x, 1.5, e.z, 60, [0.3, 0.3, 0.36]); fx.embers(e.x, 1.5, e.z, 60, [3, 1.4, 0.4]); fx.shockRing(e.x, e.z, 9, [2.6, 2.2, 1.6], 0.9); r.post.flash = 0.35; this.flashT = 0.12; }
          break;
        }
        case 'parry': fx.sparks(ev.x, 1.2, ev.z, Math.random() * 6, 28, [3, 2.8, 2.2]); fx.shockRing(ev.x, ev.z, 2.2, [2, 2, 2.4], 0.3); snd.play('parry'); r.post.flash = Math.max(r.post.flash, 0.25); this.flashT = 0.08; if (this.world.hero.stats.unlock.riposte) { hero.hp = Math.min(hero.maxHp, hero.hp + 6); } break;
        case 'perfect': snd.play('perfect'); this.view.get(hero) && fx.ghost(this.view.get(hero), [0.4, 0.8, 1.6], 0.5); this.ui.toast('PERFECT', { color: COL.ice, life: 0.9 }); break;
        case 'dash': snd.play('dash'); this.dashGhosts = 3; this.ghostT = 0; fx.dust(ev.e.x, ev.e.z, 5); break;
        case 'stagger': fx.shockRing(ev.e.x, ev.e.z, 1.6, [2.4, 2.2, 1.2], 0.35); snd.play('block'); break;
        case 'finisher': this.zoomPunch = 1.35; break;
        case 'heal': snd.play('heal'); fx.embers(ev.e.x, 1, ev.e.z, 16, [2.6, 0.5, 0.5]); break;
        case 'special': snd.play('special'); this.r.post.desat = 0.6; this.specialT = 1.6; this.zoomPunch = 1.2; fx.shockRing(ev.e.x, ev.e.z, 6.5, [3, 0.3, 0.25], 0.5); fx.embers(ev.e.x, 1, ev.e.z, 30, [3, 0.3, 0.25]); break;
        case 'specialHit': snd.play('slashA'); for (const f of this.world.foes()) if (Math.hypot(f.x - ev.e.x, f.z - ev.e.z) < 6.5) fx.slashLine(f.x, 1.1, f.z, 2.8); break;
        case 'tele': if (ev.e.boss || Math.random() < 0.7) snd.play('tele', { vol: ev.e.boss ? 1.4 : 0.8 }); break;
        case 'spawn': if (ev.e.state === 'spawn') { fx.mist(ev.e.x, 0.3, ev.e.z, 14, [0.25, 0.27, 0.32]); snd.play('rise', { vol: 0.6 }); } break;
        case 'fire': snd.play(ev.kind === 'bolt' ? 'bolt' : 'orb', { vol: 0.7 }); break;
        case 'projHit': fx.sparks(ev.p.x, ev.p.y ?? 1.1, ev.p.z, Math.random() * 6, 8, ev.p.kind === 'soul' ? [0.5, 2.5, 2.4] : [3, 0.6, 0.4]); break;
        case 'reflect': snd.play('clang'); break;
        case 'hazardGo': { const k = ev.h.kind; if (k === 'fire') snd.play('fire'); else if (k === 'water') snd.play('splash'); else if (k === 'toll') { snd.play('toll'); } else if (k === 'lightning') { snd.play('thunder', { vol: 0.8 }); this.atmos.flashT = 0.2; } else if (k === 'wax') snd.play('fire'); else snd.play('boom', { vol: 0.8 }); if (k !== 'fire') r.shake(0.25, 0.25); break; }
        case 'phase': snd.play('roar'); this.ui.toast(ev.e.def.name.toUpperCase() + ' RAGES', { color: COL.red, life: 2 }); fx.shockRing(ev.e.x, ev.e.z, 6, [2.4, 0.4, 0.3], 0.6); break;
        case 'blink': fx.mist(ev.fx, 1, ev.fz, 12, [0.6, 0.15, 0.2]); fx.mist(ev.x, 1, ev.z, 12, [0.6, 0.15, 0.2]); snd.play('vanish'); break;
        case 'vanish': fx.mist(ev.e.x, 1, ev.e.z, 30, [0.8, 0.8, 0.85]); snd.play('vanish'); break;
        case 'appear': fx.mist(ev.e.x, 1, ev.e.z, 20, [0.8, 0.8, 0.85]); snd.play('vanish'); break;
        case 'land': snd.play('boom'); fx.dust(ev.e.x, ev.e.z, 20); fx.shockRing(ev.e.x, ev.e.z, 3, [1.4, 1.4, 1.6], 0.35); break;
        case 'shake': if (this.settings.shake) r.shake(ev.amt * 0.5, 0.22); break;
        case 'heroDeath': snd.play('death'); this.ui.toast('', {}); this.go('dead'); break;
        case 'wave': snd.play('swingHeavy'); break;
        case 'block': fx.sparks(ev.x, 1.1, ev.z, Math.random() * 6, 10); snd.play('block'); break;
        case 'fullCharge': fx.embers(ev.e.x, 1, ev.e.z, 14, [3, 0.4, 0.3]); break;
        case 'summon': snd.play('rise'); break;
        case 'storm': this.atmos.flash(1); break;
        case 'foeStrike': if (ev.e.boss) snd.play('swingHeavy', { vol: 0.8 }); break;
      }
    }
  }

  emberFly(x, z, n) { this.fx.embers(x, 0.8, z, Math.min(18, 4 + n), [3, 1.6, 0.4]); this.sound.play('ember', { delay: 0.25 }); }

  // ------------------------------------------------------------------ frame
  renderFrame(dt) {
    const r = this.r, ui = this.ui, w = this.world;
    // camera
    let target = null; let zt = 1;
    if (this.state === 'title' || this.state === 'controls' && this.back === 'title' || this.state === 'settings' && this.back === 'title' || this.state === 'credits' || this.state === 'story' && this.storyNext === 'enterGate') {
      this.titleCam = (this.titleCam || 0) + dt; target = new THREE.Vector3(-0.8 + Math.sin(this.titleCam * 0.12) * 0.8, 0, -1.6 + Math.cos(this.titleCam * 0.1) * 0.5);
      if (w) { this.view.update(w, dt); for (const e of w.ents) e.animT += dt; }
    } else if (w && w.hero) {
      const h = w.hero; target = new THREE.Vector3(h.x + h.vx * 0.18, 0, h.z + h.vz * 0.18);
      if (this.state === 'bossIntro' && this.boss) { const k = Math.min(1, this.stateT / 1.0) * (this.stateT < 3.0 ? 1 : Math.max(0, 1 - (this.stateT - 3.0) / 0.6)); target.lerp(new THREE.Vector3(this.boss.x, 1.6 * (this.boss.def.scale || 1) * 0.6, this.boss.z), k * 0.85); zt = 1 + k * 0.25; }
      if (this.boss && !this.boss.dead && this.state === 'play') target.lerp(new THREE.Vector3(this.boss.x, 0, this.boss.z), 0.2);
      if (this.state !== 'title') this.view.update(w, dt);
    }
    if (target && !this.debugCamHold) this.camFocus.lerp(target, Math.min(1, dt * (this.state === 'play' ? 6 : 2.5)));
    if (this.zoomPunch) { zt = Math.max(zt, this.zoomPunch); this.zoomPunch = Math.max(1, this.zoomPunch - dt * 0.6); if (this.zoomPunch <= 1.001) this.zoomPunch = 0; }
    if (this.debugZoom) zt = this.debugZoom;
    this.zoom += (zt - this.zoom) * Math.min(1, dt * 5); r.setZoom(Math.abs(this.zoom - 1) < 0.004 ? 1 : this.zoom);
    r.focus.copy(this.camFocus);
    // dash afterimages
    if (this.dashGhosts > 0 && w && w.hero) { this.ghostT -= dt; if (this.ghostT <= 0) { this.dashGhosts--; this.ghostT = 0.05; const rig = this.view.get(w.hero); if (rig) this.fx.ghost(rig); } }
    // post
    const P = r.post; P.hurt = Math.max(0, P.hurt - dt * 1.6); if (this.state !== 'dead') P.desat = Math.max(0, P.desat - dt * (this.specialT > 0 ? 0.2 : 1.5)); this.specialT = (this.specialT || 0) - dt;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) P.flash = 0; }
    if (this.state === 'loading') P.fade = 1;
    else if (this.leaving) { this.fadeOut += dt; P.fade = Math.min(1, this.fadeOut / 0.6); }
    else if (this.fadeIn !== undefined && this.fadeIn < 1) { this.fadeIn += dt * 1.5; P.fade = Math.max(0, 1 - this.fadeIn); }
    else P.fade = this.state === 'story' && this.storyNext !== 'enterGate' ? 1 : (this.state === 'story' ? 0.72 : 0);
    if (this.state === 'dead') P.fade = Math.min(0.6, this.stateT * 0.25);
    // world-space helpers
    if (w && w.hero) { shared.cutFocus.value.set(w.hero.x, 1, w.hero.z); shared.cutDir.value.copy(r.fwd); }
    this.atmos.update(dt, r.focus, () => 0);
    if (this.level) for (const a of this.level.anims) a.update(dt);
    if (w) { this.fx.updateTeles(w.ents, this.t); this.fx.updateHazards(w.hazards, dt, this.t); this.fx.updateProjs(w.projs, this.t); }
    this.fx.update(dt, this.t);
    r.render(dt);
    // UI
    ui.clear(); this.embersShown += (this.save.embers - this.embersShown) * Math.min(1, dt * 6);
    this.drawUI(dt);
    this.sound.update();
  }

  drawUI(dt) {
    const ui = this.ui, W = ui.w, H = ui.h, S = this.state;
    if (S === 'title' || (S === 'controls' || S === 'settings' || S === 'credits') && this.back === 'title') {
      const a = Math.min(1, this.stateT * 0.8);
      ui.logo(W / 2, Math.round(H * 0.1), S === 'title' ? a : 0.35);
      if (S === 'title') {
        ui.text('RING THE BELL. BRING THE DAWN.', W / 2, Math.round(H * 0.1) + 34, { align: 'center', color: COL.dim, alpha: a });
        this.menuRects = ui.menu(this.titleItems || [], this.sel, Math.round(W * 0.2) + ui.safe.l, Math.round(H * 0.62), { align: 'center' });
        ui.text('V1.0', W - 4 - ui.safe.r, H - 10, { align: 'right', color: '#4a463e' });
      }
    }
    if (S === 'controls') this.drawControls();
    if (S === 'settings') { ui.frame(W / 2 - 80, H / 2 - 34, 160, 78); this.menuRects = ui.menu(this.setItems || [], this.sel, W / 2, H / 2 - 24, { align: 'center' }); }
    if (S === 'credits') { CREDITS.forEach((l, i) => ui.text(l, W / 2, H * 0.42 + i * 12, { align: 'center', color: i === 0 ? COL.white : COL.dim })); }
    if (S === 'story') {
      const lines = this.storyLines || []; const i = Math.min(lines.length - 1, this.storyIdx || 0); const a = Math.min(1, (this.lineT || 0) * 1.5);
      const wrapped = ui.wrap(lines[i] || '', Math.min(W - 40, 300));
      wrapped.forEach((l, k) => ui.text(l, W / 2, H / 2 - wrapped.length * 6 + k * 12, { align: 'center', color: i === lines.length - 1 && this.storyNext === 'enterGate' ? '#e8c0b0' : COL.text, alpha: a }));
      ui.text('TAP / ENTER', W / 2, H - 16, { align: 'center', color: '#5a564e', alpha: 0.5 + Math.sin(this.t * 3) * 0.3 });
    }
    if (['play', 'pause', 'lamp', 'bossIntro', 'dead'].includes(S) && this.world) {
      const hs = this.hs || (this.hs = {}); if (hs.world !== this.world) { hs.hpGhost = undefined; hs.bossGhost = undefined; } hs.world = this.world; hs.boss = this.boss && this.bossState === 'fight' ? this.boss : null; hs.bossPhases = this.boss ? (BOSS_AI[this.boss.type] || {}).phases : null; hs.embersShown = this.embersShown; hs.prompt = S === 'play' ? this.prompt : null;
      if (S !== 'bossIntro') ui.hud(hs, dt);
      if (this.card && S === 'play') {
        this.card.t += dt * (this.world.combat ? 4 : 1); const c = this.card; const a = Math.min(1, c.t * 1.5, Math.max(0, (4.5 - c.t) * 1.2));
        if (a > 0) { ui.text(c.sup, W / 2, H * 0.24, { align: 'center', color: COL.red, alpha: a }); ui.text(c.title, W / 2, H * 0.24 + 11, { align: 'center', color: COL.white, scale: ui.measure(c.title, 2) > W - 12 ? 1 : 2, alpha: a }); if (c.line) ui.wrap(c.line, W - 16).forEach((l, k) => ui.text(l, W / 2, H * 0.24 + 31 + k * 9, { align: 'center', color: COL.dim, alpha: a })); }
        if (c.t > 5) this.card = null;
      }
      if (S === 'play' && this.input.touchMode) ui.drawTouch({ world: this.world, prompt: this.prompt }, this.input);
      if (S === 'play' && !this.world.combat && !this.card) this.drawCompass();
    }
    if (this.uiSlash && this.uiSlash.t > 0) {
      // a cut across the whole screen on a finishing blow
      this.uiSlash.t -= dt; const k = this.uiSlash.t / 0.22; const g = ui.g; const a0 = g.globalAlpha; g.globalAlpha = k;
      const cy = H / 2, sl = Math.tan(this.uiSlash.a); for (let x = 0; x < W; x++) { const y = Math.round(cy + (x - W / 2) * sl); ui.rect(x, y, 1, 1, '#fff4f0'); ui.rect(x, y + 1, 1, 1, '#c8242a'); }
      g.globalAlpha = a0;
    }
    if (S === 'bossIntro' && this.boss) {
      const k = Math.min(1, this.stateT * 2) * (this.stateT > 3.2 ? Math.max(0, 1 - (this.stateT - 3.2) * 2.5) : 1); ui.letterbox(k);
      if (this.stateT > 1.2) { const a = Math.min(1, (this.stateT - 1.2) * 2) * k; ui.text(this.boss.def.name.toUpperCase(), W / 2, H * 0.62, { align: 'center', scale: 2, color: COL.white, alpha: a }); ui.text(this.boss.def.title.toUpperCase(), W / 2, H * 0.62 + 18, { align: 'center', color: COL.red, alpha: a }); }
    }
    if (S === 'pause') { ui.rect(0, 0, W, H, 'rgba(0,0,0,0.5)'); ui.text('PAUSED', W / 2, H * 0.28, { align: 'center', scale: 2, color: COL.white }); this.menuRects = ui.menu(this.pauseItems || [], this.sel, W / 2, H * 0.45, { align: 'center' }); }
    if (S === 'lamp') {
      ui.frame(W / 2 - 92, H / 2 - 48, 184, 92); ui.text('THE LAMP BURNS', W / 2, H / 2 - 42, { align: 'center', color: COL.gold });
      ui.emberIcon(W / 2 - 30, H / 2 - 30); ui.text(String(this.save.embers) + ' EMBERS', W / 2 - 24, H / 2 - 31, { color: COL.gold });
      this.menuRects = ui.menu(this.lampItems || [], this.sel, W / 2 - 70, H / 2 - 16, { lh: 13 });
      const it = (this.lampItems || [])[this.sel]; if (it && it.u) ui.text(it.u.desc, W / 2, H / 2 + 36, { align: 'center', color: COL.dim });
    }
    if (S === 'dead') { const a = Math.min(1, this.stateT * 0.8); ui.text('YOU FELL', W / 2, H * 0.4, { align: 'center', scale: 3, color: '#b01c22', alpha: a }); ui.text('THE LAMP STILL BURNS', W / 2, H * 0.4 + 28, { align: 'center', color: COL.dim, alpha: Math.max(0, a - 0.3) }); }
    if (S === 'ending') { const line = ENDING[Math.min(ENDING.length - 1, this.endIdx || 0)]; const a = Math.min(1, (this.endT || 0) * 1.2); ui.letterbox(1); ui.wrap(line, W - 40).forEach((l, k) => ui.text(l, W / 2, H * 0.84 + k * 10, { align: 'center', color: '#f0e0c0', alpha: a })); }
  }

  // Where to go next: the nearest fight not yet fought, the boss, or the way out once he falls.
  nextObjective() {
    const def = this.level.def; const h = this.world.hero; const c = (z) => ({ x: (z[0] + z[2]) / 2, z: (z[1] + z[3]) / 2 });
    const list = [];
    for (const e of this.encs || []) if (e.state === 'idle') list.push(c(e.zone));
    if (def.boss && this.bossState === 'idle') list.push(c(def.boss.zone));
    if (!list.length && def.exit && (!def.exit.requires || this.bossState === 'done')) list.push(c(def.exit.zone));
    let best = null, bd = 1e9; for (const p of list) { const d = Math.hypot(p.x - h.x, p.z - h.z); if (d < bd) { bd = d; best = p; } }
    return best && bd > 9 ? best : null;
  }
  drawCompass() {
    const t = this.nextObjective(); if (!t) return; const h = this.world.hero; const ui = this.ui;
    const hp = this.r.project(new THREE.Vector3(h.x, 1, h.z)), tp = this.r.project(new THREE.Vector3(t.x, 1, t.z));
    const dx = tp.x - hp.x, dy = tp.y - hp.y, d = Math.hypot(dx, dy); if (d < 1) return;
    const ux = dx / d, uy = dy / d; const cx = hp.x + ux * 20, cy = hp.y + uy * 20;
    const a = 0.35 + 0.25 * Math.sin(this.t * 4); const g = ui.g; const a0 = g.globalAlpha; g.globalAlpha = a;
    for (let k = 0; k < 4; k++) { const bx = cx - ux * k, by = cy - uy * k; ui.rect(bx - uy * k, by + ux * k, 1, 1, COL.gold); ui.rect(bx + uy * k, by - ux * k, 1, 1, COL.gold); }
    g.globalAlpha = a0;
  }

  drawControls() {
    const ui = this.ui, W = ui.w, H = ui.h; ui.rect(0, 0, W, H, 'rgba(0,0,0,0.6)');
    ui.text('CONTROLS', W / 2, 14, { align: 'center', scale: 2, color: COL.white });
    const rows = [['MOVE', 'WASD / ARROWS', 'LEFT STICK'], ['ATTACK', 'J / LEFT CLICK', 'ATK'], ['HEAVY (HOLD)', 'K / RIGHT CLICK', 'HVY'], ['DASH', 'SPACE / SHIFT', 'DASH'], ['PARRY', 'L / F', 'PRY'], ['TONIC', 'R', 'TON'], ['REQUIEM', 'Q', 'ART'], ['USE', 'E', 'USE'], ['PAUSE', 'ESC / P', 'II']];
    const x0 = Math.max(8, W / 2 - 150);
    ui.text('KEYBOARD', x0 + 92, 36, { color: COL.dim }); ui.text('TOUCH', x0 + 210, 36, { color: COL.dim });
    rows.forEach((r, i) => { const y = 48 + i * 11; ui.text(r[0], x0, y, { color: COL.gold }); ui.text(r[1], x0 + 92, y); ui.text(r[2], x0 + 210, y); });
    ui.text('GAMEPAD: X ATTACK  Y HEAVY  A DASH  B PARRY  LB TONIC  RB REQUIEM', W / 2, H - 22, { align: 'center', color: COL.dim });
  }
}
