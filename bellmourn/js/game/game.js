// The game: title, hero select, the training road, eight districts with checkpoint lamps, locked-gate
// fights and bosses, death and retry, the Haven between districts (levels, skills, weapons, relics, the
// merchant, travel), saving, the ending. Owns the World (simulation) and turns its events into effects.
import * as THREE from '../../vendor/three.module.min.js';
import { World, angTo } from './sim.js';
import { buildLevel, K } from '../world/level.js';
import { OPENING, ENDING, CREDITS, TIPS, DISTRICTS, ACT2, ACT3, ACT2_OPENING, FINALE } from './story.js';
import { Cutscene, drawLineBox } from './cutscene.js';
import { SCENES, AFTER_BOSS, BEFORE_BOSS, ON_ENTER, STAGE } from './scenes/index.js';
import { BOSS_LINES } from './scenes/lines.js';
import { SPEAKERS, JOINS, WARDENS } from './scenes/cast.js';
import * as PROG from './progress.js';
import * as HX from './heroes.js'; // START_HEROES, JOINS (where a warden joins)
import * as B4 from './bosses4.js'; // bossEntrance(type): the bosses' entrances
import { shared } from '../engine/materials.js';
import { COL } from '../engine/ui.js';
import { setTargetHeight } from '../engine/renderer.js';
import LEVELS from '../world/levels/index.js';
import { makeAutoplay } from './autoplay.js';
import { BOSS_AI } from './ai.js';
import { BOSS_AI2, BOSSES2 } from './bosses2.js';
import { FOES, BOSSES } from './defs.js';
import { UNITS } from './units.js';
import { HEROES, HERO_ORDER, heroStats, AFFIX_LIST, WEAPONS, RELICS, xpFor, ABILITIES, ULTS } from './heroes.js';
import { freshSave, upgradeSave, addXp, xpFrac, bossReward, chestLoot, skillRows, useSkillRow, shopStock, buy, upgradeWeapon, toggleRelic, relicSlots, havenNext, noteKill, noteSeen } from './progress.js';
import { LampMenu, fit, dots } from './lampmenu.js';
import { Tutorial, STEPS } from './tutorial.js';
import { Haven } from './haven.js';
import { buildHaven } from '../world/haven.js';

const QUALITY = [{ label: 'SHARP', h: 200 }, { label: 'BALANCED', h: 175 }, { label: 'FAST', h: 150 }];
const BUTTONS = [1.15, 1.3, 1.5]; // touch button sizes (ui.touchScale)
const BUTTON_LABEL = { 1.15: 'SMALL', 1.3: 'MEDIUM', 1.5: 'LARGE' };
const ABILITY_MODES = [{ id: 'attack', label: 'ON ATTACK' }, { id: 'auto', label: 'AUTO' }];
const SAVE_KEY = 'bellmourn.save.v2', SET_KEY = 'bellmourn.settings.v1';
function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } }
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const STARTERS = HX.START_HEROES || ['warden', 'huntress', 'bellbreaker'];
const ARMS = { blade: 'BLADE', bow: 'CROSSBOW', hammer: 'HAMMER', focus: 'LANTERN STAFF', knives: 'TWIN KNIVES', anchor: 'ANCHOR AND CHAIN', song: 'SUNG STAFF' };
const hit = (r, p) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const inZone = (e, z) => e && e.x >= z[0] && e.x <= z[2] && e.z >= z[1] && e.z <= z[3];
const NO_INPUT = { mx: 0, mz: 0 };
// a foe or boss type the simulation knows (a region may name units still being built: those are skipped,
// with a warning, rather than stopping the game)
const knownFoe = (t) => !!(FOES[t] || UNITS[t]);
const knownBoss = (t) => !!(BOSSES[t] || BOSSES2[t]);
const warned = new Set();
const knownOrWarn = (f) => { if (knownFoe(f.t)) return true; if (!warned.has(f.t)) { warned.add(f.t); console.warn('bellmourn: unknown foe type skipped: ' + f.t); } return false; };
const LAMP_REACH = 3.5, LAMP_CLEAR = 12, LAMP_REARM = 6; // metres: a lamp lights within reach when no hunting foe is this close; it restores again after you went this far

export class Game {
  constructor(sys) {
    Object.assign(this, sys); // r, atmos, fx, view, ui, input, sound
    this.save = upgradeSave(load(SAVE_KEY)) || freshSave();
    this.settings = { sound: true, music: 0.55, shake: true, quality: 0, touchScale: 1.3, abilityMode: 'attack', ...(load(SET_KEY) || {}) };
    if (!BUTTONS.includes(this.settings.touchScale)) this.settings.touchScale = 1.3;
    if (!ABILITY_MODES.some((m) => m.id === this.settings.abilityMode)) this.settings.abilityMode = 'attack';
    this.applyQuality();
    this.ui.touchScale = this.settings.touchScale;
    this.sound.on = this.settings.sound; this.sound.musicVol = this.settings.music;
    this.state = 'boot'; this.t = 0; this.stateT = 0; this.sel = 0; this.camFocus = new THREE.Vector3(); this.zoom = 1;
    this.level = null; this.world = null; this.embersShown = this.save.embers; this.card = null; this.timers = []; this.token = 0;
    this.rand = Math.random; this.lamp = new LampMenu(this); this.flares = []; this.inHaven = false; this.haven = null; this.groundAt = null;
    this.atmos.onThunder = (k) => this.sound.play('thunder', { delay: 0.3 + Math.random() * 0.9, vol: k, big: k > 0.9 });
  }

  // timers run on the frame clock and die with the level they were made in
  after(sec, fn) { this.timers.push({ t: sec, fn, token: this.token }); }
  _timers(dt) { const due = []; for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) due.push(tm); } this.timers = this.timers.filter((tm) => tm.t > 0); for (const tm of due) if (tm.token === this.token) tm.fn(); }

  // ------------------------------------------------------------------ levels
  heroStats() { return heroStats(this.save, this.save.hero); }

  async loadLevel(id, opts = {}) {
    const def = LEVELS[id]; if (!def) throw new Error('no level ' + id);
    this.loading = true; this.token++; this.timers = [];
    if (this.level) { this.r.scene.remove(this.level.group); }
    this.view.clear(); this.fx.clear(); this.leaveHaven(); this.clearNotes(); this.groundAt = null; this.wheelWakes = false; this.bark = null; this.pendingScene = null;
    const L = await buildLevel(def);
    // lamps and chests are built by the game so they can change state
    const ctx = K.makeCtx(); L.lamps = (def.lamps || []).map((l) => ({ ...l, h: K.shrineLamp(ctx, l.x, l.z) }));
    L.chests = (def.items || []).map((it) => ({ ...it, h: K.chest(ctx, it.x, it.z, it.ry || 0) }));
    await K.finishCtx(ctx); L.group.add(ctx.group); L.solids.push(...ctx.solids); L.lights.push(...ctx.lights); L.anims.push(...L.chests.map((c) => c.h));
    for (const c of L.chests) if (this.save.items[id + ':' + c.id]) { c.h.open = true; c.h.t = 1; c.h.lidPivot.rotation.x = -1.9; c.h.lock.visible = false; }
    for (const l of L.lamps) l.h.set(this.save.lamp === id + ':' + l.id || !!this.save.litLamps[id + ':' + l.id]); // before setLevel: the light pool copies the lamps' state
    if (this.level && this.level !== L) this.r.scene.remove(this.level.group);
    this.r.scene.add(L.group); this.level = L; this.levelId = id;
    this.atmos.setLevel(def.ambience || {}, L.lights);
    this.sound.setRain(def.ambience?.rain ?? 1);
    this.r.post.dawn = 0;
    if (DISTRICTS.includes(id) && !this.save.visited.includes(id)) this.save.visited.push(id);
    this.loading = false;
    this.spawnWorld(opts);
  }

  // elites appear more often deeper in
  _elite(tier, type) { if (type === 'rat' || this.levelId === 'prologue') return undefined; return Math.random() < 0.035 + tier * 0.022 ? AFFIX_LIST[Math.floor(Math.random() * AFFIX_LIST.length)] : undefined; }

  // (Re)populate the level: hero at the lamp or the start, foes, encounters reset unless cleared.
  spawnWorld(opts = {}) {
    const def = this.level.def; const L = this.level;
    this.view.clear(); this.fx.clear();
    const w = this.world = new World({ solids: L.solids, bounds: def.bounds, seed: 11 + this.save.deaths, abilityMode: this.settings.abilityMode });
    w.abilityMode = this.settings.abilityMode; this.flares = [];
    for (const [name, g] of Object.entries(L.marks)) if (g && g.set) { const startOpen = (def.gatesOpen || []).includes(name); g.set(startOpen); g.t = startOpen ? 1 : 0; g.update(0.0001); }
    let sx = def.start.x, sz = def.start.z, face = def.start.face ?? Math.PI;
    const lampKey = this.save.lamp && this.save.lamp.startsWith(this.levelId + ':') ? this.save.lamp.split(':')[1] : null;
    if (!opts.fromStart && lampKey) { const l = L.lamps.find((x) => x.id === lampKey); if (l) { sx = l.x + (l.sx ?? 0); sz = l.z + (l.sz ?? 1.3); face = l.face ?? Math.PI; } }
    if (opts.at) { sx = opts.at.x; sz = opts.at.z; face = opts.at.face ?? face; }
    const hero = w.spawnHero(sx, sz, { ...this.heroStats(), face });
    if (opts.hp !== undefined) hero.hp = Math.min(hero.maxHp, opts.hp);
    const tier = def.tier || 0;
    for (const f of (def.foes || []).filter(knownOrWarn)) w.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, rise: false, face: f.face, elite: f.elite || this._elite(tier, f.t) });
    this.encs = (def.encounters || []).map((e) => ({ ...e, state: this.save.cleared[this.levelId + ':' + e.id] ? 'done' : 'idle', wave: -1, mine: [], delay: 0 }));
    for (const e of this.encs) {
      if (e.state === 'done') { for (const g of e.opens || []) this.gate(g, true, true); continue; }
      if (e.waves[0] && e.waves[0].pre) { e.mine = e.waves[0].foes.filter(knownOrWarn).map((f) => w.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, rise: false, face: f.face, elite: f.elite })); e.wave = 0; e.preSpawned = true; }
    }
    this.boss = null; this.bossState = this.save.bosses[this.levelId] ? 'done' : 'idle';
    if (this.bossState === 'done') for (const g of def.boss?.opens || []) this.gate(g, true, true);
    this.hints = (def.hints || []).map((h) => ({ ...h, shown: false }));
    this.tutorial = def.tutorial ? new Tutorial(this) : null;
    for (const l of L.lamps) l.armed = Math.hypot(hero.x - l.x, hero.z - l.z) > LAMP_REARM; // waking beside a lamp is its rest
    this.camFocus.set(hero.x, 0, hero.z); this.r.focus.copy(this.camFocus);
    this.prompt = null; this.leaving = false;
  }

  // the hero changed (another hero, a skill, a weapon, a relic): respawn them in place with new stats
  // (the same entity id, so the view keeps the rig unless the warden or the weapon changed)
  refreshHero() {
    const w = this.world; const old = w.hero; if (!old) return;
    const frac = old.hp / old.maxHp; w.ents = w.ents.filter((e) => e !== old);
    const h = w.spawnHero(old.x, old.z, { ...this.heroStats(), face: old.face }); h.id = old.id;
    h.hp = Math.max(1, Math.round(h.maxHp * frac)); h.tonics = Math.min(h.stats.maxTonics, old.tonics + (h.stats.maxTonics - old.stats.maxTonics));
    if (this.inHaven && this.haven) this.haven.adopt(old, h);
  }

  gate(name, open, instant = false) {
    const g = this.level.marks[name]; if (!g) return;
    if (g.solid.open === open && !instant) return;
    g.set(open); if (instant) { g.t = open ? 1 : 0; g.update(0.0001); } else this.sound.play('gate');
  }

  persist() { store(SAVE_KEY, this.save); }
  saveSettings() { store(SET_KEY, this.settings); }

  // ------------------------------------------------------------------ state machine
  go(state) { this.state = state; this.stateT = 0; this.sel = 0; this.menuRects = []; if (this.world && state !== 'play') this.world.idle(); }

  async start() {
    const q = new URLSearchParams(location.search);
    if (q.get('auto') && !this.auto) { this.auto = makeAutoplay(+q.get('auto') || 3); this.timeScale = +(q.get('speed') || 1); this.debug = { god: q.get('god') === '1' }; if (q.get('hero')) this.save.hero = q.get('hero'); }
    if (q.get('scene') && !this.debugDone) { this.debugDone = true; this.debug = { god: true }; await this.debugScene(q.get('scene'), { party: q.get('party') !== '0', auto: q.get('fast') === '1', speed: +(q.get('speed') || 1) }); return; }
    if (q.get('level') && !this.debugDone) {
      // debug: ?level=id [&boss=1] [&god=1] [&lamp=id] [&hero=id] — straight into a district
      this.debugDone = true; this.debug = { god: q.get('god') === '1' };
      this.noScenes = q.get('scenes') !== '1'; // straight into a district for tests: no cutscenes unless ?scenes=1
      if (q.get('hero') && HEROES[q.get('hero')]) { this.save.hero = q.get('hero'); if (!this.save.unlocked.includes(q.get('hero'))) this.save.unlocked.push(q.get('hero')); }
      if (q.get('lamp')) this.save.lamp = q.get('level') + ':' + q.get('lamp');
      if (q.get('level') === 'haven') { await this.enterHaven(havenNext(this.save, q.get('next') || 'gate'), { first: q.get('intro') === '1', resume: q.get('resume') === '1' }); return; }
      await this.enterLevel(q.get('level'), !q.get('lamp'));
      if (q.get('boss') === '1' && this.level.def.boss) { const B = this.level.def.boss; const h = this.world.hero; h.x = (B.zone[0] + B.zone[2]) / 2; h.z = B.zone[3] - 0.5; }
      return;
    }
    await this.loadLevel('gate', { fromStart: true });
    this.titleScene();
    this.go('title');
  }

  // The title: the courtyard as it was first seen, the warden among the hushed in the rain.
  titleScene(heroId = this.save.hero) {
    const w = this.world; w.ents = []; w.hero = null;
    const hero = w.spawnHero(-0.6, 1.6, { ...heroStats(this.save, heroId), face: Math.PI * 0.82 });
    for (const [x, z] of [[1.4, -2.6], [3.6, -0.6], [4.9, -4.6]]) { const f = w.spawnFoe('hushed', x, z, { rise: false }); f.face = angTo(f, hero); }
    this.titleCam = this.titleCam || 0;
  }

  update(dt) {
    this.t += dt; this.stateT += dt;
    const inp = this.input.frame();
    if (this.auto) this.autoInput(inp, dt);
    this.input.playing = this.state === 'play';
    this.ui.touchMode = inp.touch;
    this.inputMode = inp.touch ? 'touch' : (this.input.padUsed ? 'pad' : 'key');
    if (inp.taps.length || inp.confirm || inp.attackPressed) this.sound.unlock();
    shared.time.value = this.t;
    this._timers(dt);
    const S = this.state;
    if (S === 'title') this.title(dt, inp);
    else if (S === 'select') this.select(dt, inp);
    else if (S === 'story') this.story(dt, inp);
    else if (S === 'play') this.play(dt, inp);
    else if (S === 'pause') this.pauseMenu(dt, inp);
    else if (S === 'haven') this.haven.update(dt, inp);
    else if (S === 'dead') this.dead(dt, inp);
    else if (S === 'bossIntro') this.bossIntro(dt, inp);
    else if (S === 'ending') this.ending(dt, inp);
    else if (S === 'controls') this.controls(dt, inp);
    else if (S === 'settings') this.settingsMenu(dt, inp);
    else if (S === 'credits') this.credits(dt, inp);
    else if (S === 'cutscene') this.cutUpdate(dt, inp);
    this.renderFrame(dt);
  }

  // test autoplay: drives menus and the hero
  autoInput(inp, dt) {
    const S = this.state;
    if (S === 'title' && this.stateT > 0.5) { const hero = this.save.hero; this.save = freshSave(hero); this.persist(); this.embersShown = 0; this.enterLevel('gate', true); }
    else if (S === 'story') this.storyIdx = (this.storyLines || []).length;
    else if (S === 'haven' && this.haven && this.haven.ready() && this.stateT > 0.3) { this.autoSpend(); this.refreshHero(); this.haven.onward(); }
    else if (S === 'play' && this.world && !this.loading) Object.assign(inp, this.auto(this, dt), { pausePressed: false });
    else if (S === 'ending' && this.endT > 1.2) { this.endT = 0; this.endIdx++; }
    // scenes skip themselves (a choice is picked: see autoChoice); the credits move on
    else if (S === 'cutscene' && this.cut) { const c = this.cut; if (c.pick) { if (c.pick.t > 0.3) { const want = this.autoChoice(c.pick.key, c.pick.options.map((o) => o.id)); c.choose(Math.max(0, c.pick.options.findIndex((o) => o.id === want))); } } else if (c.t > 0.3 && !c.skipping) c.skip(); }
    else if (S === 'credits' && this.stateT > 1.5) Object.assign(inp, { confirm: true });
    else if (S === 'bossIntro' && this.stateT > 0.6) Object.assign(inp, { confirm: true });
  }
  // what the autoplay (and a scene played with cutAuto) picks: at the end SING if the New Song can be sung, else RING
  autoChoice(key, ids) {
    if (key === 'final') { let ready = false; try { ready = !!(PROG.trueEndingReady && PROG.trueEndingReady(this.save)); } catch (e) { /* */ } return ready && ids.includes('sing') ? 'sing' : 'ring'; }
    if (key === 'ngplus') return 'title';
    return ids[0];
  }

  // what a sensible player does at the Haven: rank up skills, wear the best weapon and relics, temper, buy
  autoSpend() {
    const S = this.save, P = S.heroes[S.hero];
    for (let guard = 0; guard < 20 && P.points > 0; guard++) { const rows = skillRows(S).filter((r) => !r.locked && r.rank < 5); if (!rows.length) break; rows.sort((a, b) => a.rank - b.rank); useSkillRow(S, rows[0]); }
    P.weapon = P.owned.slice().sort((a, b) => WEAPONS[b].tier - WEAPONS[a].tier)[0];
    for (const id of S.relicsOwned) if (!S.relicsOn.includes(id) && S.relicsOn.filter(Boolean).length < relicSlots(S)) toggleRelic(S, id);
    const where = this.shopDistrict();
    for (const it of shopStock(S, where)) if (it.kind !== 'tome' && S.embers >= it.price + 150) buy(S, it, where);
    for (let guard = 0; guard < 10; guard++) if (upgradeWeapon(S).startsWith('NOT')) break;
    this.persist();
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
    const S = this.save; const hasSave = !!(S.lamp || Object.keys(S.cleared).length || S.level !== 'gate' || S.done || S.visited.length > 1 || S.inHaven || S.havenSeen);
    this.titleItems = [hasSave ? { label: 'CONTINUE', id: 'cont' } : null, { label: 'NEW GAME', id: 'new' }, { label: 'CONTROLS', id: 'controls' }, { label: 'SETTINGS', id: 'settings' }, { label: 'CREDITS', id: 'credits' }].filter(Boolean);
    const p = this.menuInput(inp, this.titleItems);
    if (p >= 0) {
      const id = this.titleItems[p].id;
      if (id === 'new') { this.selHero = 0; this.selStep = 0; this.go('select'); }
      else if (id === 'cont') { if (this.save.inHaven) this.enterHaven(havenNext(this.save, this.save.havenNext || this.save.level), { resume: true }); else this.enterLevel(this.save.level, false); }
      else { this.back = 'title'; this.go(id); }
    }
  }

  // Hero select, then the training road or straight to the city. The list of wardens on the left (a tap
  // picks one), the warden in the middle, their card on the right with a CHOOSE button; then how to begin.
  select(dt, inp) {
    this.sound.setMusic('title');
    const ids = this.selIds(); const unlocked = (id) => STARTERS.includes(id); const R = this.selRects || {};
    for (const tp of inp.taps) if (hit(R.back, tp)) { this.sound.play('ui'); if (this.selStep === 1) this.selStep = 0; else this.go('title'); return; }
    if (this.selStep === 0) {
      if (inp.left || inp.up) { this.selHero = (this.selHero + ids.length - 1) % ids.length; this.sound.play('ui'); }
      if (inp.right || inp.down) { this.selHero = (this.selHero + 1) % ids.length; this.sound.play('ui'); }
      let pick = inp.confirm;
      for (const tp of inp.taps) { for (const r of R.heroes || []) if (hit(r, tp) && r.i !== this.selHero) { this.selHero = r.i; this.sound.play('ui'); } if (hit(R.choose, tp)) pick = true; }
      const id = ids[this.selHero];
      if (this.world.hero && this.world.hero.heroId !== id) this.titleScene(id);
      if (inp.back) { this.go('title'); return; }
      if (pick) { if (!unlocked(id)) { this.sound.play('ui'); this.ui.toast(HEROES[id].name + ' ' + this.joinsText(id), { color: COL.dim }); } else { this.sound.play('uiOk'); this.selStep = 1; this.sel = 0; } }
    } else {
      this.selItems = [{ label: 'THE TRAINING ROAD', sub: 'LEARN TO FIGHT FIRST' }, { label: 'SKIP TO THE CITY', sub: 'STRAIGHT TO GALLOWS GATE' }];
      const p = this.menuInput(inp, this.selItems);
      if (inp.back) { this.selStep = 0; return; }
      if (p >= 0) {
        // a new game forgets the old one, but keeps the endings already seen
        const endings = (this.save && this.save.endings) || []; this.save = freshSave(ids[this.selHero]); if (endings.length) this.save.endings = endings.slice(); this.persist(); this.embersShown = 0;
        this.storyLines = OPENING; this.storyNext = p === 0 ? 'prologue' : 'gate'; this.go('story');
      }
    }
  }

  story(dt, inp) {
    this.sound.setMusic('title');
    if (this.stateT === dt) { this.storyIdx = 0; this.lineT = 0; }
    const adv = inp.confirm || inp.taps.length || inp.attackPressed;
    if (inp.back) this.storyIdx = this.storyLines.length;
    else if (adv) { if (this.lineT < 0.6) this.lineT = 0.6; else { this.storyIdx = (this.storyIdx || 0) + 1; this.lineT = 0; } }
    this.lineT = (this.lineT || 0) + dt;
    if ((this.storyIdx || 0) >= this.storyLines.length) {
      const n = this.storyNext; this.storyNext = null;
      if (n === 'prologue' || n === 'gate') this.enterLevel(n, true);
      else if (n === 'title') { this.go('loading'); this.start(); }
      else if (n && n.startsWith('haven:')) this.enterHaven(havenNext(this.save, n.slice(6)));
    }
  }

  async enterLevel(id, fromStart, at) {
    if (!LEVELS[id]) { // a region still being built: stay at (or go back to) the Haven
      console.warn('bellmourn: level not built yet: ' + id); this.ui.toast('THE ROAD BEYOND IS NOT OPEN YET', { color: COL.dim, life: 3 });
      if (this.levelId !== 'haven') { const ok = DISTRICTS.filter((d) => LEVELS[d]); this.enterHaven(ok.includes(this.save.level) ? this.save.level : ok[0], { resume: true }); }
      else if (this.haven) { this.enterHaven(this.save.havenNext, { resume: true }); }
      return;
    }
    this.go('loading'); this.r.post.fade = 1;
    await this.loadLevel(id, { fromStart, at });
    if (id !== 'prologue') this.save.level = id;
    this.save.inHaven = false;
    this.persist();
    const def = LEVELS[id]; const n = DISTRICTS.indexOf(id), a2 = ACT2.indexOf(id), a3 = ACT3.indexOf(id);
    this.card = { t: 0, sup: a3 >= 0 ? 'ACT III  REGION ' + ROMAN[a3] : (a2 >= 0 ? 'ACT II  REGION ' + ROMAN[a2] : (n >= 0 ? 'DISTRICT ' + ROMAN[n] : 'PROLOGUE')), title: def.name.toUpperCase(), line: def.tagline || '' };
    this.go('play'); this.fadeIn = 0;
    // a scene on the way in (the Old Road's; the wardens meeting at the gate if the road was skipped)
    const sid = this.noAutoScenes ? null : (ON_ENTER[id] && !this.seen(ON_ENTER[id]) ? ON_ENTER[id] : (id === 'gate' && fromStart && !this.save.tutorial && !this.seen('prologue.meet') ? 'prologue.meet' : null));
    if (sid) this.playScene(sid, {}, () => { this.go('play'); this.fadeIn = 1; if (this.card) this.card.t = 0; });
  }

  // ------------------------------------------------------------------ cutscenes
  seen(id) { const k = id + '@' + (this.save.ngPlus | 0); return !!(this.save.seen && this.save.seen[k]); }
  markSeen(id) { const S = this.save; S.seen = S.seen && typeof S.seen === 'object' ? S.seen : {}; S.seen[id + '@' + (S.ngPlus | 0)] = true; this.persist(); }
  // Play a scene by id; onEnd(result) runs when it is over (default: back to where the game was).
  playScene(id, ctx = {}, onEnd = null) {
    const sc = SCENES[id]; const back = this.state === 'cutscene' ? (this.cutBack || 'play') : this.state;
    if (this.noScenes && !this.forceScene) { this.markSeen(id); if (onEnd) onEnd({}); return false; }
    if (!sc) { console.warn('bellmourn: no scene ' + id); if (onEnd) onEnd({}); return false; }
    if (this.world) this.world.idle();
    this.markSeen(id); this.cutBack = back; this.bark = null;
    try {
      this.cut = new Cutscene(this, sc, ctx, { onEnd: (res) => { this.cut = null; this.persist(); if (onEnd) onEnd(res); else this.go(back === 'cutscene' ? 'play' : back); } });
    } catch (err) { console.error('bellmourn: scene ' + id + ' failed', err); this.cut = null; if (onEnd) onEnd({}); return false; }
    this.go('cutscene'); return true;
  }
  cutUpdate(dt, inp) {
    if (!this.cut) { this.go('play'); return; }
    try { this.cut.update(dt, inp); } catch (err) { console.error('bellmourn: scene error', err); const c = this.cut; if (c) { c.skipping = false; c.i = c.queue.length; c.active = []; c.finish(); } }
  }
  // The stage a scene moves to (an ending in the Belfry, the New Game+ offer at the Haven fire): the place
  // without its foes or its game (the scene hides what is there and brings its own actors).
  async stageAt(id, o = {}) {
    this.leaveHaven(); this.haven = null;
    if (id === 'haven') {
      this.token++; this.timers = []; if (this.level) this.r.scene.remove(this.level.group);
      this.view.clear(); this.fx.clear(); this.clearNotes();
      const L = this.havenSet || (this.havenSet = await buildHaven());
      this.r.scene.add(L.group); this.level = L; this.levelId = 'haven-stage';
      this.atmos.setLevel(L.def.ambience, L.lights); this.groundAt = L.roofAt; this.atmos.heroLight.intensity = 1.2;
      this.sound.setRain(0.55); this.r.post.dawn = 0;
      this.world = new World({ solids: L.solids, bounds: L.def.bounds, seed: 5 }); this.boss = null; this.encs = []; this.hints = []; this.tutorial = null; this.card = null; this.bossState = 'idle';
      this.camFocus.set(L.def.frame.x, L.def.frame.y, L.def.frame.z); this.r.focus.copy(this.camFocus);
      return;
    }
    const lid = LEVELS[id] ? id : (o.fallback && LEVELS[o.fallback] ? o.fallback : 'belfry');
    await this.loadLevel(lid, { fromStart: true }); this.boss = null; this.tutorial = null; this.card = null;
  }
  // for tests and ?scene=<id>: set the stage a scene expects, then play it
  async debugScene(id, opts = {}) {
    const st = STAGE[id] || {}; this.forceScene = true; this.cutAuto = !!opts.auto; this.cutSpeed = opts.speed || 1; this.noAutoScenes = true;
    if (opts.party !== false) for (const h of WARDENS) if (HEROES[h] && !this.save.unlocked.includes(h)) this.save.unlocked.push(h);
    if (opts.hero && HEROES[opts.hero]) this.save.hero = opts.hero;
    if (this.state === 'cutscene' && this.cut) { const c = this.cut; this.cut = null; c.onEnd = null; c.finish(); }
    if (st.haven) {
      await this.enterHaven(st.fresh ? 'gate' : (id === 'act3.open' ? 'marsh' : 'frostmarch'), { resume: true, first: false, noScene: true });
    } else {
      const lid = LEVELS[st.level] ? st.level : (LEVELS[st.fallback] ? st.fallback : 'gate');
      await this.enterLevel(lid, true); this.card = null; this.tutorial = null;
      const def = this.level.def; const h = this.world.hero;
      if (st.at === 'exit' && def.exit) { const z = def.exit.zone; h.x = (z[0] + z[2]) / 2; h.z = z[3] + 0.6; h.face = Math.PI; }
      if (st.boss && def.boss) {
        const B = def.boss; h.x = (B.zone[0] + B.zone[2]) / 2; h.z = B.zone[3] - 2; h.face = Math.atan2(B.x - h.x, B.z - h.z);
        this.world.ents = this.world.ents.filter((e) => e === h);
        if (st.boss !== 'none' && knownBoss(B.type)) {
          const b = this.boss = this.world.spawnBoss(B.type, B.x, B.z, { face: B.face ?? 0 }); b.face = Math.atan2(h.x - b.x, h.z - b.z);
          if (st.boss === 'dead') { b.dead = true; b.hp = 0; b.anim = 'die'; b.animT = 3; this.bossState = 'done'; this.save.bosses[lid] = true; } else this.bossState = 'intro';
        }
        this.world.drain();
      }
      this.camFocus.set(h.x, 0, h.z);
    }
    this.noAutoScenes = false;
    this.playScene(id, {}, () => { this.go(this.inHaven && this.haven ? 'haven' : 'play'); });
  }

  // ------------------------------------------------------------------ the Haven
  // After a district's exit (and the Old Road's), or from the pause menu: the shrine between districts.
  // next: the district ONWARD leads to. opts: resume (start kneeling: CONTINUE), first (the guide).
  async enterHaven(next, opts = {}) {
    this.go('loading'); this.r.post.fade = 1; this.loading = true; this.token++; this.timers = [];
    if (this.level) this.r.scene.remove(this.level.group);
    this.view.clear(); this.fx.clear(); this.clearNotes();
    const L = this.havenSet || (this.havenSet = await buildHaven());
    this.r.scene.add(L.group); this.level = L; this.levelId = 'haven';
    this.atmos.setLevel(L.def.ambience, L.lights); this.groundAt = L.roofAt; this.atmos.heroLight.intensity = 1.2;
    this.sound.setRain(0.55); this.r.post.dawn = 0;
    const S = this.save; const firstEver = !S.havenSeen; S.inHaven = true; S.havenNext = next; S.havenSeen = true; if (next) S.level = next; this.persist();
    // a scene at the fire: Sister Ash on the first visit; the wardens gathered as Act II and Act III begin
    const sid = opts.noScene || opts.resume ? null : (firstEver && !this.seen('haven.ash') ? 'haven.ash'
      : (next === ACT2[0] && !this.seen('act2.open') && (S.bosses.belfry || S.act1) ? 'act2.open'
        : (next === ACT3[0] && !this.seen('act3.open') && S.bosses.abyss ? 'act3.open' : null)));
    const w = this.world = new World({ solids: L.solids, bounds: L.def.bounds, seed: 5, abilityMode: this.settings.abilityMode }); w.abilityMode = this.settings.abilityMode;
    this.encs = []; this.boss = null; this.bossState = 'idle'; this.hints = []; this.tutorial = null; this.prompt = null; this.leaving = false; this.card = null; this.flares = [];
    this.inHaven = true; this.lamp.reset(1);
    this.haven = new Haven(this, L, { next, resume: !!opts.resume || !!sid, first: opts.first ?? !S.havenIntro });
    this.camFocus.set(w.hero.x, 0, w.hero.z); this.r.focus.copy(this.camFocus);
    this.loading = false; this.go('haven'); this.fadeIn = 0;
    if (sid) this.playScene(sid, {}, () => {
      // back at the fire: the warden kneels on the mat and the menu opens
      const h = this.world.hero, D = L.def; if (h && this.haven) { h.x = D.kneel.x; h.z = D.kneel.z; h.face = Math.atan2(D.fire.x - h.x, D.fire.z - h.z); this.haven.pose(h, 'rest'); }
      this.go('haven'); this.fadeIn = 1;
    });
  }
  // toasts and floating numbers age only while the HUD is drawn: drop them when the place changes, or a
  // district's last words (a boss's rewards) would turn up in the next one
  clearNotes() { const ui = this.ui; ui.toasts = []; if (ui.floats) ui.floats = []; ui.gain = null; }
  leaveHaven() { if (!this.inHaven) return; this.inHaven = false; this.haven = null; this.groundAt = null; this.atmos.heroLight.intensity = 5; this.atmos.heroLight.color.setHex(0xb8c8ec); }
  // the merchant and the map at the Haven are stocked for the district ahead
  shopDistrict() { return this.inHaven ? (this.save.havenNext || 'gate') : this.levelId; }

  controls(dt, inp) { if (this.stateT > 0.2 && (inp.back || inp.confirm || inp.taps.length)) { this.sound.play('ui'); this.go(this.back || 'title'); } }
  applyQuality() { const q = QUALITY[this.settings.quality || 0] || QUALITY[0]; setTargetHeight(q.h); this.r.resize(); }
  settingsMenu(dt, inp) {
    const s = this.settings;
    this.setItems = [{ label: 'SOUND', value: s.sound ? 'ON' : 'OFF' }, { label: 'MUSIC', value: String(Math.round(s.music * 10)) }, { label: 'SCREEN SHAKE', value: s.shake ? 'ON' : 'OFF' }, { label: 'PIXELS', value: QUALITY[s.quality || 0].label },
      { label: 'BUTTONS', value: BUTTON_LABEL[s.touchScale] || 'MEDIUM' }, { label: 'ABILITIES', value: (ABILITY_MODES.find((m) => m.id === s.abilityMode) || ABILITY_MODES[0]).label }, { label: 'BACK' }];
    const n = this.setItems.length; let pick = -1, side = inp.left ? -1 : (inp.right ? 1 : 0);
    if (inp.up) { this.sel = (this.sel + n - 1) % n; this.sound.play('ui'); }
    if (inp.down) { this.sel = (this.sel + 1) % n; this.sound.play('ui'); }
    if (inp.confirm) pick = this.sel;
    for (const tp of inp.taps) for (const r of this.menuRects || []) if (hit(r, tp)) { this.sel = r.i; pick = r.i; side = r.i < n - 1 && tp.x < r.x + r.w * 0.35 ? -1 : 1; }
    if (pick < 0 && side && this.sel < n - 1) pick = this.sel;
    if (pick < 0) { if (inp.back) this.go(this.back || 'title'); return; }
    const d = side || 1; this.sound.play(pick === n - 1 ? 'ui' : 'uiOk');
    if (pick === 0) { s.sound = !s.sound; this.sound.setEnabled(s.sound); }
    if (pick === 1) { const was = s.music; s.music = side ? Math.max(0, Math.min(1, was + d * 0.1)) : (was >= 0.95 ? 0 : was + 0.1); s.music = Math.round(s.music * 10) / 10; this.sound.setMusicVol(s.music); }
    if (pick === 2) s.shake = !s.shake;
    if (pick === 3) { s.quality = ((s.quality || 0) + d + QUALITY.length) % QUALITY.length; this.applyQuality(); }
    // touch button size: small / medium / large (the stick grows with them)
    if (pick === 4) { const i = Math.max(0, BUTTONS.indexOf(s.touchScale)); s.touchScale = BUTTONS[(i + d + BUTTONS.length) % BUTTONS.length]; this.ui.touchScale = s.touchScale; }
    // abilities: fired by the attack when ready (default), or cast on their own during a fight
    if (pick === 5) { const i = Math.max(0, ABILITY_MODES.findIndex((m) => m.id === s.abilityMode)); s.abilityMode = ABILITY_MODES[(i + 1) % ABILITY_MODES.length].id; if (this.world) this.world.abilityMode = s.abilityMode; }
    if (pick < n - 1) this.saveSettings();
    if (pick === n - 1 || inp.back) this.go(this.back || 'title');
  }
  credits(dt, inp) {
    // after an ending the credits roll (a tap after a moment moves on), then New Game+ is offered
    if (this.back === 'ngplus') { if (this.stateT > 16 || (this.stateT > 1.2 && (inp.back || inp.confirm || inp.taps.length))) { this.back = null; this.offerNewGamePlus(); } return; }
    if (this.stateT > 0.5 && (inp.back || inp.confirm || inp.taps.length)) { if (this.back === 'title') this.go('title'); else { this.go('loading'); this.start(); } }
  }

  pauseMenu(dt, inp) {
    // back to the Haven from a district once it has been reached (what was cleared stays cleared)
    const canReturn = !this.inHaven && this.save.havenSeen && DISTRICTS.includes(this.levelId) && this.state === 'pause';
    this.pauseItems = [{ label: 'RESUME', id: 'resume' }, canReturn ? { label: 'RETURN TO THE HAVEN', id: 'haven' } : null, { label: 'CONTROLS', id: 'controls' }, { label: 'SETTINGS', id: 'settings' }, { label: 'QUIT TO TITLE', id: 'quit' }].filter(Boolean);
    const p = this.menuInput(inp, this.pauseItems); const id = p >= 0 ? this.pauseItems[p].id : null;
    if (inp.pausePressed || inp.back || id === 'resume') { this.go(this.inHaven ? 'haven' : 'play'); return; }
    if (id === 'haven') { this.persist(); this.enterHaven(havenNext(this.save, this.levelId)); }
    if (id === 'controls') { this.back = 'pause'; this.go('controls'); }
    if (id === 'settings') { this.back = 'pause'; this.go('settings'); }
    if (id === 'quit') { this.persist(); this.token++; this.timers = []; this.leaveHaven(); this.go('loading'); this.start(); }
  }

  dead(dt, inp) {
    this.world.update(dt, NO_INPUT); this.handleEvents(this.world.drain());
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
    const evs = w.drain();
    this.handleEvents(evs);
    if (this.tutorial) this.tutorial.update(dt, evs);
    if (this.state !== 'play') return;
    // lamps light themselves (checkpoints); chests take USE
    this.lampsAuto(hero);
    this.prompt = null; let nearChest = null;
    for (const c of this.level.chests) if (!c.h.open && Math.hypot(hero.x - c.x, hero.z - c.z) < 1.7) nearChest = c;
    if (nearChest) this.prompt = 'OPEN';
    if (inp.interactPressed && nearChest) this.openChest(nearChest);
    if (!this.card && !this.tutorial) for (const h of this.hints) if (!h.shown && inZone(hero, h.zone)) { h.shown = true; this.ui.toast(inp.touch && h.touch ? h.touch : h.text, { life: h.life || 4, color: COL.ice }); }
    for (const e of this.encs) this.runEncounter(e, dt);
    const B = def.boss;
    if (B && this.bossState === 'idle' && inZone(hero, B.zone)) this.startBoss();
    // exit (the training road's gate only opens when the training is done)
    const exitOpen = def.exit && (!def.exit.requires || this.bossState === 'done') && (!this.tutorial || this.tutorial.step?.id === 'go') && !this.pendingScene;
    // through the exit: the Haven, then on to the next district (the last exit rings the bell: the end)
    if (exitOpen && inZone(hero, def.exit.zone) && !this.leaving) {
      // the end of the Old Road: the other two wardens meet the lead at the gate first
      if (this.levelId === 'prologue' && !this.seen('prologue.meet')) { this.save.tutorial = true; this.playScene('prologue.meet', {}, () => { this.go('play'); this.leaveBy(def.exit.to); }); return; }
      this.leaveBy(def.exit.to);
    }
    this.sound.setMusic(this.boss && !this.boss.dead ? 'boss' : (w.combat ? 'combat' : 'explore'));
    if (hero.state === 'run' && (this.stepT = (this.stepT || 0) - dt) <= 0) { this.stepT = 0.27; this.sound.play('step'); if (Math.random() < 0.5) this.fx.splash(hero.x, hero.z, 3); }
  }

  // Out through a district's exit: the Haven, on to the next place. The story's ends ('end': the Belfry,
  // the Abyss) were scenes already played when their bosses fell: they lead on to the next act.
  leaveBy(to) {
    this.leaving = true; this.fadeOut = 0;
    this.save.lamp = null;
    if (this.levelId === 'prologue') this.save.tutorial = true;
    this.persist();
    const next = to === 'end' ? (this.levelId === 'belfry' ? ACT2[0] : (this.levelId === 'abyss' ? ACT3[0] : 'gate')) : to;
    this.after(0.65, () => { this.leaving = false; this.enterHaven(havenNext(this.save, next)); });
  }

  // A district lamp is a checkpoint, and it lights itself: walk within reach (LAMP_REACH) while the area
  // is clear (no foe hunting you within LAMP_CLEAR, no locked fight or boss under way) and it flares up:
  // your place is kept, your health, tonics and revives come back, the game saves. Nobody kneels: the
  // warden keeps moving. A lit lamp restores you again each time you come back within reach out of a
  // fight, once per visit (it re-arms when you have walked LAMP_REARM away). Growing happens at the Haven.
  lampClear(hero) {
    if ((this.encs || []).some((e) => e.state === 'active')) return false;
    if (this.bossState === 'intro' || this.bossState === 'fight') return false;
    return !this.world.foes().some((f) => f.ai.aggro && !f.dead && Math.hypot(f.x - hero.x, f.z - hero.z) < LAMP_CLEAR);
  }
  lampsAuto(hero) {
    if (!hero || hero.dead) return;
    // the training road's lamp waits for its turn in the training
    if (this.tutorial && this.tutorial.i < STEPS.findIndex((s) => s.id === 'lamp')) return;
    let clear = null;
    for (const l of this.level.lamps) {
      const d = Math.hypot(hero.x - l.x, hero.z - l.z);
      if (d > LAMP_REARM) l.armed = true;
      if (d > LAMP_REACH || (l.h.lit && !l.armed)) continue;
      if (clear === null) clear = this.lampClear(hero);
      if (clear) this.lightLamp(l);
    }
  }
  lightLamp(l) {
    const hero = this.world.hero; const key = this.levelId + ':' + l.id; const first = !l.h.lit;
    const restored = first || hero.hp < hero.maxHp || hero.tonics < hero.stats.maxTonics || hero.revives < hero.stats.revives;
    l.armed = false;
    if (first) { l.h.set(true); this.lampLight(l, true); this.save.litLamps[key] = true; }
    this.save.lamp = key; this.persist();
    hero.hp = hero.maxHp; hero.tonics = hero.stats.maxTonics; hero.revives = hero.stats.revives;
    if (!restored) return; // already whole: the place is kept, quietly
    this.ui.toast(first ? 'LAMP LIT' : 'THE LAMP RESTORES YOU', { color: COL.gold, big: first, life: first ? 2 : 1.6 });
    this.sound.play('lamp'); this.sound.play('heal', { delay: 0.25 });
    this.fx.embers(l.x, 3.35, l.z, first ? 44 : 24, [3, 1.8, 0.5]); this.fx.embers(hero.x, 0.6, hero.z, first ? 16 : 10, [3, 2.2, 0.8]); this.flareLamp(l);
  }
  // the lamp's light in the light pool follows the lamp (the pool keeps its own copy of each light)
  lampSource(l) { const L = l.h.light; return this.atmos.sources.find((s) => s.x === L.x && s.y === L.y && s.z === L.z); }
  lampLight(l, on) { const s = this.lampSource(l); if (s) s.on = on; }
  flareLamp(l) { const s = this.lampSource(l); if (s) this.flares.push({ s, base: s.base ?? s.intensity, t: 0 }); }

  openChest(c) {
    c.h.open = true; this.save.items[this.levelId + ':' + c.id] = true; this.sound.play('uiOk'); this.fx.embers(c.x, 0.8, c.z, 30, [3, 2, 0.6]);
    const lines = chestLoot(this.save, c, this.levelId, this.rand);
    lines.forEach((l, i) => this.ui.toast(l, { color: COL.gold, life: 3 + i }));
    if (lines.some((l) => /TONIC|RELIC|WEAPON/.test(l))) this.refreshHero();
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
    e.mine = W.foes.filter(knownOrWarn).map((f) => { const m = this.world.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, aggro: true, elite: f.elite || this._elite(tier, f.t) }); m.ai.locked = true; return m; });
  }

  startBoss() {
    const B = this.level.def.boss;
    // the last fight: the Voice in the Bell speaks first, and the warden chooses (SILENCE ends it here)
    if (B.type === 'wheel' && !this.save.choice) {
      this.bossState = 'intro';
      this.playScene('finale.choice', {}, (res) => {
        const c = res.final || this.save.choice || 'ring'; this.save.choice = c; this.persist();
        if (c === 'silence') { this.playEnding('silence'); return; }
        this.bossState = 'idle'; this.go('play'); this.startBoss();
      });
      return;
    }
    if (!knownBoss(B.type)) { // a boss still being built: the arena stands empty and the way on opens (not saved as beaten)
      console.warn('bellmourn: unknown boss type skipped: ' + B.type); this.bossState = 'done';
      for (const g of B.opens || []) this.gate(g, true); this.ui.toast('THE ARENA STANDS EMPTY', { color: COL.dim, life: 3 }); return;
    }
    this.bossState = 'intro'; this.card = null; // the district's name card never sits on the boss bar
    for (const g of B.gates || []) this.gate(g, false);
    // New Game+: every boss returns Ascended; the Wheel takes its true form for the New Song
    const ng = (this.save.ngPlus | 0) > 0;
    this.boss = this.world.spawnBoss(B.type, B.x, B.z, { face: B.face ?? 0, hpMul: (B.hpMul || 1) * (ng ? 1.5 : 1), dmgMul: B.dmgMul || 1, ascended: ng, trueForm: B.type === 'wheel' && this.save.choice === 'sing' });
    if (typeof B4.ascendDef === 'function') { try { B4.ascendDef(this.boss); } catch (err) { console.error(err); } } // ASCENDED. on the card at once
    const hold = () => { const b = this.boss; b.state = 'roar'; b.anim = 'idle'; b.t = -2; b.iframes = 99; };
    hold(); this.sound.setMusic('none'); this.entT = 0; this.entDoneT = 0;
    // a boss with words before its fight: after its entrance (or, with none, before the roar)
    const pre = BEFORE_BOSS[B.type]; this.preScene = pre && !this.seen(pre) ? pre : null;
    if (this.preScene && !this.entranceOf(this.boss)) { const sid = this.preScene; this.preScene = null; this.playScene(sid, {}, () => { hold(); this.go('bossIntro'); }); }
    else this.go('bossIntro');
  }

  // The boss's entrance (its def.entrance: crawling out, breaking through, slamming down...), then its
  // name and its line; the fight starts when the entrance is over. A tap jumps the entrance to its end.
  // Without an entrance: the old roar.
  bossIntro(dt, inp) {
    const b = this.boss; const hero = this.world.hero;
    hero.anim = 'idle'; hero.state = 'idle'; hero.vx = hero.vz = 0;
    const E = this.entranceOf(b);
    if (E) {
      const skip = this.stateT > 0.3 && (inp.confirm || inp.taps.length || inp.back || inp.attackPressed);
      if (!this.entDoneT) {
        this.entT = skip ? E.dur : Math.min(E.dur, (this.entT || 0) + dt);
        try { E.step(this.world, b, this.entT, this.fx); } catch (err) { console.error('bellmourn: entrance', err); this.entT = E.dur; }
        b.iframes = 99; b.animT += dt; this.handleEvents(this.world.drain());
        if (this.entT >= E.dur) { this.entDoneT = this.stateT; this.sound.play('roar'); }
      }
      if (this.entDoneT && (this.stateT - this.entDoneT > 2.2 || (skip && this.stateT - this.entDoneT > 0.25))) {
        const fight = () => { b.state = 'idle'; b.anim = 'idle'; b.t = 0; b.iframes = 0; b.ai.cd = 1.2; this.bossState = 'fight'; this.entDoneT = 0; this.go('play'); this.sound.setMusic('boss'); };
        if (this.preScene) { const sid = this.preScene; this.preScene = null; this.entDoneT = 0; this.playScene(sid, {}, fight); } else fight();
      }
      return;
    }
    if (this.stateT > 1.0 && b.anim !== 'roar') { b.anim = 'roar'; b.animT = 0; this.sound.play('roar'); this.r.shake(0.5, 1.0); }
    b.animT += dt; hero.animT += dt;
    if (this.stateT > 4.4 || (this.stateT > 1.5 && (inp.confirm || inp.taps.length))) {
      b.state = 'idle'; b.anim = 'idle'; b.t = 0; b.iframes = 0; b.ai.cd = 1.2; this.bossState = 'fight';
      this.go('play'); this.sound.setMusic('boss');
    }
  }
  entranceOf(b) {
    if (!b) return null; if (b._entrance === undefined) { let E = b.def && b.def.entrance; if (!E && typeof B4.bossEntrance === 'function') { try { E = B4.bossEntrance(b.type); } catch (err) { E = null; } } b._entrance = E && typeof E.step === 'function' && E.dur > 0 ? E : null; }
    return b._entrance;
  }
  // how far the boss intro is: 0..1 for the name card (after an entrance, or the old roar)
  introK() { const E = this.entranceOf(this.boss); if (E) return this.entDoneT ? Math.min(1, (this.stateT - this.entDoneT) * 2.5 + 0.3) : Math.max(0, (this.entT / E.dur - 0.6) / 0.4) * 0.8; return this.stateT > 1.2 ? Math.min(1, (this.stateT - 1.2) * 2) : 0; }

  bossDown() {
    const B = this.level.def.boss; this.bossState = 'done'; this.save.bosses[this.levelId] = true;
    const w = this.world; const type = this.boss && this.boss.type;
    for (const f of w.foes()) { f.hp = 0; w._kill(f, w.hero, {}); }
    w.hazards.length = 0; w.projs = w.projs.filter((p) => p.team === 'hero');
    const lines = bossReward(this.save, this.levelId, this.rand);
    const rec = (lines && lines.recruit) || this.save.justRecruited; const recScene = rec ? 'recruit.' + (rec === 'lamplighter' ? 'ash' : rec) : null;
    this.persist();
    // the boss's last words, then the scene this fall opens (a recruit, a revelation, the bell, an ending)
    const BL = BOSS_LINES[type]; if (BL && BL.fall) this.bark = { name: (SPEAKERS[type] || {}).name || this.boss.def.name.toUpperCase(), color: (SPEAKERS[type] || {}).color || COL.gold, text: BL.fall, t: 0, life: 3.6 };
    const sid = type === 'wheel' ? 'end' : (recScene && SCENES[recScene] ? recScene : AFTER_BOSS[type]);
    if (sid && (sid === 'end' || !this.seen(sid))) {
      this.pendingScene = sid;
      this.after(3.4, () => {
        if (sid === 'end') { this.playEnding(this.save.choice === 'sing' ? 'song' : 'dawn'); return; }
        if (this.state === 'dead') { this.pendingScene = null; return; }
        this.playScene(sid, {}, () => { this.pendingScene = null; if (this.save.justRecruited) { this.save.justRecruited = null; this.persist(); } this.afterBossScene(type); });
      });
    }
    this.sound.play('bigBell', { delay: 0.4 });
    this.after(1.8, () => {
      for (const g of B.opens || []) this.gate(g, true);
      this.ui.toast(this.boss.def.name.toUpperCase() + ' FALLS', { color: COL.gold, big: true, life: 4 });
      lines.forEach((l, i) => this.after(0.6 * (i + 1), () => this.ui.toast(l, { color: COL.text, life: 4 })));
      this.refreshHero();
    });
  }

  // what follows a boss's scene: the end of Act I after the bell, Act III after the Archon, else the district
  afterBossScene(type) {
    if (type === 'silence') { this.save.act1 = true; this.persist(); this.playScene('act1.end', {}, () => { this.r.post.dawn = 0; this.enterHaven(havenNext(this.save, ACT2[0])); }); return; }
    if (type === 'archon') { this.save.act2 = true; this.persist(); this.r.post.dawn = 0; this.enterHaven(havenNext(this.save, ACT3[0])); return; }
    this.go('play');
  }
  // an ending (dawn, silence, song), then the credits, then the offer of New Game+
  playEnding(kind) {
    this.pendingScene = 'end';
    this.playScene('end.' + kind, {}, () => {
      const S = this.save; S.done = true; S.ending = kind; S.endings = Array.isArray(S.endings) ? S.endings : []; if (!S.endings.includes(kind)) S.endings.push(kind); this.persist();
      this.pendingScene = null; this.back = 'ngplus'; this.r.post.fade = 1; this.go('credits');
    });
  }
  offerNewGamePlus() {
    this.playScene('ngplus', {}, (res) => {
      this.r.post.dawn = 0;
      if (res.ngplus === 'ng' && PROG.startNewGamePlus) { PROG.startNewGamePlus(this.save); this.save.choice = null; this.persist(); this.enterHaven(havenNext(this.save, 'gate'), { resume: true }); }
      else { this.persist(); this.go('loading'); this.start(); }
    });
  }

  gainXp(n) {
    const lv = addXp(this.save, n);
    if (lv) { const P = this.save.heroes[this.save.hero]; this.ui.toast('LEVEL ' + P.level + ': A SKILL POINT', { color: COL.gold, big: true, life: 3 }); if (P.level === 2) this.ui.toast('SPEND IT AT THE HAVEN', { color: COL.dim, life: 3 }); this.sound.play('lamp'); const h = this.world.hero; this.fx.embers(h.x, 1, h.z, 30, [3, 2.2, 0.8]); this.after(0.01, () => this.refreshHero()); }
  }

  // ------------------------------------------------------------------ ending
  // 'act1': the bell rings after the Belfry (the end of Act I), then the Act II opening and the Haven with
  // the Frostmarch ahead. 'finale': after the Archon, the closing ending and the credits. Both keep the dawn.
  startEnding(kind = 'finale') { this.endKind = kind; this.endLines = kind === 'act1' ? ENDING : FINALE; if (kind === 'act1') this.save.act1 = true; this.go('ending'); }
  ending(dt, inp) {
    const P = this.r.post; const lines = this.endLines || ENDING;
    if (this.stateT === dt) { this.endIdx = 0; this.endT = 0; if (this.endKind !== 'act1') this.save.done = true; this.persist(); this.sound.play('bigBell'); this.sound.setMusic('dawn'); this.atmos.lightning = false; if (this.world) this.world.idle(); }
    P.dawn = Math.min(1, this.stateT / 8); const fadeK = Math.max(0, 1 - this.stateT / 6); this.atmos.rainOn = this.atmos.weather ? 0 : fadeK; this.atmos.weatherK = fadeK; this.sound.setRain(this.atmos.rainOn);
    this.atmos.moon.intensity += (3.2 - this.atmos.moon.intensity) * dt * 0.3; this.atmos.moon.color.lerp(new THREE.Color(0xffc890), dt * 0.3);
    this.endT += dt;
    if (this.endT > 4 || (this.endT > 1 && (inp.confirm || inp.taps.length))) { this.endT = 0; this.endIdx++; }
    if (this.endIdx >= lines.length) {
      if (this.endKind === 'act1') { this.r.post.dawn = 0; this.storyLines = ACT2_OPENING; this.storyNext = 'haven:' + ACT2[0]; this.go('story'); }
      else { this.storyLines = CREDITS; this.storyNext = 'title'; this.go('story'); }
    }
    if (this.world) { this.world.update(dt, NO_INPUT); this.handleEvents(this.world.drain()); }
  }

  // ------------------------------------------------------------------ events -> effects
  handleEvents(evs) {
    const fx = this.fx, snd = this.sound, r = this.r; const hero = this.world.hero;
    for (const ev of evs) {
      switch (ev.type) {
        case 'swing': if (ev.e === hero) snd.play(ev.atk.heavy ? 'swingHeavy' : 'swing'); else snd.play('swing', { vol: 0.6 }); break;
        case 'shoot': snd.play(ev.kind === 'hfire' ? 'orb' : 'bolt', { vol: 0.5 }); break;
        case 'hit': {
          const d = ev.dst; const y = 1.0 * (d.def?.scale || 1);
          fx.sparks(d.x, y, d.z, ev.ang, ev.heavy ? 14 : (ev.crit ? 16 : 8), ev.crit ? [3, 2.6, 0.8] : undefined);
          fx.blood(d.x, y, d.z, ev.ang, ev.heavy ? 26 : 12);
          if (Math.random() < 0.6) fx.bloodPool(d.x, d.z, ev.heavy ? 1.2 : 0.8);
          if (ev.hero) { snd.play('heroHurt'); r.post.hurt = 0.7; }
          else snd.play(ev.heavy || ev.crit ? 'hitHeavy' : 'hit', { vol: ev.kind === 'bolt' ? 0.5 : 1 });
          if (ev.special) fx.slashLine(d.x, 1.1, d.z, 2.6);
          break;
        }
        case 'kill': {
          const e = ev.e; snd.play('kill'); snd.play('foeDie', { delay: 0.05 });
          fx.blood(e.x, 1, e.z, Math.random() * 6, 30); fx.mist(e.x, 0.8, e.z, 10, [0.15, 0.16, 0.2]); for (let i = 0; i < 3; i++) fx.bloodPool(e.x, e.z, 1.3);
          if (ev.drop) { const mul = hero && hero.stats.relics.includes('coin') ? 1.3 : 1; this.save.embers += Math.round(ev.drop * mul); this.emberFly(e.x, e.z, ev.drop); }
          if (ev.xp && this.levelId !== 'prologue') this.gainXp(ev.xp);
          if (ev.elite) this.ui.toast('ELITE SLAIN', { color: COL.gold, life: 1.5 });
          if (e.type && e.type !== 'hero' && noteKill(this.save, e.type)) this.ui.toast('NEW IN THE BESTIARY', { color: COL.ice, life: 2 });
          if (ev.boss) { this.bossDown(); r.shake(0.8, 1.2); this.zoomPunch = 1.3; fx.mist(e.x, 1.5, e.z, 60, [0.3, 0.3, 0.36]); fx.embers(e.x, 1.5, e.z, 60, [3, 1.4, 0.4]); fx.shockRing(e.x, e.z, 9, [2.6, 2.2, 1.6], 0.9); r.post.flash = 0.35; this.flashT = 0.12; }
          break;
        }
        case 'perfect': snd.play('perfect'); this.view.get(hero) && fx.ghost(this.view.get(hero), [0.4, 0.8, 1.6], 0.5); this.ui.toast('PERFECT', { color: COL.ice, life: 0.9 }); break;
        case 'dash': snd.play('dash'); this.dashGhosts = 3; this.ghostT = 0; fx.dust(ev.e.x, ev.e.z, 5); break;
        case 'stagger': fx.shockRing(ev.e.x, ev.e.z, 1.6, [2.4, 2.2, 1.2], 0.35); snd.play('block'); break;
        // the tonic: the drink starts (cork, gulps, motes up the body, a green glow on the warden), then
        // the health lands (a chime, a burst, the bar's new part flashes, "+amt" over the head)
        case 'drink': snd.play('drink'); if (fx.tonicStart) fx.tonicStart(ev.e); if (this.view.healGlow) this.view.healGlow(ev.e.id, 1.5); break;
        case 'heal': {
          const e = ev.e, amt = Math.round(ev.amt || 0); snd.play('heal');
          if (fx.tonicBurst) fx.tonicBurst(e.x, e.z, amt);
          if (e === hero && amt > 0) { if (this.ui.healGain) this.ui.healGain(amt); const p = r.project(new THREE.Vector3(e.x, 2.05, e.z)); if (this.ui.floatText) this.ui.floatText('+' + amt, p.x, p.y, '#7dff9a'); }
          break;
        }
        case 'ability': {
          const k = ev.kind; snd.play({ wave: 'swingHeavy', rush: 'dash', whirl: 'swingHeavy', volley: 'bolt', smoke: 'vanish', trap: 'gate', shock: 'boom', charge: 'dash', ward: 'toll', pillar: 'fire', lantern: 'heal', wisps: 'orb', fan: 'slashA', shadow: 'vanish', noose: 'clang', undertow: 'splash', tide: 'splash', barnacle: 'clang', shatter: 'hitHeavy', lullaby: 'heal', echo: 'toll' }[k] || 'swing');
          if (k === 'shadow') { this.dashGhosts = 4; this.ghostT = 0; }
          if (k === 'ward') fx.shockRing(ev.e.x, ev.e.z, 2.7, [2.4, 2, 1], 0.5);
          if (k === 'rush' || k === 'charge') { this.dashGhosts = 4; this.ghostT = 0; }
          break;
        }
        case 'whirlHit': snd.play('slashA'); break;
        case 'blinkHero': fx.mist(ev.fx, 0.8, ev.fz, 16, [0.5, 0.52, 0.56]); break;
        case 'zoneGo': { const k = ev.z.kind; if (k === 'pillar' || k === 'sun') { snd.play('fire'); r.shake(0.3, 0.2); } else if (k === 'smoke') snd.play('boom', { vol: 0.6 }); else if (k === 'trap') snd.play('clang'); else if (k === 'bolt') snd.play('bolt', { vol: 0.35 }); break; }
        case 'special': snd.play('special'); this.r.post.desat = 0.6; this.specialT = 1.6; this.zoomPunch = 1.2; fx.shockRing(ev.e.x, ev.e.z, 6.5, [3, 0.3, 0.25], 0.5); fx.embers(ev.e.x, 1, ev.e.z, 30, [3, 0.3, 0.25]); break;
        case 'specialHit': snd.play('slashA'); for (const f of this.world.foes()) if (Math.hypot(f.x - ev.e.x, f.z - ev.e.z) < 6.5) fx.slashLine(f.x, 1.1, f.z, 2.8); break;
        case 'chain': fx.slashLine((ev.from.x + ev.to.x) / 2, 1.2, (ev.from.z + ev.to.z) / 2, Math.hypot(ev.to.x - ev.from.x, ev.to.z - ev.from.z), [1.6, 1.8, 3], 0.15); snd.play('slashA', { vol: 0.5 }); break;
        case 'revive': snd.play('bigBell'); fx.embers(ev.e.x, 1, ev.e.z, 40, [3, 2.6, 1.6]); this.ui.toast("SAINT'S BONE: YOU RISE", { color: COL.gold, big: true, life: 2.5 }); break;
        case 'crown': fx.embers(ev.x, 0.8, ev.z, 12, [2.6, 0.6, 0.6]); break;
        case 'shieldBreak': snd.play('clang'); fx.sparks(ev.e.x, 1.2, ev.e.z, 0, 20, [2.4, 2.2, 1.6]); break;
        case 'tele': if (ev.e.boss || Math.random() < 0.7) snd.play('tele', { vol: ev.e.boss ? 1.4 : 0.8 }); break;
        case 'aggro': if (ev.e && ev.e.type) noteSeen(this.save, ev.e.type); break;
        // the Act II units' moves (units2.js): sounds from the ones the city already has
        case 'burrow': snd.play('boom', { vol: 0.5 }); fx.dust(ev.e.x, ev.e.z, 10); break;
        case 'emerge': snd.play('boom', { vol: 0.8 }); fx.dust(ev.e.x, ev.e.z, 16); break;
        case 'split': snd.play('splash'); break;
        case 'collapse': snd.play('foeDie', { vol: 0.7 }); break;
        case 'interrupt': snd.play('clang'); fx.shockRing(ev.e.x, ev.e.z, 1.6, [2.4, 1.2, 0.6], 0.35); break;
        case 'breakFree': snd.play('dash', { vol: 0.8 }); if (ev.e) fx.shockRing(ev.e.x, ev.e.z, 1.2, [1.6, 1.8, 2.4], 0.3); break;
        case 'spawn': if (ev.e && ev.e.type && ev.e.team === 'foe') noteSeen(this.save, ev.e.type); if (ev.e.state === 'spawn') { fx.mist(ev.e.x, 0.3, ev.e.z, 14, [0.25, 0.27, 0.32]); snd.play('rise', { vol: 0.6 }); } break;
        case 'fire': snd.play(ev.kind === 'bolt' ? 'bolt' : 'orb', { vol: 0.7 }); break;
        case 'projHit': fx.sparks(ev.p.x, ev.p.y ?? 1.1, ev.p.z, Math.random() * 6, 8, ev.p.kind === 'soul' ? [0.5, 2.5, 2.4] : [3, 0.6, 0.4]); break;
        case 'shieldUp': fx.shockRing(ev.x ?? ev.e.x, ev.z ?? ev.e.z, 1.2, [2.4, 2.2, 1.4], 0.4); snd.play('heal', { vol: 0.5 }); break;
        case 'shield': fx.shockRing(ev.e.x, ev.e.z, 2.2, [2.2, 2.1, 1.8], 0.5); snd.play('clang'); break;
        case 'beam': r.shake(0.3, 0.4); snd.play('fire'); break;
        case 'hook': fx.slashLine((ev.e.x + ev.x) / 2, 1.4, (ev.e.z + ev.z) / 2, Math.hypot(ev.x - ev.e.x, ev.z - ev.e.z), [1.4, 1.5, 1.6], 0.3); snd.play(ev.hit ? 'clang' : 'swing'); break;
        case 'hazardGo': { if (this.hazSnd === this.t) break; this.hazSnd = this.t; const k = ev.h.kind; if (k === 'fire' || k === 'wax') snd.play('fire'); else if (k === 'water' || k === 'poison') snd.play('splash'); else if (k === 'toll') snd.play('toll'); else if (k === 'lightning') { snd.play('thunder', { vol: 0.8 }); this.atmos.flashT = 0.2; } else snd.play('boom', { vol: 0.8 }); if (k !== 'fire' && k !== 'poison') r.shake(0.25, 0.25); break; }
        case 'phase': snd.play('roar'); this.ui.toast(ev.e.def.name.toUpperCase() + ' RAGES', { color: COL.red, life: 2 }); fx.shockRing(ev.e.x, ev.e.z, 6, [2.4, 0.4, 0.3], 0.6); break;
        case 'blink': fx.mist(ev.fx, 1, ev.fz, 12, [0.6, 0.15, 0.2]); fx.mist(ev.x, 1, ev.z, 12, [0.6, 0.15, 0.2]); snd.play('vanish'); break;
        case 'vanish': fx.mist(ev.e.x, 1, ev.e.z, 30, [0.8, 0.8, 0.85]); snd.play('vanish'); break;
        case 'appear': fx.mist(ev.e.x, 1, ev.e.z, 20, [0.8, 0.8, 0.85]); snd.play('vanish'); break;
        case 'land': snd.play('boom'); fx.dust(ev.e.x, ev.e.z, 20); fx.shockRing(ev.e.x, ev.e.z, 3, [1.4, 1.4, 1.6], 0.35); break;
        case 'shake': if (this.settings.shake) r.shake(ev.amt * 0.5, 0.22); break;
        case 'heroDeath': snd.play('death'); this.go('dead'); break;
        case 'block': fx.sparks(ev.x, 1.1, ev.z, Math.random() * 6, 10); snd.play('block'); break;
        case 'summon': snd.play('rise'); break;
        case 'storm': this.atmos.flash(1); break;
        case 'foeStrike': if (ev.e.boss) snd.play('swingHeavy', { vol: 0.8 }); break;
        // Act III's foes and bosses (units3.js, bosses4.js): sounds from the ones the game already has
        case 'latch': snd.play('clang', { vol: 0.7 }); break;
        case 'vent': snd.play('fire'); if (ev.e) fx.mist(ev.e.x, 1, ev.e.z, 18, [0.6, 0.6, 0.62]); break;
        case 'cool': snd.play('splash', { vol: 0.6 }); if (ev.e) fx.mist(ev.e.x, 1.2, ev.e.z, 10, [0.5, 0.55, 0.6]); break;
        case 'bubble': snd.play('splash'); break;
        case 'rewind': snd.play('vanish'); if (ev.e) { fx.shockRing(ev.e.x, ev.e.z, 2.5, [2.2, 2, 1.2], 0.5); this.ui.toast('TIME TURNS BACK', { color: COL.ice, life: 1.6 }); } break; // PROPOSAL
        case 'voice': snd.play('special'); this.ui.toast('STAND IN THE SONG.', { color: COL.gold, big: true, life: 3.2 }); break; // PROPOSAL (the Wheel's true form)
        case 'silence': snd.play('toll', { f: 73, vol: 0.7 }); break;
        case 'ascend': snd.play('bigBell'); snd.play('roar', { delay: 0.2 }); if (ev.e) { fx.shockRing(ev.e.x, ev.e.z, 7, [2.8, 2.4, 1.2], 0.7); this.ui.toast(ev.e.def.name.toUpperCase() + ' ASCENDS', { color: COL.gold, big: true, life: 2.4 }); } break; // PROPOSAL
        case 'musicStop': snd.setMusic('none'); break;
        // the new wardens' powers and the Echoes (sim.js)
        case 'toll': snd.play('toll'); if (ev.e) fx.shockRing(ev.e.x, ev.e.z, 3.2, [2.6, 2.2, 1.2], 0.5); break;
        case 'shatter': snd.play('clang'); if (ev.e) fx.sparks(ev.e.x, 1.1, ev.e.z, 0, 16, [1.6, 2.2, 2.8]); break;
        case 'hush': snd.play('vanish', { vol: 0.6 }); break;
        case 'boneWard': snd.play('block'); if (ev.e) fx.shockRing(ev.e.x, ev.e.z, 1.4, [2.2, 2.1, 1.8], 0.35); break;
      }
    }
  }

  emberFly(x, z, n) { this.fx.embers(x, 0.8, z, Math.min(18, 4 + n), [3, 1.6, 0.4]); this.sound.play('ember', { delay: 0.25 }); }

  // ------------------------------------------------------------------ frame
  renderFrame(dt) {
    const r = this.r, w = this.world;
    let target = null; let zt = 1;
    const titleish = this.state === 'title' || this.state === 'select' || (this.state === 'controls' || this.state === 'settings') && this.back === 'title' || (this.state === 'credits' && this.back === 'title') || (this.state === 'story' && (this.storyNext === 'prologue' || this.storyNext === 'gate'));
    if (this.state === 'cutscene' && this.cut) {
      // a scene runs the camera; its puppets are drawn with the world (which stands still, breathing)
      const cs = this.cut; target = cs.camPos.clone(); zt = cs.zoom; this.camFocus.copy(target); this.zoom = zt;
      if (w) for (const e of w.ents) if (e.state !== 'cut') e.animT += dt;
      this.view.update(cs.viewList(w), dt);
    } else if (titleish) {
      this.titleCam = (this.titleCam || 0) + dt; target = new THREE.Vector3(-0.8 + Math.sin(this.titleCam * 0.12) * 0.8, 0, -1.6 + Math.cos(this.titleCam * 0.1) * 0.5);
      if (this.state === 'select' && w && w.hero) {
        // the warden stands in the free middle between the list and the card, as big as it allows
        const L = this.selLayout(); const fw = L.freeX1 - L.freeX0; zt = Math.max(1.3, Math.min(2.2, fw / 62, this.ui.h / 95));
        target = new THREE.Vector3(w.hero.x, 0.8, w.hero.z).addScaledVector(r.right, (this.ui.w / 2 - (L.freeX0 + L.freeX1) / 2) / (16 * zt));
      }
      if (w) { this.view.update(w, dt); for (const e of w.ents) e.animT += dt; }
    } else if (this.inHaven && this.haven && w && w.hero) {
      // the Haven runs its own camera (and the warden breathes on while the game is paused there)
      const c = this.haven.camera(dt); target = c.target; zt = c.zoom;
      for (const e of w.ents) e.animT += dt; this.view.update(w, dt);
    } else if (w && w.hero) {
      const h = w.hero; target = new THREE.Vector3(h.x + h.vx * 0.18, 0, h.z + h.vz * 0.18);
      const E = this.state === 'bossIntro' && this.entranceOf(this.boss);
      if (E) { // the entrance: the camera stays on the boss (entrance.cam: zoom and offset)
        const c = E.cam || {}; const o = c.off || c.offset || [0, 0, 0]; const ox = Array.isArray(o) ? o[0] : (o.x || 0), oy = (Array.isArray(o) ? (o.length > 2 ? o[1] : 0) : (o.y || 0)) + (c.lift || 0), oz = Array.isArray(o) ? (o.length > 2 ? o[2] : o[1]) : (o.z || 0);
        const k = Math.min(1, this.stateT / 0.6); target.lerp(new THREE.Vector3(this.boss.x + ox, 1.6 * (this.boss.def.scale || 1) * 0.6 + oy + (this.boss.leapH || 0) * 0.5, this.boss.z + oz), k * 0.9); zt = 1 + k * ((c.zoom || 1.25) - 1);
      } else if (this.state === 'bossIntro' && this.boss) { const k = Math.min(1, this.stateT / 1.0) * (this.stateT < 3.8 ? 1 : Math.max(0, 1 - (this.stateT - 3.8) / 0.6)); target.lerp(new THREE.Vector3(this.boss.x, 1.6 * (this.boss.def.scale || 1) * 0.6, this.boss.z), k * 0.85); zt = 1 + k * 0.25; }
      if (this.boss && !this.boss.dead && this.state === 'play') target.lerp(new THREE.Vector3(this.boss.x, 0, this.boss.z), 0.2);
      this.view.update(w, dt);
    }
    if (target && !this.debugCamHold && this.state !== 'cutscene') this.camFocus.lerp(target, Math.min(1, dt * (this.state === 'play' ? 6 : (this.inHaven ? 2 : 2.5))));
    if (this.zoomPunch) { zt = Math.max(zt, this.zoomPunch); this.zoomPunch = Math.max(1, this.zoomPunch - dt * 0.6); if (this.zoomPunch <= 1.001) this.zoomPunch = 0; }
    if (this.debugZoom) zt = this.debugZoom;
    if (this.state !== 'cutscene') this.zoom += (zt - this.zoom) * Math.min(1, dt * (this.inHaven ? 1.6 : 5)); r.setZoom(Math.abs(this.zoom - 1) < 0.004 ? 1 : this.zoom);
    r.focus.copy(this.camFocus);
    if (this.dashGhosts > 0 && w && w.hero) { this.ghostT -= dt; if (this.ghostT <= 0) { this.dashGhosts--; this.ghostT = 0.05; const rig = this.view.get(w.hero); if (rig) this.fx.ghost(rig); } }
    const P = r.post; P.hurt = Math.max(0, P.hurt - dt * 1.6); if (this.state !== 'dead') P.desat = Math.max(0, P.desat - dt * (this.specialT > 0 ? 0.2 : 1.5)); this.specialT = (this.specialT || 0) - dt;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) P.flash = 0; }
    if (this.state === 'loading') P.fade = 1;
    else if (this.leaving) { this.fadeOut += dt; P.fade = Math.min(1, this.fadeOut / 0.6); }
    else if (this.state === 'cutscene' && this.cut) P.fade = this.cut.fade;
    else if (this.state === 'credits' && this.back === 'ngplus') P.fade = Math.max(P.fade, 0.85);
    else if (this.fadeIn !== undefined && this.fadeIn < 1) { this.fadeIn += dt * 1.5; P.fade = Math.max(0, 1 - this.fadeIn); }
    else P.fade = this.state === 'story' && this.storyNext === 'title' ? 1 : (this.state === 'story' ? 0.72 : 0);
    if (this.state === 'dead') P.fade = Math.min(0.6, this.stateT * 0.25);
    if (w && w.hero) { shared.cutFocus.value.set(w.hero.x, 1, w.hero.z); shared.cutDir.value.copy(r.fwd); }
    // a lamp that was just used leaps up for a moment
    for (const f of this.flares) { f.t += dt; f.s.intensity = f.base * (1 + 1.6 * Math.max(0, 1 - f.t / 0.9)); }
    this.flares = this.flares.filter((f) => { if (f.t < 0.9) return true; f.s.intensity = f.base; return false; });
    // the rain stops where a roof still holds (the Haven); elsewhere on the stones
    this.atmos.update(dt, r.focus, this.groundAt || (() => 0));
    const hl = this.world && this.world.hero; if (hl && !hl.dead) this.atmos.heroLight.position.set(hl.x + 0.5, 2.6, hl.z + 0.8);
    if (this.level) for (const a of this.level.anims) a.update(dt);
    if (w) { this.fx.updateTeles(w.ents, this.t); this.fx.updateHazards(w.hazards, dt, this.t); this.fx.updateProjs(w.projs, this.t); this.fx.updateZones(w.zones, dt); }
    this.fx.update(dt, this.t);
    r.render(dt);
    this.ui.clear(); this.embersShown += (this.save.embers - this.embersShown) * Math.min(1, dt * 6);
    this.drawUI(dt);
    this.sound.update();
  }

  drawUI(dt) {
    const ui = this.ui, W = ui.w, H = ui.h, S = this.state;
    if (S === 'title') this.drawTitle();
    if (S === 'select') this.drawSelect();
    if (S === 'controls') this.drawControls();
    if (S === 'settings') this.drawSettings();
    if (S === 'credits' && this.back === 'ngplus') {
      // the credits roll up after an ending
      const n = CREDITS.length; const y0 = Math.round(H + 4 - this.stateT * 18); const end = Math.round(H / 2 - n * 6);
      const yy = Math.max(end, y0); CREDITS.forEach((l, i) => { if (l) ui.text(l, W / 2, yy + i * 12, { align: 'center', scale: i === 0 ? 2 : 1, color: i === 0 ? COL.white : (i === 1 ? COL.gold : COL.dim) }); });
      if (this.stateT > 1.2) ui.text(this.inputMode === 'touch' ? 'TAP TO GO ON' : 'ENTER TO GO ON', W / 2, H - 12, { align: 'center', color: '#6a6252', alpha: 0.6 });
    } else if (S === 'credits') {
      ui.veil(0.6); const n = CREDITS.length, y0 = Math.round(H / 2 - n * 6);
      CREDITS.forEach((l, i) => ui.text(l, W / 2, y0 + i * 12, { align: 'center', color: i === 0 ? COL.white : COL.dim }));
      if (this.stateT > 0.5) ui.text(this.inputMode === 'touch' ? 'TAP TO GO BACK' : 'ENTER TO GO BACK', W / 2, H - 14, { align: 'center', color: '#6a6252' });
    }
    if (S === 'story') {
      const lines = this.storyLines || []; const i = Math.min(lines.length - 1, this.storyIdx || 0); const a = Math.min(1, (this.lineT || 0) * 1.5);
      const wrapped = ui.wrap(lines[i] || '', Math.min(W - 40, 300));
      wrapped.forEach((l, k) => ui.text(l, W / 2, H / 2 - wrapped.length * 6 + k * 12, { align: 'center', color: COL.text, alpha: a }));
      ui.text('TAP / ENTER', W / 2, H - 16, { align: 'center', color: '#5a564e', alpha: 0.5 + Math.sin(this.t * 3) * 0.3 });
    }
    if (this.inHaven && this.haven && ['haven', 'pause', 'controls', 'settings'].includes(S)) this.haven.draw(ui, dt, S === 'haven');
    else if (['play', 'pause', 'bossIntro', 'dead'].includes(S) && this.world) {
      const hs = this.hs || (this.hs = {}); if (hs.world !== this.world) { hs.hpGhost = undefined; hs.bossGhost = undefined; }
      const P = this.save.heroes[this.save.hero];
      Object.assign(hs, { world: this.world, boss: this.boss && this.bossState === 'fight' ? this.boss : null, bossPhases: this.boss ? (BOSS_AI[this.boss.type] || BOSS_AI2[this.boss.type] || {}).phases : null, embersShown: this.embersShown, prompt: S === 'play' ? this.prompt : null, padMode: this.inputMode === 'pad', noToasts: S === 'pause', level: P.level, xpFrac: xpFrac(this.save), points: P.points });
      ui.toastY = S === 'play' && this.tutorial && this.tutorial.step && this.tutBottom ? this.tutBottom + 3 : 0; // toasts start under the training panel
      if (S !== 'bossIntro') ui.hud(hs, dt);
      if (this.card && S === 'play') {
        this.card.t += dt * (this.world.combat ? 4 : 1); const c = this.card; const a = Math.min(1, c.t * 1.5, Math.max(0, (4.5 - c.t) * 1.2));
        const y0 = Math.round(H * 0.62);
        // on touch the card keeps clear of the buttons (right) and, by symmetry, of the stick (left)
        let maxW = Math.min(W - 16, 260); if (!this.input.touchMode) maxW = Math.min(maxW, Math.max(140, 2 * (W - 90 - W / 2))); // clear of the ability badges
        if (this.input.touchMode) { const btns = (this.input.layout || []).filter((b) => !b.hidden && b.id !== 'pause' && b.id !== 'use'); const lim = btns.length ? Math.min(...btns.map((b) => b.x - b.r)) : W - 100; maxW = Math.min(maxW, Math.max(120, 2 * (lim - W / 2) - 6)); }
        if (a > 0) { ui.text(c.sup, W / 2, y0, { align: 'center', color: COL.red, alpha: a }); ui.text(c.title, W / 2, y0 + 11, { align: 'center', color: COL.white, scale: ui.measure(c.title, 2) > Math.min(W - 16, 260) + 8 ? 1 : 2, alpha: a }); if (c.line) ui.wrapEven(c.line, maxW).forEach((l, k) => ui.text(l, W / 2, y0 + 31 + k * 9, { align: 'center', color: COL.dim, alpha: a })); }
        if (c.t > 5) this.card = null;
      }
      if (S === 'play' && this.tutorial) this.drawTutorial();
      if (S === 'play' && this.input.touchMode) ui.drawTouch({ world: this.world, prompt: this.prompt }, this.input);
      if (S === 'play' && !this.world.combat && !this.card && !this.tutorial) this.drawCompass();
    }
    if (S === 'bossIntro' && this.boss) {
      // the name sits inside the bottom bar so it never covers the fight
      const k = Math.min(1, this.stateT * 2) * (this.entranceOf(this.boss) || this.stateT <= 4.0 ? 1 : Math.max(0, 1 - (this.stateT - 4.0) * 2.5));
      const bh = Math.round(H * 0.2 * k); if (bh > 0) { ui.rect(0, 0, W, bh, '#000'); ui.rect(0, H - bh, W, bh, '#000'); }
      const ik = this.introK();
      if (ik > 0) { const a = ik * k; const nm = this.boss.def.name.toUpperCase(); ui.text(nm, W / 2, H - 32, { align: 'center', scale: ui.measure(nm, 2) > W - 12 ? 1 : 2, color: COL.white, alpha: a }); ui.text((this.boss.def.title || '').toUpperCase(), W / 2, H - 13, { align: 'center', color: COL.red, alpha: a }); }
      // its line, in the top bar, in its own colour
      const BL = BOSS_LINES[this.boss.type]; const la = Math.max(0, ik - 0.35) / 0.65 * k;
      if (BL && BL.intro && la > 0) { const sp = SPEAKERS[this.boss.type] || {}; const tw = Math.min(W - 24, 252); const ls = ui.wrap('"' + BL.intro + '"', tw).slice(0, 2); ls.forEach((l, i) => ui.text(l, W / 2, Math.max(3, Math.round(bh / 2) - ls.length * 5) + i * 10, { align: 'center', color: sp.color || COL.text, alpha: la, shadow: false })); }
      if (this.entranceOf(this.boss) && !this.entDoneT && this.stateT > 0.3) ui.text('TAP TO SKIP', W - Math.round(ui.safe.r) - 6, H - bh + 3, { align: 'right', color: '#6a6252', shadow: false });
    }
    if (S === 'cutscene' && this.cut) this.cut.draw(ui);
    // a boss's last words as it falls
    if (this.bark && S === 'play') { const B = this.bark; B.t += dt; const a = Math.min(1, B.t * 3, Math.max(0, (B.life - B.t) * 2)); if (a > 0) drawLineBox(ui, B.name, B.color, B.text, a, this.input.touchMode ? 'top' : 'bottom'); if (B.t > B.life) this.bark = null; }
    if (S === 'pause') this.drawPause();
    if (S === 'dead') {
      const a = Math.min(1, this.stateT * 0.8); ui.text('YOU FELL', W / 2, Math.round(H * 0.36), { align: 'center', scale: 3, color: '#b01c22', alpha: a }); ui.text('THE LAMP STILL BURNS', W / 2, Math.round(H * 0.36) + 28, { align: 'center', color: COL.dim, alpha: Math.max(0, a - 0.3) });
      if (this.stateT > 1.2) ui.text(this.inputMode === 'touch' ? 'TAP TO RISE' : 'ENTER TO RISE', W / 2, Math.round(H * 0.36) + 46, { align: 'center', color: '#7a7262', alpha: Math.min(1, (this.stateT - 1.2) * 2) * (0.7 + 0.3 * Math.sin(this.t * 4)) });
    }
    if (S === 'ending') { const EL = this.endLines || ENDING; const line = EL[Math.min(EL.length - 1, this.endIdx || 0)]; const a = Math.min(1, (this.endT || 0) * 1.2); ui.letterbox(1); ui.wrap(line, W - 40).forEach((l, k) => ui.text(l, W / 2, H * 0.84 + k * 10, { align: 'center', color: '#f0e0c0', alpha: a })); }
  }

  // ---- menus: one look everywhere (ui.button): framed buttons at least 18 px tall (about 40 points on a
  // phone), clear of the notch, a dim veil over the scene where a screen sits on top of it
  menuHeight(n, avail, gap) { return Math.max(16, Math.min(22, Math.floor((avail - gap * (n - 1)) / n))); }

  drawTitle() {
    const ui = this.ui, W = ui.w, H = ui.h; const a = Math.min(1, this.stateT * 0.8); const sl = Math.round(ui.safe.l), sr = Math.round(ui.safe.r);
    const short = H < 170; const ly = short ? 6 : Math.round(H * 0.07);
    ui.logo(W / 2, ly, a);
    if (!short) ui.text('RING THE BELL. BRING THE DAWN.', W / 2, ly + 34, { align: 'center', color: COL.dim, alpha: a });
    const items = this.titleItems || []; const gap = 4; const y0 = ly + (short ? 34 : 48); const h = this.menuHeight(items.length, H - 6 - y0, gap);
    const x = sl + 12, w = 118; const g = ui.g, a0 = g.globalAlpha; g.globalAlpha = a0 * a;
    this.menuRects = ui.buttons(items, this.sel, x, y0, w, h, gap, { align: 'left' });
    g.globalAlpha = a0;
    ui.text('V2.1', W - 4 - sr, H - 10, { align: 'right', color: '#4a463e' });
  }

  drawPause() {
    const ui = this.ui, W = ui.w, H = ui.h; ui.veil(0.6);
    const short = H < 170; const ty = short ? 8 : Math.round(H * 0.1);
    ui.text('PAUSED', W / 2, ty, { align: 'center', scale: 2, color: COL.white });
    const where = this.inHaven ? 'THE HAVEN' : (this.level && this.level.def && this.level.def.name ? this.level.def.name.toUpperCase() : '');
    if (where) ui.text(where, W / 2, ty + 19, { align: 'center', color: COL.dim });
    const items = this.pauseItems || []; const gap = 4; const y0 = ty + 32; const h = this.menuHeight(items.length, H - 6 - y0, gap); const w = 156;
    this.menuRects = ui.buttons(items, this.sel, Math.round(W / 2 - w / 2), y0, w, h, gap);
  }

  drawSettings() {
    const ui = this.ui, W = ui.w, H = ui.h; ui.veil(0.66); const sl = Math.round(ui.safe.l), sr = Math.round(ui.safe.r);
    const items = this.setItems || []; const n = items.length; const short = H < 175;
    ui.text('SETTINGS', W / 2, 6, { align: 'center', scale: short ? 1 : 2, color: COL.white });
    const top = short ? 18 : 26; const tipH = 11; const gap = 3;
    // one column when it fits, two on a short screen (BACK under both)
    const cols = short ? 2 : 1; const per = Math.ceil((n - 1) / cols);
    const h = this.menuHeight(per + 1, H - top - tipH - 4, gap);
    const use = W - sl - sr - 16; const cw = cols === 1 ? Math.min(250, use) : Math.min(200, Math.floor((use - 6) / 2));
    const x0 = Math.round(sl + 8 + (use - (cw * cols + (cols - 1) * 6)) / 2);
    this.menuRects = [];
    items.forEach((it, i) => {
      const back = i === n - 1; const c = back ? 0 : Math.floor(i / per), k = back ? per : i % per;
      const bw = back ? Math.min(120, cw) : cw; const bx = back ? Math.round(W / 2 - bw / 2) : x0 + c * (cw + 6), by = top + k * (h + gap);
      const r = ui.button(bx, by, bw, h, it.label, { sel: i === this.sel, align: back ? 'center' : 'left' });
      if (!back) { const vx = bx + bw - 8; ui.text('>', vx, by + Math.round((h - 7) / 2), { align: 'right', color: '#8a6a3a', shadow: false }); ui.text(it.value, vx - 10, by + Math.round((h - 7) / 2), { align: 'right', color: COL.gold, shadow: false }); if (bx + 8 + ui.measure(it.label) + 10 < vx - 16 - ui.measure(it.value) - 5) ui.text('<', vx - 16 - ui.measure(it.value), by + Math.round((h - 7) / 2), { align: 'right', color: '#8a6a3a', shadow: false }); }
      this.menuRects.push({ ...r, i });
    });
    const tip = ['SOUND EFFECTS AND MUSIC', 'MUSIC VOLUME, 0 TO 10', 'THE SCREEN SHAKES ON HEAVY BLOWS', 'BIGGER PIXELS RUN FASTER', 'THE SIZE OF THE TOUCH BUTTONS AND THE STICK', 'ON ATTACK: A READY SKILL FIRES FROM YOUR ATTACK. AUTO: ALSO ON ITS OWN', ''][this.sel] || '';
    if (tip) ui.text(fit(ui, tip, W - sl - sr - 12), W / 2, H - tipH, { align: 'center', color: COL.dim });
  }

  drawSelect() {
    const ui = this.ui, W = ui.w, H = ui.h; const ids = this.selIds(); const id = ids[this.selHero] || ids[0]; const Hd = HEROES[id]; const locked = !STARTERS.includes(id);
    const L = this.selLayout(); const R = this.selRects = { heroes: [] };
    // the wardens: a list on the left
    ui.text('CHOOSE YOUR WARDEN', L.lx, 6, { color: COL.gold });
    const gap = ids.length > 5 ? 2 : 3; const bh = Math.max(12, Math.min(24, Math.floor((H - 17 - 30) / ids.length) - gap));
    ids.forEach((hid, i) => {
      const lk = !STARTERS.includes(hid); const y = 17 + i * (bh + gap);
      R.heroes.push({ ...ui.button(L.lx, y, L.lw, bh, HEROES[hid].name, { on: i === this.selHero, align: 'left', sub: bh >= 19 ? (lk ? 'LOCKED' : ARMS[HEROES[hid].weapon] || '') : undefined, color: lk ? '#7a7266' : undefined }), i });
      if (lk) lockIcon(ui, L.lx + L.lw - 12, y + Math.round(bh / 2) - 4);
    });
    R.back = ui.button(L.lx, H - 6 - 20, 64, 20, '< BACK', {});
    // the card on the right
    const cx = L.cx, cw = L.cw, cy = 6, ch = H - 12; const px = cx + 7, tw = cw - 14;
    ui.frame(cx, cy, cw, ch, 'rgba(8,9,12,0.88)', locked ? '#3a3630' : '#5a4a32');
    let y = cy + 6;
    ui.text(Hd.name, px, y, { scale: ui.measure(Hd.name, 2) <= tw ? 2 : 1, color: locked ? '#8a8478' : COL.white }); y += 16;
    ui.text(Hd.title, px, y, { color: COL.red, shadow: false }); y += 12;
    const btnY = cy + ch - 6 - 22;
    if (this.selStep === 0) {
      const ult = ULTS[Hd.ult] ? ULTS[Hd.ult].name : Hd.ult.toUpperCase();
      const skills = ui.wrap(Hd.abilities.map((a) => (ABILITIES[a] ? ABILITIES[a].name : a)).join(', '), tw); const statsH = 20, skillsH = 11 + skills.length * 9 + 9;
      const room = btnY - 4 - y - statsH - skillsH; const blurb = ui.wrap(Hd.blurb, tw); const nb = Math.max(1, Math.min(blurb.length, Math.floor(room / 9)));
      blurb.slice(0, nb).forEach((l, k) => ui.text(k === nb - 1 && nb < blurb.length ? dots(ui, l, tw) : l, px, y + k * 9, { color: COL.text, shadow: false })); y += nb * 9 + 4;
      // ratings in two columns
      const rows = [['POWER', Hd.rating.power], ['RANGE', Hd.rating.range], ['SPEED', Hd.rating.speed], ['GUARD', Hd.rating.guard]]; const colW = Math.floor(tw / 2);
      rows.forEach(([nm, v], k) => { const rx = px + (k % 2) * colW, ry = y + Math.floor(k / 2) * 9; ui.text(nm, rx, ry, { color: COL.dim, shadow: false }); for (let s = 0; s < 5; s++) ui.rect(rx + 33 + s * 5, ry + 1, 4, 5, s < v ? COL.gold : '#2a2620'); });
      y += statsH;
      ui.text('SKILLS', px, y, { color: COL.dim, shadow: false }); y += 10;
      skills.forEach((l, k) => ui.text(l, px, y + k * 9, { color: COL.ice, shadow: false })); y += skills.length * 9;
      ui.text('ULTIMATE: ' + ult, px, y, { color: '#e08070', shadow: false });
      R.choose = ui.button(px - 2, btnY, tw + 4, 22, locked ? fit(ui, this.joinsText(id), tw) : 'CHOOSE ' + Hd.name, { sel: !locked, disabled: locked, fill: locked ? '#14120f' : '#3a1a14', edge: locked ? '#3a3228' : COL.gold, color: locked ? '#6a6458' : COL.white });
    } else {
      // how to begin: two big choices
      ui.text('HOW WILL YOU BEGIN?', px, y + 2, { color: COL.dim, shadow: false }); y += 14;
      const items = this.selItems || []; const gap = 4; const h = Math.max(20, Math.min(28, Math.floor((btnY + 22 - y - gap) / 2) - gap));
      this.menuRects = ui.buttons(items, this.sel, px - 2, y, tw + 4, h, gap, { align: 'left' });
      R.choose = null;
    }
    if (this.selStep === 0) this.menuRects = [];
  }
  // the wardens on the select screen (every registered one; those who join later show a lock)
  selIds() { return HERO_ORDER.filter((id) => HEROES[id]); }
  joinsText(id) { if (HX.JOINS && HX.JOINS[id]) return 'JOINS AFTER ' + HX.JOINS[id]; const at = (HEROES[id] && HEROES[id].unlock) || JOINS[id]; const L = at && LEVELS[at]; return L ? 'JOINS AFTER ' + L.name.toUpperCase() : 'JOINS LATER'; }
  // where the select screen puts things (the camera frames the warden between the list and the card)
  selLayout() {
    const ui = this.ui, W = ui.w; const sl = Math.round(ui.safe.l), sr = Math.round(ui.safe.r); const use = W - sl - sr;
    const lx = sl + 6, lw = 92; const cw = Math.max(170, Math.min(206, Math.round(use * 0.46))); const cx = W - sr - 6 - cw;
    return { lx, lw, cx, cw, freeX0: lx + lw, freeX1: cx };
  }

  drawTutorial() {
    const ui = this.ui, W = ui.w; const T = this.tutorial; const s = T.step; if (!s) return;
    const N = STEPS.length, n = Math.min(T.i + 1, N); const txt = T.text(this.inputMode); const note = T.note();
    const lines = ui.wrap(txt, Math.min(W - 40, 280)); const ph = 14 + lines.length * 9 + (note ? 9 : 0); const pw = Math.min(W - 24, 296); const x0 = Math.round((W - pw) / 2), y0 = 26;
    ui.frame(x0, y0, pw, ph, 'rgba(8,10,14,0.8)', T.doneT > 0 ? '#8a7a40' : '#3a3428'); this.tutBottom = y0 + ph;
    ui.text('TRAINING ' + n + '/' + N, x0 + 5, y0 + 3, { color: COL.dim, shadow: false });
    if (T.doneT > 0) ui.text('DONE', x0 + pw - 5, y0 + 3, { align: 'right', color: COL.gold, shadow: false });
    lines.forEach((l, k) => ui.text(l, W / 2, y0 + 13 + k * 9, { align: 'center', color: T.doneT > 0 ? COL.gold : COL.white, shadow: false }));
    if (note) ui.text(note, W / 2, y0 + 13 + lines.length * 9, { align: 'center', color: COL.ice, shadow: false });
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
    const ui = this.ui, W = ui.w, H = ui.h; ui.veil(0.72); const sl = Math.round(ui.safe.l), sr = Math.round(ui.safe.r);
    const short = H < 175; ui.text('CONTROLS', W / 2, 6, { align: 'center', scale: short ? 1 : 2, color: COL.white });
    const rows = [['MOVE', 'WASD, ARROWS', 'LEFT THUMB', 'LEFT STICK'], ['ATTACK (HOLD)', 'J, LEFT CLICK', 'ATK', 'X'], ['DASH (MOVE SKILL)', 'SPACE, SHIFT', 'DASH', 'A'], ['ULTIMATE', 'Q, U', 'ULT', 'RB'], ['TONIC', 'R, H', 'TON', 'LB'], ['OPEN A CHEST', 'E', 'USE', 'BACK'], ['PAUSE', 'ESC, P', 'II', 'START']];
    const head = ['', 'KEYBOARD', 'TOUCH', 'GAMEPAD'];
    const widths = head.map((h, c) => Math.max(ui.measure(h), ...rows.map((r) => ui.measure(r[c]))));
    const use = W - sl - sr - 12; const gapC = Math.max(6, Math.min(16, Math.floor((use - widths.reduce((a, b) => a + b, 0)) / 3)));
    const total = widths.reduce((a, b) => a + b, 0) + gapC * 3; let x = Math.round(sl + 6 + (use - total) / 2); const xs = widths.map((w) => { const v = x; x += w + gapC; return v; });
    let y = short ? 20 : 30; const lh = short ? 10 : 11;
    head.forEach((h, c) => ui.text(h, xs[c], y, { color: COL.dim, shadow: false })); y += lh + 1;
    ui.rect(xs[0], y - 3, total, 1, '#3a2e20');
    rows.forEach((r) => { r.forEach((t, c) => ui.text(t, xs[c], y, { color: c === 0 ? COL.gold : COL.text, shadow: false })); y += lh; });
    y += 4;
    const notes = ['SKILLS FIRE FROM YOUR ATTACK WHEN THEIR BADGE GLOWS; MOVEMENT SKILLS FIRE FROM YOUR DASH.', 'LAMPS LIGHT THEMSELVES WHEN NO FOE IS NEAR.'];
    for (const n of notes) for (const l of ui.wrap(n, use)) { if (y + 7 < H - 4) ui.text(l, W / 2, y, { align: 'center', color: COL.ice, shadow: false }); y += 9; }
    if (this.stateT > 0.3 && y + 9 < H) ui.text(this.inputMode === 'touch' ? 'TAP TO GO BACK' : 'ENTER TO GO BACK', W / 2, H - 10, { align: 'center', color: '#6a6252' });
  }
}

// a small padlock (locked wardens)
function lockIcon(ui, x, y) { ui.rect(x + 1, y, 4, 1, '#8a8070'); ui.rect(x + 1, y, 1, 3, '#8a8070'); ui.rect(x + 4, y, 1, 3, '#8a8070'); ui.rect(x, y + 3, 6, 5, '#8a8070'); ui.rect(x + 2, y + 5, 2, 2, '#2a2620'); }
