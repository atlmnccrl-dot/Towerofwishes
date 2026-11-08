// Bannerborn — who each hero is. Every recruit gets a combat class, an entrance (how they arrive: on the summoning
// and at the start of every battle), a temperament (their combat brain: who they go for, which moves they favour)
// and a signature move. No two heroes share the same mix, and the description is written from it. Pure: runs in Node.
(function () {
  const BB = (typeof window !== 'undefined' ? window : globalThis).BB || ((typeof window !== 'undefined' ? window : globalThis).BB = {});

  // ---------------------------------------------------------------- classes: what a hero does for the team
  BB.CLASSES = {
    guardian: { name: 'Guardian', col: '#5aa9ff', icon: 'shield', job: 'Holds the front, draws the blows, shields the weak.' },
    warrior: { name: 'Warrior', col: '#ff6a4a', icon: 'sword', job: 'Fights in the thick of it and breaks enemy lines.' },
    assassin: { name: 'Assassin', col: '#c27cff', icon: 'dagger', job: 'Slips round the flank and kills the back line.' },
    marksman: { name: 'Marksman', col: '#9be15d', icon: 'bow', job: 'Picks foes off from behind the shields.' },
    mage: { name: 'Mage', col: '#ff9a3a', icon: 'flame', job: 'Burns crowds and bends the battlefield.' },
    healer: { name: 'Healer', col: '#ffe27a', icon: 'cross', job: 'Keeps the team standing.' },
  };
  const CLASS_OF = { vanguard: 'guardian', berserker: 'warrior', lancer: 'warrior', monk: 'warrior', shadowblade: 'assassin', ranger: 'marksman', arcanist: 'mage', warpriest: 'healer' };
  BB.classOf = (h) => CLASS_OF[h.calling] || 'warrior';
  // a quick read of a team: what it has, what it lacks
  BB.teamBalance = function (heroes) {
    const n = {}; for (const h of heroes) { const c = BB.classOf(h); n[c] = (n[c] || 0) + 1; }
    const tips = [];
    if (!n.guardian) tips.push('No Guardian: nothing holds the front.');
    if (!n.healer && heroes.length >= 3) tips.push('No Healer: wounds will add up.');
    if (!(n.marksman || n.mage) && heroes.length >= 3) tips.push('No ranged damage: archers behind shields go untouched.');
    if (!(n.warrior || n.assassin) && heroes.length >= 4) tips.push('No Warrior or Assassin: the lines will not break.');
    if ((n.guardian || 0) >= 3) tips.push('Too many Guardians: the fight will drag.');
    return { counts: n, tips, balanced: heroes.length >= 4 && !tips.length };
  };

  // ---------------------------------------------------------------- entrances
  BB.ENTRANCES = {
    stride: { name: 'The Stride', line: 'walks out of rolling smoke, unhurried, eyes burning' },
    slam: { name: 'Sky Slam', line: 'drops out of the sky and slams into the ground' },
    blink: { name: 'Teleport Strike', line: 'tears through space and lands with a strike' },
    lightning: { name: 'Thunderfall', line: 'arrives inside a bolt of lightning' },
    flame: { name: 'Pyre Rise', line: 'rises out of a pillar of fire' },
    shadow: { name: 'Shadow Rise', line: 'climbs out of a pool of shadow' },
    charge: { name: 'War Charge', line: 'charges in at full tilt and skids to a stop' },
    holy: { name: 'Descent', line: 'descends in a column of light' },
    frost: { name: 'Ice Shatter', line: 'breaks out of a block of ice' },
    leaves: { name: 'Leafstorm', line: 'steps out of a whirl of leaves' },
  };
  // ---------------------------------------------------------------- temperaments: the combat brain
  // target: who they go for · w: how much they like each tactic · potion: when they drink · guard/dodge: their reads
  BB.TEMPERS = {
    reckless: { name: 'Reckless', target: 'nearest', potion: 0.25, guard: -0.05, dodge: -0.04, w: { charge: 2, shove: 1.6, rock: 0.6, tumble: 0.3 },
      line: (n) => n + ' goes for the nearest throat and never backs off.' },
    cunning: { name: 'Cunning', target: 'weakest', potion: 0.45, dodge: 0.06, w: { rock: 1.8, tumble: 1.5, shove: 0.8 },
      line: (n) => n + ' finishes off whoever is already bleeding.' },
    protector: { name: 'Protector', target: 'threat', potion: 0.4, guard: 0.08, w: { rescue: 2.5, shove: 1.3, mend: 1.4 },
      line: (n) => n + ' watches the team and turns on anyone who hurts a friend.' },
    hunter: { name: 'Hunter', target: 'backline', potion: 0.4, w: { rock: 1.5, charge: 1.3 },
      line: (n) => n + ' hunts archers and casters first.' },
    duelist: { name: 'Duelist', target: 'strongest', potion: 0.35, guard: 0.06, parry: 0.06, w: { shove: 1.2 },
      line: (n) => n + ' seeks out the strongest foe on the field.' },
    skirmisher: { name: 'Skirmisher', target: 'nearest', potion: 0.45, dodge: 0.08, hitrun: true, w: { tumble: 2, charge: 1.5, hitrun: 1 },
      line: (n) => n + ' strikes, springs away, and strikes again.' },
    brawler: { name: 'Brawler', target: 'nearest', potion: 0.3, w: { shove: 2.2, rock: 2 },
      line: (n) => n + ' fights dirty: kicks, shoves and thrown stones.' },
    steady: { name: 'Steady', target: 'default', potion: 0.4, guard: 0.03, w: {},
      line: (n) => n + ' keeps formation and does the job.' },
  };
  // ---------------------------------------------------------------- signature moves
  BB.SIGNATURES = {
    whirlwind: { name: 'Whirlwind', line: 'spins through a crowd, cutting everything around' },
    groundpound: { name: 'Ground Pound', line: 'leaps up and slams the ground, hurling foes back' },
    blinkstrike: { name: 'Blink Strike', line: 'vanishes and reappears behind a foe for a certain critical' },
    warcry: { name: 'War Cry', line: 'roars to drive allies into a fury and foes back a step' },
    shieldtoss: { name: 'Shield Toss', line: 'hurls a shield that ricochets between foes, dazing each' },
    multishot: { name: 'Multishot', line: 'looses a fan of five arrows' },
    snare: { name: 'Snare', line: 'throws a weighted net that pins a foe in place' },
    chainbolt: { name: 'Chain Lightning', line: 'calls lightning that leaps from foe to foe' },
    meteor: { name: 'Meteor', line: 'drops a burning stone from the sky on the thickest crowd' },
    smite: { name: 'Smite', line: 'calls a pillar of light down on a foe and heals allies near it' },
    bloodrush: { name: 'Blood Rush', line: 'flies into a frenzy: faster blows, wounds closing' },
    vault: { name: 'Pole Vault', line: 'vaults over the front line onto an archer or caster' },
    decoy: { name: 'Decoy', line: 'leaves a shadow double behind and slips away unseen' },
    flurry: { name: 'Flurry', line: 'unleashes five blows faster than the eye, the last one launching' },
    barrier: { name: 'Barrier', line: 'wraps the most wounded ally in a shield of light' },
  };
  const ALLOW = {
    vanguard: { e: ['stride', 'slam', 'charge', 'holy'], s: ['shieldtoss', 'groundpound', 'warcry', 'barrier', 'whirlwind'] },
    berserker: { e: ['slam', 'charge', 'flame', 'stride'], s: ['whirlwind', 'groundpound', 'bloodrush', 'warcry'] },
    lancer: { e: ['charge', 'slam', 'lightning', 'stride'], s: ['vault', 'whirlwind', 'warcry', 'groundpound'] },
    monk: { e: ['slam', 'blink', 'charge', 'leaves'], s: ['flurry', 'blinkstrike', 'groundpound', 'whirlwind'] },
    shadowblade: { e: ['shadow', 'blink', 'charge', 'stride'], s: ['blinkstrike', 'decoy', 'snare', 'flurry', 'whirlwind'] },
    ranger: { e: ['leaves', 'blink', 'charge', 'stride'], s: ['multishot', 'snare', 'decoy'] },
    arcanist: { e: ['flame', 'frost', 'lightning', 'blink'], s: ['chainbolt', 'meteor', 'barrier', 'blinkstrike'] },
    warpriest: { e: ['holy', 'lightning', 'frost', 'stride'], s: ['smite', 'barrier', 'chainbolt', 'warcry'] },
  };
  const TEMPER_ALLOW = { melee: Object.keys(BB.TEMPERS), ranged: ['cunning', 'hunter', 'duelist', 'skirmisher', 'steady', 'protector'], healer: ['protector', 'steady', 'cunning', 'skirmisher'] };
  const temperPool = (calling) => calling === 'warpriest' ? TEMPER_ALLOW.healer : (calling === 'ranger' || calling === 'arcanist') ? TEMPER_ALLOW.ranged : TEMPER_ALLOW.melee;
  // the legends and the Captain are written by hand
  const FIXED = {
    captain: { entrance: 'stride', temper: 'protector', sig: 'warcry' },
    sera: { entrance: 'shadow', temper: 'cunning', sig: 'chainbolt' },
    ahmos: { entrance: 'holy', temper: 'protector', sig: 'shieldtoss' },
    kestrel: { entrance: 'blink', temper: 'skirmisher', sig: 'whirlwind' },
    talia: { entrance: 'charge', temper: 'hunter', sig: 'multishot' },
    brenna: { entrance: 'slam', temper: 'duelist', sig: 'vault' },
    reaper: { entrance: 'shadow', temper: 'hunter', sig: 'decoy' },
  };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // deal every recruit a mix nobody else has, spreading entrances and signatures evenly inside each calling
  let table = null, tableN = -1;
  function buildTable() {
    const roster = (BB.ROSTER || []).filter((c) => c.role === 'hero').slice().sort((a, b) => hash(a.key) - hash(b.key));
    table = {}; tableN = (BB.ROSTER || []).length;
    const used = new Set(), useE = {}, useS = {}, useT = {};
    for (const c of roster) {
      const A = ALLOW[c.calling] || ALLOW.vanguard, T = temperPool(c.calling), k = c.calling;
      const cand = [];
      for (const e of A.e) for (const s of A.s) for (const t of T) cand.push({ e, s, t, sc: ((useE[k + e] || 0) + (useS[k + s] || 0)) * 10 + (useT[k + t] || 0) * 3 + (hash(c.key + e + s + t) % 1000) / 1000 });
      cand.sort((a, b) => a.sc - b.sc);
      const pick = cand.find((q) => !used.has(q.e + q.s + q.t)) || cand[0];
      used.add(pick.e + pick.s + pick.t); useE[k + pick.e] = (useE[k + pick.e] || 0) + 1; useS[k + pick.s] = (useS[k + pick.s] || 0) + 1; useT[k + pick.t] = (useT[k + pick.t] || 0) + 1;
      table[c.key] = { entrance: pick.e, temper: pick.t, sig: pick.s };
    }
  }
  BB.identityOf = function (h) {
    if (!h) return null;
    let id;
    if (h.captain) id = FIXED.captain;
    else if (h.legend) id = FIXED[h.legend];
    else if (h.recruit) { if (!table || tableN !== (BB.ROSTER || []).length) buildTable(); id = table[h.recruit]; }
    if (!id) { // a hero outside the roster (tests, old saves): still a stable, legal mix
      const A = ALLOW[h.calling] || ALLOW.vanguard, T = temperPool(h.calling), x = hash(h.recruit || h.id || h.name || 'x');
      id = { entrance: A.e[x % A.e.length], temper: T[(x >> 4) % T.length], sig: A.s[(x >> 8) % A.s.length] };
    }
    return Object.assign({ cls: BB.classOf(h) }, id);
  };
  // the card text: class, temperament, signature, entrance — in a few plain lines
  BB.heroDesc = function (h) {
    const I = BB.identityOf(h); if (!I) return '';
    const first = (h.name || 'This hero').split(' ')[0] === 'The' ? h.name : (h.name || 'This hero').split(' ')[0];
    const T = BB.TEMPERS[I.temper], S = BB.SIGNATURES[I.sig], E = BB.ENTRANCES[I.entrance], C = BB.CLASSES[I.cls];
    return C.name + '. ' + T.line(first) + ' Signature — ' + S.name + ': ' + S.line + '. Arrives: ' + E.line + '.';
  };
  BB.identityAll = function () { if (!table || tableN !== (BB.ROSTER || []).length) buildTable(); return table; };
  if (typeof module !== 'undefined') module.exports = BB;
})();
