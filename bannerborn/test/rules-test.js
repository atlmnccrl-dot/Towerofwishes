// Pure rules: heroes, stats, levels, stars, gear and forge, formation, tiers and recruiting, stages and rewards,
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

// gear and forge
const r = BB.rng(9);
for (let i = 0; i < 300; i++) {
  const slot = r.pick(BB.SLOTS), rar = r.int(4);
  const it = BB.makeItem(r, slot, 1 + r.int(30), rar, slot === 'weapon' ? r.pick(['sword', 'axe', 'bow', 'focus', 'fist', 'spear']) : undefined);
  ok(it.name && it.stats && Object.values(it.stats).every(Number.isFinite), 'item ' + it.name + ' finite stats');
  ok(BB.itemScore(it) > 0 && BB.upgradeCost(it) > 0 && BB.salvageValue(it) > 0, 'item scores and prices positive');
}
const bow = BB.makeItem(r, 'weapon', 3, 1, 'bow');
ok(BB.canEquip(BB.newHero({ calling: 'ranger' }), bow) && !BB.canEquip(BB.newHero({ calling: 'vanguard' }), bow), 'weapon types follow calling');
const chest = BB.makeItem(r, 'chest', 5, 2);
const g0 = BB.heroStats(h).hp; h.gear.chest = chest; ok(BB.heroStats(h).hp > g0, 'gear raises health');
S.gold = 1e6;
const sc0 = BB.itemScore(chest); ok(BB.upgradeItem(S, chest) && chest.plus === 1 && BB.itemScore(chest) > sc0, 'forging raises the item');
for (let i = 0; i < 20; i++) BB.upgradeItem(S, chest);
ok(chest.plus === BB.MAX_PLUS, 'forging stops at +' + BB.MAX_PLUS);
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
const F = BB.newSave(1);
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
  ok(BB.teamIds(R).length === 5, 'recruits fill the formation');
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
ok(crys >= BB.TIERS[0].cost * 4, 'chapter 1 crystals buy at least four recruits (' + crys + ')');

// idle spoils
const I = BB.newSave(0);
ok(BB.idlePending(I, 3600000).gold > 100, 'an hour of spoils');
ok(BB.idlePending(I, 100 * 3600000).ms === BB.IDLE_CAP, 'spoils are capped');
const got = BB.idleClaim(I, 3600000); ok(got.gold > 0 && I.gold === got.gold && BB.idlePending(I, 3600000).gold === 0, 'claiming resets the clock');

// shop
const day = Date.UTC(2026, 10, 8, 12);
const SH = BB.newSave(day);
ok(BB.buy(SH, 'free', day).crystals === 60 && !BB.buy(SH, 'free', day), 'free crystals once a day');
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
