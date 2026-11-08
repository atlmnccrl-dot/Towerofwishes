// Pure rules: heroes, stats, levels, perks, loot, bonds, campaign unlocks. usage: node test/rules-test.js
const BB = require('../js/rules.js');
let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };

// heroes and stats
for (const c of BB.CALLING_ORDER) {
  const h = BB.newHero({ calling: c, seed: 5 });
  const s = BB.heroStats(h, null, null);
  ok(s.hp > 90 && s.atk > 10 && s.def >= 3, c + ' base stats sane');
  ok(Number.isFinite(s.cd) && s.cd > 3, c + ' skill cooldown');
  const h10 = BB.newHero({ calling: c, seed: 5, level: 10 });
  ok(BB.heroStats(h10).hp > s.hp * 1.8, c + ' grows with level');
}
// xp
const h = BB.newHero({ calling: 'ranger', seed: 1 });
const lv = BB.grantXp(h, 1000);
ok(lv.length >= 3 && h.level === 1 + lv.length && h.pendingPerks === lv.length, 'xp grants levels and perks');
ok(h.xp < BB.xpNext(h.level), 'xp remainder below next level');
const top = BB.newHero({ calling: 'ranger', level: BB.MAX_LEVEL });
ok(BB.grantXp(top, 99999).length === 0 && top.level === BB.MAX_LEVEL, 'level cap');
// perks
for (let i = 0; i < 20; i++) {
  const ch = BB.perkChoices(h, i * 13 + 1);
  ok(ch.length === 3 && new Set(ch.map((p) => p.id)).size === 3, 'three distinct perk choices');
}
const before = BB.heroStats(h).atk; h.perks.push('sharp'); ok(BB.heroStats(h).atk > before, 'perk raises attack');
// items
const r = BB.rng(9);
for (let i = 0; i < 300; i++) {
  const slot = r.pick(BB.SLOTS), rar = r.int(4);
  const it = BB.makeItem(r, slot, 1 + r.int(12), rar, slot === 'weapon' ? r.pick(['sword', 'axe', 'bow', 'focus']) : undefined);
  ok(it.name && it.stats && Object.values(it.stats).every(Number.isFinite), 'item ' + it.name + ' finite stats');
  ok(BB.itemScore(it) > 0, 'item score positive');
}
const bow = BB.makeItem(r, 'weapon', 3, 1, 'bow');
ok(BB.canEquip(BB.newHero({ calling: 'ranger' }), bow) && !BB.canEquip(BB.newHero({ calling: 'vanguard' }), bow), 'weapon types follow calling');
const shield = BB.makeItem(r, 'offhand', 3, 1);
ok(BB.canEquip(BB.newHero({ calling: 'warpriest' }), shield) && !BB.canEquip(BB.newHero({ calling: 'arcanist' }), shield), 'shields only for shield callings');
const geared = BB.newHero({ calling: 'vanguard', seed: 3 }); const g0 = BB.heroStats(geared).hp;
geared.gear.chest = BB.makeItem(r, 'chest', 5, 2); ok(BB.heroStats(geared).hp > g0, 'gear raises health');
// loot
const save = BB.newSave();
const team = ['vanguard', 'ranger', 'arcanist'].map((c) => BB.newHero({ calling: c, level: 4 }));
for (const M of BB.MISSIONS) {
  const loot = BB.rollLoot(BB.rng(M.level), M, team, save);
  ok(loot.length >= 2, M.id + ' drops loot');
  ok(loot.every((it) => it.slot !== 'weapon' || team.some((t) => BB.weaponType(t.calling) === it.wtype)), M.id + ' weapons fit the team');
}
let rares = 0; const rr = BB.rng(4); for (let i = 0; i < 2000; i++) if (BB.rollRarity(rr, 0) >= 1) rares++;
let rares3 = 0; const rr3 = BB.rng(4); for (let i = 0; i < 2000; i++) if (BB.rollRarity(rr3, 3) >= 1) rares3++;
ok(rares3 > rares, 'forge level raises rarity');
// bonds
ok(BB.bondsFor(['vanguard', 'berserker', 'ranger', 'arcanist']).some((b) => b.id === 'full'), 'Full Banner bond');
ok(BB.bondsFor(['berserker', 'berserker']).some((b) => b.id === 'blood'), 'Bloodpact bond');
ok(!BB.bondsFor(['ranger']).length, 'no bond alone');
const v = BB.newHero({ calling: 'arcanist', seed: 2 });
ok(BB.heroStats(v, ['arcanist', 'vanguard']).atk > BB.heroStats(v, ['arcanist']).atk, 'Shield & Sorcery boosts casters');
// campaign
ok(BB.missionUnlocked(save, 0) && !BB.missionUnlocked(save, 1), 'only first mission open');
save.cleared.m1 = 1; ok(BB.missionUnlocked(save, 1), 'clearing unlocks the next');
ok(BB.MISSIONS.every((m) => m.waves.every((w) => w.every((x, i) => (i % 2 ? Number.isInteger(x) : !!BB.FOES[x])))), 'mission waves reference real foes');
ok(BB.MISSIONS.filter((m) => m.recruit).every((m) => BB.LEGENDS[m.recruit]), 'recruits are legends');
ok(BB.MISSIONS.filter((m) => m.boss).every((m) => BB.FOES[m.boss] && BB.FOES[m.boss].boss), 'bosses exist');
// foes scale
ok(BB.foeStats('ghoul', 10).hp > BB.foeStats('ghoul', 1).hp * 2, 'foes scale with level');
ok(BB.foeStats('ghoul', 3, BB.ELITES[0]).hp > BB.foeStats('ghoul', 3).hp, 'elites are tougher');
ok(BB.damage(50, 0) > BB.damage(50, 20) && BB.damage(1, 999) >= 1, 'defence reduces damage, minimum 1');

// recruits (the real roster when packed, else a stand-in)
let roster;
try { roster = require('../assets/chars/h/roster.json'); } catch (e) { roster = ['knight', 'monk', 'ranger', 'mage', 'rogue'].map((a, i) => ({ key: a + '_00' + i, arch: a, role: 'hero', calling: { knight: 'vanguard', monk: 'monk', ranger: 'ranger', mage: 'arcanist', rogue: 'shadowblade' }[a] })); }
ok(roster.every((c) => c.role !== 'hero' || BB.CALLINGS[c.calling]), 'every roster hero has a known calling');
ok(roster.filter((c) => c.role === 'foe').every((c) => BB.FOES[c.foe]), 'every roster foe maps to a foe kind');
const rs = BB.newSave(); rs.heroes.push(BB.newHero({ calling: 'vanguard', level: 5 }));
const offers = BB.rollOffers(rs, roster, 11);
ok(offers.length >= 1 && offers.length <= 3 && new Set(offers.map((o) => o.key)).size === offers.length, 'offers are distinct, three without a hall');
ok(offers.every((o) => ['knight', 'barbarian', 'ranger', 'spearman', 'monk'].includes(o.arch)), 'early offers use the first archetypes');
rs.cleared = { m1: 1, m2: 1, m3: 1, m4: 1, m5: 1, m6: 1 }; rs.buildings.tavern = 3;
ok(BB.rollOffers(rs, roster, 12).length <= 6, 'a full hall offers up to six');
const o1 = Object.assign({}, offers[0], { stars: 1 }), o3 = Object.assign({}, offers[0], { stars: 3 });
ok(BB.recruitPrice(o3) > BB.recruitPrice(o1), 'three stars cost more');
const h1 = BB.makeRecruit(o1), h3 = BB.makeRecruit(o3);
ok(h3.recruit === o3.key && BB.heroStats(h3).atk > BB.heroStats(h1).atk, 'stars raise stats');
rs.heroes.push(h1); ok(!BB.recruitPool(rs, roster).some((c) => c.key === h1.recruit), 'owned recruits leave the pool');
ok(!BB.canEquip(h1, BB.makeItem(BB.rng(1), 'offhand', 3, 1)), 'recruits keep their own shields');
for (const c of ['monk', 'shadowblade', 'lancer']) { const hh = BB.newHero({ calling: c, level: 6 }); ok(BB.heroStats(hh).atk > 20, c + ' grows'); ok(BB.weaponType(c), c + ' has a weapon type'); }
ok(BB.FORGE_CALLINGS.indexOf('lancer') < 0 && BB.FORGE_CALLINGS.length === 7, 'the forge offers seven callings (no spear art)');
ok(BB.foeStats('vesh', 16).hp < 80000 && BB.foeStats('ossric', 5).hp > 5000, 'boss health on a sane curve');

console.log(fails ? fails + ' of ' + n + ' checks FAILED' : 'rules: all ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
