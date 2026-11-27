// The wardens' traits (run.js TALENTS, sim_traits.js): five per warden, each one fires in a fight, nothing breaks.
// node bellmourn/test/traits-test.mjs
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { HERO_ORDER } from '../js/game/heroes.js';
import { TALENTS, talentsOf, matchXp, freshMeta, newRun, talentSlots } from '../js/game/run.js';

let fail = 0; const check = (ok, m) => { if (!ok) { fail++; console.log('  FAIL', m); } };
const FLAT = { bounds: [-14, -14, 14, 14], solids: [] };

// the catalogue: five each, unlocked along the mastery road, in the 5x7 font
for (const h of HERO_ORDER) {
  const T = talentsOf(h); check(T.length === 5, `${h}: five traits`);
  check(T.every((t, i) => !i || t.level > T[i - 1].level), `${h}: traits unlock in order`);
  for (const t of T) check(t.trait && t.name && t.desc && /^[A-Z0-9 ,.'!?:%+\-]+$/.test(t.name + t.desc), `${h}/${t.id}: name and desc in capitals`);
  check(new Set(T.map((t) => t.id)).size === 5, `${h}: ids unique`);
}
const all = Object.values(TALENTS).flat(); check(new Set(all.map((t) => t.id)).size === all.length, 'trait ids unique across wardens');

// a fight with all five: every trait fires (the ones that need a lethal blow are checked on their own)
const IDLE = { mx: 0, mz: 0 };
const NEED = { laststand: 'lethal' };
for (const hero of HERO_ORDER) {
  const ids = talentsOf(hero).map((t) => t.id); const fired = {};
  for (const seed of [3, 5, 9]) {
    const w = new World({ ...FLAT, seed }); const h = w.spawnHero(0, 5, { heroId: hero, traits: ids });
    const spawn = () => [['ghoul', -3, -3], ['hushed', 3, -3], ['warden', 0, -6], ['acolyte', -6, -8], ['hushed', 5, -6], ['ghoul', 0, -2], ['ghoul', 2, 1]].forEach(([t, x, z]) => w.spawnFoe(t, x + (w.rand() - 0.5), z, { tier: 3, aggro: true, rise: false }));
    spawn(); const bot = makeBot(3, seed * 7 + 1); let t = 0, gone = 0, err = null;
    try {
      while (t < 45) {
        h.hp = Math.round(h.maxHp * 0.5); // hurt, never down: healing traits have something to mend if (t % 5 < 1 / 60) w.meter = 100;
        w.update(1 / 60, bot(w, 1 / 60)); w.drain(); if (w.fxq) w.fxq.length = 0; t += 1 / 60;
        if (!w.foes().length && (gone += 1 / 60) > 0.5) { gone = 0; spawn(); }
        for (const e of w.ents) if (!Number.isFinite(e.x) || !Number.isFinite(e.hp)) { err = 'NaN on ' + e.type; break; } if (err) break;
      }
    } catch (e) { err = e.stack.split('\n').slice(0, 3).join(' / '); }
    check(!err, `${hero} seed ${seed}: ${err}`);
    for (const [k, n] of Object.entries(w.stats.trait || {})) fired[k] = (fired[k] || 0) + n;
  }
  // the lethal one: the warden at 1 health, a foe's blow
  if (ids.includes('laststand')) {
    const w = new World({ ...FLAT, seed: 4 }); const h = w.spawnHero(0, 0, { heroId: hero, traits: ids }); const f = w.spawnFoe('ghoul', 0, -1.2, { tier: 3, aggro: true, rise: false });
    h.hp = 1; w._damage(f, h, 50, { melee: true, src: f }); check(!h.dead && h.hp >= 1 && (w.stats.trait || {}).laststand === 1, `${hero}: the Refused Oath keeps the warden standing once`);
    h.iframes = 0; w._damage(f, h, 50, { melee: true, src: f }); check(h.hp <= 0 || h.dead, `${hero}: but only once an area`); fired.laststand = 1;
  }
  // the perfect dodge, on cue, with foes close
  { const w = new World({ ...FLAT, seed: 6 }); const h = w.spawnHero(0, 0, { heroId: hero, traits: ids }); const f = w.spawnFoe('ghoul', 0, -2, { tier: 3, rise: false }); w.spawnFoe('hushed', 1.5, -1, { tier: 3, rise: false });
    w.update(1 / 60, IDLE); w._trPerfect(h, f); for (const [k, n] of Object.entries(w.stats.trait || {})) fired[k] = (fired[k] || 0) + n; }
  const miss = ids.filter((id) => !fired[id] && !NEED[id]);
  check(!miss.length, `${hero}: traits that never fired: ${miss.join(', ')}`);
  console.log(`${hero.padEnd(12)} ` + ids.map((id) => `${id} ${fired[id] || 0}`).join('  '));
}

// mastery from a match: given at once, a trait learned goes into a free slot
{
  const meta = freshMeta(); const run = newRun(meta, 'warden', 1); let r = null; let n = 0;
  while ((meta.mastery.warden?.level || 0) < 2 && n < 40) { r = matchXp(meta, run, { kills: 10, perfects: 1 }); n++; if (r.learned.length) break; }
  check(r && r.learned.length === 1 && r.learned[0].id === 'riposte' && run.talents.includes('riposte'), 'the first trait is learned and put in the free slot mid-run');
  check(run.xpGiven > 0 && n <= 6, `the first trait comes in a few matches (${n})`);
  check(talentSlots(0) === 1 && talentSlots(2) === 2 && talentSlots(6) === 3, 'slots: one, two at mastery 2, three at 6');
}

console.log(fail ? `${fail} trait checks failed` : 'all trait checks hold');
process.exit(fail ? 1 : 0);
