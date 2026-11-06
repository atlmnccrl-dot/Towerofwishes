// EMBERFALL — the screens: title, the road map, the camp (party, talents, gear, shop), results, pause, settings, credits.
(function () {
  const EF = window.EF; const D = EF.DATA; const S = EF.STORY; const R = EF.R;
  const U = EF.UI = { buttons: [], hover: null };
  U.clear = () => { U.buttons = []; };
  U.button = function (ctx, x, y, w, h, label, onClick, opts) {
    const o = opts || {}; const dis = !!o.disabled; const hot = U.hover === label && !dis;
    ctx.fillStyle = dis ? 'rgba(20,16,24,0.6)' : hot ? 'rgba(90,60,30,0.95)' : (o.primary ? 'rgba(120,70,30,0.9)' : 'rgba(24,18,30,0.9)'); ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = dis ? 'rgba(120,110,100,0.3)' : o.primary || hot ? '#ffd060' : 'rgba(230,190,120,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    if (o.icon) EF.drawIcon(ctx, o.icon[0], o.icon[1], o.icon[2], x + 4, y + (h - 16) / 2, 16, dis ? 0.4 : 1);
    R.text(ctx, label, x + (o.icon ? 24 : w / 2), y + h / 2 + 3, o.size || 8, dis ? '#776' : '#fff', o.icon ? 'left' : 'center', { bold: !!o.primary });
    if (!dis) U.buttons.push({ x, y, w, h, label, onClick });
  };
  U.hit = function (x, y) { for (let i = U.buttons.length - 1; i >= 0; i--) { const b = U.buttons[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; } return null; };
  U.backdrop = function (ctx, place, t, drift) { R.sky(ctx, place); const cam = { x: R.WORLD.w / 2 + Math.sin(t * 0.1) * 20 * (drift || 0), y: R.WORLD.h / 2 + 10, zoom: 1.15 }; R.drawWorld(ctx, place, cam, [], t); R.weather(ctx, S.PLACES[place].weather, t, R.W, R.H, 0.8); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, R.W, R.H); };

  // ---- title ----------------------------------------------------------------------------
  U.title = function (ctx, G, t, actions) {
    const place = 'nightwood'; R.sky(ctx, place);
    const cam = { x: R.WORLD.w / 2 + Math.sin(t * 0.15) * 14, y: R.WORLD.h / 2 + 8, zoom: 1.3 };
    const roster = G.roster.length ? G.roster : ['rook']; const fire = { x: R.WORLD.w / 2, y: R.WORLD.h / 2 + 30 };
    const dr = [{ y: fire.y, draw: g => { EF.drawProp(g, 'fv_campfire', fire.x, fire.y + 6); EF.drawFx(g, 'campfire', t, fire.x, fire.y - 10, 2.2); } }];
    const poses = { rook: ['Idle4', -70, 10], ysolde: ['Idle2', 60, -4], brannoc: ['CrouchIdle', -30, 36], tamsin: ['Idle3', 80, 30], mouse: ['CrouchIdle', 30, 44], wren: ['Idle', -80, -20] };
    for (const id of roster) { const h = D.HEROES[id]; const p = poses[id]; const x = fire.x + p[1], y = fire.y + p[2]; dr.push({ y, draw: g => { R.shadow(g, x, y, 9); EF.drawActor(g, h.sceneSet || h.set, p[0], EF.frameAt(p[0], t + id.length), Math.atan2(fire.y - y, fire.x - x), x, y, h.scale || 1); } }); }
    R.drawWorld(ctx, place, cam, dr, t); R.weather(ctx, 'fireflies', t, R.W, R.H, 0.8);
    // firelight
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const fx = (fire.x - cam.x) * cam.zoom + R.W / 2, fy = (fire.y - cam.y) * cam.zoom + R.H / 2; const g = ctx.createRadialGradient(fx, fy, 4, fx, fy, 90 + Math.sin(t * 7) * 4); g.addColorStop(0, 'rgba(255,140,50,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, 190, R.H);
    // logo
    ctx.save(); ctx.shadowColor = '#ff6a20'; ctx.shadowBlur = 12; R.text(ctx, 'EMBER', 18, 64, 34, '#ffb040', 'left', { bold: true }); R.text(ctx, 'FALL', 18, 98, 34, '#ff6030', 'left', { bold: true }); ctx.restore();
    R.text(ctx, 'THE SUN IS DEAD. NINE SHARDS REMAIN.', 18, 112, 6, '#d0c0b0');
    const items = [['NEW GAME', actions.newGame, { primary: !G.started }], ['CONTINUE', actions.cont, { primary: G.started, disabled: !G.started }], ['SETTINGS', actions.settings], ['CREDITS', actions.credits]];
    items.forEach(([l, f, o], i) => U.button(ctx, 18, 128 + i * 26, 120, 22, l, f, o));
    R.text(ctx, 'v1.0  ·  landscape  ·  keyboard or touch', 18, R.H - 8, 6, 'rgba(255,255,255,0.5)');
  };

  // ---- the road map ---------------------------------------------------------------------
  U.NODES = [[50, 190], [105, 140], [160, 195], [215, 120], [270, 170], [325, 110], [380, 165], [425, 100], [455, 190]];
  U.map = function (ctx, G, t, actions) {
    ctx.fillStyle = '#1a1410'; ctx.fillRect(0, 0, R.W, R.H);
    // parchment
    ctx.fillStyle = '#5a4a36'; ctx.fillRect(10, 30, R.W - 20, R.H - 60); ctx.fillStyle = '#6a5a44'; ctx.fillRect(14, 34, R.W - 28, R.H - 68);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(0,0,0,' + (0.05 + (i % 5) * 0.02) + ')'; const x = 14 + ((i * 97) % (R.W - 40)), y = 34 + ((i * 53) % (R.H - 80)); ctx.fillRect(x, y, 10 + (i % 7) * 4, 3 + (i % 3)); }
    // the road
    ctx.save(); ctx.strokeStyle = 'rgba(40,24,12,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); U.NODES.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
    // landmarks
    const marks = ['fv_well', 'cd_skull_on_pike', 'fv_tree_pine_snow', 'rock_big', 'ruin_pillar', 'monolith_b', 'tree_dark_a', 'cd_throne', 'stone_circle'];
    S.ACTS.forEach((a, i) => { const [x, y] = U.NODES[i]; const st = G.progress[a.id] || (i === 0 ? 'open' : 'locked'); const cur = st === 'open';
      ctx.save(); ctx.globalAlpha = st === 'locked' ? 0.35 : 0.9; EF.drawProp(ctx, marks[i], x, y - 10, 0.7); ctx.restore();
      ctx.fillStyle = st === 'done' ? '#c8a040' : cur ? '#c03030' : '#3a3030'; ctx.beginPath(); ctx.arc(x, y, cur ? 9 + Math.sin(t * 5) : 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1; ctx.stroke();
      R.text(ctx, a.num, x, y + 3, 7, st === 'locked' ? '#776' : '#fff', 'center', { bold: true });
      R.text(ctx, a.name.toUpperCase(), x, y + (i % 2 ? -20 : 22), 6, st === 'locked' ? 'rgba(255,255,255,0.3)' : '#f0e0c0', 'center');
      if (st !== 'locked') { const sel = G.sel === a.id; U.buttons.push({ x: x - 14, y: y - 14, w: 28, h: 28, label: 'node' + a.id, onClick: () => actions.select(a.id) }); if (sel) { ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke(); } }
    });
    // header
    R.text(ctx, 'THE ROAD TO THE DEAD SUN', R.W / 2, 20, 10, '#ffd0a0', 'center', { bold: true });
    EF.drawIcon(ctx, 2, 3, 0, 10, 6, 14); R.text(ctx, String(G.gold), 28, 17, 8, '#ffe080'); EF.drawIcon(ctx, 2, 0, 2, 60, 6, 14); R.text(ctx, 'x' + G.potions, 78, 17, 8, '#fff');
    U.button(ctx, R.W - 70, 4, 62, 18, 'CAMP', actions.camp, { icon: [2, 2, 5], size: 7 }); U.button(ctx, R.W - 136, 4, 62, 18, 'TITLE', actions.title, { size: 7 });
    // selected act panel
    const a = S.actById(G.sel); if (a) { const st = G.progress[a.id] || 'open'; R.panel(ctx, 40, R.H - 30, R.W - 80, 28);
      R.text(ctx, 'ACT ' + a.num + ' · ' + a.name.toUpperCase() + (st === 'done' ? ' · CLEARED' : ''), 48, R.H - 18, 8, '#ffe0b0', 'left', { bold: true });
      R.text(ctx, 'Party: ' + a.party.map(h => D.HEROES[h].name.split(' ')[0]).join(', '), 48, R.H - 8, 6, '#d0c0b0');
      U.button(ctx, R.W - 170, R.H - 27, 62, 22, st === 'done' ? 'REPLAY' : 'PLAY', () => actions.play(a.id), { primary: st !== 'done', size: 7 });
      if (st === 'done') U.button(ctx, R.W - 104, R.H - 27, 58, 22, 'HUNT', () => actions.hunt(a.id), { size: 7 });
    }
  };

  // ---- the camp -------------------------------------------------------------------------
  U.camp = function (ctx, G, t, actions) {
    U.backdrop(ctx, 'court', t, 1); R.text(ctx, 'CAMP', R.W / 2, 16, 11, '#ffd0a0', 'center', { bold: true });
    EF.drawIcon(ctx, 2, 3, 0, 10, 6, 14); R.text(ctx, String(G.gold), 28, 17, 8, '#ffe080');
    const tabs = ['PARTY', 'SHOP']; tabs.forEach((tb, i) => U.button(ctx, 120 + i * 70, 4, 64, 18, tb, () => actions.tab(tb), { primary: G.tab === tb, size: 7 }));
    U.button(ctx, R.W - 70, 4, 62, 18, 'BACK', actions.back, { size: 7 });
    if (G.tab === 'SHOP') return U.shop(ctx, G, t, actions);
    // hero list
    G.roster.forEach((id, i) => { const h = D.HEROES[id]; const hs = G.heroes[id]; const y = 28 + i * 24; const sel = G.selHero === id;
      ctx.fillStyle = sel ? 'rgba(120,70,30,0.8)' : 'rgba(10,8,14,0.7)'; ctx.fillRect(6, y, 150, 22); ctx.drawImage(R.portrait(h.set, 18), 8, y + 2);
      R.text(ctx, h.name.toUpperCase(), 30, y + 9, 7, h.color, 'left', { bold: true }); R.text(ctx, 'Lv ' + hs.level + (hs.points ? '  +' + hs.points + ' pts' : ''), 30, y + 18, 6, hs.points ? '#ffd060' : '#d0c0b0');
      U.buttons.push({ x: 6, y, w: 150, h: 22, label: 'hero' + id, onClick: () => actions.selHero(id) }); });
    const id = G.selHero; if (!id) return; const h = D.HEROES[id]; const hs = G.heroes[id]; const st = D.levelStats(id, hs.level); const x = 164;
    R.panel(ctx, x, 28, R.W - x - 6, R.H - 34);
    R.text(ctx, h.name.toUpperCase() + ', ' + h.title, x + 8, 40, 8, h.color, 'left', { bold: true });
    const bio = R.wrap(ctx, h.bio, 6, R.W - x - 24); bio.forEach((s, i) => R.text(ctx, s, x + 8, 50 + i * 8, 6, '#d0c0b0'));
    const gear = U.gearStats(G, id); R.text(ctx, `HP ${st.hp + gear.hp}   ATK ${st.atk + gear.atk}   DEF ${st.def + gear.def}   SPD ${Math.round(st.spd)}`, x + 8, 76, 7, '#fff');
    R.text(ctx, 'XP ' + hs.xp + ' / ' + D.xpForLevel(hs.level), x + 8, 86, 6, '#c0b0a0');
    R.text(ctx, h.special.name.toUpperCase() + ': ' + h.special.desc, x + 8, 96, 6, '#e0d0ff');
    // gear slots
    ['weapon', 'armor', 'trinket'].forEach((slot, i) => { const it = D.ITEMS[hs.items[slot]]; const bx = x + 8 + i * 100; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx, 104, 96, 24); ctx.strokeStyle = 'rgba(230,190,120,0.4)'; ctx.strokeRect(bx + 0.5, 104.5, 95, 23);
      if (it) EF.drawIcon(ctx, it.icon[0], it.icon[1], it.icon[2], bx + 3, 108, 16); R.text(ctx, it ? it.name : '(no ' + slot + ')', bx + 22, 114, 6, it ? '#fff' : '#887'); R.text(ctx, it ? it.desc : 'tap to equip', bx + 22, 123, 5, '#b0a090');
      U.buttons.push({ x: bx, y: 104, w: 96, h: 24, label: 'slot' + slot, onClick: () => actions.cycleGear(id, slot) }); });
    // talents
    R.text(ctx, 'TALENTS' + (hs.points ? '   (' + hs.points + ' points to spend)' : ''), x + 8, 142, 7, '#ffd060', 'left', { bold: true });
    D.TALENTS[id].forEach((tl, i) => { const y = 148 + i * 26; const rank = hs.talents[tl.id] || 0; EF.drawIcon(ctx, tl.icon[0], tl.icon[1], tl.icon[2], x + 8, y + 2, 20);
      R.text(ctx, tl.name.toUpperCase() + '  ' + '◆'.repeat(rank) + '◇'.repeat(3 - rank), x + 32, y + 10, 7, rank ? '#ffe0a0' : '#fff'); R.text(ctx, tl.desc, x + 32, y + 19, 5, '#c0b0a0');
      U.button(ctx, R.W - 36, y + 2, 26, 20, '+', () => actions.talent(id, tl.id), { disabled: !hs.points || rank >= 3, size: 10 }); });
  };
  U.gearStats = function (G, id) { const hs = G.heroes[id]; const r = { hp: 0, atk: 0, def: 0 }; for (const k of Object.values(hs.items)) { const it = D.ITEMS[k]; if (it) { r.hp += it.hp || 0; r.atk += it.atk || 0; r.def += it.def || 0; } } return r; };
  U.shop = function (ctx, G, t, actions) {
    R.text(ctx, 'THE QUARTERMASTER   ·   buy gear, equip it on PARTY. Draughts heal 40% in a fight.', R.W / 2, 34, 6, '#d0c0b0', 'center');
    D.ITEM_ORDER.forEach((id, i) => { const it = D.ITEMS[id]; const col = i < 8 ? 0 : 1; const row = i % 8; const x = 8 + col * 234, y = 42 + row * 27; const owned = G.inventory[id] || 0; const equipped = Object.values(G.heroes).filter(h => Object.values(h.items).includes(id)).length;
      const locked = it.price > 600 && G.actsDone < 4 || it.price > 1100 && G.actsDone < 7; ctx.fillStyle = 'rgba(10,8,14,0.75)'; ctx.fillRect(x, y, 230, 25); EF.drawIcon(ctx, it.icon[0], it.icon[1], it.icon[2], x + 3, y + 4, 18, locked ? 0.3 : 1);
      R.text(ctx, locked ? '???' : it.name.toUpperCase(), x + 26, y + 10, 7, locked ? '#776' : '#fff', 'left', { bold: true }); R.text(ctx, locked ? 'Clear more of the road.' : it.desc + (it.atk ? ' +' + it.atk + ' ATK' : '') + (it.hp ? ' +' + it.hp + ' HP' : '') + (it.def ? ' +' + it.def + ' DEF' : ''), x + 26, y + 19, 5, '#c0b0a0');
      if (owned || equipped) R.text(ctx, 'x' + owned + (equipped ? ' (' + equipped + ' worn)' : ''), x + 170, y + 10, 5, '#a0d0a0', 'right');
      U.button(ctx, x + 174, y + 3, 52, 19, String(it.price), () => actions.buy(id), { disabled: locked || G.gold < it.price, icon: [2, 3, 0], size: 6 }); });
  };

  // ---- results --------------------------------------------------------------------------
  U.results = function (ctx, G, res, t, actions) {
    U.backdrop(ctx, res.place, t, 0); const win = res.result === 'win';
    R.text(ctx, win ? (res.boss ? res.bossName.toUpperCase() + ' IS DUST' : 'VICTORY') : 'DOWN, NOT OUT', R.W / 2, 36, 16, win ? '#ffd060' : '#ff8060', 'center', { bold: true });
    R.text(ctx, win ? ('Rank ' + res.rank + '   ·   ' + res.stats.kills + ' slain   ·   ' + res.stats.maxCombo + ' hit combo   ·   ' + res.stats.perfect + ' perfect dodges   ·   ' + Math.round(res.stats.time) + 's') : 'Nothing is lost. Retry, or go to camp and come back stronger.', R.W / 2, 52, 7, '#e0d0c0', 'center');
    if (win) {
      R.panel(ctx, 40, 62, R.W - 80, 120);
      EF.drawIcon(ctx, 2, 3, 0, 50, 68, 16); R.text(ctx, '+' + res.gold + ' gold', 70, 80, 8, '#ffe080'); EF.drawIcon(ctx, 2, 0, 3, 150, 68, 16); R.text(ctx, '+' + res.xp + ' xp each', 170, 80, 8, '#c0e0ff');
      if (res.loot) { EF.drawIcon(ctx, res.loot.icon[0], res.loot.icon[1], res.loot.icon[2], 260, 68, 16); R.text(ctx, 'FOUND: ' + res.loot.name, 280, 80, 8, '#ffd0a0'); }
      res.levels.forEach((l, i) => { const h = D.HEROES[l.id]; const y = 96 + i * 14; ctx.drawImage(R.portrait(h.set, 12), 50, y - 9); R.text(ctx, h.name.toUpperCase(), 66, y, 7, h.color); R.bar(ctx, 150, y - 7, 160, 7, l.frac, '#80c0ff'); R.text(ctx, 'Lv ' + l.level + (l.ups ? '  LEVEL UP! +' + l.ups + ' talent pt' : ''), 316, y, 7, l.ups ? '#ffd060' : '#fff'); });
    }
    if (win) U.button(ctx, R.W / 2 - 60, R.H - 50, 120, 24, 'CONTINUE', actions.cont, { primary: true });
    else { U.button(ctx, R.W / 2 - 130, R.H - 50, 120, 24, 'RETRY', actions.retry, { primary: true }); U.button(ctx, R.W / 2 + 10, R.H - 50, 120, 24, 'TO CAMP', actions.camp); }
  };
  U.pause = function (ctx, G, t, actions) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, R.W, R.H); R.text(ctx, 'PAUSED', R.W / 2, 60, 16, '#ffd0a0', 'center', { bold: true });
    const items = [['RESUME', actions.resume, { primary: true }], [G.settings.auto ? 'FULL AUTO: ON' : 'FULL AUTO: OFF', actions.auto], ['SETTINGS', actions.settings], ['LEAVE FIGHT', actions.leave]];
    items.forEach(([l, f, o], i) => U.button(ctx, R.W / 2 - 70, 84 + i * 28, 140, 24, l, f, o));
  };
  U.settings = function (ctx, G, t, actions) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, R.W, R.H); R.text(ctx, 'SETTINGS', R.W / 2, 40, 14, '#ffd0a0', 'center', { bold: true }); const s = G.settings;
    const items = [['MUSIC: ' + (s.music ? 'ON' : 'OFF'), () => actions.toggle('music')], ['SOUND: ' + (s.sfx ? 'ON' : 'OFF'), () => actions.toggle('sfx')], ['SKIP SCENES: ' + (s.skip ? 'ON' : 'OFF'), () => actions.toggle('skip')], ['FULL AUTO FIGHTS: ' + (s.auto ? 'ON' : 'OFF'), () => actions.toggle('auto')], ['TOUCH CONTROLS: ' + (s.touch ? 'ON' : 'OFF'), () => actions.toggle('touch')], ['BACK', actions.back, { primary: true }]];
    items.forEach(([l, f, o], i) => U.button(ctx, R.W / 2 - 90, 56 + i * 27, 180, 23, l, f, o));
    R.text(ctx, 'Keyboard: WASD/arrows move · J attack · K heavy · SPACE dodge · L special · Q Ember Surge · TAB swap hero · E draught · ESC pause', R.W / 2, R.H - 12, 5, '#b0a090', 'center');
  };
  U.credits = function (ctx, G, t, actions) {
    U.backdrop(ctx, 'deadsun', t, 1); R.text(ctx, 'CREDITS', R.W / 2, 34, 14, '#ffd0a0', 'center', { bold: true });
    const lines = ['EMBERFALL · a pixel action RPG', '', 'Characters: Character Creator 2D Fantasy (itch.io), built per character', 'Tiles, props and effects: the packed atlases in assets/', 'UI icons: Medieval Fantasy UI by Kibyra (free for commercial use)', 'Font: Adventurer', 'Music: "Heartfelt Battle" (OpenGameArt, CC0)', 'Particles: Brackeys (see assets/vfx/LICENSE-brackeys.txt)', 'Fight sounds and ambience: synthesised (tools/make_sfx.py)', '', 'Story, design and code: written for this game.'];
    lines.forEach((s, i) => R.text(ctx, s, R.W / 2, 56 + i * 13, 7, i === 0 ? '#ffe0a0' : '#e0d0c0', 'center'));
    U.button(ctx, R.W / 2 - 50, R.H - 34, 100, 22, 'BACK', actions.back, { primary: true });
  };
  U.loading = function (ctx, frac) { ctx.fillStyle = '#0a0810'; ctx.fillRect(0, 0, R.W, R.H); R.text(ctx, 'EMBERFALL', R.W / 2, R.H / 2 - 10, 20, '#ffb040', 'center', { bold: true }); R.bar(ctx, R.W / 2 - 80, R.H / 2 + 6, 160, 8, frac, '#ff7030'); R.text(ctx, 'kindling ' + Math.round(frac * 100) + '%', R.W / 2, R.H / 2 + 26, 7, '#c0b0a0', 'center'); };
})();
