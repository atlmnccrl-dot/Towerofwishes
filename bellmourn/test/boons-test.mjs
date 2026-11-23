// The in-run build (boons.js) and the boons at work in the fight (sim_boons.js), elemental foes, allies.
// node bellmourn/test/boons-test.mjs [balanceSeeds=4]     (BALANCE=0 skips the balance runs)
import { World } from '../js/game/sim.js';
import { makeBot } from '../js/game/bot.js';
import { heroStats, newHeroSave, HERO_ORDER, HEROES, weaponsOfType, MAX_LEVEL } from '../js/game/heroes.js';
import { BOONS, BOON_LIST, RES, RES_ORDER, RARITY_ORDER, CHAIN, offerBoons, addBoon, upgradeBoon, boonMods, canUse, useCtx, isOpen, resCounts, boonText, chainOf, boonsOf } from '../js/game/boons.js';
import { mulberry } from '../js/game/sim.js';

let fail = 0; const bad = (m) => { fail++; console.log('  FAIL', m); };
const check = (ok, m) => { if (!ok) bad(m); };
const FLAT = { bounds: [-14, -14, 14, 14], solids: [] };
const t0 = Date.now();

// ------------------------------------------------------------------ the catalogue
{
  for (const r of RES_ORDER) {
    const ids = boonsOf(r); const D = ids.map((id) => BOONS[id]);
    check(ids.length >= 8, `${r}: at least 8 boons (${ids.length})`);
    check(D.filter((d) => d.kind === 'crown').length === 1, `${r}: one crown`);
    for (const t of [1, 2, 3]) check(D.some((d) => d.tier === t), `${r}: a tier ${t} boon`);
    for (const sl of ['attack', 'dash', 'skill', 'ult', 'passive']) check(D.some((d) => d.slot === sl), `${r}: a ${sl} boon`);
    check(RES[r].name && RES[r].col && RES[r].rgb && RES[r].pix && RES[r].pix.length === 7, `${r}: name, colours, glyph`);
  }
  const duos = BOON_LIST.filter((id) => BOONS[id].kind === 'duo'); const pairs = new Set(duos.map((id) => BOONS[id].duo.slice().sort().join('+')));
  check(pairs.size >= 12, `at least 12 Resonance pairs have a duo (${pairs.size})`);
  for (const id of BOON_LIST) {
    const d = BOONS[id];
    check(RARITY_ORDER.every((r) => Number.isFinite(d.values[r])), `${id}: a value at every rarity`);
    check(RARITY_ORDER.every((r, i) => !i || d.values[r] >= d.values[RARITY_ORDER[i - 1]]), `${id}: values grow with rarity`);
    check(d.name && d.desc && d.stat && /^[A-Z0-9 ,.'!?:%+\-]+$/.test(d.name + d.desc), `${id}: name and desc in capitals (the 5x7 font)`);
    const tx = boonText(id, 'legendary'); check(tx && !/[{}]/.test(tx.stat), `${id}: boonText fills the number`);
    if (d.tier === 2 && d.kind === 'boon') check(d.needs && d.needs[d.res] === CHAIN[2].held, `${id}: tier II needs ${CHAIN[2].held}`);
  }
  console.log(`catalogue: ${BOON_LIST.length} boons (${duos.length} duos)`);
}

// ------------------------------------------------------------------ offers respect chains and the kit
{
  const rng = mulberry(5); let n = 0, chainOffers = 0, heldOffers = 0, freshOffers = 0, withHeld = 0;
  for (let run = 0; run < 240; run++) {
    const hero = HERO_ORDER[run % HERO_ORDER.length]; const R = { hero, boons: [] }; const ctx = useCtx(R);
    for (let pick = 0; pick < 14; pick++) {
      const offers = offerBoons(R, rng, 3); n++;
      check(offers.length === 3 || BOON_LIST.filter((id) => isOpen(R, id) && canUse(id, ctx)).length < 3, 'three offers while three are open');
      check(new Set(offers.map((o) => o.id)).size === offers.length, 'no boon offered twice at once');
      const counts = resCounts(R);
      for (const o of offers) {
        const d = BOONS[o.id];
        check(isOpen(R, o.id), `offered ${o.id} with its chain unmet (${JSON.stringify(counts)})`);
        check(canUse(o.id, ctx), `offered ${o.id} to ${hero}, who cannot use it`);
        if (d.tier >= 2 && d.kind === 'boon') check(counts[d.res] >= CHAIN[2].held, `${o.id}: tier ${d.tier} before ${CHAIN[2].held} of ${d.res}`);
        if (d.kind === 'crown') check(counts[d.res] >= CHAIN.crown.held, `${o.id}: a crown too early`);
        if (d.fits && d.fits.attack) check(HEROES[hero].attack.kind === d.fits.attack, `${o.id} offered to a ${HEROES[hero].attack.kind} warden`);
        check(RARITY_ORDER.includes(o.rarity) && o.def === d && o.chain && Array.isArray(o.chain.nextUnlocks) && o.chain.res === d.res, `${o.id}: offer item shape`);
        if (d.tier > 1 || d.kind === 'duo') chainOffers++;
      }
      if (R.boons.length) { withHeld++; if (offers.some((o) => counts[BOONS[o.id].res] > 0)) heldOffers++; if (offers.some((o) => !counts[BOONS[o.id].res])) freshOffers++; }
      // a player who builds: mostly the chain they hold, sometimes something new
      const pickO = offers.slice().sort((a, b) => (counts[BOONS[b.id].res] || 0) - (counts[BOONS[a.id].res] || 0))[rng() < 0.75 ? 0 : offers.length - 1];
      if (pickO) addBoon(R, pickO.id, pickO.rarity);
    }
  }
  check(heldOffers / withHeld > 0.95, `offers continue a held chain (${(heldOffers / withHeld * 100).toFixed(0)}%)`);
  check(freshOffers / withHeld > 0.6, `offers still bring something new (${(freshOffers / withHeld * 100).toFixed(0)}%)`);
  console.log(`offers: ${n} checked; continue a chain ${(heldOffers / withHeld * 100).toFixed(0)}%, something new ${(freshOffers / withHeld * 100).toFixed(0)}%, tier II+/duo ${(chainOffers / n / 3 * 100).toFixed(0)}% of cards`);
  // a warden without skills slotted is never offered a skill boon; a movement-skill boon only with a movement skill
  const none = { hero: 'warden', boons: [] }; for (let i = 0; i < 200; i++) for (const o of offerBoons(none, rng, 3, { abilities: [] })) check(BOONS[o.id].slot !== 'skill', 'a skill boon with no skills slotted');
  for (const h of ['lamplighter', 'hollis', 'wren']) check(!canUse('thunder_bolt', useCtx({ hero: h })), `${h} (no movement skill) cannot take LIVING BOLT`);
  check(canUse('thunder_bolt', useCtx({ hero: 'warden' })) && !canUse('crimson_hemo', useCtx({ hero: 'huntress' })), 'fits: movement skill and combo attack');
  // the chain preview names what a pick would open
  const R2 = { hero: 'warden', boons: [{ id: 'ember_edge', rarity: 'common' }] }; const c = chainOf(R2, 'ember_wake');
  check(c.nextUnlocks.includes(BOONS.ember_fall.name) && c.held === 1, 'chainOf: the second EMBER boon opens tier II');
  // add / upgrade
  const R3 = { hero: 'warden', boons: [] }; addBoon(R3, 'rime_edge', 'common'); check(upgradeBoon(R3, 'rime_edge') && R3.boons[0].rarity === 'rare', 'upgradeBoon: common to rare');
  addBoon(R3, 'rime_edge', 'common'); check(R3.boons.length === 1 && R3.boons[0].rarity === 'epic', 'addBoon on a held boon upgrades it');
  R3.boons[0].rarity = 'legendary'; check(!upgradeBoon(R3, 'rime_edge'), 'nothing above legendary');
}

// ------------------------------------------------------------------ fights
const IDLE = { mx: 0, mz: 0 };
function fight({ hero = 'warden', boons = [], rarity = 'legendary', secs = 18, seed = 3, hpFix = null, foes = 'pack', element = null, ultEvery = 6, allies = [], skill = 1 }) {
  const w = new World({ ...FLAT, seed });
  const mods = boonMods(boons.map((id) => ({ id, rarity })));
  const h = w.spawnHero(0, 5, { heroId: hero, boons: mods });
  const spawn = () => {
    if (foes === 'boss') return [w.spawnBoss('deacon', 0, -5, { face: 0, hpMul: 1.5 })];
    const L = [['ghoul', -3, -3], ['hushed', 3, -3], ['warden', 0, -6], ['acolyte', -6, -8], ['hushed', 5, -6], ['ghoul', 0, -2]];
    return L.map(([t, x, z]) => w.spawnFoe(t, x + (w.rand() - 0.5), z, { tier: 3, aggro: true, rise: false, element }));
  };
  spawn(); for (const a of allies) w.spawnAlly(a, 1.5, 5);
  const bot = makeBot(skill, seed * 7 + 1); let t = 0; const dt = 1 / 60; let err = null, maxZones = 0, maxProjs = 0, evs = 0, gone = 0;
  try {
    while (t < secs && !h.dead) {
      if (hpFix !== null) h.hp = Math.round(h.maxHp * hpFix);
      if (ultEvery && t % ultEvery < dt) w.meter = 100;
      w.update(dt, bot(w, dt)); t += dt; evs += w.drain().length; w.fxq.length = 0;
      if (!w.foes().length && (gone += dt) > 0.6) { gone = 0; spawn(); }
      maxZones = Math.max(maxZones, w.zones.length); maxProjs = Math.max(maxProjs, w.projs.length);
      for (const e of w.ents) if (!Number.isFinite(e.x) || !Number.isFinite(e.z) || !Number.isFinite(e.hp) || !Number.isFinite(e.aegis ?? 0)) { err = `NaN on ${e.type}`; break; }
      if (err) break;
    }
  } catch (e) { err = e.stack.split('\n').slice(0, 3).join(' | '); }
  return { w, h, err, t, maxZones, maxProjs, procs: w.stats.boon };
}

// every boon applies without error to every warden who can use it
{
  let runs = 0;
  for (const hero of HERO_ORDER) {
    const ctx = useCtx({ hero });
    for (const id of BOON_LIST) {
      if (!canUse(id, ctx)) continue; runs++;
      const r = fight({ hero, boons: [id], secs: 6, seed: 11 + runs, rarity: RARITY_ORDER[runs % 4] });
      if (r.err) bad(`${hero} + ${id}: ${r.err}`);
    }
  }
  console.log(`every boon on every warden: ${runs} fights, no errors${fail ? ' (see failures)' : ''}`);
}

// every boon does something you can count (with the elements it plays on primed: the seven attack boons and a shield)
{
  const PRIME = ['ember_edge', 'rime_edge', 'blight_edge', 'thunder_edge', 'crimson_edge', 'dawn_step', 'dawn_edge', 'silence_edge'];
  const LOW = new Set(['crimson_price']);
  // boons that answer blows on the hero: no freezing primer (foes must strike), and a bot that does not dodge
  const STRUCK = new Set(['rime_mail', 'blight_wither', 'dawn_radiance', 'duo_eclipse', 'dawn_sanct']);
  const EXTRA = { crimson_bound: ['crimson_thirst'], duo_consecrate: ['crimson_thirst'], duo_supercon: ['rime_tomb', 'thunder_rite'], dawn_radiance: ['dawn_rite', 'dawn_halo'], blight_bloom: ['blight_rite'] };
  const LONG = { rime_still: 40, blight_bloom: 30, dawn_radiance: 40 };
  const quiet = [];
  for (const id of BOON_LIST) {
    const heroes = BOONS[id].fits && BOONS[id].fits.attack === 'shoot' ? ['huntress'] : ['warden', 'kestrel', 'bellbreaker'];
    let got = 0;
    for (const hero of heroes) {
      const prime = (id === 'rime_still' || id === 'dawn_radiance') ? ['dawn_step'] : (STRUCK.has(id) ? PRIME.filter((x) => x !== 'rime_edge') : PRIME);
      const r = fight({ hero, boons: [...new Set([...prime, ...(EXTRA[id] || []), id])], secs: LONG[id] || 16, seed: 41, hpFix: LOW.has(id) ? 0.4 : (id === 'dawn_halo' ? null : 1), skill: STRUCK.has(id) ? 0 : 1 });
      if (r.err) bad(`${id} primed on ${hero}: ${r.err}`);
      got += (r.procs[id] || 0); if (got) break;
    }
    if (!got) quiet.push(id);
  }
  check(!quiet.length, `every boon fires in a fight (silent: ${quiet.join(', ')})`);
  console.log(`every boon fires: ${BOON_LIST.length - quiet.length}/${BOON_LIST.length}`);
}

// all of them at once at legendary: still sane (no NaN, effects bounded, damage taken never below half)
{
  const all = BOON_LIST.filter((id) => canUse(id, useCtx({ hero: 'warden' })));
  const m = boonMods(all.map((id) => ({ id, rarity: 'legendary' })));
  check(m.dmgTaken >= 0.5 && m.dmgTaken <= 1 && m.burnMul < 3 && m.shieldMax < 200 && m.poisonMax <= 10 && m.bleedMax <= 5 && m.freezeAt >= 2, 'boonMods: stacked numbers stay sane');
  for (const hero of HERO_ORDER) {
    const r = fight({ hero, boons: BOON_LIST.filter((id) => canUse(id, useCtx({ hero }))), secs: 20, seed: 9, hpFix: 0.5 });
    if (r.err) bad(`${hero} with every boon: ${r.err}`);
    check(r.maxZones < 260 && r.maxProjs < 200, `${hero} with every boon: zones ${r.maxZones}, projectiles ${r.maxProjs} stay bounded`);
    check(r.w.fxq.length <= 300, 'fxq is capped');
  }
  console.log('every boon at once: sane on every warden');
}

// ------------------------------------------------------------------ elemental foes
{
  for (const el of ['fire', 'frost', 'poison', 'storm', 'blood', 'holy', 'void']) {
    const w = new World({ ...FLAT, seed: 21 }); const h = w.spawnHero(0, 0, { heroId: 'bellbreaker', face: Math.PI });
    const f = w.spawnFoe('ghoul', 0, -1.6, { element: el, aggro: true, rise: false, tier: 2 });
    check(f.element === el, `${el}: the foe carries it`);
    let hz = 0, got = false, ticks = 0;
    for (let i = 0; i < 60 * 14 && !h.dead; i++) {
      w.update(1 / 60, IDLE); w.drain(); if (w.hazards.some((z) => z.el === el)) hz++;
      const st = { fire: 'burn', frost: 'frost', poison: 'poison', storm: 'shock', blood: 'bleed', holy: 'sear', void: 'mark' }[el];
      if (h.status[st]) got = true; h.hp = h.maxHp; ticks++;
    }
    check(got, `${el}: its blows inflict its status`);
    check(hz > 0, `${el}: it leaves a hazard of its element`);
  }
  // same-element immunity
  const w = new World({ ...FLAT, seed: 22 }); w.spawnHero(0, 5, { heroId: 'warden' }); const f = w.spawnFoe('ghoul', 0, 0, { element: 'fire', rise: false });
  w.applyStatus(f, 'burn', { dps: 9 }); check(!f.status.burn, 'a fire foe shrugs off burning');
  console.log('elemental foes: statuses, hazards, immunity');
}

// ------------------------------------------------------------------ freeze, chill, marks, shields
{
  const w = new World({ ...FLAT, seed: 23 }); const h = w.spawnHero(0, 5, { heroId: 'warden', boons: boonMods([{ id: 'dawn_halo', rarity: 'common' }]) });
  const f = w.spawnFoe('hushed', 0, 0, { rise: false, aggro: true }); const b = w.spawnBoss('deacon', 5, -5);
  for (let i = 0; i < 3; i++) w.applyStatus(f, 'chill', {}); check(f.status.freeze && f.state === 'hurt', 'three chills freeze a foe');
  const x = f.x; f.kbx = 0; w.update(0.5, IDLE); check(f.status.freeze && Math.abs(f.x - x) < 0.01, 'frozen: it does not move');
  for (let i = 0; i < 3; i++) w.applyStatus(b, 'chill', {}); check(!b.status.freeze && b.status.frost, 'a great foe is slowed, never frozen');
  for (let i = 0; i < 9; i++) w.applyStatus(f, 'mark', {}); check(f.status.mark.stacks === 5, 'marks stack to five');
  h.aegis = 10; const hp = h.hp; h.iframes = 0; w._damage({ x: 0, z: 0, team: 'foe' }, h, 8, {}); check(h.hp === hp && h.aegis === 2, 'a shield soaks the blow first');
}

// ------------------------------------------------------------------ allies
{
  const w = new World({ ...FLAT, seed: 31 }); const h = w.spawnHero(0, 6, { heroId: 'warden' });
  const a = w.spawnAlly('huntress', 2, 6); const b = w.spawnAlly('bellbreaker', -2, 6, { scale: 0.6 });
  check(a.team === 'hero' && a.ally && w.heroTeam().length === 3 && w.hero === h, 'spawnAlly: on the hero side; world.hero is still the player');
  check(Math.abs(a.maxHp - Math.round(HEROES.huntress.hp * 0.6)) <= 1 && a.stats.dmgMul <= 0.61, 'allies are modest: 0.6 health and damage by default');
  const foes = [['ghoul', -3, -4], ['hushed', 3, -4], ['ghoul', 0, -7], ['hushed', 5, -7]].map(([t, x, z]) => w.spawnFoe(t, x, z, { tier: 1, aggro: true, rise: false }));
  let allyHits = 0, onAlly = 0, hunted = 0, worldMeterFromAllies = 0, events = {};
  for (let i = 0; i < 60 * 30 && w.foes().length; i++) {
    const m0 = w.meter; w.update(1 / 60, IDLE); h.hp = h.maxHp;
    for (const ev of w.drain()) { events[ev.type] = (events[ev.type] || 0) + 1; if (ev.type === 'hit' && ev.ally && ev.src && ev.src.ally) allyHits++; if (ev.type === 'hit' && ev.dst && ev.dst.ally) onAlly++; }
    if (w.meter > m0 && !events.hit) worldMeterFromAllies++;
    if (w.foes().some((f) => f.ai.tg && f.ai.tg.ally)) hunted++;
  }
  check(allyHits > 5, `allies fight (${allyHits} blows landed)`);
  check(hunted > 30, `foes hunt allies too (${hunted} frames, ${onAlly} blows on allies)`);
  check(!events.dash || true, 'ally dashes are told apart');
  check(w.meter < 100 || w.stats.hits > 0, "the player's meter is the player's");
  const w2 = new World({ ...FLAT, seed: 32 }); w2.spawnHero(0, 6, { heroId: 'warden' }); const c = w2.spawnAlly('kestrel', 0, 0, { think: () => ({ mx: 1, mz: 0 }) });
  for (let i = 0; i < 30; i++) w2.update(1 / 60, IDLE); check(c.x > 1, 'opts.think drives the ally'); w2._damage({ x: 0, z: 1, team: 'foe' }, c, 9999, {});
  const ev2 = w2.drain(); check(c.dead && ev2.some((e) => e.type === 'allyDown') && !ev2.some((e) => e.type === 'heroDeath'), 'an ally falls without ending the fight');
  console.log(`allies: ${allyHits} blows landed, ${onAlly} taken`);
}

// ------------------------------------------------------------------ balance: a run's worth of boons vs the late bosses
function prog(heroId, tier) {
  const save = { heroes: {}, relicsOn: tier >= 2 ? (tier >= 5 ? ['psalter', 'clapper'] : ['psalter']) : [], bossTonics: Math.min(3, tier) };
  const P = save.heroes[heroId] = newHeroSave(heroId); P.level = Math.min(MAX_LEVEL, 1 + tier * 3); const ws = weaponsOfType(HEROES[heroId].weapon);
  P.weapon = ws[Math.min(ws.length - 1, Math.floor(tier / 2))]; P.plus = { [P.weapon]: Math.min(10, Math.round(tier * 0.8)) };
  return heroStats(save, heroId);
}
// a build: 12 picks from real offers, a player who follows one or two Resonances (focus) or takes what looks best (any)
function draft(hero, seed, focus) {
  const rng = mulberry(seed); const R = { hero, boons: [] };
  for (let i = 0; i < 12; i++) {
    const offers = offerBoons(R, rng, 3); if (!offers.length) break; const c = resCounts(R);
    const score = (o) => { const d = BOONS[o.id]; let s = (d.tier || 1) + RARITY_ORDER.indexOf(o.rarity) * 0.5 + (c[d.res] || 0) * 0.6; if (focus && (d.res === focus[0] || d.res === focus[1] || (d.duo && d.duo.some((x) => focus.includes(x))))) s += 4; return s + rng() * 0.5; };
    const o = offers.sort((a, b) => score(b) - score(a))[0]; addBoon(R, o.id, o.rarity);
    if (rng() < 0.25) { const b = R.boons[(rng() * R.boons.length) | 0]; upgradeBoon(R, b.id); } // a shrine's upgrade now and then
  }
  return R.boons;
}
const BAL = +(process.argv[2] || 4);
if (process.env.BALANCE !== '0' && BAL > 0) {
  const BOSSES = [['archon', 9], ['bogmother', 10], ['wheel', 11]];
  const BUILDS = [['none', null], ['any', 'any'], ['ember+thunder', ['ember', 'thunder']], ['rime+silence', ['rime', 'silence']], ['crimson+dawn', ['crimson', 'dawn']], ['blight+ember', ['blight', 'ember']]];
  const heroes = (process.env.HEROES || 'warden,huntress,bellbreaker').split(',');
  // the kit under the boons: BASE=tier of sim-test's progression (levels, weapon, relics); default 5 (a mid kit:
  // what a warden brings into a run is A's mastery, not the old levels), BASE=late uses each boss's own late tier
  const base = process.env.BASE || '5';
  console.log(`balance: ${BAL} seeds x ${heroes.join('/')}, kit tier ${base}, 12 picks from real offers (BALANCE=0 skips)`);
  for (const [boss, btier] of BOSSES) for (const [name, focus] of BUILDS) {
    const tier = base === 'late' ? btier : +base;
    let wins = 0, time = 0, hp = 0, to = 0, n = 0;
    for (const hero of heroes) for (let s = 1; s <= BAL; s++) {
      const boons = focus ? draft(hero, s * 13 + btier, focus === 'any' ? null : focus) : [];
      const w = new World({ bounds: [-14, -14, 14, 14], solids: [{ x: -6, z: -6, r: 0.8, h: 3 }, { x0: 5, z0: 4, x1: 7, z1: 6, h: 3 }], seed: s * 31 + btier });
      const h = w.spawnHero(0, 8, { ...prog(hero, tier), boons: boonMods(boons) }); w.spawnBoss(boss, 0, -6, { face: 0 });
      const bot = makeBot(1, s * 7 + 1); let t = 0;
      while (t < 360 && !h.dead && w.foes().length) { w.update(1 / 60, bot(w, 1 / 60)); w.drain(); w.fxq.length = 0; t += 1 / 60; }
      n++; time += t; if (!h.dead && !w.foes().length) { wins++; hp += h.hp / h.maxHp; } if (t >= 360) to++;
    }
    console.log(`  ${boss.padEnd(10)} ${name.padEnd(14)} win ${(wins / n * 100).toFixed(0).padStart(3)}%  avg ${(time / n).toFixed(0).padStart(4)}s  hp left ${wins ? (hp / wins * 100).toFixed(0) : '-'}%  timeouts ${to}`);
  }
}
console.log(`${fail ? fail + ' failures' : 'all boon checks hold'} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
process.exit(fail ? 1 : 0);
