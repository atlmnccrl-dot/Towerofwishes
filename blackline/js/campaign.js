// BLACKLINE — the campaign: Operation Black Rain. Missions, unlocks, scripted waves,
// objectives, tutorial hints, stars and saved progress. Pure; no DOM.
(function (root) {
  const BL = root.BL || (root.BL = {});

  const KEY = 'blackline.progress.v1';
  const BASE_UNITS = ['rifle'];

  // Camera shots for the briefing flyovers. x/z in world units and zoom (scaled to the screen
  // at play time); follow names a moving subject; reveal shows the enemy during the shot.
  const MISSIONS = [
    {
      id: 'm1', num: '01', name: 'LANDFALL', time: '0214 HRS', place: 'WESTERN SLOPES', sky: 'HEAVY RAIN',
      summary: 'Go in by rope and take the hill at sector A.',
      brief: [
        'The storm grounded the convoys. The ridge belongs to them.',
        'Two enemy squads hold the hill at sector A.',
        'We go in by rope, ahead of the main body.',
        'Take sector A before first light.',
      ],
      shots: [
        { x: 2400, z: 0.45, dur: 4.6, line: 0 },
        { x: 1340, z: 1.5, dur: 4.6, line: 1, reveal: true },
        { follow: 'transport', z: 1.6, dur: 6.2, line: 2 },
        { x: 900, z: 1.25, dur: 3.8, line: 3 },
      ],
      weather: { rain: 1.15, wind: 0.3, bolts: [7, 14] },
      allowed: ['rifle'], enemyAllowed: ['rifle'],
      sectors: { A: 1 }, drain: false, startRP: 100,
      insert: { x: 640 },
      setup: [
        { team: 1, type: 'rifle', x: 1290 },
        { team: 1, type: 'rifle', x: 1430 },
      ],
      ai: { buy: false, support: false, mode: 'defend' },
      objective: { type: 'capture', sector: 'A', text: 'TAKE SECTOR A' },
      intro: ['rifle'], par: 360, maxLoss: 8, unlocks: ['mg'],
      hints: 'm1',
    },
    {
      id: 'm2', num: '02', name: 'THE GUNLINE', time: '0347 HRS', place: 'SECTOR A', sky: 'WIND RISING',
      summary: 'Hold the trench at A against their counterattack.',
      brief: [
        'They want the hill back.',
        'Their companies are massing behind the ridge at B.',
        'A machine-gun team has reached our trench.',
        'Hold sector A until the guns behind us are ready.',
      ],
      shots: [
        { x: 1700, z: 0.55, dur: 4.4, line: 0 },
        { x: 2520, z: 1.3, dur: 4.6, line: 1, reveal: true },
        { x: 1395, z: 2.1, dur: 4.6, line: 2 },
        { x: 1500, z: 1.2, dur: 3.6, line: 3 },
      ],
      weather: { rain: 1.0, wind: 0.55, bolts: [6, 12] },
      allowed: ['rifle', 'mg'], enemyAllowed: ['rifle', 'mg'],
      sectors: { A: 0, B: 1, C: 1 }, drain: false, startRP: 140,
      setup: [
        { team: 0, type: 'rifle', x: 1375 },
        { team: 0, type: 'mg', x: 1402 },
      ],
      waves: [
        { t: 14, units: ['rifle', 'rifle'] },
        { t: 58, units: ['rifle', 'rifle', 'mg'] },
        { t: 110, units: ['rifle', 'rifle', 'rifle'] },
        { t: 160, units: ['rifle', 'mg', 'rifle', 'rifle'] },
      ],
      waveX: 2560,
      ai: { buy: false, support: false, mode: 'assault' },
      objective: { type: 'hold', sector: 'A', dur: 210, text: 'HOLD SECTOR A' },
      intro: ['mg'], par: 210, maxLoss: 10, unlocks: ['scout', 'arty'],
      hints: 'm2',
    },
    {
      id: 'm3', num: '03', name: 'EYES ON THE RIDGE', time: '0420 HRS', place: 'SECTOR B', sky: 'LIGHTNING',
      summary: 'Find their guns on the ridge and take sector B.',
      brief: [
        'The ridge at B looks down on everything.',
        'Their gunners are dug in among the ruins by the mast.',
        'Scouts can see what our rifles cannot.',
        'The batteries are ready. Spot for them. Take B.',
      ],
      shots: [
        { x: 2400, z: 0.5, dur: 4.4, line: 0 },
        { x: 2420, z: 1.9, dur: 4.8, line: 1, reveal: true },
        { x: 1395, z: 1.7, dur: 4.2, line: 2 },
        { x: 1900, z: 0.9, dur: 3.8, line: 3 },
      ],
      weather: { rain: 0.9, wind: 0.4, bolts: [4, 8] },
      allowed: ['rifle', 'mg', 'scout', 'arty'], enemyAllowed: ['rifle', 'mg', 'arty'],
      sectors: { A: 0, B: 1, C: 1 }, drain: true, startRP: 320,
      setup: [
        { team: 0, type: 'rifle', x: 1390 },
        { team: 0, type: 'mg', x: 1372 },
        { team: 1, type: 'mg', x: 2415 },
        { team: 1, type: 'rifle', x: 2370 },
        { team: 1, type: 'rifle', x: 2505 },
      ],
      ai: { buy: true, support: true, mode: 'defend', incomeMul: 0.6, artyT: 80 },
      objective: { type: 'capture', sector: 'B', text: 'TAKE SECTOR B' },
      intro: ['scout', 'arty'], par: 420, maxLoss: 14, unlocks: ['apc', 'tank'],
      hints: 'm3',
    },
    {
      id: 'm4', num: '04', name: 'IRON IN THE RAIN', time: '0455 HRS', place: 'SECTOR C', sky: 'ARMOUR REPORTED',
      summary: 'Their armour is coming. Meet it, then take C.',
      brief: [
        'B is ours. Engines on the far side of the valley.',
        'Their tanks are moving up to sector C.',
        'Our armour has crossed the river. Tanks and carriers.',
        'Break their armour and take sector C.',
      ],
      shots: [
        { x: 2900, z: 0.5, dur: 4.2, line: 0 },
        { x: 3520, z: 1.7, dur: 4.8, line: 1, reveal: true },
        { x: 380, z: 1.8, dur: 4.4, line: 2 },
        { x: 2700, z: 0.9, dur: 3.8, line: 3 },
      ],
      weather: { rain: 1.1, wind: 0.5, bolts: [6, 11] },
      allowed: ['rifle', 'mg', 'scout', 'arty', 'apc', 'tank'], enemyAllowed: ['rifle', 'mg', 'apc', 'tank'],
      sectors: { A: 0, B: 0, C: 1 }, drain: true, startRP: 520,
      setup: [
        { team: 0, type: 'rifle', x: 2380 },
        { team: 0, type: 'mg', x: 2412 },
        { team: 0, type: 'scout', x: 2330 },
        { team: 0, type: 'tank', x: 330 },
        { team: 1, type: 'tank', x: 3560 },
        { team: 1, type: 'apc', x: 3470 },
        { team: 1, type: 'rifle', x: 3505 },
        { team: 1, type: 'mg', x: 3420 },
      ],
      ai: { buy: true, support: false, mode: 'push', incomeMul: 0.7 },
      objective: { type: 'capture', sector: 'C', text: 'TAKE SECTOR C' },
      intro: ['tank', 'apc'], par: 480, maxLoss: 16, unlocks: ['heli', 'insert'],
      hints: 'm4',
    },
    {
      id: 'm5', num: '05', name: 'BLACK RAIN', time: '0530 HRS', place: 'THE WHOLE FRONT', sky: 'THE STORM BREAKS',
      summary: 'Everything we have. Break their line.',
      brief: [
        'Their reserve has come up. They want all of it back.',
        'Every sector is in play again.',
        'Air support is cleared to fly in this weather.',
        'Break the eastern line.',
      ],
      shots: [
        { x: 2400, z: 0.32, dur: 4.6, line: 0 },
        { x: 3600, z: 1.1, dur: 4.4, line: 1, reveal: true },
        { x: 300, z: 1.8, dur: 4.4, line: 2 },
        { x: 1300, z: 0.8, dur: 3.8, line: 3 },
      ],
      weather: { rain: 1.3, wind: 0.65, bolts: [4, 9] },
      allowed: null, enemyAllowed: null,
      sectors: null, drain: true, startRP: 350,
      setup: [
        { team: 0, type: 'rifle', x: 260, order: { type: 'hold', x: 320 } },
        { team: 0, type: 'heli', x: 220 },
        { team: 1, type: 'rifle', x: 4540 },
      ],
      ai: {},
      objective: { type: 'break', text: 'BREAK THE EASTERN LINE' },
      intro: ['heli', 'insert'], par: 720, maxLoss: 30, unlocks: [],
      hints: 'm5',
    },
  ];

  const SKIRMISH = {
    id: 'skirmish', num: '', name: 'SKIRMISH', time: 'NIGHT', place: 'BLACK RAIN', sky: 'STORM',
    brief: ['Night. A storm over three sectors.', 'Hold more of them than the enemy does.', 'Break their line.'],
    shots: [
      { x: 2400, z: 0.35, dur: 4.2, line: 0, reveal: true },
      { x: 2400, z: 1.4, dur: 4, line: 1, reveal: true },
      { x: 450, z: 1.4, dur: 3.6, line: 2 },
    ],
    weather: { rain: 1.1, wind: 0.45, bolts: [5, 12] },
    drain: true, startRP: 350,
    setup: [
      { team: 0, type: 'rifle', x: 260, order: { type: 'hold', x: 320 } },
      { team: 1, type: 'rifle', x: 4540 },
    ],
    ai: {},
    objective: { type: 'break', text: 'BREAK THE EASTERN LINE' },
    intro: [], par: 720, maxLoss: 30, unlocks: [],
  };

  // What each unit is for, shown on its introduction card and its unlock.
  const DOSSIER = {
    rifle: { role: 'Line infantry', lines: ['Six riflemen; one carries an AT rocket.', 'Takes and holds ground. Fights from cover.'] },
    mg: { role: 'Suppression', lines: ['Pins infantry: pinned men go prone and stop.', 'Must set up before it fires. Keep it still.'] },
    scout: { role: 'Reconnaissance', lines: ['Sees farther than any unit.', 'Marksman rifles. Fast, and fragile.'] },
    arty: { role: 'Fire support', lines: ['Six shells, three seconds after the call.', 'Red marks warn both sides. It hits friends too.'] },
    apc: { role: 'Fast armour', lines: ['Autocannon: shreds infantry, hits aircraft.', 'Light armour. Rockets and tanks kill it.'] },
    tank: { role: 'Heavy armour', lines: ['Main gun breaks armour; the coax MG covers.', 'Slow. Cannot aim at aircraft.'] },
    heli: { role: 'Air attack', lines: ['Rocket pods and a chin gun, from the air.', 'Autocannon and massed fire bring it down.'] },
    insert: { role: 'Air insertion', lines: ['A rifle squad by rope from a transport.', 'Anywhere your units can see.'] },
  };

  // Tutorial hints. when/done take (S, c) where c = { selected, shownT }.
  const own = (S) => S.units.filter((u) => u.alive && u.team === 0);
  const ownLanded = (S) => own(S).filter((u) => !u.members.some((m) => m.rappel));
  const sees = (S) => S.units.some((u) => u.alive && u.team === 1 && BL.visible(S, 0, u));
  const sector = (S, id) => S.field.sectors.find((s) => s.id === id);
  const HINTS = {
    m1: [
      { text: 'Your squad is down. Tap it to take command.', target: { kind: 'unit' }, when: (S) => ownLanded(S).length > 0, done: (S, c) => c.selected.size > 0 },
      { text: 'Tap the ground near flag A to move up the hill.', target: { kind: 'sector', id: 'A' }, when: (S, c) => c.selected.size > 0, done: (S) => own(S).some((u) => Math.abs(u.order.x - 1300) < 260 || u.x > 1050) },
      { text: 'Drag to look around. Pinch or scroll to zoom.', when: () => true, done: (S, c) => c.shownT > 7 },
      { text: 'Reinforcements: tap the RIFLE card, then tap near a beam.', target: { kind: 'card', arg: 'rifle' }, when: (S) => !BL.canAfford(S, 0, 'rifle'), done: (S) => own(S).length >= 2 || S.teams[0].stats.deployed >= 2 },
      { text: 'Contact. Squads fire on their own; ATTACK mode stops them to fight.', target: { kind: 'cmd', arg: 'attack' }, when: sees, done: (S, c) => c.shownT > 8 },
      { text: 'Stand inside the brackets on the hill to take the sector.', target: { kind: 'sector', id: 'A' }, when: (S) => own(S).some((u) => Math.abs(u.x - 1300) < 420), done: (S, c) => sector(S, 'A').prog > -40 || c.shownT > 10 },
    ],
    m2: [
      { text: 'Machine guns must set up before they fire. Keep them still.', target: { kind: 'unit', type: 'mg' }, when: () => true, done: (S, c) => c.shownT > 7 },
      { text: 'HOLD digs a squad in: harder to hit from cover.', target: { kind: 'cmd', arg: 'hold' }, when: () => true, done: (S, c) => c.shownT > 7 },
      { text: 'Pinned men go prone and stop advancing. Fire wins the fight.', when: sees, done: (S, c) => c.shownT > 8 },
      { text: 'Hurt squads can RETREAT: at base they refill.', target: { kind: 'cmd', arg: 'retreat' }, when: (S) => own(S).some((u) => u.kind === 'inf' && u.members.filter((m) => m.alive).length <= 3), done: (S, c) => c.shownT > 8 },
    ],
    m3: [
      { text: 'Scouts see farther than anyone. You cannot shoot what you cannot see.', target: { kind: 'card', arg: 'scout' }, when: () => true, done: (S, c) => c.shownT > 8 || own(S).some((u) => u.type === 'scout') },
      { text: 'ARTILLERY: tap the card, then the target. Mind your own men.', target: { kind: 'card', arg: 'arty' }, when: (S) => !BL.canAfford(S, 0, 'arty') && sees(S), done: (S, c) => c.shownT > 9 || S.strikes.some((s) => s.team === 0) },
      { text: 'Hold more sectors than the enemy and their line drains.', when: () => true, done: (S, c) => c.shownT > 8 },
    ],
    m4: [
      { text: 'Vehicles deploy at the base. Infantry can deploy at sectors you hold.', target: { kind: 'card', arg: 'tank' }, when: () => true, done: (S, c) => c.shownT > 8 },
      { text: 'Rifle squads carry one AT rocket. Tanks break armour.', when: (S) => S.units.some((u) => u.alive && u.team === 1 && u.kind === 'veh' && BL.visible(S, 0, u)), done: (S, c) => c.shownT > 8 },
    ],
    m5: [
      { text: 'The helicopter hits anything on the ground. Keep it away from autocannons.', target: { kind: 'unit', type: 'heli' }, when: () => true, done: (S, c) => c.shownT > 8 },
      { text: 'DROP lands a squad by rope anywhere you can see.', target: { kind: 'card', arg: 'insert' }, when: (S) => !BL.canAfford(S, 0, 'insert'), done: (S, c) => c.shownT > 8 },
    ],
  };

  // ---------------------------------------------------------------- battle set-up

  function battleOptions(M, P, seed, difficulty) {
    const isSkirmish = M.id === 'skirmish';
    const mine = isSkirmish ? unlockedCards(P) : M.allowed;
    const theirs = isSkirmish ? unlockedCards(P) : M.enemyAllowed;
    return {
      seed, difficulty,
      ai: [false, true],
      allowed: [mine ? mine.slice() : null, theirs ? theirs.slice() : null],
      sectors: M.sectors || null,
      drain: M.drain !== false,
      startRP: [M.startRP, M.id === 'm5' || isSkirmish ? 350 : 0],
      aiCfg: [{}, M.ai || {}],
      calm: true,
    };
  }

  function setupBattle(S, M) {
    for (const s of M.setup || []) {
      const u = BL.spawn(S, s.team, s.type, s.x, s.order || { type: 'hold', x: s.x });
      u.members.forEach((m) => { m.y = BL.heightAt(S.field, m.x) + (u.kind === 'air' ? 150 : 0); });
    }
    if (M.insert) {
      S.teams[0].rp += BL.SUPPORT.insert.cost;
      const saveCd = S.teams[0].cds.insert;
      const saved = S.allowed[0];
      S.allowed[0] = null;
      const r = BL.deploy(S, 0, 'insert', M.insert.x, true);
      if (!r.ok) throw new Error('mission insert failed: ' + r.reason);
      S.allowed[0] = saved;
      S.teams[0].cds.insert = saveCd || 0;
      S.teams[0].stats.spent -= BL.SUPPORT.insert.cost;
      S.teams[0].stats.deployed--;
    }
    return { t: 0, wave: 0, hintsDone: {}, result: null };
  }

  // ---------------------------------------------------------------- mission tick

  function tick(S, M, ms, dt) {
    if (S.calm || ms.result) return;
    ms.t += dt;
    const waves = M.waves || [];
    while (ms.wave < waves.length && waves[ms.wave].t <= ms.t) {
      const w = waves[ms.wave++];
      w.units.forEach((type, i) => {
        const x = (M.waveX || S.field.W - 260) + i * 34;
        const tgt = sector(S, M.objective.sector);
        BL.spawn(S, 1, type, x, { type: 'attack', x: tgt ? tgt.x + 30 : 1300 });
      });
      S.events.push({ t: 'wave', n: ms.wave, of: waves.length });
    }
    const st = evaluate(S, M, ms);
    if (st.status !== 'run') {
      ms.result = st.status;
      BL.endBattle(S, st.status === 'win' ? 0 : 1);
    }
  }

  function evaluate(S, M, ms) {
    const o = M.objective;
    if (S.over) return { status: S.winner === 0 ? 'win' : 'lose' };
    const sec = o.sector ? sector(S, o.sector) : null;
    if (o.type === 'capture') {
      if (sec.owner === 0) return { status: 'win' };
      if (!S.drain && stranded(S)) return { status: 'lose' };
    } else if (o.type === 'hold') {
      if (sec.owner === 1) return { status: 'lose' };
      if (ms.t >= o.dur) return { status: 'win' };
    }
    return { status: 'run' };
  }

  // Nothing left in the field and nothing affordable soon: the attack has failed.
  function stranded(S) {
    if (S.units.some((u) => u.alive && u.team === 0) || S.transports.some((t) => t.team === 0)) return false;
    return S.teams[0].rp < 60 && S.t > 60;
  }

  function progressText(S, M, ms) {
    const o = M.objective;
    if (o.type === 'capture') {
      const s = sector(S, o.sector);
      const k = Math.round((s.prog + 100) / 2);
      return `${o.text}  ·  ${s.owner === 0 ? 'SECURED' : s.contested ? 'CONTESTED' : k + '%'}`;
    }
    if (o.type === 'hold') {
      const left = Math.max(0, o.dur - (ms ? ms.t : 0));
      return `${o.text}  ·  ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    }
    return o.text;
  }

  function stars(S, M, won) {
    if (!won) return 0;
    let n = 1;
    if (S.teams[0].stats.lost <= M.maxLoss) n++;
    if ((S.endT || S.t) <= M.par + 25) n++;
    return n;
  }

  // ---------------------------------------------------------------- progress (saved)

  function loadProgress(store) {
    try {
      const raw = store && store.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') return { stars: p.stars || {}, seen: p.seen || {} };
      }
    } catch (e) { /* storage blocked: play without saving */ }
    return { stars: {}, seen: {} };
  }

  function saveProgress(store, P) {
    try { if (store) store.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignore */ }
  }

  function unlockedCards(P) {
    const out = BASE_UNITS.slice();
    for (const M of MISSIONS) if ((P.stars[M.id] || 0) > 0) for (const u of M.unlocks) if (!out.includes(u)) out.push(u);
    return BL.DEPLOY_ORDER.filter((k) => out.includes(k));
  }

  function missionOpen(P, i) { return i === 0 || (P.stars[MISSIONS[i - 1].id] || 0) > 0; }
  function skirmishOpen(P) { return (P.stars.m1 || 0) > 0; }

  function record(P, M, n) {
    const before = unlockedCards(P);
    if (n > (P.stars[M.id] || 0)) P.stars[M.id] = n;
    return unlockedCards(P).filter((k) => !before.includes(k));
  }

  const RANKS = [[0, 'RECRUIT'], [2, 'PRIVATE'], [4, 'CORPORAL'], [6, 'SERGEANT'], [8, 'LIEUTENANT'], [11, 'CAPTAIN'], [14, 'MAJOR'], [15, 'COLONEL']];
  function rank(P) {
    let total = 0;
    for (const M of MISSIONS) total += P.stars[M.id] || 0;
    let name = RANKS[0][1];
    for (const [n, r] of RANKS) if (total >= n) name = r;
    return { total, max: MISSIONS.length * 3, name };
  }

  BL.campaign = {
    MISSIONS, SKIRMISH, DOSSIER, HINTS, KEY,
    battleOptions, setupBattle, tick, evaluate, progressText, stars,
    loadProgress, saveProgress, unlockedCards, missionOpen, skirmishOpen, record, rank,
  };
})(typeof window !== 'undefined' ? window : globalThis);
