// The game: the roguelite run (docs/RUN_DESIGN.md). Title, the warden select and talents, the Old Road (the
// tutorial duel on the first run), the route map, and each node: an area (its variant, its boss), an event, a
// shrine (the solitary Haven), the merchant, a trial, a quest; a boon of three after each cleared fight; death
// ends the run, then its summary. Owns the World (simulation) and turns its events into effects. The run's
// rules are pure (run.js); the menus are screen objects (E's js/ui, plain stand-ins until they land).
import * as THREE from '../../vendor/three.module.min.js';
import { World, angTo } from './sim.js';
import { buildLevel, K } from '../world/level.js';
import { CREDITS, ACT_OF } from './story.js';
import { Cutscene, drawLineBox } from './cutscene.js';
import { SCENES, AFTER_BOSS, BEFORE_BOSS, ON_ENTER, STAGE } from './scenes/index.js';
import { BOSS_LINES } from './scenes/lines.js';
import { SPEAKERS, WARDENS } from './scenes/cast.js';
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
import { HEROES, heroStats, AFFIX_LIST, RELICS, ECHOES } from './heroes.js';
import { noteKill, noteSeen, trueEndingReady } from './progress.js';
import {
  freshMeta, upgradeMeta, migrateSave, newRun, nextNodes, enterNode, completeNode, advanceAct, actOver, currentNode, endRun, statSave, applyRunStats,
  merchantStock, buyItem, healRun, upgradeCost, rerollCost, shrineHeal, priceK, towerLevel, buyTower, toggleTalent, availableTalents, masteryOf,
  rngOf, hashSeed, AREA_NAMES, AREA_BOSS, AREA_TIER, RUN_VERSION, TOWER, curseMod,
} from './run.js';
import { Duel } from './tutorial.js';
import { Haven } from './haven.js';
import { buildHaven } from '../world/haven.js';

const QUALITY = [{ label: 'SHARP', h: 200 }, { label: 'BALANCED', h: 175 }, { label: 'FAST', h: 150 }];
const BUTTONS = [1.15, 1.3, 1.5]; // touch button sizes (ui.touchScale)
const BUTTON_LABEL = { 1.15: 'SMALL', 1.3: 'MEDIUM', 1.5: 'LARGE' };
const ABILITY_MODES = [{ id: 'attack', label: 'ON ATTACK' }, { id: 'auto', label: 'AUTO' }];
const SAVE_KEY = 'bellmourn.save.v2', SET_KEY = 'bellmourn.settings.v1', META_KEY = 'bellmourn.meta.v3', RUN_KEY = 'bellmourn.run.v3';
function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode */ } }
const loadRun = (r) => (r && r.v === RUN_VERSION && r.map && Array.isArray(r.map.nodes) && HEROES[r.hero] && !r.over ? r : null);
const hit = (r, p) => r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const inZone = (e, z) => e && e.x >= z[0] && e.x <= z[2] && e.z >= z[1] && e.z <= z[3];
const NO_INPUT = { mx: 0, mz: 0 };
const RAR = ['common', 'rare', 'epic', 'legendary']; const rarN = (r) => Math.max(0, RAR.indexOf(r));
function fit(ui, s, w) { s = String(s); if (ui.measure(s) <= w) return s; while (s.length > 1 && ui.measure(s + '.') > w) s = s.slice(0, -1); return s + '.'; }
// a foe or boss type the simulation knows (a region may name units still being built: those are skipped,
// with a warning, rather than stopping the game)
const knownFoe = (t) => !!(FOES[t] || UNITS[t]);
const knownBoss = (t) => !!(BOSSES[t] || BOSSES2[t]);
const warned = new Set();
const knownOrWarn = (f) => { if (knownFoe(f.t)) return true; if (!warned.has(f.t)) { warned.add(f.t); console.warn('bellmourn: unknown foe type skipped: ' + f.t); } return false; };
const D_SOUNDS = { iai: ['slashA', 1], sheathe: ['clang', 0.5], stillness: ['toll', 0.35], counter: ['parry', 1], stutter: ['vanish', 0.5], laugh: ['roar', 0.4], lightsOut: ['vanish', 0.9], lightsOn: ['lamp', 0.8],
  masquerade: ['vanish', 0.8], unmasked: ['clang', 0.9], mimic: ['vanish', 0.6], scare: ['roar', 0.8], climb: ['step', 0.6], dropWarn: ['tele', 1.2], flicker: ['lamp', 0.4], tide: ['splash', 1], shellBreak: ['hitHeavy', 1],
  shellUp: ['clang', 0.8], clawStuck: ['boom', 0.8], brood: ['rise', 0.7], cageFall: ['gate', 1], chains: ['clang', 0.6], gibbet: ['gate', 0.7], harden: ['clang', 0.7], snuff: ['vanish', 0.6], relight: ['fire', 0.8],
  pyreRings: ['fire', 1], crucify: ['clang', 1], nova: ['boom', 1], pillar: ['fire', 0.9], pillarEnd: ['fire', 0.4], gust: ['dash', 0.8], allyArrive: ['bigBell', 0.6], choir: ['toll', 0.6], pin: ['clang', 0.8] };
const LAMP_REACH = 3.5, LAMP_CLEAR = 12, LAMP_HEAL = 0.2; // metres; an old lamp heals this much of the max health, once

// ------------------------------------------------------------------ the other owners' modules
// Loaded when present; every use is guarded, so the run plays (with stand-ins) while they are being built.
// B: boons.js (offerBoons, addBoon, upgradeBoon, boonMods); C: events.js, variants.js, quests.js; D: bosses5.js
// (bossPool), allies.js (allyEntrance), challenges.js (trackChallenges); E: the screens in js/ui.
const OPT = {};
const OPTIONAL = { boons: './boons.js', events: './events.js', variants: './variants.js', quests: './quests.js', bosses5: './bosses5.js', allies: './allies.js', challenges: './challenges.js', screens: '../ui/index.js' };
async function loadOptional() {
  await Promise.all(Object.entries(OPTIONAL).map(async ([k, p]) => { try { OPT[k] = await import(p); } catch (e) { OPT[k] = null; if (!/Failed to fetch|Importing a module script failed|find module/i.test(String(e && e.message))) console.error('bellmourn: ' + p + ' failed to load', e); } }));
}
const bossLines = (t) => BOSS_LINES[t] || (OPT.bosses5 && OPT.bosses5.BOSS_LINES5 && OPT.bosses5.BOSS_LINES5[t]) || null;
const speaker = (t) => SPEAKERS[t] || (OPT.bosses5 && OPT.bosses5.SPEAKERS5 && OPT.bosses5.SPEAKERS5[t]) || {};
const lockedOf = (meta) => { const f = OPT.challenges && OPT.challenges.lockedBoons; try { return f ? f(meta) || [] : []; } catch (e) { return []; } };
const opt = (mod, name) => (OPT[mod] && typeof OPT[mod][name] === 'function' ? OPT[mod][name] : null);
// E's screen class by name (from js/ui/index.js), else the plain stand-in
function screenClass(name) { const S = OPT.screens; const C = S && (S[name] || (S.SCREENS && S.SCREENS[name])); return typeof C === 'function' ? C : MiniScreen; }

// ------------------------------------------------------------------ stand-in screens
// A plain menu for any screen E has not delivered: a title, a few lines and big buttons. Same interface as
// E's screens. PROPOSAL: every text in SPECS.
const SPECS = {
  SelectScreen: (g, d, h) => ({ title: 'CHOOSE YOUR WARDEN', lines: ['A RUN IS ONE WARDEN, TO THE END.', 'SHARDS: ' + (d.meta.shards | 0) + '   RUNS: ' + (d.meta.runs | 0)],
    items: [...Object.keys(HEROES).map((id) => { const ok = (d.meta.unlocked || []).includes(id); return { label: HEROES[id].name, sub: ok ? 'MASTERY ' + masteryOf(d.meta, id).level : 'LOCKED', disabled: !ok, on: () => h.choose(id), hover: () => h.preview && h.preview(id) }; }),
      { label: 'BELL TOWER', on: () => h.tower() }, { label: 'CHALLENGES', on: () => h.challenges() }, { label: 'CODEX', on: () => h.codex() }, { label: '< BACK', on: () => h.back && h.back() }] }),
  TalentScreen: (g, d, h) => { const M = masteryOf(d.meta, d.hero); return { title: HEROES[d.hero].name + ': TALENTS', lines: ['MASTERY ' + M.level + '. PICK UP TO ' + (M.level >= 8 ? 3 : (M.level >= 3 ? 2 : 1)) + '.'],
    items: [...availableTalents(d.meta, d.hero).map((t) => ({ label: (M.talents.includes(t.id) ? '* ' : '') + t.name, sub: t.locked ? 'MASTERY ' + t.level : t.desc, disabled: t.locked, on: () => h.pick(t.id) })), { label: 'BEGIN THE RUN', on: () => h.start() }, { label: '< BACK', on: () => h.back && h.back() }] }; },
  TowerScreen: (g, d, h) => ({ title: 'THE BELL TOWER', lines: ['BELL SHARDS: ' + (d.meta.shards | 0)],
    items: [...TOWER_LIST().map((t) => ({ label: t.name + ' ' + towerLevel(d.meta, t.id) + '/' + t.max, sub: towerLevel(d.meta, t.id) >= t.max ? 'BUILT' : t.desc + ' ' + t.cost[towerLevel(d.meta, t.id)] + ' SHARDS', on: () => h.buy(t.id) })), { label: '< BACK', on: () => h.back() }] }),
  ChallengesScreen: (g, d, h) => { const CH = (OPT.challenges && OPT.challenges.CHALLENGES) || []; const list = Array.isArray(CH) ? CH : Object.values(CH); return { title: 'CHALLENGES', lines: list.length ? list.slice(0, 8).map((c) => ((d.meta.done || []).includes(c.id) ? 'DONE  ' : '      ') + String(c.title || c.id).toUpperCase()) : ['NO CHALLENGES YET.'], items: [{ label: '< BACK', on: () => h.back() }] }; },
  CodexScreen: (g, d, h) => ({ title: 'THE CODEX', lines: ['FOES MET: ' + Object.keys(d.meta.codex.foes || {}).length, 'BOSSES FELLED: ' + Object.keys(d.meta.codex.bosses || {}).length, 'BOONS FOUND: ' + Object.keys(d.meta.codex.boons || {}).length, 'ECHOES HEARD: ' + Object.keys(d.meta.codex.echoes || {}).length, 'ENDINGS: ' + ((d.meta.codex.endings || []).join(', ') || 'NONE').toUpperCase()], items: [{ label: '< BACK', on: () => h.back() }] }),
  MapScreen: (g, d, h) => { const run = d.run; const nx = nextNodes(run); return { title: 'ACT ' + ['I', 'II', 'III'][run.act - 1] + ': ' + (d.map.name || ''), lines: ['HEALTH ' + (run.hp ?? '-') + '/' + (run.maxHp ?? '-') + '   EMBERS ' + run.embers + '   TONICS ' + (run.tonics ?? '-') + '   BOONS ' + run.boons.length, 'WHERE NEXT?'],
    items: nx.map((n) => ({ label: n.label + (n.cond ? ' (' + n.cond + ')' : ''), sub: n.kind === 'area' || n.kind === 'boss' ? (n.kind === 'boss' ? 'THE ACT\'S END' : 'AN AREA') : n.kind.toUpperCase(), on: () => h.pick(n.id) })) }; },
  BoonScreen: (g, d, h) => ({ title: 'A VOICE OFFERS ITS STRENGTH', lines: ['CHOOSE ONE.'], items: [...(d.offers || []).map((o) => ({ label: ((o.def && o.def.name) || o.id) + ' (' + String(o.rarity || 'common').toUpperCase() + ')', sub: (o.def && o.def.desc) || '', on: () => h.pick(o.id) })), (d.run.rerolls | 0) > 0 ? { label: 'REROLL (' + d.run.rerolls + ')', on: () => h.reroll() } : null].filter(Boolean) }),
  EventScreen: (g, d, h) => ({ title: String(d.event.title || 'AN EVENT').toUpperCase(), lines: [String(d.event.text || '').toUpperCase()], items: (d.event.choices || []).map((c, i) => ({ label: String(c.label).toUpperCase(), sub: [c.cost && Object.entries(c.cost).map(([k, v]) => '-' + v + ' ' + k.toUpperCase()).join(' '), c.risk ? String(c.risk).toUpperCase() : ''].filter(Boolean).join('  '), on: () => h.choose(i) })) }),
  ShrineScreen: (g, d, h) => { const run = d.run; const used = h.used && h.used(); return { title: 'THE SHRINE', lines: ['A FIRE LIT FROM THE BELL\'S FORGE. EMBERS: ' + run.embers, 'HEALTH ' + run.hp + '/' + run.maxHp], items: [{ label: used ? 'RESTED' : 'REST', sub: 'HEAL ' + Math.round(h.healFrac() * 100) + '% AND A TONIC', disabled: used, on: () => h.heal() },
    ...run.boons.filter((b) => b.rarity !== 'legendary').slice(0, 4).map((b) => ({ label: 'RAISE ' + String(b.id).toUpperCase(), sub: String(b.rarity).toUpperCase() + ' -> ' + h.upgradeCost(b.rarity) + ' EMBERS', on: () => h.upgrade(b.id) })), { label: 'BUY A REROLL', sub: h.rerollCost() + ' EMBERS', on: () => h.reroll() }, { label: 'LEAVE', on: () => h.leave() }] }; },
  MerchantScreen: (g, d, h) => ({ title: 'THE MERCHANT', lines: ['EMBERS: ' + d.run.embers], items: [...d.stock.map((it) => ({ label: it.name, sub: it.price + ' EMBERS  ' + it.desc, disabled: (d.run.bought || []).includes(it.id) && it.kind !== 'tonic', on: () => h.buy(it) })), { label: 'LEAVE', on: () => h.leave() }] }),
  SummaryScreen: (g, d, h) => ({ title: 'THE RUN IS OVER', lines: (d.summary.lines || []), items: [{ label: 'BACK TO THE TITLE', on: () => h.done() }] }),
};
const TOWER_LIST = () => TOWER;
export { finishResult };
export class MiniScreen {
  constructor(game, name) { this.g = game; this.name = name; this.sel = 0; this.t = 0; this.rects = []; this.scroll = 0; }
  open(data, handlers) { this.data = data; this.h = handlers; this.result = null; this.t = 0; }
  spec() { const f = SPECS[this.name]; try { return f ? f(this.g, this.data || {}, this.h || {}) : { title: this.name, lines: [], items: [{ label: 'BACK', on: () => (this.h.back || this.h.done || this.h.leave || (() => {}))() }] }; } catch (e) { console.error(e); return { title: this.name, lines: [], items: [] }; } }
  showResult(lines, onDone) { this.result = { lines: lines || [], done: onDone }; this.t = 0; }
  update(dt, inp) {
    this.t += dt; const g = this.g;
    if (this.result) { if (this.t > 0.4 && (inp.confirm || inp.taps.length || inp.attackPressed)) { const r = this.result; this.result = null; g.sound.play('uiOk'); if (r.done) r.done(); } return; }
    const items = this.spec().items || []; const n = items.length; if (!n) return;
    if (inp.up) { this.sel = (this.sel + n - 1) % n; g.sound.play('ui'); }
    if (inp.down) { this.sel = (this.sel + 1) % n; g.sound.play('ui'); }
    let pick = inp.confirm && this.t > 0.2 ? this.sel : -1;
    for (const tp of inp.taps) for (const r of this.rects) if (hit(r, tp)) { this.sel = r.i; pick = r.i; }
    this.sel = Math.min(this.sel, n - 1); const it = items[this.sel]; if (it && it.hover && this.lastHover !== this.sel) { this.lastHover = this.sel; it.hover(); }
    if (pick >= 0 && items[pick] && !items[pick].disabled && this.t > 0.15) { const f = items[pick].on; if (f) f(); }
    if (inp.back && this.t > 0.2) { const b = this.h && (this.h.back || this.h.leave); if (b) b(); }
  }
  // the shrine's stand-in sits on the right half, beside the kneeling warden; the others cover the screen
  layout(ui) { return this.name === 'ShrineScreen' ? { freeX0: Math.round(ui.safe.l), freeX1: Math.round(ui.w * 0.5) } : { freeX0: 0, freeX1: ui.w }; }
  draw(ui) {
    const half = this.name === 'ShrineScreen'; const H = ui.h; const sl0 = Math.round(ui.safe.l), sr = Math.round(ui.safe.r);
    const X0 = half ? Math.round(ui.w * 0.5) : 0; const W = ui.w - X0; const cxm = X0 + W / 2; const sl = half ? 0 : sl0;
    if (half) ui.rect(X0, 0, W, H, 'rgba(6,7,10,0.72)'); else ui.veil(0.78);
    const sp = this.spec(); let y = 6;
    ui.text(fit(ui, sp.title || '', W - 20), cxm, y, { align: 'center', scale: ui.measure(sp.title || '', 2) < W - 30 ? 2 : 1, color: COL.gold }); y += 17;
    if (this.result) { for (const l of this.result.lines) for (const w of ui.wrap(String(l).toUpperCase(), W - 40)) { ui.text(w, cxm, y, { align: 'center', color: COL.text }); y += 10; } if (this.t > 0.4) ui.text(g_tap(this.g), cxm, H - 14, { align: 'center', color: COL.dim }); this.rects = []; return; }
    for (const l of sp.lines || []) for (const w of ui.wrap(String(l), W - 40).slice(0, 3)) { ui.text(w, cxm, y, { align: 'center', color: COL.dim, shadow: false }); y += 9; }
    y += 3; const items = sp.items || []; const n = items.length; const cols = n > 6 && !half ? 2 : 1; const per = Math.ceil(n / cols);
    const gap = 3; const bh = Math.max(14, Math.min(24, Math.floor((H - y - 4 - gap * (per - 1)) / per))); const use = W - sl - sr - 16; const bw = cols === 1 ? Math.min(300, use) : Math.floor((use - 6) / 2);
    const x0 = Math.round(X0 + sl + 8 + (use - (bw * cols + (cols - 1) * 6)) / 2); this.rects = [];
    items.forEach((it, i) => { const c = Math.floor(i / per), k = i % per; const x = x0 + c * (bw + 6), yy = y + k * (bh + gap);
      const r = ui.button(x, yy, bw, bh, fit(ui, it.label, bw - 12), { sel: i === this.sel, align: 'left', disabled: it.disabled, sub: bh >= 19 && it.sub ? fit(ui, it.sub, bw - 12) : undefined, color: it.disabled ? '#7a7266' : undefined }); this.rects.push({ ...r, i }); });
  }
  close() {}
}
// a screen showing an outcome (EventScreen.showResult): go on as CONTINUE would (E keeps onDone, the stand-in done)
function finishResult(scr) {
  const r = scr && scr.result; if (!r) return false;
  const f = typeof r.onDone === 'function' ? r.onDone : (typeof r.done === 'function' ? r.done : null); if (!f) return false;
  if (typeof r.onDone === 'function') { r.onDone = null; r.done = true; } else scr.result = null;
  f(); return true;
}
const g_tap = (g) => (g.inputMode === 'touch' ? 'TAP TO GO ON' : 'ENTER TO GO ON');
// an event when C's events are not in yet: a stranger by a fire (PROPOSAL)
function fallbackEvent(run) {
  return { id: 'fallback.fire', fallback: true, title: 'A STRANGER BY A FIRE', text: 'A HOODED FIGURE WARMS ITS HANDS. IT OFFERS YOU THE FIRE, OR A FEW EMBERS FOR THE ROAD.',
    choices: [{ label: 'SIT BY THE FIRE', risk: 'HEAL 20%' }, { label: 'TAKE THE EMBERS', risk: '+30 EMBERS' }],
    resolve: (r, i) => (i === 0 ? { lines: ['THE WARMTH STAYS WITH YOU.'], changes: { hp: Math.round((r.maxHp || 100) * 0.2) } } : { lines: ['THE EMBERS ARE STILL WARM.'], changes: { embers: 30 } }) };
}

export class Game {
  constructor(sys) {
    Object.assign(this, sys); // r, atmos, fx, view, ui, input, sound
    // the permanent save (meta v3; the old v2 save migrates once) and the run in progress, if any
    this.meta = upgradeMeta(load(META_KEY)) || (load(SAVE_KEY) ? migrateSave(load(SAVE_KEY)) : freshMeta()); store(META_KEY, this.meta);
    this.run = loadRun(load(RUN_KEY));
    this.settings = { sound: true, music: 0.55, shake: true, quality: 0, touchScale: 1.3, abilityMode: 'attack', ...(load(SET_KEY) || {}), ...(this.meta.settings || {}) };
    if (!BUTTONS.includes(this.settings.touchScale)) this.settings.touchScale = 1.3;
    if (!ABILITY_MODES.some((m) => m.id === this.settings.abilityMode)) this.settings.abilityMode = 'attack';
    this.applyQuality();
    this.ui.touchScale = this.settings.touchScale;
    this.sound.on = this.settings.sound; this.sound.musicVol = this.settings.music;
    this.state = 'boot'; this.t = 0; this.stateT = 0; this.sel = 0; this.camFocus = new THREE.Vector3(); this.zoom = 1;
    this.level = null; this.world = null; this.card = null; this.timers = []; this.token = 0;
    this.syncSave(); this.embersShown = this.run ? this.run.embers : 0;
    this.rand = Math.random; this.flares = []; this.inHaven = false; this.haven = null; this.groundAt = null; this.screen = null;
    this.atmos.onThunder = (k) => this.sound.play('thunder', { delay: 0.3 + Math.random() * 0.9, vol: k, big: k > 0.9 });
  }

  // timers run on the frame clock and die with the level they were made in
  after(sec, fn) { this.timers.push({ t: sec, fn, token: this.token }); }
  _timers(dt) { const due = []; for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0) due.push(tm); } this.timers = this.timers.filter((tm) => tm.t > 0); for (const tm of due) if (tm.token === this.token) tm.fn(); }

  // ------------------------------------------------------------------ levels
  // ------------------------------------------------------------------ the run's warden
  // The warden's stats in this run: the level and weapon for the depth reached (run.js statSave), talents and
  // the Bell Tower (applyRunStats), the boons (B's boonMods, handed to the sim as stats.boons).
  heroStats(heroId) {
    const run = this.run || this.titleRun(heroId); const id = heroId || run.hero;
    const base = heroStats(statSave(run.hero === id ? run : { ...run, hero: id }, this.meta), id);
    const s = applyRunStats(base, run.hero === id ? run : { ...run, hero: id, talents: [] }, this.meta);
    const bm = opt('boons', 'boonMods'); if (bm && this.run && run.hero === id) { try { s.boons = bm(this.run); } catch (e) { console.error('bellmourn: boonMods', e); } }
    return s;
  }
  // a run-shaped stand-in for the title and the select screen (no run in progress)
  titleRun(heroId) { const id = heroId || (this.meta && this.meta.lastHero) || 'warden'; return { hero: HEROES[id] ? id : 'warden', tier: 0, talents: [], boons: [], echoes: [], relics: [], curses: [], weapon: null, flags: {}, embers: 0, mercy: 0 }; }
  // the old-style save the cutscenes, the HUD and heroes.heroStats read (built from the run and meta)
  syncSave() {
    const run = this.run || this.titleRun();
    const s = statSave(run, this.meta); const prev = this.save || {};
    s.flags = run.flags || (run.flags = {}); s.choice = run.choice || prev.choice || null; s.ending = prev.ending;
    this.save = s; return s;
  }

  // opts.def: the level as this run plays it (its variant applied, the run's tier, the boss drawn for it)
  async loadLevel(id, opts = {}) {
    const def = opts.def || LEVELS[id]; if (!def) throw new Error('no level ' + id);
    this.loading = true; this.token++; this.timers = [];
    if (this.level) { this.r.scene.remove(this.level.group); }
    this.view.clear(); this.fx.clear(); this.leaveHaven(); this.clearNotes(); this.groundAt = null; this.wheelWakes = false; this.bark = null; this.pendingScene = null;
    const L = await buildLevel(def);
    // lamps (a small heal, once) and chests are built by the game so they can change state
    const ctx = K.makeCtx(); L.lamps = (def.lamps || []).map((l) => ({ ...l, h: K.shrineLamp(ctx, l.x, l.z) }));
    L.chests = (def.items || []).map((it) => ({ ...it, h: K.chest(ctx, it.x, it.z, it.ry || 0) }));
    await K.finishCtx(ctx); L.group.add(ctx.group); L.solids.push(...ctx.solids); L.lights.push(...ctx.lights); L.anims.push(...L.chests.map((c) => c.h));
    const prog = this.nodeProg();
    for (const c of L.chests) if (prog.chests.includes(c.id)) { c.h.open = true; c.h.t = 1; c.h.lidPivot.rotation.x = -1.9; c.h.lock.visible = false; }
    for (const l of L.lamps) l.h.set(prog.lamps.includes(l.id)); // before setLevel: the light pool copies the lamps' state
    if (this.level && this.level !== L) this.r.scene.remove(this.level.group);
    this.r.scene.add(L.group); this.level = L; this.levelId = id;
    this.atmos.setLevel(def.ambience || {}, L.lights);
    this.sound.setRain(def.ambience?.rain ?? 1);
    this.r.post.dawn = 0;
    this.loading = false;
    this.spawnWorld(opts);
  }

  // elites appear more often deeper in
  _elite(tier, type) { if (type === 'rat' || this.levelId === 'prologue') return undefined; return Math.random() < 0.035 + tier * 0.022 ? AFFIX_LIST[Math.floor(Math.random() * AFFIX_LIST.length)] : undefined; }
  // what this node has already done (kept in the run, so closing the app mid-area loses nothing won)
  nodeProg() { const run = this.run; const empty = { node: null, encs: [], boss: false, chests: [], lamps: [], touched: [] }; if (!run) return empty; if (!run.prog || run.prog.node !== run.at) run.prog = { ...empty, node: run.at }; if (!run.prog.touched) run.prog.touched = []; return run.prog; }

  // (Re)populate the level: the warden at the start with the run's health and tonics, foes, encounters
  // (those this node already won stay won).
  spawnWorld(opts = {}) {
    const def = this.level.def; const L = this.level; const run = this.run; const prog = this.nodeProg();
    this.view.clear(); this.fx.clear();
    const w = this.world = new World({ solids: L.solids, bounds: def.bounds, seed: run ? hashSeed(run.seed, run.at || 'road') % 100000 : 11, abilityMode: this.settings.abilityMode });
    w.abilityMode = this.settings.abilityMode; this.flares = [];
    for (const [name, g] of Object.entries(L.marks)) if (g && g.set) { const startOpen = (def.gatesOpen || []).includes(name); g.set(startOpen); g.t = startOpen ? 1 : 0; g.update(0.0001); }
    let sx = def.start.x, sz = def.start.z, face = def.start.face ?? Math.PI;
    if (opts.at) { sx = opts.at.x; sz = opts.at.z; face = opts.at.face ?? face; }
    const hero = w.spawnHero(sx, sz, { ...this.heroStats(), face });
    this.fitRunHero(hero);
    const tier = def.tier || 0;
    for (const f of (def.foes || []).filter(knownOrWarn)) w.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, rise: false, face: f.face, elite: f.elite || this._elite(tier, f.t), element: f.element });
    this.encs = (def.encounters || []).map((e) => ({ ...e, state: prog.encs.includes(e.id) ? 'done' : 'idle', wave: -1, mine: [], delay: 0 }));
    for (const e of this.encs) {
      if (e.state === 'done') { for (const g of e.opens || []) this.gate(g, true, true); for (const g of e.gates || []) this.gate(g, true, true); continue; }
      if (e.waves[0] && e.waves[0].pre) { e.mine = e.waves[0].foes.filter(knownOrWarn).map((f) => w.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, rise: false, face: f.face, elite: f.elite, element: f.element })); e.wave = 0; e.preSpawned = true; }
    }
    this.boss = null; this.bossState = prog.boss || !def.boss ? 'done' : 'idle';
    if (this.bossState === 'done' && def.boss) for (const g of def.boss.opens || []) this.gate(g, true, true);
    this.hints = (def.hints || []).map((h) => ({ ...h, shown: false }));
    // the variant's touches (C): a quest hint, a chained survivor, a cursed lamp: walked into, onHint() runs them
    this.touches = (def.touches || []).filter((t) => !(this.meta.hints || {})[t.id] && !this.nodeProg().touched.includes(t.id)).map((t) => ({ ...t, used: false }));
    this.tutorial = def.tutorial && this.duelOn ? new Duel(this) : null;
    this.camFocus.set(hero.x, 0, hero.z); this.r.focus.copy(this.camFocus);
    this.prompt = null; this.leaving = false; this.alliesCalled = false; this.allyEnts = [];
  }
  // the run's health and tonics on a freshly spawned warden (a deeper level may raise the max: the gain is added)
  fitRunHero(hero) {
    const run = this.run; if (!run || !hero) return;
    if (run.maxHp === null || run.hp === null) { run.maxHp = hero.maxHp; run.hp = hero.maxHp; }
    else if (hero.maxHp !== run.maxHp) { run.hp = Math.max(1, run.hp + (hero.maxHp - run.maxHp)); run.maxHp = hero.maxHp; }
    hero.hp = Math.max(1, Math.min(hero.maxHp, run.hp));
    if (run.tonics === null || run.tonics === undefined) run.tonics = hero.stats.maxTonics;
    hero.tonics = Math.min(hero.stats.maxTonics, run.tonics);
  }
  // the warden's health and tonics back into the run (after a fight, on leaving, before saving)
  keepHero() { const h = this.world && this.world.hero; const run = this.run; if (!h || !run || h.dead || h.cut) return; run.hp = Math.max(1, Math.round(h.hp)); run.maxHp = h.maxHp; run.tonics = h.tonics; }

  // the hero changed (a boon, a relic, a weapon): respawn them in place with new stats
  // (the same entity id, so the view keeps the rig unless the weapon changed)
  refreshHero() {
    const w = this.world; const old = w && w.hero; if (!old || old.cut) return;
    const frac = old.hp / old.maxHp; w.ents = w.ents.filter((e) => e !== old);
    const h = w.spawnHero(old.x, old.z, { ...this.heroStats(), face: old.face }); h.id = old.id;
    h.hp = Math.max(1, Math.round(h.maxHp * frac)); h.tonics = Math.min(h.stats.maxTonics, old.tonics + Math.max(0, h.stats.maxTonics - old.stats.maxTonics)); h.revives = Math.min(h.revives, old.revives ?? h.revives);
    if (this.inHaven && this.haven) this.haven.adopt(old, h);
    if (this.run) { this.run.hp = Math.round(h.hp); this.run.maxHp = h.maxHp; }
  }

  gate(name, open, instant = false) {
    const g = this.level.marks[name]; if (!g) return;
    if (g.solid.open === open && !instant) return;
    g.set(open); if (instant) { g.t = open ? 1 : 0; g.update(0.0001); } else this.sound.play('gate');
  }

  // the meta and the run are saved separately: closing the app mid-run resumes it (RUN_KEY), dying clears it
  persist() { this.keepHero(); if (this.run) store(RUN_KEY, this.run); store(META_KEY, this.meta); }
  persistMeta() { store(META_KEY, this.meta); }
  clearRun() { this.run = null; try { localStorage.removeItem(RUN_KEY); } catch (e) { /* */ } this.syncSave(); }
  saveSettings() { store(SET_KEY, this.settings); this.meta.settings = { ...this.settings }; this.persistMeta(); }

  // ------------------------------------------------------------------ state machine
  go(state) { this.state = state; this.stateT = 0; this.sel = 0; this.menuRects = []; if (this.world && state !== 'play') this.world.idle(); }

  async start() {
    await loadOptional();
    const q = new URLSearchParams(location.search);
    if (q.get('auto') && !this.auto) { this.auto = makeAutoplay(+q.get('auto') || 3); this.timeScale = +(q.get('speed') || 1); this.debug = { god: q.get('god') === '1' }; this.autoHero = q.get('hero') || null; this.autoRuns = +(q.get('runs') || 1); }
    if (q.get('scene') && !this.debugDone) { this.debugDone = true; this.debug = { god: true }; if (!this.run) { this.run = newRun(this.meta, q.get('hero') || 'warden', 7); this.syncSave(); } await this.debugScene(q.get('scene'), { party: q.get('party') !== '0', auto: q.get('fast') === '1', speed: +(q.get('speed') || 1) }); return; }
    if (q.get('level') && !this.debugDone) {
      // debug: ?level=id [&boss=1] [&god=1] [&hero=id] [&variant=id] — straight into an area of a fresh run
      this.debugDone = true; this.debug = { god: q.get('god') === '1' };
      this.noScenes = q.get('scenes') !== '1'; // straight into an area for tests: no cutscenes unless ?scenes=1
      const hero = q.get('hero') && HEROES[q.get('hero')] ? q.get('hero') : 'warden';
      this.run = newRun(this.meta, hero, +(q.get('seed') || 7)); this.syncSave();
      if (q.get('level') === 'haven' || q.get('level') === 'shrine') { await this.enterShrine({ id: 'debug-shrine', kind: 'shrine', act: 1 }); return; }
      if (q.get('level') === 'map') { this.openMap(); return; }
      const id = q.get('level'); const T = AREA_TIER[id] ?? 0; this.run.tier = T;
      const node = { id: 'debug-' + id, kind: id === 'prologue' ? 'road' : (['belfry', 'abyss', 'empyrean'].includes(id) ? 'boss' : 'area'), act: ACT_OF(id) || 1, area: id, tier: T, boss: AREA_BOSS[id], variant: q.get('variant') || undefined, short: q.get('short') === '1' };
      this.run.at = node.id; this.duelOn = id === 'prologue' && q.get('duel') === '1';
      await this.enterArea(node);
      if (q.get('boss') === '1' && this.level.def.boss) { const B = this.level.def.boss; const h = this.world.hero; h.x = (B.zone[0] + B.zone[2]) / 2; h.z = B.zone[3] - 0.5; }
      return;
    }
    await this.loadLevel('gate', { fromStart: true });
    this.titleScene();
    this.go('title');
  }

  // The title: the courtyard as it was first seen, the warden among the hushed in the rain.
  titleScene(heroId = (this.run && this.run.hero) || this.meta.lastHero || 'warden') {
    const w = this.world; w.ents = []; w.hero = null;
    const hero = w.spawnHero(-0.6, 1.6, { ...this.heroStats(heroId), face: Math.PI * 0.82 });
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
    if (this.run && this.state === 'play') this.run.time = (this.run.time || 0) + dt;
    const S = this.state;
    if (S === 'title') this.title(dt, inp);
    else if (S === 'screen') this.screenUpdate(dt, inp);
    else if (S === 'story') this.story(dt, inp);
    else if (S === 'play') this.play(dt, inp);
    else if (S === 'pause') this.pauseMenu(dt, inp);
    else if (S === 'haven') this.haven.update(dt, inp);
    else if (S === 'dead') this.dead(dt, inp);
    else if (S === 'bossIntro') this.bossIntro(dt, inp);
    else if (S === 'controls') this.controls(dt, inp);
    else if (S === 'settings') this.settingsMenu(dt, inp);
    else if (S === 'credits') this.credits(dt, inp);
    else if (S === 'cutscene') this.cutUpdate(dt, inp);
    this.renderFrame(dt);
  }

  // test autoplay: plays whole runs: picks the warden, map nodes, boons, event choices, shrine and merchant
  // wares, fights with the bot, and goes through death and the summary (game.autoRunsDone counts the runs)
  autoInput(inp, dt) {
    const S = this.state;
    if (S === 'title' && this.stateT > 0.5) { if ((this.autoRunsDone | 0) >= (this.autoRuns || 1)) return; if (this.run) this.resumeRun(); else this.newRunFlow(); }
    else if (S === 'screen' && this.screen && this.stateT > 0.35) { if (!this.autoNoScreens) this.autoScreen(); }
    else if (S === 'story') this.storyIdx = (this.storyLines || []).length;
    else if (S === 'haven' && this.haven && this.haven.ready() && this.stateT > 0.3) this.autoShrine();
    else if (S === 'play' && this.world && !this.loading) Object.assign(inp, this.auto(this, dt), { pausePressed: false });
    else if (S === 'cutscene' && this.cut) { const c = this.cut; if (c.pick) { if (c.pick.t > 0.3) { const want = this.autoChoice(c.pick.key, c.pick.options.map((o) => o.id)); c.choose(Math.max(0, c.pick.options.findIndex((o) => o.id === want))); } } else if (c.strikeS) Object.assign(inp, { attackPressed: true }); else if (c.t > 0.3 && !c.skipping) c.skip(); }
    else if (S === 'credits' && this.stateT > 1.5) Object.assign(inp, { confirm: true });
    else if (S === 'bossIntro' && this.stateT > 0.6) Object.assign(inp, { confirm: true });
    else if (S === 'dead' && this.stateT > 1.4) Object.assign(inp, { confirm: true });
  }
  // what a sensible player picks on each screen (calls the screen's handlers, as a tap would)
  autoScreen() {
    const n = this.screenName, d = this.screenData || {}, h = this.screenH || {}; const run = this.run; this.autoT = (this.autoT || 0) + 1;
    if (this.screen && this.screen.result) { if (finishResult(this.screen)) return; }
    if (this.screen && typeof this.screen.autoDone === 'function' && this.screen.autoDone()) return;
    if (n === 'SelectScreen') { const ids = (this.meta.unlocked || []).filter((id) => HEROES[id]); h.choose(this.autoHero && ids.includes(this.autoHero) ? this.autoHero : ids[(this.meta.runs | 0) % ids.length]); }
    else if (n === 'TalentScreen') { const av = availableTalents(this.meta, d.hero).filter((t) => !t.locked); if (av.length && !masteryOf(this.meta, d.hero).talents.length) h.pick(av[0].id); h.start(); }
    else if (n === 'MapScreen') { const nx = nextNodes(run); if (!nx.length) return; const want = (k) => nx.find((x) => x.kind === k); const low = run.hp !== null && run.maxHp && run.hp < run.maxHp * 0.5; const pick = (low && (want('shrine') || want('merchant'))) || want('quest') || want('area') || want('boss') || want('event') || want('shrine') || want('merchant') || nx[0]; h.pick(pick.id); }
    else if (n === 'BoonScreen') { const o = (d.offers || []).slice().sort((a, b) => rarN(b.rarity) - rarN(a.rarity))[0]; if (o) h.pick(o.id); else if (h.skip) h.skip(); }
    else if (n === 'EventScreen') { const ch = (d.event && d.event.choices) || []; let best = 0, bs = -1e9; ch.forEach((c, i) => { const cost = c.cost || {}; const hpLeft = run && run.hp !== null ? run.hp - (cost.hp || 0) : 99; const ok = (!cost.embers || run.embers >= cost.embers) && (!cost.tonic || run.tonics >= cost.tonic) && hpLeft > (run ? run.maxHp * 0.3 : 0); const s = (ok ? 10 : -10) - i * 0.1 + (c.risk ? -1 : 0); if (s > bs) { bs = s; best = i; } }); h.choose(best); }
    else if (n === 'ShrineScreen') this.autoShrine();
    else if (n === 'MerchantScreen') { const st = d.stock || []; const cand = st.filter((it) => it.price <= run.embers && !(run.bought || []).includes(it.id) && !(it.kind === 'tonic' && run.tonics >= this.maxTonics())); const pick = cand.find((it) => it.kind === 'heal' && run.hp < run.maxHp * 0.6) || cand.find((it) => it.kind === 'relic') || cand.find((it) => it.kind === 'boon') || cand.find((it) => it.kind === 'weapon'); if (pick && (this.autoBuys = (this.autoBuys | 0) + 1) < 4) h.buy(pick); else { this.autoBuys = 0; h.leave(); } }
    else if (n === 'SummaryScreen') h.done();
    else if (h.back) h.back(); else if (h.done) h.done(); else if (h.leave) h.leave();
  }
  autoShrine() {
    const h = this.screenH || {}; if (this.screenName !== 'ShrineScreen') return;
    const run = this.run; this.shrineAuto = (this.shrineAuto | 0) + 1;
    if (!this.shrineUsed && h.heal) { h.heal(); return; }
    const up = (run.boons || []).find((b) => b.rarity !== 'legendary' && upgradeCost(run, b.rarity) !== null && upgradeCost(run, b.rarity) <= run.embers - 60);
    if (up && this.shrineAuto < 4 && h.upgrade) { h.upgrade(up.id); return; }
    this.shrineAuto = 0; h.leave();
  }
  // what the autoplay (and a scene played with cutAuto) picks: at the end SING if the New Song can be sung, else RING
  autoChoice(key, ids) {
    if (key === 'final') { let ready = false; try { ready = !!trueEndingReady(this.save); } catch (e) { /* */ } return ready && ids.includes('sing') ? 'sing' : 'ring'; }
    return ids[0];
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
    // PROPOSAL: the title's items
    this.titleItems = [this.run ? { label: 'CONTINUE RUN', id: 'cont' } : null, { label: 'NEW RUN', id: 'new' }, { label: 'CONTROLS', id: 'controls' }, { label: 'SETTINGS', id: 'settings' }, { label: 'CREDITS', id: 'credits' }].filter(Boolean);
    const p = this.menuInput(inp, this.titleItems);
    if (p >= 0) {
      const id = this.titleItems[p].id;
      if (id === 'new') { if (this.run) { this.finishRun('quit', () => this.newRunFlow()); return; } this.newRunFlow(); }
      else if (id === 'cont') this.resumeRun();
      else { this.back = 'title'; this.go(id); }
    }
  }

  // ------------------------------------------------------------------ screens
  // Every menu of the run is a screen object (E's js/ui screens when present, a plain stand-in otherwise):
  // new XScreen(game).open(data, handlers), update(dt, inp), draw(ui), close(). The world stays frozen beneath.
  openScreen(name, data = {}, handlers = {}) {
    if (this.screen && this.screen.close) { try { this.screen.close(); } catch (e) { /* */ } }
    const Cls = screenClass(name); let s;
    try { s = new Cls(this, name); s.open(data, handlers); } catch (err) { console.error('bellmourn: screen ' + name + ' failed, using the stand-in', err); s = new MiniScreen(this, name); s.open(data, handlers); }
    this.screen = s; this.screenName = name; this.screenData = data; this.screenH = handlers;
    if (this.world) this.world.idle();
    this.go('screen'); return s;
  }
  // a screen object without changing the state (the shrine's panel inside the Haven)
  makeScreen(name, data, handlers) { const Cls = screenClass(name); let s; try { s = new Cls(this, name); s.open(data, handlers); } catch (err) { console.error('bellmourn: screen ' + name, err); s = new MiniScreen(this, name); s.open(data, handlers); } return s; }
  closeScreen() { const s = this.screen; this.screen = null; this.screenName = null; this.screenH = null; this.screenData = null; if (s && s.close) { try { s.close(); } catch (e) { /* */ } } }
  screenUpdate(dt, inp) {
    if (!this.screen) { this.go(this.world && this.world.hero && this.level && this.level.def && !this.inHaven ? 'play' : 'title'); return; }
    try { this.screen.update(dt, inp); } catch (err) { console.error('bellmourn: screen error', err); }
  }

  // ------------------------------------------------------------------ the run's flow
  // title -> SelectScreen -> TalentScreen -> the Old Road -> the MapScreen -> a node -> ... -> death or an ending
  // -> the SummaryScreen -> the title. No warden changes anywhere once the run has begun.
  newRunFlow() {
    const meta = this.meta;
    this.openScreen('SelectScreen', { meta }, {
      choose: (heroId) => { if (!HEROES[heroId] || !(meta.unlocked || []).includes(heroId)) { this.sound.play('ui'); return; } this.sound.play('uiOk'); meta.lastHero = heroId; this.persistMeta(); this.talentFlow(heroId); },
      preview: (heroId) => { if (HEROES[heroId] && this.world && this.levelId === 'gate' && (!this.world.hero || this.world.hero.heroId !== heroId)) this.titleScene(heroId); },
      tower: () => this.openScreen('TowerScreen', { meta }, { buy: (id) => { const m = buyTower(meta, id); this.persistMeta(); this.ui.toast(m, { color: m.startsWith('NOT') || m.startsWith('FULLY') ? COL.dim : COL.gold }); this.sound.play(m.startsWith('NOT') ? 'ui' : 'upgrade'); return m; }, back: () => this.newRunFlow() }),
      challenges: () => this.openScreen('ChallengesScreen', { meta }, { back: () => this.newRunFlow() }),
      codex: () => this.openScreen('CodexScreen', { meta }, { back: () => this.newRunFlow() }),
      back: () => { this.closeScreen(); this.go('title'); },
    });
  }
  talentFlow(heroId) {
    const meta = this.meta;
    this.openScreen('TalentScreen', { meta, hero: heroId }, {
      pick: (id) => { const m = toggleTalent(meta, heroId, id); this.persistMeta(); this.sound.play(m === 'TALENT CHOSEN' ? 'uiOk' : 'ui'); return m; },
      start: () => this.beginRun(heroId),
      back: () => this.newRunFlow(),
    });
  }
  beginRun(heroId) {
    this.closeScreen();
    this.run = newRun(this.meta, heroId, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    this.syncSave(); const st = this.heroStats(); this.run.maxHp = st.maxHp; this.run.hp = st.maxHp; this.run.tonics = st.maxTonics;
    this.embersShown = this.run.embers; this.persist();
    this.track({ type: 'runStart', hero: heroId });
    this.oldRoad();
  }
  // The Old Road: the first run's tutorial duel; later runs a short cinematic walk to the gate.
  async oldRoad() {
    const first = !this.meta.story.seen.tutorial;
    this.run.at = null; this.node = { id: 'road', kind: 'road', area: 'prologue', tier: 0 }; this.duelOn = first;
    await this.enterArea(this.node, { road: true });
    if (!first) this.playScene('road.short', { run: this.run }, () => this.openMap(), { always: true });
  }
  resumeRun() {
    const run = this.run; if (!run) { this.newRunFlow(); return; }
    this.syncSave(); this.embersShown = run.embers;
    const n = currentNode(run);
    if (n && !run.cleared.includes(n.id)) this.runNode(n, { resume: true }); else this.openMap();
  }
  openMap() {
    const run = this.run; if (!run) { this.go('title'); return; }
    this.node = null; this.leaveHaven();
    if (actOver(run)) { if (!advanceAct(run, this.meta)) { this.finishRun('ending:' + (run.choice === 'sing' ? 'song' : 'dawn')); return; } this.track({ type: 'actEnter', act: run.act }); }
    this.persist();
    this.openScreen('MapScreen', { run, map: run.map }, { pick: (id) => this.goNode(id) });
  }
  goNode(id) {
    const run = this.run; const n = enterNode(run, id); if (!n) { this.sound.play('ui'); return; }
    this.sound.play('uiOk'); run.prog = null; this.persist(); this.track({ type: 'node', kind: n.kind, node: n });
    this.closeScreen(); this.runNode(n);
  }
  runNode(n, o = {}) {
    this.node = n; this.variant = null;
    if (n.kind === 'area' || n.kind === 'boss') this.enterArea(n, o);
    else if (n.kind === 'event') this.doEvent(n);
    else if (n.kind === 'shrine') this.enterShrine(n);
    else if (n.kind === 'merchant') this.doMerchant(n);
    else if (n.kind === 'trial') this.doTrial(n);
    else if (n.kind === 'quest') this.doQuest(n);
    else this.nodeDone();
  }
  // the node is done: on to the map (an act's boss: the next act's map; the last one ends the run elsewhere)
  nodeDone(extra = {}) {
    const run = this.run; if (!run) return;
    this.keepHero(); completeNode(run, extra); run.prog = null; this.persist();
    this.closeScreen(); this.openMap();
  }

  // ---- areas: the level as this run plays it
  levelFor(n) {
    const base = LEVELS[n.area]; if (!base) return null;
    let def = base; let variant = null;
    if (n.variant) { variant = (base.variants || []).find((v) => v.id === n.variant) || null; const gv = opt('variants', 'getVariant'); if (!variant && gv) { try { variant = gv(n.area, n.variant); } catch (e) { /* */ } } }
    const av = opt('variants', 'applyVariant'); if (variant && av) { try { def = av(base, variant, { short: n.short !== false, seed: hashSeed((this.run && this.run.seed) || 1, n.id) % 100000, meta: this.meta, run: this.run }) || base; } catch (err) { console.error('bellmourn: applyVariant', err); def = base; } }
    def = { ...def, tier: n.tier ?? def.tier ?? 0 };
    // the boss: the variant's pool (D's bossPool), seeded per node; the level's own if the drawn one is unknown
    if (def.boss && n.kind !== 'trial') {
      let type = def.boss.type; const bp = opt('bosses5', 'bossPool'); let pool = null;
      if (bp) { try { pool = bp(n.area, variant); } catch (e) { pool = null; } } if ((!pool || !pool.length) && variant && Array.isArray(variant.bossPool)) pool = variant.bossPool;
      if (pool && pool.length) { const t = pool[hashSeed((this.run && this.run.seed) || 1, n.id, 'boss') % pool.length]; if (knownBoss(t)) type = t; }
      def.boss = { ...def.boss, type, baseTier: base.tier ?? 0 };
    }
    this.variant = variant; const nv = opt('variants', 'noteVariant'); if (nv && variant && this.run) { try { nv(this.run, variant); } catch (e) { /* */ } }
    return def;
  }
  async enterArea(n, o = {}) {
    if (!LEVELS[n.area]) { console.warn('bellmourn: level not built: ' + n.area); this.nodeDone(); return; }
    this.closeScreen(); this.node = n;
    this.go('loading'); this.r.post.fade = 1;
    const def = this.levelFor(n) || LEVELS[n.area];
    await this.loadLevel(n.area, { fromStart: true, def });
    this.persist();
    const a = ACT_OF(n.area); const cond = n.cond || (this.variant && (this.variant.name || this.variant.condition)) || '';
    this.card = { t: 0, sup: n.kind === 'road' || n.area === 'prologue' ? 'PROLOGUE' : (n.kind === 'boss' ? 'ACT ' + ['I', 'II', 'III'][a - 1] + '  THE LAST OF IT' : 'ACT ' + ['I', 'II', 'III'][(a || 1) - 1] + (cond ? '  ' + String(cond).toUpperCase() : '')), title: def.name.toUpperCase(), line: def.tagline || '' };
    if (this.duelOn) this.card = null;
    this.go('play'); this.fadeIn = 0;
    // a scene on the way in, the first time only
    const sid = this.noAutoScenes || o.road ? null : (ON_ENTER[n.area] && !this.seen(ON_ENTER[n.area]) ? ON_ENTER[n.area] : null);
    if (sid) this.playScene(sid, {}, () => { this.go('play'); this.fadeIn = 1; if (this.card) this.card.t = 0; });
    if (n.kind !== 'road') this.track({ type: 'areaEnter', area: n.area, node: n });
  }
  // out through the exit after the boss: health and tonics kept, the node done
  finishArea() {
    if (this.leaving) return; this.leaving = true; this.fadeOut = 0; this.keepHero();
    const n = this.node; this.track({ type: 'areaClear', area: n && n.area, node: n });
    this.after(0.65, () => { this.leaving = false; if (!n || n.kind === 'road') { this.openMap(); return; } this.nodeDone({ boss: this.areaBoss, echo: this.areaBoss }); this.areaBoss = null; });
  }

  // ---- boons (B): after each cleared fight, a trial, some events, a boss
  offerBoon(source, then, o = {}) {
    const run = this.run; const ob = opt('boons', 'offerBoons');
    let offers = [];
    const roll = () => { const rng = rngOf(hashSeed(run.seed, run.at || 'road', source, (run.stats.boons | 0), this.rerollN | 0)); try { offers = ob ? (ob(run, rng, Math.max(2, Math.round(curseMod(run, 'boonChoicesAdd', 3))), { source, luck: towerLevel(this.meta, 'luck'), minRarity: o.minRarity, res: o.res, rarityBoost: 0.15 * towerLevel(this.meta, 'luck'), locked: lockedOf(this.meta), act: run.act, hero: run.hero, heroId: run.hero, abilities: (HEROES[run.hero].abilities || []).slice(0, 2) }) || []) : []; } catch (err) { console.error('bellmourn: offerBoons', err); offers = []; } };
    this.rerollN = 0; roll();
    if (!offers.length) { if (!ob) this.ui.toast('A VOICE ANSWERS, BUT FINDS NO SHAPE YET', { color: COL.dim, life: 2 }); then(); return; } // PROPOSAL
    const back = this.state === 'play' ? 'play' : null;
    const handlers = {
      pick: (id) => {
        const it = offers.find((x) => x.id === id) || offers[0]; const ab = opt('boons', 'addBoon');
        try { if (ab) ab(run, it.id, it.rarity); else run.boons.push({ id: it.id, rarity: it.rarity }); } catch (err) { console.error('bellmourn: addBoon', err); }
        run.stats.boons = (run.stats.boons | 0) + 1; this.sound.play('upgrade'); this.freshBoon = it.id;
        this.track({ type: 'boon', id: it.id, rarity: it.rarity, res: it.def && it.def.res });
        this.closeScreen(); if (back) this.go('play'); this.refreshHero(); this.persist(); then(it);
      },
      reroll: () => {
        if ((run.rerolls | 0) <= 0) { this.sound.play('ui'); return false; }
        run.rerolls--; this.rerollN++; roll(); this.sound.play('uiOk'); if (this.screen && this.screen.open) this.screen.open({ run, offers }, handlers); this.screenData = { run, offers }; return true;
      },
    };
    this.openScreen('BoonScreen', { run, offers, source }, handlers);
  }
  maxTonics() { const h = this.world && this.world.hero; return h && h.stats ? h.stats.maxTonics : this.heroStats().maxTonics; }

  // ---- events (C)
  doEvent(n, o = {}) {
    const run = this.run, meta = this.meta; const rng = rngOf(hashSeed(run.seed, n.id, 'event'));
    let ev = null; const pe = opt('events', 'pickEvent'), E = OPT.events && OPT.events.EVENTS;
    try { if (o.eventId && E) ev = Array.isArray(E) ? E.find((x) => x.id === o.eventId) : E[o.eventId]; if (!ev && pe) ev = pe(run, meta, rng, { node: n, act: run.act, quest: o.quest }); } catch (err) { console.error('bellmourn: pickEvent', err); }
    if (!ev) ev = fallbackEvent(run); else { const ne = opt('events', 'noteEvent'); if (ne) { try { ne(run, ev.id); } catch (e) { /* */ } } }
    const re = opt('events', 'resolveEvent');
    this.openScreen('EventScreen', { run, event: ev, meta }, {
      choose: (i) => {
        let res = null;
        try { res = ev.fallback ? ev.resolve(run, i) : (re ? re(run, meta, ev.id, i, rng) : null); } catch (err) { console.error('bellmourn: resolveEvent', err); }
        res = res || { lines: ['NOTHING HAPPENS.'], changes: {} };
        const after = this.applyChanges(res.changes || {}, n); this.persist(); this.track({ type: 'event', id: ev.id, choice: i, changes: res.changes });
        const done = () => {
          if (after.fight) { this.doTrial({ ...n, area: after.fight.area || n.area || this.questArea(), tier: n.tier ?? run.tier ?? 0 }, { ambush: true, encounter: after.fight.foes ? after.fight : null, elite: after.fight.elite, then: after.boon ? 'boon' : null }); return; }
          if (after.boon) this.eventBoon(after.boon, () => this.nodeDone()); else this.nodeDone();
        };
        const lines = [...(res.lines || []), ...(after.lines || [])];
        if (this.screen && typeof this.screen.showResult === 'function') this.screen.showResult(lines, done, res.changes || {}); else done();
      },
    });
  }
  // what an event's choice changes (C's resolveEvent returns them; C's applyChanges applies them to the run and
  // meta when present, else the game does). Returns what only the game can do: { boon, fight, lines }.
  applyChanges(ch, n) {
    const run = this.run, meta = this.meta; const out = { lines: [] }; if (!ch) return out;
    if (ch.rerolls) { run.rerolls = (run.rerolls | 0) + ch.rerolls; ch = { ...ch }; delete ch.rerolls; }
    const friends0 = (meta.friends || []).slice();
    const ac = opt('events', 'applyChanges');
    if (ac) {
      let r = null; try { r = ac(run, meta, ch); } catch (err) { console.error('bellmourn: applyChanges', err); }
      const pd = (r && r.pending) || {}; out.lines = (r && r.lines) || []; if (pd.boon) out.boon = pd.boon; if (pd.fight) out.fight = pd.fight;
    } else {
      if (typeof ch.hp === 'number' && run.maxHp) run.hp = Math.max(1, Math.min(run.maxHp, (run.hp ?? run.maxHp) + ch.hp));
      if (typeof ch.hpPct === 'number' && run.maxHp) run.hp = Math.max(1, Math.min(run.maxHp, (run.hp ?? run.maxHp) + Math.round(run.maxHp * ch.hpPct)));
      if (typeof ch.maxHp === 'number' && run.maxHp) { run.maxHp = Math.max(10, run.maxHp + ch.maxHp); run.hp = Math.min(run.maxHp, run.hp); }
      if (typeof ch.embers === 'number') run.embers = Math.max(0, (run.embers | 0) + ch.embers);
      if (typeof ch.tonics === 'number') run.tonics = Math.max(0, (run.tonics ?? 0) + ch.tonics);
      if (ch.curse && !run.curses.includes(ch.curse)) run.curses.push(ch.curse);
      if (ch.relic && !run.relics.includes(ch.relic)) run.relics.push(ch.relic);
      if (ch.hint) meta.hints[ch.hint] = true;
      if (ch.boon) out.boon = ch.boon; if (ch.fight) out.fight = ch.fight;
    }
    if (run.tonics !== null) run.tonics = Math.min(this.maxTonics(), run.tonics);
    if (ch.hp > 0 || ch.hpPct > 0) this.track({ type: 'heal', amt: ch.hp || Math.round((run.maxHp || 0) * ch.hpPct), source: 'event' });
    if (ch.hint) this.track({ type: 'hint', id: ch.hint });
    for (const f of meta.friends || []) if (!friends0.includes(f) && HEROES[f]) { this.ui.toast(HEROES[f].name + ' WILL STAND WITH YOU', { color: COL.gold, big: true, life: 3 }); this.track({ type: 'friend', hero: f }); } // PROPOSAL
    this.syncSave(); this.persistMeta(); return out;
  }
  // a boon an event asked for: an offer (of one Resonance), or a rise in rarity of the weakest one held
  eventBoon(b, then) {
    const run = this.run;
    if (b === 'upgrade') { const ub = opt('boons', 'upgradeBoon'); const x = (run.boons || []).filter((q) => q.rarity !== 'legendary').sort((a, c) => rarN(a.rarity) - rarN(c.rarity))[0]; if (ub && x) { try { ub(run, x.id); } catch (e) { /* */ } } then(); return; }
    this.offerBoon('event', then, { res: b && typeof b === 'object' ? b.res : undefined, minRarity: b === 'rare' ? 'rare' : undefined });
  }
  // ---- the merchant
  doMerchant(n) {
    const run = this.run; const stock = merchantStock(run, n.id);
    const handlers = {
      buy: (item) => {
        const r = buyItem(run, item, this.maxTonics());
        this.sound.play(r.ok ? 'upgrade' : 'ui'); this.ui.toast(r.msg, { color: r.ok ? COL.gold : COL.dim, life: 1.6 });
        if (r.ok && r.then === 'heal') this.healTo(0.4);
        if (r.ok && r.then === 'upgrade') { const ub = opt('boons', 'upgradeBoon'); const b = (run.boons || []).filter((x) => x.rarity !== 'legendary').sort((a, c) => rarN(a.rarity) - rarN(c.rarity))[0]; if (ub && b) { try { ub(run, b.id); } catch (e) { /* */ } } }
        this.syncSave(); this.persist(); this.track({ type: 'buy', item: item.kind, id: item.id, ok: r.ok });
        if (r.ok && r.then === 'boon') { this.offerBoon('merchant', () => this.doMerchant(n)); return r; }
        return r;
      },
      leave: () => this.nodeDone(),
    };
    this.openScreen('MerchantScreen', { run, stock }, handlers);
  }
  healTo(frac) { const run = this.run; const got = healRun(run, frac); if (got > 0) this.track({ type: 'heal', amt: got, source: this.node && this.node.kind }); const h = this.world && this.world.hero; if (h && !h.cut && run.hp !== null && this.levelId !== 'haven') h.hp = Math.min(h.maxHp, run.hp); return got; }

  // ---- trials: an elite arena (an area's boss arena, its boss away, elites in waves)
  async doTrial(n, o = {}) {
    const area = LEVELS[n.area] ? n.area : 'gate'; const run = this.run;
    this.closeScreen(); this.go('loading'); this.r.post.fade = 1;
    const base = LEVELS[area]; const B = base.boss;
    const def = { ...base, tier: n.tier ?? run.tier ?? 0, foes: [], encounters: [], boss: null, exit: null, items: [], lamps: [], hints: [] };
    await this.loadLevel(area, { fromStart: true, def });
    const w = this.world, h = w.hero;
    if (B) { h.x = (B.zone[0] + B.zone[2]) / 2; h.z = B.zone[3] - 1.5; h.face = Math.PI; for (const g of B.gates || []) this.gate(g, false, true); }
    // the foes: the area's own kinds, every one elite (an ambush from an event: a little fewer)
    let types = [...new Set((base.encounters || []).flatMap((e) => e.waves.flatMap((wv) => wv.foes.map((f) => f.t))).filter(knownFoe))]; if (!types.length) types.push('hushed', 'warden');
    const QE = o.encounter; if (QE && Array.isArray(QE.foes)) types = QE.foes.filter(knownFoe).length ? QE.foes.filter(knownFoe) : types;
    const rng = rngOf(hashSeed(run.seed, n.id, 'trial')); const cx = B ? B.x : h.x, cz = B ? B.z : h.z - 5; const waves = o.ambush || o.quest ? 1 : 2;
    const mk = (k) => ({ foes: new Array(k).fill(0).map((_, i) => { const a = (i / k) * Math.PI * 2 + rng() * 0.5; return { t: QE ? types[i % types.length] : types[Math.floor(rng() * types.length)], x: cx + Math.sin(a) * 2.6, z: cz + Math.cos(a) * 2.2, element: QE && QE.element, elite: QE ? (i === 0 ? QE.elite : undefined) : (o.elite === false ? undefined : AFFIX_LIST[Math.floor(rng() * AFFIX_LIST.length)]) }; }) });
    const enc = { id: 'trial', zone: B ? B.zone : [h.x - 20, h.z - 20, h.x + 20, h.z + 20], waves: Array.from({ length: waves }, (_, i) => mk(QE ? types.length : (o.ambush ? 3 : 3 + i))), gates: [], opens: [], msg: o.ambush ? 'AMBUSH!' : 'THE TRIAL', done: o.ambush ? 'THE AMBUSH IS BROKEN' : 'TRIAL WON', trial: true, state: 'idle', wave: -1, mine: [], delay: 0 }; // PROPOSAL
    this.encs = [enc]; this.trial = { node: n, ambush: !!o.ambush, quest: !!o.quest }; this.bossState = 'done';
    this.card = { t: 0, sup: o.ambush ? 'AN AMBUSH' : 'A TRIAL', title: (o.ambush ? 'AMBUSH' : 'THE TRIAL OF ' + (AREA_NAMES[area] || '').replace(/^THE /, '')), line: o.ambush ? '' : 'ELITES ONLY. THE PRIZE IS A RARE BOON.' }; // PROPOSAL
    this.go('play'); this.fadeIn = 0;
  }
  trialWon() {
    const t = this.trial; this.trial = null; for (const g of (this.level.def && LEVELS[this.levelId] && LEVELS[this.levelId].boss ? LEVELS[this.levelId].boss.gates : []) || []) this.gate(g, true);
    this.track({ type: 'trial', ambush: t && t.ambush, quest: t && t.quest });
    if (t && t.quest) { this.run.prog = { ...(this.run.prog || {}), node: this.run.at, questFought: t.node.id }; this.keepHero(); this.persist(); this.after(1.4, () => { this.leaving = true; this.fadeOut = 0; this.after(0.6, () => { this.leaving = false; this.doEvent(t.node, { eventId: t.node.event, quest: t.node.quest }); }); }); return; }
    this.after(1.2, () => this.offerBoon('trial', () => { this.keepHero(); this.leaving = true; this.fadeOut = 0; this.after(0.6, () => { this.leaving = false; this.nodeDone(); }); }, { minRarity: t && t.ambush ? undefined : 'rare' }));
  }

  // ---- quests (C): a quest node runs its step (an event of its own, or an area)
  doQuest(n) {
    if (n.encounter && !(this.run.prog && this.run.prog.questFought === n.id)) { this.doTrial({ ...n, area: n.area || this.questArea(), tier: n.tier ?? this.run.tier ?? 0 }, { quest: true, encounter: n.encounter }); return; }
    this.doEvent(n, { eventId: n.event, quest: n.quest });
  }
  questArea() { const run = this.run; const a = (run.stats.areas || []).slice(-1)[0]; return LEVELS[a] ? a : (run.act === 2 ? 'frostmarch' : (run.act === 3 ? 'marsh' : 'gate')); }
  // an event opened from inside an area (a cursed lamp's touch): the card over the frozen fight, then back to it
  openEvent(id) {
    const run = this.run, meta = this.meta; const E = OPT.events && OPT.events.EVENTS; let ev = null; try { ev = E ? (Array.isArray(E) ? E.find((x) => x.id === id) : E[id]) : null; } catch (e) { ev = null; }
    if (!ev) return false; const rng = rngOf(hashSeed(run.seed, run.at || 'x', id)); const re = opt('events', 'resolveEvent');
    this.after(0.4, () => this.openScreen('EventScreen', { run, event: ev, meta }, { choose: (i) => {
      let res = null; try { res = re ? re(run, meta, ev.id, i, rng) : null; } catch (err) { console.error('bellmourn: resolveEvent', err); } res = res || { lines: [], changes: {} };
      this.keepHero(); const after = this.applyChanges(res.changes || {}); this.refreshHero(); const h = this.world && this.world.hero; if (h && run.hp !== null) { h.hp = Math.max(1, Math.min(h.maxHp, run.hp)); h.tonics = Math.min(h.stats.maxTonics, run.tonics ?? h.tonics); }
      this.persist(); this.track({ type: 'event', id: ev.id, choice: i, changes: res.changes });
      const back = () => { this.closeScreen(); this.go('play'); if (after.boon) this.eventBoon(after.boon, () => {}); };
      const lines = [...(res.lines || []), ...(after.lines || [])];
      if (this.screen && this.screen.showResult) this.screen.showResult(lines, back, res.changes || {}); else back();
    } }));
    return true;
  }

  // ---- the end of a run: the summary, then the title (the run is gone; meta keeps what it earned)
  finishRun(outcome, then = null) {
    const run = this.run; if (!run) { if (then) then(); else this.go('title'); return; }
    this.keepHero();
    let summary; try { summary = endRun(this.meta, run, outcome); } catch (err) { console.error('bellmourn: endRun', err); summary = { lines: ['THE RUN IS OVER.'], outcome }; }
    this.meta.lastHero = run.hero; this.persistMeta(); this.clearRun();
    this.autoRunsDone = (this.autoRunsDone | 0) + 1; this.lastSummary = summary;
    if (outcome === 'quit' && then) { then(); return; }
    this.r.post.desat = 0; this.r.post.dawn = 0;
    this.openScreen('SummaryScreen', { summary, meta: this.meta }, { done: () => { this.closeScreen(); this.toTitle(); } });
  }
  async toTitle() { this.token++; this.timers = []; this.leaveHaven(); this.go('loading'); await this.loadLevel('gate', { fromStart: true }); this.titleScene(); this.go('title'); }

  // ---- challenges (D): game events and the run's end feed them; a newly done one says so
  track(ev) {
    const tc = opt('challenges', 'trackChallenges'); if (!tc || !this.run) return;
    const before = (this.meta.done || []).length;
    try { tc(this.meta, this.run, ev); } catch (err) { console.error('bellmourn: trackChallenges', err); return; }
    const done = this.meta.done || [];
    if (done.length > before) {
      const CH = (OPT.challenges && OPT.challenges.CHALLENGES) || [];
      for (const id of done.slice(before)) { const c = Array.isArray(CH) ? CH.find((x) => x.id === id) : CH[id]; this.ui.toast('CHALLENGE: ' + String((c && c.title) || id).toUpperCase(), { color: COL.gold, big: true, life: 3 }); } // PROPOSAL
      this.sound.play('bigBell', { vol: 0.5 }); this.persistMeta();
    }
  }

  story(dt, inp) {
    this.sound.setMusic('title');
    if (this.stateT === dt) { this.storyIdx = 0; this.lineT = 0; }
    const adv = inp.confirm || inp.taps.length || inp.attackPressed;
    if (inp.back) this.storyIdx = this.storyLines.length;
    else if (adv) { if (this.lineT < 0.6) this.lineT = 0.6; else { this.storyIdx = (this.storyIdx || 0) + 1; this.lineT = 0; } }
    this.lineT = (this.lineT || 0) + dt;
    if ((this.storyIdx || 0) >= this.storyLines.length) { const f = this.storyNext; this.storyNext = null; if (typeof f === 'function') f(); else this.toTitle(); }
  }


  // ------------------------------------------------------------------ cutscenes
  // ------------------------------------------------------------------ cutscenes
  // A scene plays in full once (meta.story.seen); after that it is cut short at once (its flags, kept calls and
  // choices still happen). o.always: a scene written to be short (the road on later runs) plays every time.
  seen(id) { return !!(this.meta.story && this.meta.story.seen && this.meta.story.seen[id]); }
  markSeen(id) { const st = this.meta.story = this.meta.story || { seen: {} }; st.seen = st.seen || {}; st.seen[id] = true; this.persistMeta(); }
  // Play a scene by id; onEnd(result) runs when it is over (default: back to where the game was).
  playScene(id, ctx = {}, onEnd = null, o = {}) {
    const sc = SCENES[id]; const back = this.state === 'cutscene' ? (this.cutBack || 'play') : this.state;
    if (this.noScenes && !this.forceScene) { this.markSeen(id); if (onEnd) onEnd({}); return false; }
    if (!sc) { console.warn('bellmourn: no scene ' + id); if (onEnd) onEnd({}); return false; }
    const short = this.seen(id) && !o.always && !this.forceScene;
    if (this.world) this.world.idle();
    this.markSeen(id); this.cutBack = back; this.bark = null;
    try {
      this.cut = new Cutscene(this, sc, ctx, { onEnd: (res) => { this.cut = null; this.persist(); if (onEnd) onEnd(res); else this.go(back === 'cutscene' ? 'play' : back); } });
    } catch (err) { console.error('bellmourn: scene ' + id + ' failed', err); this.cut = null; if (onEnd) onEnd({}); return false; }
    this.go('cutscene');
    if (short) { try { this.cut.skip(); } catch (e) { /* */ } }
    return true;
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
    if (opts.party !== false) for (const h of WARDENS) if (HEROES[h] && h !== this.run.hero && !this.meta.friends.includes(h)) this.meta.friends.push(h);
    this.syncSave();
    if (this.state === 'cutscene' && this.cut) { const c = this.cut; this.cut = null; c.onEnd = null; c.finish(); }
    if (st.haven) {
      await this.enterShrine({ id: 'scene', kind: 'shrine', act: id === 'act3.open' ? 3 : 2 }, { noScene: true, resume: true });
    } else {
      const lid = LEVELS[st.level] ? st.level : (LEVELS[st.fallback] ? st.fallback : 'gate');
      await this.enterArea({ id: 'scene', kind: 'area', area: lid, tier: AREA_TIER[lid] || 0 }, { road: true }); this.card = null; this.tutorial = null;
      const def = this.level.def; const h = this.world.hero;
      if (st.at === 'exit' && def.exit) { const z = def.exit.zone; h.x = (z[0] + z[2]) / 2; h.z = z[3] + 0.6; h.face = Math.PI; }
      if (st.boss && def.boss) {
        const B = def.boss; h.x = (B.zone[0] + B.zone[2]) / 2; h.z = B.zone[3] - 2; h.face = Math.atan2(B.x - h.x, B.z - h.z);
        this.world.ents = this.world.ents.filter((e) => e === h);
        if (st.boss !== 'none' && knownBoss(B.type)) {
          const b = this.boss = this.world.spawnBoss(B.type, B.x, B.z, { face: B.face ?? 0 }); b.face = Math.atan2(h.x - b.x, h.z - b.z);
          if (st.boss === 'dead') { b.dead = true; b.hp = 0; b.anim = 'die'; b.animT = 3; this.bossState = 'done'; } else this.bossState = 'intro';
        }
        this.world.drain();
      }
      this.camFocus.set(h.x, 0, h.z);
    }
    this.noAutoScenes = false;
    this.playScene(id, {}, () => { this.go(this.inHaven && this.haven ? 'haven' : 'play'); });
  }

  // ------------------------------------------------------------------ the Haven
  // ------------------------------------------------------------------ the shrine (a small Haven)
  // A SHRINE node: the warden walks out of the rain to the bell's forge-flame, alone, and kneels; the
  // ShrineScreen sits beside them (heal, raise a boon's rarity, buy a reroll, leave). An act's first node
  // is a shrine too, where the act's opening scene plays the first time.
  async enterShrine(n, opts = {}) {
    this.closeScreen(); this.node = n;
    this.go('loading'); this.r.post.fade = 1; this.loading = true; this.token++; this.timers = [];
    if (this.level) this.r.scene.remove(this.level.group);
    this.view.clear(); this.fx.clear(); this.clearNotes();
    const L = this.havenSet || (this.havenSet = await buildHaven());
    this.r.scene.add(L.group); this.level = L; this.levelId = 'haven';
    this.atmos.setLevel(L.def.ambience, L.lights); this.groundAt = L.roofAt; this.atmos.heroLight.intensity = 1.2;
    this.sound.setRain(0.6); this.r.post.dawn = 0;
    const act = n.act || (this.run && this.run.act) || 1;
    const sid = opts.noScene ? null : (n.start && act === 2 && !this.seen('act2.open') ? 'act2.open' : (n.start && act === 3 && !this.seen('act3.open') ? 'act3.open' : null));
    const w = this.world = new World({ solids: L.solids, bounds: L.def.bounds, seed: 5, abilityMode: this.settings.abilityMode }); w.abilityMode = this.settings.abilityMode;
    this.encs = []; this.boss = null; this.bossState = 'idle'; this.hints = []; this.qhints = []; this.tutorial = null; this.prompt = null; this.leaving = false; this.card = null; this.flares = [];
    this.inHaven = true; this.shrineUsed = false; this.shrineAuto = 0;
    this.haven = new Haven(this, L, { resume: !!opts.resume || !!sid, act, onLeave: () => this.nodeDone() });
    this.camFocus.set(w.hero.x, 0, w.hero.z); this.r.focus.copy(this.camFocus);
    this.loading = false; this.go('haven'); this.fadeIn = 0;
    this.track({ type: 'shrine' });
    if (sid) this.playScene(sid, {}, () => {
      const h = this.world.hero, D = L.def; if (h && this.haven) { h.x = D.kneel.x; h.z = D.kneel.z; h.face = Math.atan2(D.fire.x - h.x, D.fire.z - h.z); this.haven.pose(h, 'rest'); }
      this.go('haven'); this.fadeIn = 1;
    });
  }
  // the ShrineScreen's data and handlers (the Haven opens it once the warden kneels). A handler returns false
  // when it refuses (E's screens shake the row), else a short line of what happened.
  shrineData() {
    const run = this.run, meta = this.meta; const k = priceK(run);
    const cheapest = Math.min(...(run.boons || []).filter((b) => b.rarity !== 'legendary').map((b) => upgradeCost(run, b.rarity) || 999), 999);
    return { run, meta, prices: { heal: 0, upgrade: cheapest < 999 ? cheapest : upgradeCost(run, 'common'), reroll: rerollCost(run), tonic: Math.round(45 * k) }, limits: { heal: 1, upgrade: 3, reroll: 3, tonic: 2 }, healAmount: Math.round((run.maxHp || 100) * shrineHeal(meta)), veil: 0.42, inScene: true };
  }
  shrineHandlers() {
    const run = this.run, meta = this.meta; const no = (m) => { this.sound.play('ui'); if (m) this.ui.toast(m, { color: COL.dim, life: 1.4 }); return false; };
    return {
      heal: () => { if (this.shrineUsed) return no('YOU HAVE RESTED'); this.shrineUsed = true; const got = this.healTo(shrineHeal(meta)); if (this.haven) this.haven.react('skill', true); this.syncSave(); this.persist(); return got > 0 ? '+' + got + ' HEALTH' : 'RESTED'; }, // PROPOSAL
      tonic: () => { const c = Math.round(45 * priceK(run)); if (run.embers < c) return no('NOT ENOUGH EMBERS'); if ((run.tonics ?? 0) >= this.maxTonics()) return no('YOUR FLASK IS FULL'); run.embers -= c; run.tonics = (run.tonics ?? 0) + 1; if (this.haven) this.haven.react('buy', true); this.persist(); return 'A TONIC'; }, // PROPOSAL
      upgrade: (id) => { const b = (run.boons || []).find((x) => x.id === id); const c = b ? upgradeCost(run, b.rarity) : null; if (!b || c === null) return no('IT CANNOT RISE FURTHER'); if (run.embers < c) return no('NOT ENOUGH EMBERS'); const ub = opt('boons', 'upgradeBoon'); let ok = false; try { ok = ub ? ub(run, id) !== false : false; } catch (e) { ok = false; } if (!ok) return no('THE BOON WILL NOT CHANGE'); run.embers -= c; if (this.haven) this.haven.react('temper', true); this.refreshHero(); this.persist(); this.track({ type: 'upgrade', id }); return 'THE BOON GROWS'; }, // PROPOSAL
      reroll: () => { const c = rerollCost(run); if (run.embers < c) return no('NOT ENOUGH EMBERS'); run.embers -= c; run.rerolls = (run.rerolls | 0) + 1; if (this.haven) this.haven.react('buy', true); this.persist(); return 'A REROLL FOR LATER'; }, // PROPOSAL
      leave: () => { if (this.haven) this.haven.onward(); },
      upgradeCost: (rarity) => upgradeCost(run, rarity), rerollCost: () => rerollCost(run), healFrac: () => shrineHeal(meta), used: () => this.shrineUsed,
    };
  }
  // toasts and floating numbers age only while the HUD is drawn: drop them when the place changes, or a
  // district's last words (a boss's rewards) would turn up in the next one
  clearNotes() { const ui = this.ui; ui.toasts = []; if (ui.floats) ui.floats = []; ui.gain = null; }
  leaveHaven() { if (!this.inHaven) return; this.inHaven = false; this.haven = null; this.groundAt = null; this.atmos.heroLight.intensity = 5; this.atmos.heroLight.color.setHex(0xb8c8ec); }

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
    // after an ending the credits roll (a tap after a moment moves on), then the run's summary
    if (this.back === 'ending') { if (this.stateT > 16 || (this.stateT > 1.2 && (inp.back || inp.confirm || inp.taps.length))) { this.back = null; this.finishRun('ending:' + (this.endingKind || 'dawn')); } return; }
    if (this.stateT > 0.5 && (inp.back || inp.confirm || inp.taps.length)) this.go('title');
  }

  pauseMenu(dt, inp) {
    // PROPOSAL: ABANDON RUN ends the run here (it counts as a run: its summary, its shards)
    this.pauseItems = [{ label: 'RESUME', id: 'resume' }, { label: 'CONTROLS', id: 'controls' }, { label: 'SETTINGS', id: 'settings' }, this.run && !this.duelOn ? { label: 'ABANDON RUN', id: 'abandon' } : null, { label: 'QUIT TO TITLE', id: 'quit' }].filter(Boolean);
    const p = this.menuInput(inp, this.pauseItems); const id = p >= 0 ? this.pauseItems[p].id : null;
    if (inp.pausePressed || inp.back || id === 'resume') { this.go(this.inHaven ? 'haven' : 'play'); return; }
    if (id === 'controls') { this.back = 'pause'; this.go('controls'); }
    if (id === 'settings') { this.back = 'pause'; this.go('settings'); }
    if (id === 'abandon') { this.token++; this.timers = []; this.finishRun('quit'); }
    if (id === 'quit') { this.persist(); this.toTitle(); } // the run is saved: CONTINUE RUN picks it up at this node
  }

  // Death ends the run: a moment of silence, then the summary.
  dead(dt, inp) {
    this.world.update(dt * 0.35, NO_INPUT); this.handleEvents(this.world.drain());
    this.r.post.desat = Math.min(0.85, this.stateT * 0.5);
    if (this.stateT > 1.0 && !this.deathSlow) { this.deathSlow = true; this.sound.setMusic('none'); }
    if (this.stateT > 3.6 || (this.stateT > 1.6 && (inp.confirm || inp.taps.length))) {
      this.deathSlow = false; this.r.post.desat = 0;
      if (this.duelOn) { const h = this.world.hero; h.dead = false; h.hp = h.maxHp; h.state = 'idle'; h.anim = 'idle'; this.go('play'); return; } // the tutorial duel cannot be lost
      this.finishRun('death');
    }
  }

  // ------------------------------------------------------------------ play
  // ------------------------------------------------------------------ play
  play(dt, inp) {
    const w = this.world; const hero = w.hero; const def = this.level.def;
    if (inp.pausePressed) { this.go('pause'); return; }
    if (this.debug && this.debug.god) { w.hero.hp = w.hero.maxHp; }
    if (this.tutorial && (inp.confirm || inp.taps.length) && this.tutorial.tap) this.tutorial.tap();
    const ts = (this.timeScale || 1) * (this.tutorial && this.tutorial.timeK ? this.tutorial.timeK() : 1);
    w.update(dt * ts, this.tutorial && this.tutorial.filter ? this.tutorial.filter(inp) : inp);
    const evs = w.drain();
    this.handleEvents(evs);
    if (this.tutorial) this.tutorial.update(dt, evs, inp);
    this.allyStep(dt);
    if (this.state !== 'play') return;
    // the old lamps: a small heal, once each, when walked up to out of a fight
    this.lampsAuto(hero);
    this.prompt = null; let nearChest = null;
    for (const c of this.level.chests) if (!c.h.open && Math.hypot(hero.x - c.x, hero.z - c.z) < 1.7) nearChest = c;
    if (nearChest) this.prompt = 'OPEN';
    if (inp.interactPressed && nearChest) this.openChest(nearChest);
    if (!this.card && !this.tutorial) for (const h of this.hints) if (!h.shown && inZone(hero, h.zone)) { h.shown = true; this.ui.toast(inp.touch && h.touch ? h.touch : h.text, { life: h.life || 4, color: COL.ice }); }
    // a touch (C): a quest hint, a chained survivor, a cursed lamp; quests.onHint applies it (and may open an event)
    for (const t of this.touches || []) if (!t.used && Math.hypot(hero.x - t.x, hero.z - t.z) < (t.r || 1.1) + 0.4) {
      t.used = true; this.nodeProg().touched.push(t.id); this.sound.play('toll', { vol: 0.5 }); this.fx.embers(t.x, 1, t.z, 24, [2.4, 2.2, 3]);
      const oh = opt('quests', 'onHint'); let res = null;
      if (oh) { try { res = oh(this, t.id); } catch (err) { console.error('bellmourn: onHint', err); } }
      else { this.meta.hints[t.id] = true; this.ui.toast(t.text || 'A HINT', { color: COL.ice, life: 4 }); }
      const m = this.level.marks && this.level.marks['touch:' + t.id]; if (m && m.hide) { try { m.hide(); } catch (e) { /* */ } }
      this.persist(); this.track({ type: t.id.startsWith('ev:') ? 'touch' : 'hint', id: t.id, kind: t.kind, res });
    }
    for (const e of this.encs) this.runEncounter(e, dt);
    const B = def.boss;
    if (B && this.bossState === 'idle' && inZone(hero, B.zone)) this.startBoss();
    // the exit opens after the boss; the Old Road's gate opens when the duel is over
    const exitOpen = def.exit && (!def.exit.requires || this.bossState === 'done') && (!this.tutorial || this.tutorial.done) && !this.pendingScene && !(this.encs || []).some((e) => e.state === 'active');
    if (exitOpen && inZone(hero, def.exit.zone) && !this.leaving) this.finishArea();
    this.sound.setMusic(this.boss && !this.boss.dead ? 'boss' : (w.combat ? 'combat' : 'explore'));
    if (hero.state === 'run' && (this.stepT = (this.stepT || 0) - dt) <= 0) { this.stepT = 0.27; this.sound.play('step'); if (Math.random() < 0.5) this.fx.splash(hero.x, hero.z, 3); }
  }


  // The old checkpoint lamps are small one-time heals in a run: walk within reach (LAMP_REACH) while the area is
  // clear (no foe hunting you within LAMP_CLEAR, no locked fight or boss under way) and it flares up and heals
  // a little, once. Nothing is kept: death ends the run.
  lampClear(hero) {
    if ((this.encs || []).some((e) => e.state === 'active')) return false;
    if (this.bossState === 'intro' || this.bossState === 'fight') return false;
    return !this.world.foes().some((f) => f.ai.aggro && !f.dead && Math.hypot(f.x - hero.x, f.z - hero.z) < LAMP_CLEAR);
  }
  lampsAuto(hero) {
    if (!hero || hero.dead || this.tutorial) return;
    let clear = null;
    for (const l of this.level.lamps) {
      if (l.h.lit) continue;
      if (Math.hypot(hero.x - l.x, hero.z - l.z) > LAMP_REACH) continue;
      if (clear === null) clear = this.lampClear(hero);
      if (clear) this.lightLamp(l);
    }
  }
  lightLamp(l) {
    const hero = this.world.hero; const prog = this.nodeProg();
    l.h.set(true); this.lampLight(l, true); if (!prog.lamps.includes(l.id)) prog.lamps.push(l.id);
    const amt = Math.round(hero.maxHp * LAMP_HEAL); const before = hero.hp; hero.hp = Math.min(hero.maxHp, hero.hp + amt); const got = Math.round(hero.hp - before);
    if (this.run) this.run.stats.healed += got; this.keepHero(); this.persist();
    this.ui.toast(got > 0 ? 'THE LAMP WARMS YOU  +' + got : 'LAMP LIT', { color: COL.gold, life: 1.8 }); // PROPOSAL
    if (got > 0) { if (this.ui.healGain) this.ui.healGain(got); this.track({ type: 'heal', amt: got, source: 'lamp' }); }
    this.sound.play('lamp'); this.sound.play('heal', { delay: 0.25 });
    this.fx.embers(l.x, 3.35, l.z, 36, [3, 1.8, 0.5]); this.fx.embers(hero.x, 0.6, hero.z, 14, [3, 2.2, 0.8]); this.flareLamp(l);
  }
  // the lamp's light in the light pool follows the lamp (the pool keeps its own copy of each light)
  lampSource(l) { const L = l.h.light; return this.atmos.sources.find((s) => s.x === L.x && s.y === L.y && s.z === L.z); }
  lampLight(l, on) { const s = this.lampSource(l); if (s) s.on = on; }
  flareLamp(l) { const s = this.lampSource(l); if (s) this.flares.push({ s, base: s.base ?? s.intensity, t: 0 }); }

  // a chest: embers, sometimes a tonic or a relic for this run
  openChest(c) {
    const run = this.run; c.h.open = true; const prog = this.nodeProg(); prog.chests.push(c.id); this.sound.play('uiOk'); this.fx.embers(c.x, 0.8, c.z, 30, [3, 2, 0.6]);
    const rng = rngOf(hashSeed(run ? run.seed : 1, run && run.at, c.id)); const lines = [];
    const amt = Math.round((c.amount || (25 + rng() * 25)) * (1 + 0.35 * ((this.level.def.tier || 0) / 3))); if (run) run.embers += amt; lines.push('+' + amt + ' EMBERS');
    if (c.kind === 'tonic' || rng() < 0.3) { const h = this.world.hero; if (h.tonics < h.stats.maxTonics) { h.tonics++; lines.push('A TONIC'); } }
    else if (rng() < 0.25 && run) { const pool = Object.keys(RELICS).filter((id) => !run.relics.includes(id)); if (pool.length) { const id = pool[Math.floor(rng() * pool.length)]; run.relics.push(id); lines.push('RELIC: ' + RELICS[id].name); this.refreshHero(); } }
    lines.forEach((l, i) => this.ui.toast(l, { color: COL.gold, life: 3 + i }));
    this.persist();
  }

  runEncounter(e, dt) {
    const w = this.world; const hero = w.hero;
    if (e.state === 'idle' && (inZone(hero, e.zone) || e.trial)) {
      e.state = 'active'; for (const g of e.gates || []) this.gate(g, false);
      if (e.msg) this.ui.toast(e.msg, { color: COL.red, big: !!e.trial });
      if (e.preSpawned) { for (const f of e.mine) { f.ai.aggro = true; f.ai.locked = true; } }
      else this.spawnWave(e, 0);
    }
    if (e.state !== 'active') return;
    if (e.mine.every((f) => f.dead)) {
      e.delay += dt; if (e.delay < 0.9) return; e.delay = 0;
      if (e.wave + 1 < e.waves.length) this.spawnWave(e, e.wave + 1);
      else {
        e.state = 'done'; if (!e.trial) { const prog = this.nodeProg(); if (!prog.encs.includes(e.id)) prog.encs.push(e.id); }
        for (const g of e.gates || []) this.gate(g, true); for (const g of e.opens || []) this.gate(g, true);
        this.ui.toast(e.done || 'THE WAY IS OPEN', { color: COL.gold });
        this.keepHero(); this.persist(); this.track({ type: 'fightClear', area: this.levelId, trial: !!e.trial });
        // a cleared fight: one boon of three (a trial gives its own, rarer, when it is won)
        if (e.trial) this.trialWon();
        else if (this.run && this.levelId !== 'prologue') this.after(1.0, () => { if (this.state === 'play') this.offerBoon('fight', () => {}); else this.after(1.0, () => { if (this.state === 'play') this.offerBoon('fight', () => {}); }); });
      }
    }
  }
  spawnWave(e, i) {
    e.wave = i; const tier = this.level.def.tier || 0; const W = e.waves[i];
    e.mine = W.foes.filter(knownOrWarn).map((f) => { const m = this.world.spawnFoe(f.t, f.x, f.z, { tier: f.tier ?? tier, aggro: true, elite: f.elite || this._elite(tier, f.t), element: f.element }); m.ai.locked = true; return m; });
  }

  startBoss() {
    const B = this.level.def.boss; const run = this.run;
    // the last fight: the Voice in the Bell speaks first, and the warden chooses (SILENCE ends the run here)
    if (B.type === 'wheel' && !(run && run.choice)) {
      this.bossState = 'intro';
      this.playScene('finale.choice', {}, (res) => {
        const c = res.final || this.save.choice || 'ring'; if (run) run.choice = c; this.save.choice = c; this.persist();
        if (c === 'silence') { this.playEnding('silence'); return; }
        this.bossState = 'idle'; this.go('play'); this.startBoss();
      });
      return;
    }
    if (!knownBoss(B.type)) { // a boss still being built: the arena stands empty and the way on opens
      console.warn('bellmourn: unknown boss type skipped: ' + B.type); this.bossState = 'done'; this.nodeProg().boss = true;
      for (const g of B.opens || []) this.gate(g, true); this.ui.toast('THE ARENA STANDS EMPTY', { color: COL.dim, life: 3 }); return;
    }
    this.bossState = 'intro'; this.card = null; // the area's name card never sits on the boss bar
    for (const g of B.gates || []) this.gate(g, false);
    // a boss fights to its row's strength against its district's own (bossOpts covers a boss from another district)
    const tier = this.level.def.tier ?? 0, own = B.baseTier ?? AREA_TIER[this.levelId] ?? tier; const hpK = (1 + tier * 0.32) / (1 + own * 0.32), dK = (1 + tier * 0.16) / (1 + own * 0.16);
    const bo = opt('bosses5', 'bossOpts'); let O = {}; if (bo) { try { O = bo(B.type, this.levelId) || {}; } catch (e) { O = {}; } }
    this.boss = this.world.spawnBoss(B.type, B.x, B.z, { ...O, face: B.face ?? 0, hpMul: (B.hpMul || 1) * (O.hpMul || 1) * Math.max(0.45, Math.min(1.6, hpK)), dmgMul: (B.dmgMul || 1) * (O.dmgMul || 1) * Math.max(0.6, Math.min(1.3, dK)), ascended: !!B.ascended, trueForm: B.type === 'wheel' && run && run.choice === 'sing' });
    if (typeof B4.ascendDef === 'function' && B.ascended) { try { B4.ascendDef(this.boss); } catch (err) { console.error(err); } }
    this.bossTonics0 = run ? run.stats.tonics : 0; this.track({ type: 'bossStart', boss: B.type });
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
    const B = this.level.def.boss; this.bossState = 'done'; this.nodeProg().boss = true;
    const w = this.world; const type = this.boss && this.boss.type; const run = this.run;
    for (const f of w.foes()) { if (f.ally || f.team !== 'foe') continue; f.hp = 0; w._kill(f, w.hero, {}); }
    w.hazards.length = 0; w.projs = w.projs.filter((p) => p.team === 'hero');
    // the run's rewards: embers, the boss's Echo for this run, then a boon of three
    const lines = []; const k = priceK(run || { act: 1 }); const emb = Math.round(70 * k + (this.level.def.tier || 0) * 6);
    if (run) { run.embers += emb; lines.push('+' + emb + ' EMBERS'); if (ECHOES[type] && !run.echoes.includes(type)) { run.echoes.push(type); lines.push('ECHO: ' + ECHOES[type].name); } if (!run.stats.bosses.includes(type)) run.stats.bosses.push(type); }
    this.areaBoss = type; this.keepHero(); this.persist();
    this.track({ type: 'bossDown', boss: type, area: this.levelId, tonicsUsed: run ? run.stats.tonics - (this.bossTonics0 | 0) : 0, hp: w.hero ? w.hero.hp / w.hero.maxHp : 1 });
    // the boss's last words, then the scene this fall opens (a revelation, the bell, an ending)
    const BL = bossLines(type); if (BL && BL.fall) this.bark = { name: speaker(type).name || this.boss.def.name.toUpperCase(), color: speaker(type).color || COL.gold, text: BL.fall, t: 0, life: 3.6 };
    const after = AFTER_BOSS[type]; const sid = type === 'wheel' ? 'end' : (after && !after.startsWith('recruit.') && !this.seen(after) ? after : null);
    this.pendingScene = 'boss';
    this.after(3.4, () => {
      if (this.state === 'dead') { this.pendingScene = null; return; }
      if (sid === 'end') { this.playEnding(run && run.choice === 'sing' ? 'song' : 'dawn'); return; }
      const next = () => this.offerBoon('boss', () => { this.pendingScene = null; this.afterBossScene(type); }, { minRarity: 'rare' });
      if (sid) this.playScene(sid, {}, () => { this.go('play'); next(); }); else next();
    });
    this.sound.play('bigBell', { delay: 0.4 });
    this.after(1.8, () => {
      for (const g of B.opens || []) this.gate(g, true);
      this.ui.toast(this.boss.def.name.toUpperCase() + ' FALLS', { color: COL.gold, big: true, life: 4 });
      lines.forEach((l, i) => this.after(0.6 * (i + 1), () => this.ui.toast(l, { color: COL.text, life: 4 })));
      this.refreshHero();
    });
  }

  // ---- allies: when the Wheel enters its second stage, each befriended warden (meta.friends, at most three)
  // arrives with their entrance (D's allyEntrance) and fights beside the warden (B's world.spawnAlly)
  callAllies() {
    this.alliesCalled = true; const w = this.world; const h = w && w.hero; if (!h) return;
    const friends = ((this.meta && this.meta.friends) || []).filter((id) => id !== (this.run && this.run.hero) && HEROES[id]).slice(0, 3);
    if (!friends.length) return;
    if (typeof w.spawnAlly !== 'function') { console.warn('bellmourn: world.spawnAlly is not there yet: no allies'); return; }
    const ae = opt('allies', 'allyEntrance'); this.allyEnts = [];
    friends.forEach((id, i) => {
      const a = (i - (friends.length - 1) / 2) * 1.1 + Math.PI; const x = h.x + Math.sin(h.face + a) * 2.2, z = h.z + Math.cos(h.face + a) * 2.2;
      let ally = null; try { ally = w.spawnAlly(id, x, z, { tier: this.level.def.tier || 0, stats: this.heroStats(id) }); } catch (err) { console.error('bellmourn: spawnAlly ' + id, err); }
      if (!ally) return;
      let E = null; try { E = ae ? ae(id) : null; } catch (err) { E = null; }
      this.allyEnts.push({ e: ally, E: E && typeof E.step === 'function' ? E : null, t: 0, delay: 0 });
      const AL = OPT.allies && OPT.allies.ALLY_LINES; const line = (E && E.line) || (AL && AL[id]);
      this.after(i * 1.6, () => { this.ui.toast(HEROES[id].name + ' ANSWERS THE TOLL', { color: COL.gold, big: i === 0, life: 2.6 }); this.sound.play('bigBell', { vol: 0.6 }); if (line) this.bark = { name: HEROES[id].name, color: (SPEAKERS[id] || {}).color || COL.gold, text: line, t: 0, life: 3 }; }); // PROPOSAL
    });
    for (const id of friends) this.track({ type: 'ally', hero: id });
  }
  allyStep(dt) {
    for (const A of this.allyEnts || []) {
      if (!A.E || A.done) continue; if ((A.delay -= dt) > 0) { A.e.iframes = 9; continue; }
      A.t = Math.min(A.E.dur, A.t + dt); try { A.E.step(this.world, A.e, A.t, this.fx); } catch (err) { console.error('bellmourn: ally entrance', err); A.t = A.E.dur; }
      if (A.t >= A.E.dur) A.done = true;
    }
  }
  // what follows a boss's boon: an act's end (the bell after Saint Silence, the Wheel turning after the Archon:
  // the next act's map), else the walk to the area's exit
  afterBossScene(type) {
    const n = this.node;
    if (n && n.kind === 'boss') {
      const go = () => { this.r.post.dawn = 0; this.keepHero(); this.nodeDone({ boss: type, echo: type }); this.areaBoss = null; };
      if (type === 'silence' || n.area === 'belfry') { this.playScene('act1.end', {}, go); return; }
      go(); return;
    }
    this.go('play');
  }
  // an ending (dawn, silence, song), then the credits, then the run's summary
  playEnding(kind) {
    this.pendingScene = 'end'; if (this.run) this.run.choice = this.run.choice || kind;
    this.playScene('end.' + kind, {}, () => {
      this.pendingScene = null; this.endingKind = kind; this.back = 'ending'; this.r.post.fade = 1; this.go('credits');
    }, { always: true });
  }


  // ------------------------------------------------------------------ ending

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
          if (ev.hero && d === hero) { snd.play('heroHurt'); r.post.hurt = 0.7; if (this.run && d === hero) { this.run.stats.damageTaken += ev.dmg || 0; this.track({ type: 'hit', hero: true, dst: d, dmg: ev.dmg }); } }
          else snd.play(ev.heavy || ev.crit ? 'hitHeavy' : 'hit', { vol: ev.kind === 'bolt' ? 0.5 : 1 });
          if (ev.special) fx.slashLine(d.x, 1.1, d.z, 2.6);
          break;
        }
        case 'kill': {
          const e = ev.e; snd.play('kill'); snd.play('foeDie', { delay: 0.05 });
          fx.blood(e.x, 1, e.z, Math.random() * 6, 30); fx.mist(e.x, 0.8, e.z, 10, [0.15, 0.16, 0.2]); for (let i = 0; i < 3; i++) fx.bloodPool(e.x, e.z, 1.3);
          if (ev.drop && this.run && this.levelId !== 'prologue' && e.team === 'foe') { const mul = hero && hero.stats.relics.includes('coin') ? 1.3 : 1; this.run.embers += Math.round(ev.drop * mul * 0.8 * curseMod(this.run, 'emberMul')); this.emberFly(e.x, e.z, ev.drop); }
          if (this.run && e.team === 'foe' && !e.ally) { this.run.stats.kills++; this.run.stats.freed++; if (ev.elite) this.run.stats.elites++; this.track({ type: 'kill', e, foe: e.type, elite: !!ev.elite, boss: !!ev.boss, element: e.element }); }
          if (ev.elite) this.ui.toast('ELITE SLAIN', { color: COL.gold, life: 1.5 });
          if (e.type && e.team === 'foe' && noteKill(this.codexSave(), e.type)) this.ui.toast('NEW IN THE BESTIARY', { color: COL.ice, life: 2 });
          if (ev.boss) { this.bossDown(); r.shake(0.8, 1.2); this.zoomPunch = 1.3; fx.mist(e.x, 1.5, e.z, 60, [0.3, 0.3, 0.36]); fx.embers(e.x, 1.5, e.z, 60, [3, 1.4, 0.4]); fx.shockRing(e.x, e.z, 9, [2.6, 2.2, 1.6], 0.9); r.post.flash = 0.35; this.flashT = 0.12; }
          break;
        }
        case 'perfect': if (this.run && ev.e === hero) { this.run.stats.perfects++; this.track({ type: 'perfect' }); } snd.play('perfect'); this.view.get(hero) && fx.ghost(this.view.get(hero), [0.4, 0.8, 1.6], 0.5); this.ui.toast('PERFECT', { color: COL.ice, life: 0.9 }); break;
        case 'dash': snd.play('dash'); this.dashGhosts = 3; this.ghostT = 0; fx.dust(ev.e.x, ev.e.z, 5); break;
        case 'stagger': fx.shockRing(ev.e.x, ev.e.z, 1.6, [2.4, 2.2, 1.2], 0.35); snd.play('block'); break;
        // the tonic: the drink starts (cork, gulps, motes up the body, a green glow on the warden), then
        // the health lands (a chime, a burst, the bar's new part flashes, "+amt" over the head)
        case 'drink': if (this.run && ev.e === hero) { this.run.stats.tonics++; this.track({ type: 'drink' }); } snd.play('drink'); if (fx.tonicStart) fx.tonicStart(ev.e); if (this.view.healGlow) this.view.healGlow(ev.e.id, 1.5); break;
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
        case 'chain': if (ev.boon) { if (this.t - (this.chainT || 0) < 0.12) break; this.chainT = this.t; }
          fx.slashLine((ev.from.x + ev.to.x) / 2, 1.2, (ev.from.z + ev.to.z) / 2, Math.hypot(ev.to.x - ev.from.x, ev.to.z - ev.from.z), [1.6, 1.8, 3], 0.15); snd.play('slashA', { vol: 0.5 }); break;
        case 'revive': if (this.run && ev.e === hero && this.run.mercy > 0 && (!hero.stats.relics.includes('bone') || hero.revives === 0)) { this.run.mercy = 0; this.persist(); } snd.play('bigBell'); fx.embers(ev.e.x, 1, ev.e.z, 40, [3, 2.6, 1.6]); this.ui.toast("SAINT'S BONE: YOU RISE", { color: COL.gold, big: true, life: 2.5 }); break;
        case 'crown': fx.embers(ev.x, 0.8, ev.z, 12, [2.6, 0.6, 0.6]); break;
        case 'shieldBreak': snd.play('clang'); fx.sparks(ev.e.x, 1.2, ev.e.z, 0, 20, [2.4, 2.2, 1.6]); break;
        case 'tele': if (ev.e.boss || Math.random() < 0.7) snd.play('tele', { vol: ev.e.boss ? 1.4 : 0.8 }); break;
        case 'aggro': if (ev.e && ev.e.type) noteSeen(this.codexSave(), ev.e.type); break;
        // the Act II units' moves (units2.js): sounds from the ones the city already has
        case 'burrow': snd.play('boom', { vol: 0.5 }); fx.dust(ev.e.x, ev.e.z, 10); break;
        case 'emerge': snd.play('boom', { vol: 0.8 }); fx.dust(ev.e.x, ev.e.z, 16); break;
        case 'split': snd.play('splash'); break;
        case 'collapse': snd.play('foeDie', { vol: 0.7 }); break;
        case 'interrupt': snd.play('clang'); fx.shockRing(ev.e.x, ev.e.z, 1.6, [2.4, 1.2, 0.6], 0.35); break;
        case 'breakFree': snd.play('dash', { vol: 0.8 }); if (ev.e) fx.shockRing(ev.e.x, ev.e.z, 1.2, [1.6, 1.8, 2.4], 0.3); break;
        case 'spawn': if (ev.e && ev.e.type && ev.e.team === 'foe') noteSeen(this.codexSave(), ev.e.type); if (ev.e.state === 'spawn') { fx.mist(ev.e.x, 0.3, ev.e.z, 14, [0.25, 0.27, 0.32]); snd.play('rise', { vol: 0.6 }); } break;
        case 'fire': snd.play(ev.kind === 'bolt' ? 'bolt' : 'orb', { vol: 0.7 }); break;
        case 'projHit': fx.sparks(ev.p.x, ev.p.y ?? 1.1, ev.p.z, Math.random() * 6, 8, ev.p.kind === 'soul' ? [0.5, 2.5, 2.4] : [3, 0.6, 0.4]); break;
        case 'shieldUp': fx.shockRing(ev.x ?? ev.e.x, ev.z ?? ev.e.z, 1.2, [2.4, 2.2, 1.4], 0.4); snd.play('heal', { vol: 0.5 }); break;
        case 'shield': fx.shockRing(ev.e.x, ev.e.z, 2.2, [2.2, 2.1, 1.8], 0.5); snd.play('clang'); break;
        case 'beam': r.shake(0.3, 0.4); snd.play('fire'); break;
        case 'hook': fx.slashLine((ev.e.x + ev.x) / 2, 1.4, (ev.e.z + ev.z) / 2, Math.hypot(ev.x - ev.e.x, ev.z - ev.e.z), [1.4, 1.5, 1.6], 0.3); snd.play(ev.hit ? 'clang' : 'swing'); break;
        case 'hazardGo': { if (this.hazSnd === this.t) break; this.hazSnd = this.t; const k = ev.h.kind; if (k === 'fire' || k === 'wax') snd.play('fire'); else if (k === 'water' || k === 'poison') snd.play('splash'); else if (k === 'toll') snd.play('toll'); else if (k === 'lightning') { snd.play('thunder', { vol: 0.8 }); this.atmos.flashT = 0.2; } else snd.play('boom', { vol: 0.8 }); if (k !== 'fire' && k !== 'poison') r.shake(0.25, 0.25); break; }
        case 'phase': if (ev.e && ev.e.type === 'wheel' && !this.alliesCalled) this.callAllies(); snd.play('roar'); this.ui.toast(ev.e.def.name.toUpperCase() + ' RAGES', { color: COL.red, life: 2 }); fx.shockRing(ev.e.x, ev.e.z, 6, [2.4, 0.4, 0.3], 0.6); break;
        case 'blink': fx.mist(ev.fx, 1, ev.fz, 12, [0.6, 0.15, 0.2]); fx.mist(ev.x, 1, ev.z, 12, [0.6, 0.15, 0.2]); snd.play('vanish'); break;
        case 'vanish': fx.mist(ev.e.x, 1, ev.e.z, 30, [0.8, 0.8, 0.85]); snd.play('vanish'); break;
        case 'appear': fx.mist(ev.e.x, 1, ev.e.z, 20, [0.8, 0.8, 0.85]); snd.play('vanish'); break;
        case 'land': snd.play('boom'); fx.dust(ev.e.x, ev.e.z, 20); fx.shockRing(ev.e.x, ev.e.z, 3, [1.4, 1.4, 1.6], 0.35); break;
        // the allies (B's spawnAlly): their own moves and their fall, never the player's
        case 'ally': snd.play(ev.what === 'ult' ? 'special' : (ev.what === 'dash' ? 'dash' : 'swing'), { vol: 0.5 }); break;
        case 'allyDown': snd.play('foeDie', { vol: 0.6 }); if (ev.e) { fx.mist(ev.e.x, 0.8, ev.e.z, 16, [0.4, 0.4, 0.45]); if (HEROES[ev.e.heroId]) this.ui.toast(HEROES[ev.e.heroId].name + ' FALLS BACK', { color: COL.dim, life: 2 }); } break; // PROPOSAL
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
        // the new bosses' moves (D's bosses5.js) and the allies' arrivals: sounds from the ones the game has
        default: { const sd = D_SOUNDS[ev.type]; if (sd) { if (this.dSnd && this.dSnd[ev.type] === this.t) break; (this.dSnd = this.dSnd || {})[ev.type] = this.t; snd.play(sd[0], { vol: sd[1] }); if (ev.type === 'shellBreak') this.ui.toast('THE SHELL BREAKS', { color: COL.gold, life: 1.6 }); } } // PROPOSAL
      }
    }
  }

  // the bestiary lives in meta's codex
  codexSave() { const c = this.meta.codex = this.meta.codex || {}; c.foes = c.foes || {}; return { bestiary: c.foes }; }
  emberFly(x, z, n) { this.fx.embers(x, 0.8, z, Math.min(18, 4 + n), [3, 1.6, 0.4]); this.sound.play('ember', { delay: 0.25 }); }

  // ------------------------------------------------------------------ frame
  renderFrame(dt) {
    const r = this.r, w = this.world;
    let target = null; let zt = 1;
    const titleish = this.state === 'title' || (this.state === 'screen' && !this.run && this.levelId === 'gate') || (this.state === 'controls' || this.state === 'settings') && this.back === 'title' || (this.state === 'credits' && this.back === 'title') || (this.state === 'story' && (this.storyNext === 'prologue' || this.storyNext === 'gate'));
    if (this.state === 'cutscene' && this.cut) {
      // a scene runs the camera; its puppets are drawn with the world (which stands still, breathing)
      const cs = this.cut; target = cs.camPos.clone(); zt = cs.zoom; this.camFocus.copy(target); this.zoom = zt;
      if (w) for (const e of w.ents) if (e.state !== 'cut') e.animT += dt;
      this.view.update(cs.viewList(w), dt);
    } else if (titleish) {
      this.titleCam = (this.titleCam || 0) + dt; target = new THREE.Vector3(-0.8 + Math.sin(this.titleCam * 0.12) * 0.8, 0, -1.6 + Math.cos(this.titleCam * 0.1) * 0.5);
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
      // the tutorial duel runs its own camera (close on the two of them, the gate at the end)
      const tc = this.tutorial && this.tutorial.camera && (this.state === 'play' || this.state === 'screen') ? this.tutorial.camera() : null; if (tc) { target = tc.target; zt = tc.zoom; }
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
    else if (this.state === 'credits' && this.back === 'ending') P.fade = Math.max(P.fade, 0.85);
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
    this.ui.clear(); this.embersShown += ((this.run ? this.run.embers : 0) - this.embersShown) * Math.min(1, dt * 6);
    this.drawUI(dt);
    this.sound.update();
  }

  drawUI(dt) {
    const ui = this.ui, W = ui.w, H = ui.h, S = this.state;
    if (S === 'title') this.drawTitle();
    if (S === 'controls') this.drawControls();
    if (S === 'settings') this.drawSettings();
    if (S === 'credits' && this.back === 'ending') {
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
    else if (['play', 'pause', 'bossIntro', 'dead'].includes(S) && this.world && this.world.hero) {
      const hs = this.hs || (this.hs = {}); if (hs.world !== this.world) { hs.hpGhost = undefined; hs.bossGhost = undefined; }
      const run = this.run; const lv = this.save.heroes[this.save.hero];
      Object.assign(hs, { world: this.world, boss: this.boss && this.bossState === 'fight' ? this.boss : null, bossPhases: this.boss ? (BOSS_AI[this.boss.type] || BOSS_AI2[this.boss.type] || {}).phases : null, embersShown: this.embersShown, prompt: S === 'play' ? this.prompt : null, padMode: this.inputMode === 'pad', noToasts: S === 'pause', level: lv ? lv.level : 1, xpFrac: 0, points: 0, run, boons: run ? run.boons : [], act: run ? run.act : 0, duel: !!this.duelOn });
      ui.toastY = S === 'play' && this.tutorial && this.tutBottom ? this.tutBottom + 3 : 0;
      if (S !== 'bossIntro' && !(this.tutorial && this.tutorial.hideHud && this.tutorial.hideHud())) ui.hud(hs, dt);
      if (this.card && S === 'play') {
        this.card.t += dt * (this.world.combat ? 4 : 1); const c = this.card; const a = Math.min(1, c.t * 1.5, Math.max(0, (4.5 - c.t) * 1.2));
        const y0 = Math.round(H * 0.62);
        // on touch the card keeps clear of the buttons (right) and, by symmetry, of the stick (left)
        let maxW = Math.min(W - 16, 260); if (!this.input.touchMode) maxW = Math.min(maxW, Math.max(140, 2 * (W - 90 - W / 2))); // clear of the ability badges
        if (this.input.touchMode) { const btns = (this.input.layout || []).filter((b) => !b.hidden && b.id !== 'pause' && b.id !== 'use'); const lim = btns.length ? Math.min(...btns.map((b) => b.x - b.r)) : W - 100; maxW = Math.min(maxW, Math.max(120, 2 * (lim - W / 2) - 6)); }
        if (a > 0) { ui.text(c.sup, W / 2, y0, { align: 'center', color: COL.red, alpha: a }); ui.text(c.title, W / 2, y0 + 11, { align: 'center', color: COL.white, scale: ui.measure(c.title, 2) > Math.min(W - 16, 260) + 8 ? 1 : 2, alpha: a }); if (c.line) ui.wrapEven(c.line, maxW).forEach((l, k) => ui.text(l, W / 2, y0 + 31 + k * 9, { align: 'center', color: COL.dim, alpha: a })); }
        if (c.t > 5) this.card = null;
      }
      if (S === 'play' && this.tutorial) this.tutorial.draw(ui, dt);
      if (S === 'play' && this.input.touchMode && !(this.tutorial && this.tutorial.hideTouch && this.tutorial.hideTouch())) ui.drawTouch({ world: this.world, prompt: this.prompt }, this.input);
      if (S === 'play' && !this.world.combat && !this.card && !this.tutorial) this.drawCompass();
    }
    if (S === 'bossIntro' && this.boss) {
      // the name sits inside the bottom bar so it never covers the fight
      const k = Math.min(1, this.stateT * 2) * (this.entranceOf(this.boss) || this.stateT <= 4.0 ? 1 : Math.max(0, 1 - (this.stateT - 4.0) * 2.5));
      const bh = Math.round(H * 0.2 * k); if (bh > 0) { ui.rect(0, 0, W, bh, '#000'); ui.rect(0, H - bh, W, bh, '#000'); }
      const ik = this.introK();
      if (ik > 0) { const a = ik * k; const nm = this.boss.def.name.toUpperCase(); ui.text(nm, W / 2, H - 32, { align: 'center', scale: ui.measure(nm, 2) > W - 12 ? 1 : 2, color: COL.white, alpha: a }); ui.text((this.boss.def.title || '').toUpperCase(), W / 2, H - 13, { align: 'center', color: COL.red, alpha: a }); }
      // its line, in the top bar, in its own colour
      const BL = bossLines(this.boss.type); const la = Math.max(0, ik - 0.35) / 0.65 * k;
      if (BL && BL.intro && la > 0) { const sp = speaker(this.boss.type); const tw = Math.min(W - 24, 252); const ls = ui.wrap('"' + BL.intro + '"', tw).slice(0, 2); ls.forEach((l, i) => ui.text(l, W / 2, Math.max(3, Math.round(bh / 2) - ls.length * 5) + i * 10, { align: 'center', color: sp.color || COL.text, alpha: la, shadow: false })); }
      if (this.entranceOf(this.boss) && !this.entDoneT && this.stateT > 0.3) ui.text('TAP TO SKIP', W - Math.round(ui.safe.r) - 6, H - bh + 3, { align: 'right', color: '#6a6252', shadow: false });
    }
    if (S === 'cutscene' && this.cut) this.cut.draw(ui);
    if (S === 'screen' && this.screen) { try { this.screen.draw(ui, dt); } catch (err) { console.error('bellmourn: screen draw', err); } }
    // a boss's last words as it falls
    if (this.bark && S === 'play') { const B = this.bark; B.t += dt; const a = Math.min(1, B.t * 3, Math.max(0, (B.life - B.t) * 2)); if (a > 0) drawLineBox(ui, B.name, B.color, B.text, a, this.input.touchMode ? 'top' : 'bottom'); if (B.t > B.life) this.bark = null; }
    if (S === 'pause') this.drawPause();
    if (S === 'dead') {
      // PROPOSAL: the run ends
      const a = Math.min(1, this.stateT * 0.8); ui.text('YOU FELL', W / 2, Math.round(H * 0.36), { align: 'center', scale: 3, color: '#b01c22', alpha: a }); ui.text(this.duelOn ? 'RISE, WARDEN' : 'THE RUN ENDS HERE', W / 2, Math.round(H * 0.36) + 28, { align: 'center', color: COL.dim, alpha: Math.max(0, a - 0.3) });
      if (this.stateT > 1.6) ui.text(this.inputMode === 'touch' ? 'TAP TO GO ON' : 'ENTER TO GO ON', W / 2, Math.round(H * 0.36) + 46, { align: 'center', color: '#7a7262', alpha: Math.min(1, (this.stateT - 1.6) * 2) * (0.7 + 0.3 * Math.sin(this.t * 4)) });
    }
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
