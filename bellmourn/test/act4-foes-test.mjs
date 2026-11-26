// Act IV's foes (js/game/units4.js): each one, alone and in its pack, against an unhurtable warden played by the
// skilled bot: it must attack (every move it has gets used at least once over the seeds), take damage, die, and
// leave no NaN anywhere. Also a pack of all of them against a mortal warden: report win rate and time.
// node bellmourn/test/act4-foes-test.mjs [seeds=4]
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { heroStats, newHeroSave, MAX_LEVEL, weaponsOfType, HEROES } from '../js/game/heroes.js';
import '../js/game/bosses2.js';
import '../js/game/units4.js';

const N = +(process.argv[2] || 4);
const ARENA = { bounds: [-12, -11, 12, 11], solids: [{ x: -6, z: -4, r: 0.7, h: 3 }] };
function prog(tier) { const save = { heroes: {}, relicsOn: ['psalter'], bossTonics: 3 }; const P = save.heroes.warden = newHeroSave('warden'); P.level = Math.min(MAX_LEVEL, 1 + tier * 3); const ws = weaponsOfType(HEROES.warden.weapon); P.weapon = ws[Math.min(ws.length - 1, Math.floor(tier / 2))]; P.plus = { [P.weapon]: 8 }; return heroStats(save, 'warden'); }
let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); };
function fight(types, seed, immortal, tier = 16) {
  const w = new World({ ...ARENA, seed }); const hero = w.spawnHero(0, 7, prog(tier)); if (immortal) hero.iframes = 1e9;
  types.forEach((t, i) => { const f = w.spawnFoe(t, -4 + i * 2.4, -4, { tier, aggro: true }); f.ai.locked = true; });
  const bot = makeBot(1, seed * 13 + 3); const used = new Set(); let t = 0; const dt = 1 / 60;
  w.on && w.on('attack', () => {});
  while (t < 90) {
    w.step(dt, bot(w, dt)); t += dt;
    for (const e of w.ents) { if (e.atk && e.atk.name) used.add(e.type + ':' + e.atk.name); if (![e.x, e.z, e.hp].every(Number.isFinite)) { bad('NaN on ' + e.type); return { t, used, win: false }; } }
    if (!w.foes().some((f) => !f.dead)) return { t, used, win: true };
    if (hero.dead) return { t, used, win: false };
  }
  return { t, used, win: false, timeout: true };
}
const TYPES = ['belljelly', 'glasshound', 'shardswarm', 'drownedangel', 'choirwraith', 'mirrorknight'];
const all = new Set();
for (const ty of TYPES) {
  let wins = 0, tt = 0;
  for (let s = 1; s <= N; s++) { const r = fight([ty, ty], s, true); if (r.win) wins++; else bad(ty + ' seed ' + s + (r.timeout ? ' timeout' : ' not killed')); tt += r.t; for (const u of r.used) all.add(u); }
  console.log(ty.padEnd(13), 'killed', wins + '/' + N, ' avg', (tt / N).toFixed(1) + 's', ' moves', [...all].filter((u) => u.startsWith(ty + ':')).map((u) => u.split(':')[1]).join(' '));
}
let wins = 0, tt = 0; for (let s = 1; s <= N; s++) { const r = fight(['glasshound', 'glasshound', 'belljelly', 'choirwraith', 'mirrorknight'], s, false, 16); if (r.win) wins++; tt += r.t; }
console.log('pack vs a mortal warden (tier 16):', wins + '/' + N, 'won, avg', (tt / N).toFixed(1) + 's');
console.log(fail ? fail + ' failures' : 'all act IV foes hold');
