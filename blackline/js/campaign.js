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
      id: 'm1', num: '01', name: 'THE FORD', map: 'ford', time: '0214 HRS', place: 'THE STREAM', sky: 'HEAVY RAIN',
      summary: 'Cross the stream at the ford and take the wooded hill at A.',
      brief: [
        'The bridges are down. One ford is still passable.',
        'Two enemy squads hold the wooded hill at sector A.',
        'Our lead platoon is at the start line.',
        'Cross at the ford. Take sector A before first light.',
      ],
      shots: [
        { x: 1400, y: 850, z: 0.42, dur: 4.6, line: 0 },
        { x: 1480, y: 780, z: 1.5, dur: 4.6, line: 1, reveal: true },
        { x: 1110, y: 800, z: 1.4, dur: 4.2, line: 3 },
        { x: 330, y: 880, z: 1.6, dur: 3.8, line: 2 },
      ],
      weather: { rain: 1.15, wind: 0.3, bolts: [7, 14] },
      allowed: ['rifle'], enemyAllowed: ['rifle'],
      sectors: { A: 1 }, drain: false, startRP: 100,
      setup: [
        { team: 0, type: 'rifle', x: 300, y: 820 },
        { team: 0, type: 'rifle', x: 320, y: 950 },
        { team: 1, type: 'rifle', x: 1490, y: 740 },
        { team: 1, type: 'rifle', x: 1390, y: 860 },
      ],
      ai: { buy: false, support: false, mode: 'defend' },
      objective: { type: 'capture', sector: 'A', text: 'TAKE SECTOR A' },
      intro: ['rifle'], par: 360, maxLoss: 8, unlocks: ['mg'], hints: 'm1',
    },
    {
      id: 'm2', num: '02', name: 'THE GUNLINE', map: 'ford', time: '0347 HRS', place: 'SECTOR A', sky: 'WIND RISING',
      summary: 'Hold the hill at A against their counterattack.',
      brief: [
        'They want the hill back.',
        'Their companies are massing on the far ridge.',
        'A machine-gun team has reached our trench.',
        'Hold sector A until the guns behind us are ready.',
      ],
      shots: [
        { x: 1800, y: 850, z: 0.5, dur: 4.4, line: 0 },
        { x: 2400, y: 900, z: 1.2, dur: 4.6, line: 1, reveal: true },
        { x: 1395, y: 760, z: 2.0, dur: 4.6, line: 2 },
        { x: 1550, y: 780, z: 1.1, dur: 3.6, line: 3 },
      ],
      weather: { rain: 1.0, wind: 0.55, bolts: [6, 12] },
      allowed: ['rifle', 'mg'], enemyAllowed: ['rifle', 'mg'],
      sectors: { A: 0, B: 1, C: 1 }, drain: false, startRP: 220,
      setup: [
        { team: 0, type: 'rifle', x: 1395, y: 860 },
        { team: 0, type: 'mg', x: 1390, y: 760 },
      ],
      waves: [
        { t: 16, units: ['rifle'] },
        { t: 55, units: ['rifle', 'rifle'] },
        { t: 105, units: ['rifle', 'mg', 'rifle'] },
        { t: 160, units: ['rifle', 'mg', 'rifle', 'rifle'] },
      ],
      waveAt: { x: 2560, y: 820, spread: 140 },
      ai: { buy: false, support: false, mode: 'assault' },
      objective: { type: 'hold', sector: 'A', dur: 210, text: 'HOLD SECTOR A' },
      intro: ['mg'], par: 210, maxLoss: 10, unlocks: ['scout', 'arty'], hints: 'm2',
    },
    {
      id: 'm3', num: '03', name: 'EYES ON THE RIDGE', map: 'ridge', time: '0420 HRS', place: 'SECTOR B', sky: 'LIGHTNING',
      summary: 'Find their guns on the ridge and take sector B.',
      brief: [
        'The ridge at B looks down on everything.',
        'Their gunners are dug in among the ruins.',
        'Scouts can see what our rifles cannot.',
        'The batteries are ready. Spot for them. Take B.',
      ],
      shots: [
        { x: 1700, y: 950, z: 0.42, dur: 4.4, line: 0 },
        { x: 1710, y: 960, z: 1.8, dur: 4.8, line: 1, reveal: true },
        { x: 900, y: 900, z: 1.6, dur: 4.2, line: 2 },
        { x: 1300, y: 940, z: 0.8, dur: 3.8, line: 3 },
      ],
      weather: { rain: 0.9, wind: 0.4, bolts: [4, 8] },
      allowed: ['rifle', 'mg', 'scout', 'arty'], enemyAllowed: ['rifle', 'mg', 'arty'],
      sectors: { A: 0, B: 1, C: 1 }, drain: true, startRP: 320,
      setup: [
        { team: 0, type: 'rifle', x: 930, y: 860 },
        { team: 0, type: 'mg', x: 880, y: 960 },
        { team: 1, type: 'mg', x: 1690, y: 900 },
        { team: 1, type: 'rifle', x: 1640, y: 1040 },
        { team: 1, type: 'rifle', x: 1770, y: 1000 },
      ],
      ai: { buy: true, support: true, mode: 'defend', incomeMul: 0.6, artyT: 80 },
      objective: { type: 'capture', sector: 'B', text: 'TAKE SECTOR B' },
      intro: ['scout', 'arty'], par: 420, maxLoss: 14, unlocks: ['apc', 'tank'], hints: 'm3',
    },
    {
      id: 'm4', num: '04', name: 'IRON IN THE RAIN', map: 'ridge', time: '0455 HRS', place: 'THE VILLAGE', sky: 'ARMOUR REPORTED',
      summary: 'Their armour holds the village. Break it and take C.',
      brief: [
        'The ridge is ours. Engines in the village below.',
        'Their tanks are dug in at sector C.',
        'Our armour has come up the road. Tanks and carriers.',
        'Break their armour and take the village.',
      ],
      shots: [
        { x: 2300, y: 1000, z: 0.5, dur: 4.2, line: 0 },
        { x: 2640, y: 1010, z: 1.5, dur: 4.8, line: 1, reveal: true },
        { x: 360, y: 950, z: 1.7, dur: 4.4, line: 2 },
        { x: 2100, y: 1000, z: 0.8, dur: 3.8, line: 3 },
      ],
      weather: { rain: 1.1, wind: 0.5, bolts: [6, 11] },
      allowed: ['rifle', 'mg', 'scout', 'arty', 'apc', 'tank'], enemyAllowed: ['rifle', 'mg', 'apc', 'tank'],
      sectors: { A: 0, B: 0, C: 1 }, drain: true, startRP: 520,
      setup: [
        { team: 0, type: 'rifle', x: 1700, y: 960 },
        { team: 0, type: 'mg', x: 1690, y: 1020 },
        { team: 0, type: 'scout', x: 1780, y: 960 },
        { team: 0, type: 'tank', x: 330, y: 950 },
        { team: 1, type: 'tank', x: 2700, y: 1010 },
        { team: 1, type: 'apc', x: 2620, y: 1180 },
        { team: 1, type: 'rifle', x: 2600, y: 960 },
        { team: 1, type: 'mg', x: 2490, y: 1000 },
      ],
      ai: { buy: true, support: false, mode: 'push', incomeMul: 0.7 },
      objective: { type: 'capture', sector: 'C', text: 'TAKE SECTOR C' },
      intro: ['tank', 'apc'], par: 480, maxLoss: 16, unlocks: ['heli', 'insert'], hints: 'm4',
    },
    {
      id: 'm5', num: '05', name: 'BLACK RAIN', map: 'valley', time: '0530 HRS', place: 'THE VALLEY', sky: 'THE STORM BREAKS',
      summary: 'Everything we have. Break their line.',
      brief: [
        'Their reserve has come up. They want all of it back.',
        'Every sector in the valley is in play.',
        'Air support is cleared to fly in this weather.',
        'Break the eastern line.',
      ],
      shots: [
        { x: 1800, y: 1000, z: 0.34, dur: 4.6, line: 0 },
        { x: 2700, y: 1200, z: 1.0, dur: 4.4, line: 1, reveal: true },
        { x: 260, y: 1000, z: 1.7, dur: 4.4, line: 2 },
        { x: 1100, y: 800, z: 0.7, dur: 3.8, line: 3 },
      ],
      weather: { rain: 1.3, wind: 0.65, bolts: [4, 9] },
      allowed: null, enemyAllowed: null, sectors: null, drain: true, startRP: 350,
      setup: [
        { team: 0, type: 'rifle', x: 280, y: 940, order: { type: 'hold', x: 360, y: 940 } },
        { team: 0, type: 'heli', x: 220, y: 1060 },
        { team: 1, type: 'rifle', x: 3320, y: 1060 },
      ],
      ai: {},
      objective: { type: 'break', text: 'BREAK THE EASTERN LINE' },
      intro: ['heli', 'insert'], par: 720, maxLoss: 30, unlocks: [], hints: 'm5',
    },
  ];

  const SKIRMISH = {
    id: 'skirmish', num: '', name: 'SKIRMISH', map: 'valley', time: 'NIGHT', place: 'THE VALLEY', sky: 'STORM',
    brief: ['Night. A storm over three sectors.', 'Hold more of them than the enemy does.', 'Break their line.'],
    shots: [
      { x: 1800, y: 1000, z: 0.34, dur: 4.2, line: 0, reveal: true },
      { x: 1800, y: 1000, z: 1.3, dur: 4, line: 1, reveal: true },
      { x: 360, y: 1000, z: 1.4, dur: 3.6, line: 2 },
    ],
    weather: { rain: 1.1, wind: 0.45, bolts: [5, 12] },
    drain: true, startRP: 350,
    setup: [
      { team: 0, type: 'rifle', x: 280, y: 940, order: { type: 'hold', x: 360, y: 940 } },
      { team: 1, type: 'rifle', x: 3320, y: 1060 },
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

  // Tutorial hints. when/done take (S, c) where c = { selected, shownT, deployOpen }.
  const own = (S) => S.units.filter((u) => u.alive && u.team === 0);
  const sees = (S) => S.units.some((u) => u.alive && u.team === 1 && BL.visible(S, 0, u));
  const sector = (S, id) => S.field.sectors.find((s) => s.id === id);
  const near = (u, s, r) => Math.hypot(u.x - s.x, u.y - s.y) < r;
  const HINTS = {
    m1: [
      { text: 'Your units are listed on the left. Tap one to command it.', target: { kind: 'roster' }, when: () => true, done: (S, c) => c.selected.size > 0 },
      { text: 'Now tap the map near flag A. The squad finds its way there.', target: { kind: 'sector', id: 'A' }, when: (S, c) => c.selected.size > 0, done: (S) => own(S).some((u) => near(u.order, sector(S, 'A'), 320) || near(u, sector(S, 'A'), 520)) },
      { text: 'Drag the map to look around. Pinch or scroll to zoom.', when: () => true, done: (S, c) => c.shownT > 7 },
      { text: 'Reinforcements: tap DEPLOY, pick RIFLE, then tap a glowing ring.', target: { kind: 'deploy' }, when: (S) => !BL.canAfford(S, 0, 'rifle'), done: (S) => S.teams[0].stats.deployed >= 1 },
      { text: 'Contact. ATTACK makes a squad stop and fight; MOVE keeps it going.', target: { kind: 'cmd', arg: 'attack' }, when: sees, done: (S, c) => c.shownT > 8 },
      { text: 'Stand inside the ring around the flag to take the sector.', target: { kind: 'sector', id: 'A' }, when: (S) => own(S).some((u) => near(u, sector(S, 'A'), 420)), done: (S, c) => sector(S, 'A').prog > -40 || c.shownT > 10 },
    ],
    m2: [
      { text: 'Machine guns must set up before they fire. Keep them still.', target: { kind: 'roster', type: 'mg' }, when: () => true, done: (S, c) => c.shownT > 7 },
      { text: 'HOLD digs a unit in where it stands: harder to hit.', target: { kind: 'cmd', arg: 'hold' }, when: (S, c) => c.selected.size > 0, done: (S, c) => c.shownT > 7 },
      { text: 'Pinned men go prone and stop advancing. Fire wins the fight.', when: sees, done: (S, c) => c.shownT > 8 },
      { text: 'Hurt squads can RETREAT: at base they refill.', target: { kind: 'cmd', arg: 'retreat' }, when: (S) => own(S).some((u) => u.kind === 'inf' && u.members.filter((m) => m.alive).length <= 3), done: (S, c) => c.shownT > 8 },
    ],
    m3: [
      { text: 'Scouts see farther than anyone. You cannot shoot what you cannot see.', target: { kind: 'deploy' }, when: () => true, done: (S, c) => c.shownT > 8 || own(S).some((u) => u.type === 'scout') },
      { text: 'Woods hide whoever stands in them. Ridges block sight.', when: () => true, done: (S, c) => c.shownT > 8 },
      { text: 'ARTILLERY: pick it in DEPLOY, then tap the target. Mind your own men.', target: { kind: 'deploy' }, when: (S) => !BL.canAfford(S, 0, 'arty') && sees(S), done: (S, c) => c.shownT > 9 || S.strikes.some((s) => s.team === 0) },
    ],
    m4: [
      { text: 'Vehicles deploy at the base. Infantry can deploy at sectors you hold.', target: { kind: 'deploy' }, when: () => true, done: (S, c) => c.shownT > 8 },
      { text: 'Rifle squads carry one AT rocket. Tanks break armour.', when: (S) => S.units.some((u) => u.alive && u.team === 1 && u.kind === 'veh' && BL.visible(S, 0, u)), done: (S, c) => c.shownT > 8 },
    ],
    m5: [
      { text: 'The helicopter hits anything on the ground. Keep it away from carriers.', target: { kind: 'roster', type: 'heli' }, when: () => true, done: (S, c) => c.shownT > 8 },
      { text: 'DROP lands a squad by rope anywhere you can see.', target: { kind: 'deploy' }, when: (S) => !BL.canAfford(S, 0, 'insert'), done: (S, c) => c.shownT > 8 },
    ],
  };

  // ---------------------------------------------------------------- battle set-up

  function battleOptions(M, P, seed, difficulty) {
    const isSkirmish = M.id === 'skirmish';
    const mine = isSkirmish ? unlockedCards(P) : M.allowed;
    const theirs = isSkirmish ? unlockedCards(P) : M.enemyAllowed;
    return {
      seed, difficulty, map: M.map || 'valley',
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
    for (const s of M.setup || []) BL.spawn(S, s.team, s.type, s.x, s.y, s.order || null);
    return { t: 0, wave: 0, result: null };
  }

  // ---------------------------------------------------------------- mission tick

  function tick(S, M, ms, dt) {
    if (S.calm || ms.result) return;
    ms.t += dt;
    const waves = M.waves || [];
    while (ms.wave < waves.length && waves[ms.wave].t <= ms.t) {
      const w = waves[ms.wave++];
      const at = M.waveAt || { x: S.field.W - 260, y: S.field.H / 2, spread: 120 };
      const tgt = sector(S, M.objective.sector);
      w.units.forEach((type, i) => {
        const y = at.y + (i - (w.units.length - 1) / 2) * (at.spread / Math.max(1, w.units.length - 1));
        BL.spawn(S, 1, type, at.x + (i % 2) * 30, y, { type: 'attack', x: tgt ? tgt.x + 40 : at.x - 800, y: tgt ? tgt.y + (i - 1) * 30 : y });
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
