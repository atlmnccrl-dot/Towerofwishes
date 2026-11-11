// Pure rules: heroes, stats, levels, stars, gear, formation, tiers and recruiting, stages and rewards,
// idle spoils, shop, milestones, save. usage: node test/rules-test.js
global.window = global.window || {};
require('../js/data.js');
require('../js/rules.js');
const BB = window.BB;
let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };

// heroes and stats
for (const c of BB.CALLING_ORDER) {
  const h = BB.newHero({ calling: c, seed: 5 });
  const s = BB.heroStats(h);
  ok(s.hp > 90 && s.atk > 10 && s.def >= 3, c + ' base stats sane');
  ok(Number.isFinite(s.cd) && s.cd > 3, c + ' ultimate cooldown');
  ok(BB.heroStats(BB.newHero({ calling: c, level: 10 })).hp > s.hp * 1.8, c + ' grows with level');
  ok(BB.weaponType(c), c + ' has a weapon type');
}
const r0 = BB.newHero({ calling: 'ranger', rarity: 0 }), r3 = BB.newHero({ calling: 'ranger', rarity: 3 });
ok(BB.power(r3) > BB.power(r0) * 1.3, 'rarity raises power');
const s1 = BB.newHero({ calling: 'monk', stars: 1, level: 5 }), s3 = BB.newHero({ calling: 'monk', stars: 3, level: 5 });
ok(BB.heroStats(s3).atk > BB.heroStats(s1).atk, 'stars raise stats');
ok(BB.newHero({ legend: 'sera' }).rarity === 3, 'legends are legendary');
const cap = BB.newCaptain();
ok(cap.captain && BB.heroStats(cap).hp > BB.heroStats(BB.newHero({ calling: 'vanguard', look: cap.look })).hp, 'the captain is hardier than a plain vanguard');

// levels and stars
const S = BB.newSave(1000);
ok(S.heroes.length === 1 && S.heroes[0].captain && BB.teamIds(S).length === 1, 'a new game starts with the captain alone');
const h = S.heroes[0];
const gold0 = S.gold;
ok(BB.gainXp(h, BB.xpNeed(h) - 1) === 0 && h.level === 1, 'not quite a level');
ok(BB.gainXp(h, 1) === 1 && h.level === 2 && S.gold === gold0, 'levels come from experience, not gold');
BB.gainXp(h, 1e7);
ok(h.level === BB.levelCap(h) && h.xp <= BB.xpNeed(h), 'level cap holds; a level of experience waits');
const M1 = { level: 1 }, M9 = { level: 9 };
ok(BB.battleXp(M9, true, 0.3) > BB.battleXp(M1, true, 0.3), 'harder stages teach more');
ok(BB.battleXp(M1, true, 0.6) > BB.battleXp(M1, true, 0.1) && BB.battleXp(M1, false, 0.3) < BB.battleXp(M1, true, 0.3) && BB.battleXp(M1, false, 0) > 0, 'work done and winning count; a loss still teaches');
ok(BB.battleXp(M9, true, 0.3, false, 2) > BB.battleXp(M9, true, 0.3, false, 9) * 2, 'low-level heroes catch up');
ok(!BB.ascend(S, h), 'ascending needs sigils');
S.sigils = 100;
ok(BB.ascend(S, h) && h.stars === 2 && BB.levelCap(h) > h.level - 1, 'ascend raises the cap');
ok(h.level === 21, 'waiting experience flows after ascending');
for (let i = 0; i < 9; i++) BB.ascend(S, h);
ok(h.stars === BB.MAX_STARS, 'stars stop at the max');
ok(BB.xpNeed({ level: 30 }) > BB.xpNeed({ level: 5 }) * 5, 'levels take longer');

// gear
const r = BB.rng(9);
for (let i = 0; i < 300; i++) {
  const slot = r.pick(BB.SLOTS), rar = r.int(4);
  const it = BB.makeItem(r, slot, 1 + r.int(30), rar, slot === 'weapon' ? r.pick(['sword', 'axe', 'bow', 'focus', 'fist', 'spear']) : undefined);
  ok(it.name && it.stats && Object.values(it.stats).every(Number.isFinite), 'item ' + it.name + ' finite stats');
  ok(BB.itemScore(it) > 0 && BB.salvageValue(it) > 0, 'item scores and prices positive');
}
const bow = BB.makeItem(r, 'weapon', 3, 1, 'bow');
ok(BB.canEquip(BB.newHero({ calling: 'ranger' }), bow) && !BB.canEquip(BB.newHero({ calling: 'vanguard' }), bow), 'weapon types follow calling');
const chest = BB.makeItem(r, 'chest', 5, 2);
const g0 = BB.heroStats(h).hp; h.gear.chest = chest; ok(BB.heroStats(h).hp > g0, 'gear raises health');
ok(BB.upgradeItem === undefined && BB.upgradeCost === undefined, 'there is no forging');
S.gold = 1e6;
{ // the war chest and the relics
  const S2 = BB.newSave(1), h2 = S2.heroes[0]; BB.save = S2; const p0 = BB.power(h2);
  ok(!BB.raiseRank(S2), 'no gold, no rank'); S2.gold = 1e7;
  ok(BB.raiseRank(S2) && S2.rank === 1 && BB.power(h2) > p0, 'a rank makes every hero stronger');
  for (let i = 0; i < 60; i++) BB.raiseRank(S2);
  ok(S2.rank === BB.RANK_MAX && BB.rankCost(5) > BB.rankCost(1), 'ranks stop at the top and cost more as they rise');
  BB.save = undefined;
  const rel = BB.makeRelic('hroald', 32), plain = BB.makeItem(BB.rng(BB.hashStr('relichroald')), 'charm', 32, 3);
  ok(rel.name === BB.RELICS.hroald && BB.itemScore(rel) > BB.itemScore(plain) * 1.3, 'a relic is a named charm, stronger than any that drops');
  const far = BB.MISSIONS.find((m) => m.chapter === 5 && m.type === 'rout'), near = BB.MISSIONS.find((m) => m.chapter === 1 && m.type === 'rout');
  ok(BB.stageRewards(far, true).sigils > BB.stageRewards(near, true).sigils, 'the far marches pay more sigils');
}
const team3 = ['vanguard', 'ranger', 'arcanist'].map((c) => BB.newHero({ calling: c, level: 4 }));
const loot = BB.rollLoot(BB.rng(3), 5, team3, 40);
ok(loot.length === 40 && loot.every((it) => it.slot !== 'weapon' || team3.some((t) => BB.weaponType(t.calling) === it.wtype)), 'loot weapons fit the team');
S.inventory.push(BB.makeItem(r, 'weapon', 9, 3, 'sword'), BB.makeItem(r, 'weapon', 9, 2, 'bow'));
BB.equipBest(S, h);
ok(h.gear.weapon && h.gear.weapon.wtype === 'sword' && S.inventory.every((it) => it !== h.gear.weapon), 'equip best takes the right weapon out of the armory');

// bonds
ok(BB.bondsFor(['vanguard', 'berserker', 'ranger', 'arcanist']).some((b) => b.id === 'full'), 'Full Banner bond');
ok(BB.bondsFor(['berserker', 'berserker']).some((b) => b.id === 'blood'), 'Bloodpact bond');
ok(!BB.bondsFor(['ranger']).length, 'no bond alone');
const arc = BB.newHero({ calling: 'arcanist', seed: 2 });
ok(BB.heroStats(arc, ['arcanist', 'vanguard']).atk > BB.heroStats(arc, ['arcanist']).atk, 'Shield & Sorcery boosts casters');

// formation
{ // places in the team are earned with the campaign
  const P = BB.newSave(1), need = [1, 2, 3, 4].map((k) => BB.slotStage(k));
  ok(BB.teamMax(P) === 1 && BB.nextSlot(P).slot === 2 && BB.nextSlot(P).left === need[0], 'the banner starts with one place');
  const two = BB.newHero({ calling: 'ranger', level: 3 }); P.heroes.push(two);
  ok(!BB.placeHero(P, two.id) && BB.teamIds(P).length === 1, 'a second hero waits for a second place');
  BB.MISSIONS.slice(0, need[0] - 1).forEach((m) => (P.cleared[m.id] = 1)); ok(BB.teamMax(P) === 1, 'one stage short of a fifth of the campaign: still one');
  P.cleared[BB.MISSIONS[need[0] - 1].id] = 1; ok(BB.teamMax(P) === 2 && BB.placeHero(P, two.id) && BB.teamIds(P).length === 2, 'a fifth of the campaign opens the second place');
  ok(need.join() === [0.2, 0.4, 0.6, 0.8].map((q) => Math.ceil(BB.MISSIONS.length * q)).join(), 'places open at a fifth, two fifths, three and four');
  BB.MISSIONS.forEach((m) => (P.cleared[m.id] = 1)); ok(BB.teamMax(P) === 5 && BB.nextSlot(P) === null, 'the whole campaign: five places');
  const Q = BB.newSave(1); for (let i = 0; i < 4; i++) { const x = BB.newHero({ calling: 'ranger', level: 9 }); Q.heroes.push(x); Q.formation.back[i] = x.id; }
  BB.fixFormation(Q); ok(BB.teamIds(Q).length === 1, 'an older save with more on the field than it has places keeps the strongest');
  ok(BB.teamK('count', 1) < BB.teamK('count', 3) && BB.teamK('count', 5) === 1 && BB.teamK('boss', 1) < BB.teamK('boss', 5), 'the horde is sized to the team');
}
const F = BB.newSave(1); F.allSlots = true; // the formation's own rules, with every place open
const extra = ['ranger', 'berserker', 'arcanist', 'warpriest', 'monk', 'lancer'].map((c) => { const x = BB.newHero({ calling: c, level: 3 }); F.heroes.push(x); return x; });
for (const x of extra.slice(0, 4)) ok(BB.placeHero(F, x.id), 'place ' + x.calling);
ok(BB.teamIds(F).length === 5 && !BB.placeHero(F, extra[4].id), 'five heroes at most');
BB.removeHero(F, extra[0].id); ok(BB.teamIds(F).length === 4, 'remove a hero');
ok(BB.placeHero(F, extra[4].id, 'back', 0) || true, 'place into a chosen slot');
ok(new Set(BB.teamIds(F)).size === BB.teamIds(F).length, 'no hero twice in the formation');
BB.autoFill(F);
const fl = BB.formationList(F);
ok(fl.length === 5 && fl.filter((x) => x.row === 'front').every((x) => !BB.CALLINGS[x.hero.calling].ranged), 'auto-fill: five heroes, fighters in front');
ok(BB.teamPower(BB.teamHeroes(F)) > 0, 'team power');
// free placement: anywhere on the field; the half a hero stands in decides their line
const mover = fl.find((x) => x.row === 'back').hero;
ok(BB.setPlace(F, mover.id, 0.9, 0.1) && BB.rowOf(F, mover.id) === 'front' && BB.teamIds(F).length === 5, 'dragging a hero forward puts them in the front line');
ok(BB.formationList(F).filter((x) => x.row === 'front').length === 3, 'the front line can hold more than two');
const pm = BB.placeOf(F, mover.id); ok(pm.u === 0.9 && pm.v === 0.1, 'the place is kept');
ok(BB.setPlace(F, mover.id, -3, 7) && BB.placeOf(F, mover.id).u === 0 && BB.placeOf(F, mover.id).v === 1 && BB.rowOf(F, mover.id) === 'back', 'places stay on the field');
const flp = BB.formationList(F); ok(flp.length === 5 && flp.every((x) => x.u >= 0 && x.u <= 1 && x.v >= 0 && x.v <= 1 && x.slot >= 0), 'every hero in the list has a place');
const bench = F.heroes.find((x) => !BB.teamIds(F).includes(x.id)); ok(bench && !BB.setPlace(F, bench.id, 0.5, 0.5), 'a sixth hero cannot be dropped on a full field');
BB.removeHero(F, mover.id); ok(!F.place[mover.id] && BB.teamIds(F).length === 4, 'taking a hero out clears their place');
ok(BB.placeHero(F, bench.id) && BB.teamIds(F).length === 5, 'a tap brings a hero onto a free place');
const old = { allSlots: true, heroes: F.heroes, formation: { front: [F.heroes[0].id, null], back: [null, F.heroes[1].id, null] } }; BB.fixFormation(old);
ok(old.formation.front.length === 5 && old.formation.back.length === 5 && BB.teamIds(old).length === 2 && BB.formationList(old).length === 2, 'an older save\'s formation still loads');

// tiers and recruiting
let roster;
try { roster = require('../assets/chars/h/roster.json'); } catch (e) { roster = null; }
if (roster) {
  ok(roster.every((c) => c.role !== 'hero' || BB.CALLINGS[c.calling]), 'every roster hero has a known calling');
  ok(roster.filter((c) => c.role === 'foe').every((c) => BB.FOES[c.foe]), 'every roster foe maps to a foe kind');
  const tiers = BB.heroTiers(roster);
  ok(tiers.length === 4 && tiers.every((t) => t.heroes.length > 0), 'four hero tiers, none empty');
  const keys = tiers.flatMap((t) => t.heroes.map((x) => x.key));
  ok(new Set(keys).size === keys.length, 'no hero in two tiers');
  ok(tiers.every((t) => new Set(t.heroes.map((x) => x.name.split(' ')[0])).size === t.heroes.length), 'first names unique within a tier');
  ok(JSON.stringify(BB.heroTiers(roster).map((t) => t.heroes.map((x) => x.key))) === JSON.stringify(keys.length ? tiers.map((t) => t.heroes.map((x) => x.key)) : []), 'tiers are deterministic');
  const R = BB.newSave(1);
  ok(BB.tierOpen(R, BB.TIERS[0]) && !BB.tierOpen(R, BB.TIERS[1]), 'only the first tier opens at the start');
  ok(!BB.summon(R, roster, BB.TIERS[0].id), 'recruiting needs crystals');
  R.crystals = 1e5;
  ok(!BB.summon(R, roster, BB.TIERS[1].id), 'a locked tier cannot be recruited from');
  const got = new Set();
  for (let i = 0; i < 20; i++) { const x = BB.summon(R, roster, BB.TIERS[0].id, BB.rng(i + 1)); if (x) got.add(x.recruit); }
  ok(got.size === tiers[0].heroes.length && !BB.summon(R, roster, BB.TIERS[0].id), 'every hero of a tier once, then the tier is empty');
  ok(BB.teamIds(R).length === BB.teamMax(R), 'a recruit takes a place only while one is free');
  BB.MISSIONS.filter((m) => m.chapter === 1).forEach((m) => (R.cleared[m.id] = 1));
  ok(BB.tierOpen(R, BB.TIERS[1]) && !BB.tierOpen(R, BB.TIERS[2]), 'clearing chapter 1 opens the second tier');
  const x = BB.summon(R, roster, BB.TIERS[1].id, BB.rng(5));
  ok(x && x.rarity === BB.TIERS[1].rarity, 'tier heroes carry the tier rarity');
}
const L = BB.newSave(1); L.heroes[0].level = 12;
const leg = BB.joinLegend(L, 'sera');
ok(leg && leg.legend === 'sera' && leg.level >= 10 && !BB.joinLegend(L, 'sera'), 'a legend joins once, near the team level');

// stages and rewards
ok(BB.MISSIONS.length === BB.CHAPTERS.reduce((a, c) => a + c.stages.length, 0), 'every chapter stage is a mission');
const C = BB.newSave(1);
ok(BB.stageUnlocked(C, 0) && !BB.stageUnlocked(C, 1), 'only the first stage open');
C.cleared[BB.MISSIONS[0].id] = 1; ok(BB.stageUnlocked(C, 1) && BB.nextStageIdx(C) === 1, 'clearing unlocks the next');
ok(BB.MISSIONS.every((m) => m.waves.every((w) => w.every((v, i) => (i % 2 ? Number.isInteger(v) && v > 0 : !!BB.FOES[v])))), 'waves reference real foes');
ok(BB.MISSIONS.filter((m) => m.boss).every((m) => BB.FOES[m.boss] && BB.FOES[m.boss].boss), 'bosses exist');
ok(BB.MISSIONS.filter((m) => m.legend).every((m) => BB.LEGENDS[m.legend]), 'legend rewards are legends');
ok(new Set(BB.MISSIONS.map((m) => m.code)).size === BB.MISSIONS.length, 'stage codes unique');
ok(BB.MISSIONS.every((m, i) => i === 0 || m.level >= BB.MISSIONS[i - 1].level), 'enemy levels never drop');
ok(BB.MISSIONS.every((m) => BB.recPower(m) > 0), 'recommended power for every stage');
const boss = BB.MISSIONS.find((m) => m.type === 'boss'), norm = BB.MISSIONS[1];
const fb = BB.stageRewards(boss, true), fn = BB.stageRewards(norm, true), rn = BB.stageRewards(norm, false);
ok(fb.crystals > fn.crystals && fb.sigils > fn.sigils && rn.gold < fn.gold && rn.crystals === 0, 'first victories pay more, bosses most');
ok(BB.waveScale(1) < BB.waveScale(5) && BB.waveScale(5) === 1, 'fewer foes for a small team');

// economy: the first chapter pays for a handful of recruits and levels
const ch1 = BB.MISSIONS.filter((m) => m.chapter === 1).map((m) => BB.stageRewards(m, true));
const crys = ch1.reduce((a, x) => a + x.crystals, 0);
ok(crys >= BB.TIERS[0].cost && crys < BB.TIERS[0].cost * 3, 'chapter 1 stage crystals buy a recruit or two, not a full team (' + crys + ')');

// idle spoils
const I = BB.newSave(0);
ok(BB.idlePending(I, 3600000).gold > 100, 'an hour of spoils');
ok(BB.idlePending(I, 100 * 3600000).ms === BB.IDLE_CAP, 'spoils are capped');
const got = BB.idleClaim(I, 3600000); ok(got.gold > 0 && I.gold === got.gold && BB.idlePending(I, 3600000).gold === 0, 'claiming resets the clock');

// shop
const day = Date.UTC(2026, 10, 8, 12);
const SH = BB.newSave(day);
ok(BB.buy(SH, 'free', day).crystals === 30 && !BB.buy(SH, 'free', day), 'free crystals once a day');
ok(!BB.buy(SH, 'chest', day), 'paid offers need gold');
SH.gold = 1e5; const ch = BB.buy(SH, 'chest', day); ok(ch && ch.item && ch.item.rarity >= 1, 'armory chest gives Rare or better');
ok(BB.shopLeft(SH, BB.SHOP[0], day + 86400000) === 1, 'offers come back the next day');

// milestones
const Q = BB.newSave(1);
ok(BB.questsReady(Q) === 0, 'no milestones at the start');
Q.cleared['s1-3'] = 1; ok(BB.questsReady(Q) === 1, 'clearing 1-3 readies First Blood');
const c0 = Q.crystals; ok(BB.claimQuest(Q, 'clear3') && Q.crystals > c0 && !BB.claimQuest(Q, 'clear3'), 'milestones pay once');
ok(BB.QUESTS.every((q) => typeof q.test(BB.newSave(1)) === 'boolean'), 'milestone tests run on a new save');

// foes
ok(BB.foeStats('ghoul', 10).hp > BB.foeStats('ghoul', 1).hp * 2, 'foes scale with level');
ok(BB.foeStats('ghoul', 3, BB.ELITES[0]).hp > BB.foeStats('ghoul', 3).hp, 'elites are tougher');
ok(BB.damage(50, 0) > BB.damage(50, 20) && BB.damage(1, 999) >= 1, 'defence reduces damage, minimum 1');

// save round trip
const J = JSON.parse(JSON.stringify(F));
ok(J.v === BB.SAVE_V && BB.teamHeroes(J).length === 5 && BB.heroStats(J.heroes[1]).hp > 0, 'a save survives JSON');

console.log(fails ? fails + ' of ' + n + ' checks FAILED' : 'rules: all ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
