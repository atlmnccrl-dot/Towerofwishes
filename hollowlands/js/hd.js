'use strict';
// HOLLOWLANDS — the HUD and item screen drawn sharp at full screen resolution over the pixel world:
// bars, objective, pickup cards, damage numbers, messages, rank and callouts, boss bars, the item screen.
HL.HD = (() => {
  const H = { nums: [] };
  const P = HL.P, TAU = Math.PI * 2;
  const RAR = { common: '#ece4d1', forged: '#7fd8ff', relic: '#c88cff', named: '#ffc95a' };
  let ctx, S, G;
  const F = (px, w = 700, it = '') => it + ' ' + w + ' ' + Math.round(px * S) + 'px ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif';
  const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
  const txt = (s, x, y, size, col, align = 'left', w = 700, shadow = true, it = '') => {
    ctx.font = F(size, w, it); ctx.textAlign = align; ctx.textBaseline = 'top';
    if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(s, x + S * 0.35, y + S * 0.35); }
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  };
  const wrap = (s, maxW, size, w = 600) => {
    ctx.font = F(size, w); const out = [];
    for (const para of String(s).split('\n')) { let line = ''; for (const word of para.split(' ')) { const t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t; } out.push(line); }
    return out;
  };
  const icon = (id, x, y, size) => { const ic = HL.ART.icons[id]; if (!ic) return; ctx.imageSmoothingEnabled = false; ctx.drawImage(ic, Math.round(x), Math.round(y), Math.round(size), Math.round(size)); };
  const bar = (x, y, w, h, f, col, trail) => {
    rr(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(10,8,8,0.6)'; ctx.fill();
    if (trail > f) { rr(x, y, w * HL.clamp(trail, 0, 1), h, h / 2); ctx.fillStyle = 'rgba(196,71,63,0.75)'; ctx.fill(); }
    if (f > 0) { rr(x, y, Math.max(h, w * HL.clamp(f, 0, 1)), h, h / 2); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); ctx.fillStyle = g; ctx.fill(); }
    rr(x, y, w, h, h / 2); ctx.strokeStyle = 'rgba(236,228,209,0.35)'; ctx.lineWidth = Math.max(1, S * 0.3); ctx.stroke();
  };
  const region = (x, y, w, h, fn) => HL.UI.region(x / S, y / S, w / S, h / S, fn);

  // ---------------------------------------------------------------- damage numbers
  H.num = (e, n, crit, col) => { if (!HL.G.settings || HL.G.settings.dmgNums === false) return; H.nums.push({ x: e.x + (Math.random() - 0.5) * 6, y: e.y, h: e.type === 'keeper' ? 44 : e.type === 'brute' ? 26 : 16, n: Math.max(1, Math.round(n)), crit, col, t: 0 }); if (H.nums.length > 40) H.nums.shift(); };

  // ---------------------------------------------------------------- HUD
  H.hud = (c, Gm, dt) => {
    ctx = c; G = Gm; S = G.scale; const UI = HL.UI, p = G.player, W = G.W * S, Ht = G.H * S, L = (8 + G.safe.l) * S, Tp = (7 + G.safe.t) * S;
    ctx.save();
    // health, stamina, experience
    G.hpTrail = HL.approach(G.hpTrail == null ? p.hp : G.hpTrail, p.hp, dt * 25);
    const bw = 92 * S;
    bar(L, Tp, bw, 4.4 * S, p.hp / p.maxhp, p.hp < p.maxhp * 0.3 ? ['#ff7a6a', '#b8302a'] : ['#f6ecd6', '#c9b896'], G.hpTrail / p.maxhp);
    txt(Math.ceil(p.hp) + ' / ' + p.maxhp, L + bw + 3 * S, Tp - 0.6 * S, 4, 'rgba(236,228,209,0.85)', 'left', 700);
    bar(L, Tp + 6 * S, bw * 0.78, 2.4 * S, p.st / p.maxst, p.stDelay > 0.6 ? ['#8d8678', '#6b6560'] : ['#bfe8c8', '#7fae8c']);
    const f = G.flags, lvl = f.lvl || 1;
    bar(L, Tp + 10 * S, bw * 0.78, 1.6 * S, Math.min(1, (f.xp || 0) / HL.Epic.need(lvl)), ['#ffe08a', '#d8a040']);
    txt('LV ' + lvl, L + bw * 0.78 + 3 * S, Tp + 8.2 * S, 3.8, '#ffc95a', 'left', 800);
    if (p.regen > 0) txt('+regen', L + bw + 3 * S, Tp + 4.5 * S, 3.4, '#bfe8c8');
    // objective
    const ob = G.objective();
    let oy = Tp + 15 * S;
    if (ob) {
      UI.objFlash = Math.max(0, (UI.objFlash || 0) - dt);
      const lines = wrap(ob.text, 108 * S, 4.6), lh = 6.2 * S, ph = lines.length * lh + 9 * S;
      rr(L - 2 * S, oy - 1.5 * S, 116 * S, ph, 2.5 * S); ctx.fillStyle = 'rgba(12,9,9,0.5)'; ctx.fill();
      ctx.fillStyle = ob.optional ? '#8d8678' : UI.objFlash > 0 && Math.floor(G.time * 6) % 2 ? '#ffe08a' : '#d0a578'; ctx.fillRect(L - 2 * S, oy - 1.5 * S, Math.max(2, S * 0.7), ph);
      txt(UI.objFlash > 0 ? 'NEW OBJECTIVE' : 'OBJECTIVE', L + 1.5 * S, oy, 3.3, UI.objFlash > 0 ? '#ffe08a' : '#d0a578', 'left', 800, false);
      lines.forEach((l, i) => txt(l, L + 1.5 * S, oy + 5 * S + i * lh, 4.6, '#ece4d1', 'left', 600));
      oy += ph + 2 * S;
      const shr = Object.keys(HL.SHRINES).filter((k) => f['shrine:' + k]).length, sha = G.inv.lumen_shard || 0;
      if (shr || sha || f.lumen) txt('light ' + (f.lumen || 0) + '%   shrines ' + shr + '/' + Object.keys(HL.SHRINES).length + '   shards ' + sha + '/' + HL.SHARD_COUNT, L, oy, 3.6, '#9ff5ec', 'left', 700);
    }
    // ash
    UI.ashPop = Math.max(0, (UI.ashPop || 0) - dt);
    { const ax = L + 3 * S, ay = Ht - (12 + G.safe.b) * S, r = 3 * S * (1 + UI.ashPop * 0.6);
      const gr = ctx.createRadialGradient(ax, ay, 0, ax, ay, r); gr.addColorStop(0, '#fff0d8'); gr.addColorStop(0.5, '#ff9a6a'); gr.addColorStop(1, 'rgba(255,90,40,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ax, ay, r, 0, TAU); ctx.fill();
      txt(String(f.ash || 0), ax + 5 * S, ay - 3 * S, 5.2 + UI.ashPop * 2, UI.ashPop > 0 ? '#ffd0a0' : '#ece4d1', 'left', 800); }
    // pickup cards
    UI.feed.forEach((c2, i) => {
      c2.t += dt; if (i < UI.feed.length - 3) return; const a = c2.t < 0.15 ? c2.t / 0.15 : c2.t > 3 ? 1 - (c2.t - 3) : 1; if (a <= 0) return;
      const it = c2.id && HL.ITEMS[c2.id], col = it ? RAR[it.rarity] || (it.kind === 'key' ? '#e7c98d' : '#ece4d1') : '#ffb08a';
      const y = Ht * 0.34 + (i - Math.max(0, UI.feed.length - 3)) * 12.5 * S, x = L - (1 - Math.min(1, c2.t / 0.15)) * 30 * S, w = 82 * S, h = 10.5 * S;
      ctx.globalAlpha = HL.clamp(a, 0, 1);
      rr(x, y, w, h, 2 * S); ctx.fillStyle = 'rgba(12,9,9,0.72)'; ctx.fill(); ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(2, S * 0.8), h);
      if (c2.id) icon(c2.id, x + 2.5 * S, y + 0.75 * S, 9 * S);
      txt(c2.text || it.name, x + 13 * S, y + 1.2 * S, 4.4, col, 'left', 700, false);
      if (!c2.text) txt(it.rarity && it.rarity !== 'common' ? HL.RARITY[it.rarity] : it.kind === 'material' ? 'material' : it.kind, x + 13 * S, y + 6 * S, 3, 'rgba(236,228,209,0.6)', 'left', 600, false);
      if (c2.n > 1) txt('x' + c2.n, x + w - 2.5 * S, y + 2.5 * S, 4.6, '#ece4d1', 'right', 800, false);
      ctx.globalAlpha = 1;
    });
    UI.feed = UI.feed.filter((c2) => c2.t < 4);
    // style rank
    const cb = HL.Epic.combo, rk = HL.Epic.RANKS[cb.rank];
    if (cb.n >= 3) {
      const x = W - (34 + G.safe.r) * S, y = (30 + G.safe.t) * S, sc = 15 + (cb.pop > 0.5 ? 4 : 0);
      txt(rk[1], x, y, sc, rk[2], 'center', 900, true, 'italic');
      txt('x' + cb.n, x, y + sc * S * 0.95, 4.6, '#ece4d1', 'center', 800);
      bar(x - 12 * S, y + sc * S * 0.95 + 6.5 * S, 24 * S, 1.6 * S, Math.max(0, 1 - cb.t / 3.2), [rk[2], rk[2]]);
    }
    // area banner
    if (UI.banner) {
      const b = UI.banner; b.t += dt; const a = b.t < 0.4 ? b.t / 0.4 : b.t > 3 ? 1 - (b.t - 3) : 1;
      if (a <= 0) UI.banner = null; else {
        ctx.globalAlpha = HL.clamp(a, 0, 1);
        const y = Ht * 0.2; ctx.font = F(9, 800); const tw = ctx.measureText(b.s).width;
        txt(b.s, W / 2, y, 9, '#f6ecd6', 'center', 800);
        const lw = Math.min(W * 0.6, tw + 30 * S); const g2 = ctx.createLinearGradient(W / 2 - lw / 2, 0, W / 2 + lw / 2, 0); g2.addColorStop(0, 'rgba(236,228,209,0)'); g2.addColorStop(0.5, 'rgba(236,228,209,0.8)'); g2.addColorStop(1, 'rgba(236,228,209,0)'); ctx.fillStyle = g2; ctx.fillRect(W / 2 - lw / 2, y + 11 * S, lw, Math.max(1, S * 0.35));
        if (b.sub) txt(b.sub, W / 2, y + 13.5 * S, 4.8, '#d8cfbe', 'center', 600);
        ctx.globalAlpha = 1;
      }
    }
    // message
    if (UI.toastT > 0) {
      UI.toastT -= dt; const a = Math.min(1, UI.toastT / 0.3);
      const lines = wrap(UI.toastMsg, 150 * S, 4.8), lh = 6.6 * S, w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 12 * S, h = lines.length * lh + 6 * S, x = W / 2 - w / 2, y = Ht - (58 + G.safe.b) * S - h;
      ctx.globalAlpha = a; rr(x, y, w, h, 3 * S); ctx.fillStyle = 'rgba(12,9,9,0.72)'; ctx.fill(); ctx.strokeStyle = 'rgba(236,228,209,0.25)'; ctx.lineWidth = Math.max(1, S * 0.3); ctx.stroke();
      lines.forEach((l, i) => txt(l, W / 2, y + 3 * S + i * lh, 4.8, '#ece4d1', 'center', 600, false)); ctx.globalAlpha = 1;
    }
    // callouts
    HL.Epic.callouts.forEach((k, i) => {
      const a = k.t < 0.12 ? k.t / 0.12 : k.t > 1 ? 1 - (k.t - 1) / 0.4 : 1, sc = (k.size === 3 ? 13 : k.size === 2 ? 10 : 7) * (k.t < 0.12 ? 1.4 - k.t * 3 : 1);
      ctx.globalAlpha = HL.clamp(a, 0, 1);
      const y = Ht * 0.3 + i * 15 * S - k.t * 6 * S, jx = k.t < 0.3 ? (Math.random() - 0.5) * 3 * S : 0;
      ctx.font = F(sc, 900, 'italic'); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = S * 1.2; ctx.strokeStyle = 'rgba(10,6,6,0.85)'; ctx.strokeText(k.s, W / 2 + jx, y); ctx.fillStyle = k.col; ctx.fillText(k.s, W / 2 + jx, y);
      ctx.globalAlpha = 1;
    });
    // ultimate cut-in
    if (G.ultBanner && G.ultBanner.t < 1.1) {
      const b = G.ultBanner, k = HL.clamp(b.t / 0.12, 0, 1), out = HL.clamp((b.t - 0.7) / 0.25, 0, 1), y = Ht * 0.16;
      ctx.globalAlpha = 1 - out; ctx.fillStyle = 'rgba(12,9,9,0.7)'; ctx.fillRect(0, y, W * k, 15 * S); ctx.fillStyle = '#ffe08a'; ctx.fillRect(0, y, W * k, S * 0.5); ctx.fillRect(W * (1 - k), y + 15 * S, W * k, S * 0.5);
      txt(b.name.toUpperCase(), W / 2 + (1 - k) * 60 * S, y + 2.5 * S, 9, '#ffe08a', 'center', 900, true, 'italic'); ctx.globalAlpha = 1;
    }
    // boss, gate, tide and trial bars
    const boss = G.enemies.find((e) => !e.dead && ((e.type === 'keeper' && e.state !== 'dormant') || (e.bossName && e.state !== 'idle' && e.state !== 'return')));
    const bigBar = (name, fr, col, nameCol) => { const w = Math.min(150 * S, W * 0.5), x = W / 2 - w / 2, y = Ht - (17 + G.safe.b) * S; txt(name, W / 2, y - 7.5 * S, 4.6, nameCol, 'center', 800); bar(x, y, w, 3 * S, fr, col); };
    if (boss) bigBar((boss.bossName || HL.FOES.keeper.name).toUpperCase(), boss.hp / boss.maxhp, boss.stunned > 0 ? ['#fff0c0', '#e7c98d'] : ['#ff7a6a', '#a8302a'], boss.bossName ? '#ffc95a' : '#f6ecd6');
    else if (G.tide && G.tide.active) { const T = G.tide, tot = T.d.total + 1; bigBar('HOLD BACK THE TIDE', Math.min(tot, T.killed) / tot, ['#ff7a6a', '#a8302a'], '#ff8a7a'); }
    else if (G.waves && G.waves.active) bigBar('THE GATE RISES', G.waves.progress, ['#f6ecd6', '#c9b896'], '#f6ecd6');
    else if (G.trial) { const T = G.trial; bigBar('TRIAL OF THE SHRINE  ' + Math.min(T.wave + 1, T.d.waves.length) + ' / ' + T.d.waves.length, T.wave / T.d.waves.length, ['#bffaf3', '#5ac8bc'], '#9ff5ec'); }
    // floating words (warded, guard broken, +light ...)
    for (const f2 of HL.fx.list) if (f2.k === 'text') {
      const s = HL.R3.project(f2.x, 14, f2.y + 16 + f2.t * 8); if (s.behind) continue; const q = f2.t / f2.life;
      ctx.globalAlpha = HL.clamp(q > 0.7 ? (1 - q) / 0.3 : 1, 0, 1); ctx.font = F(4.4, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const y2 = s.y * S - f2.t * 8 * S; ctx.lineWidth = S * 0.8; ctx.strokeStyle = 'rgba(10,6,6,0.8)'; ctx.strokeText(f2.s, s.x * S, y2); ctx.fillStyle = f2.col; ctx.fillText(f2.s, s.x * S, y2); ctx.globalAlpha = 1;
    }
    // damage numbers
    for (const d of H.nums) {
      d.t += dt; const s = HL.R3.project(d.x, d.h + d.t * 14, d.y); if (s.behind) continue;
      const a = d.t < 0.6 ? 1 : 1 - (d.t - 0.6) / 0.3, sc = (d.crit ? 8.5 : 6) * (d.t < 0.1 ? 1.5 - d.t * 5 : 1);
      ctx.globalAlpha = HL.clamp(a, 0, 1); ctx.font = F(sc, 900, d.crit ? 'italic' : ''); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = S * 0.9; ctx.strokeStyle = 'rgba(10,6,6,0.85)'; const str = d.crit ? d.n + '!' : String(d.n); ctx.strokeText(str, s.x * S, s.y * S); ctx.fillStyle = d.crit ? '#ffe08a' : d.col || '#f6ecd6'; ctx.fillText(str, s.x * S, s.y * S);
      ctx.globalAlpha = 1;
    }
    H.nums = H.nums.filter((d) => d.t < 0.9);
    ctx.restore();
  };

  // ---------------------------------------------------------------- the item screen
  H.menuHeader = (c, Gm) => {
    ctx = c; G = Gm; S = G.scale; const W = G.W * S, M = HL.UI.menu;
    ctx.save();
    const tabs = [['items', 'ITEMS'], ['map', 'MAP'], ['journal', 'JOURNAL'], ['system', 'SYSTEM']];
    let x = (12 + G.safe.l) * S;
    for (const [id, name] of tabs) {
      ctx.font = F(5.4, 800); const w = ctx.measureText(name).width;
      txt(name, x, 6 * S, 5.4, M.tab === id ? '#f6ecd6' : 'rgba(236,228,209,0.45)', 'left', 800, false);
      if (M.tab === id) { ctx.fillStyle = '#7fe8e0'; ctx.fillRect(x, 13.5 * S, w, Math.max(1.5, S * 0.5)); }
      region(x - 4 * S, 0, w + 8 * S, 18 * S, () => { M.tab = id; });
      x += w + 14 * S;
    }
    txt('✕', W - (12 + G.safe.r) * S, 5 * S, 6.5, '#f6ecd6', 'center', 700, false);
    region(W - (24 + G.safe.r) * S, 0, 24 * S, 18 * S, () => G.closeMenu());
    ctx.restore();
  };
  H.items = (c, Gm) => {
    ctx = c; G = Gm; S = G.scale; const W = G.W * S, Ht = G.H * S, M = HL.UI.menu, L = (12 + G.safe.l) * S;
    ctx.save(); ctx.fillStyle = 'rgba(12,9,9,0.94)'; ctx.fillRect(0, 0, W, Ht);
    H.menuHeader(c, Gm);
    const slotFrame = (x, y, s, col, sel) => { rr(x, y, s, s, 2 * S); ctx.fillStyle = sel ? 'rgba(80,70,60,0.75)' : 'rgba(40,33,32,0.75)'; ctx.fill(); ctx.strokeStyle = sel ? '#f6ecd6' : col; ctx.lineWidth = Math.max(1.5, S * (sel ? 0.7 : 0.4)); ctx.stroke(); };
    // equipment
    const eqs = [['weapon', 'WEAPON'], ['armor', 'ARMOUR'], ['relic', 'RELIC'], ['quick', 'QUICK']];
    eqs.forEach(([k, name], i) => {
      const s = 22 * S, x = L, y = (22 + i * 33) * S, id = k === 'quick' ? G.quick : G.eq[k], it = id && HL.ITEMS[id];
      slotFrame(x, y, s, it ? RAR[it.rarity] || 'rgba(236,228,209,0.4)' : 'rgba(236,228,209,0.2)', M.sel === id && id);
      if (it) icon(id, x + 3 * S, y + 3 * S, 16 * S);
      txt(name, x + s / 2, y + s + 1.5 * S, 3.2, 'rgba(236,228,209,0.55)', 'center', 800, false);
      if (id) region(x, y, s, s + 6 * S, () => { M.sel = id; });
    });
    // inventory grid
    const ids = HL.Inv.sorted(G.inv), cols = 6, rows = 4, cs = 23 * S, gx = L + 34 * S, gy = 22 * S;
    for (let r = 0; r < rows; r++) for (let cI = 0; cI < cols; cI++) {
      const i = r * cols + cI, x = gx + cI * (cs + 2 * S), y = gy + r * (cs + 2 * S), id = ids[i], it = id && HL.ITEMS[id];
      slotFrame(x, y, cs, it ? RAR[it.rarity] || (it.kind === 'key' ? '#e7c98d' : 'rgba(236,228,209,0.35)') : 'rgba(236,228,209,0.12)', M.sel === id && id);
      if (!it) continue;
      icon(id, x + 3.5 * S, y + 3.5 * S, 16 * S);
      if (G.inv[id] > 1) { txt(String(G.inv[id]), x + cs - 1.5 * S, y + cs - 6.5 * S, 4, '#f6ecd6', 'right', 900); }
      if (Object.values(G.eq).includes(id) || G.quick === id) { ctx.fillStyle = '#7fe8e0'; ctx.beginPath(); ctx.arc(x + 3.2 * S, y + 3.2 * S, 1.4 * S, 0, TAU); ctx.fill(); }
      region(x, y, cs, cs, () => { if (M.sel === id) HL.UI.itemAction(G, id); else M.sel = id; });
    }
    const p = G.player, wid = G.eq.weapon;
    txt('Harm taken  -' + Math.round(p.def() * 100) + '%      Ash  ' + (G.flags.ash || 0) + '      Level  ' + (G.flags.lvl || 1), gx, gy + rows * (cs + 2 * S) + 2 * S, 4, 'rgba(236,228,209,0.6)', 'left', 600, false);
    // details
    const dx = gx + cols * (cs + 2 * S) + 8 * S, dw = W - dx - (12 + G.safe.r) * S, id = M.sel && (G.inv[M.sel] || M.sel === G.quick) ? M.sel : null;
    rr(dx, 20 * S, dw, Ht - 30 * S, 3 * S); ctx.fillStyle = 'rgba(30,25,24,0.75)'; ctx.fill();
    if (id) {
      const it = HL.ITEMS[id], col = RAR[it.rarity] || '#ece4d1';
      const gl = ctx.createRadialGradient(dx + dw / 2, 40 * S, 0, dx + dw / 2, 40 * S, 22 * S); gl.addColorStop(0, col + '55'); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.fillRect(dx, 18 * S, dw, 44 * S);
      icon(id, dx + dw / 2 - 14 * S, 26 * S, 28 * S);
      txt(it.name, dx + dw / 2, 57 * S, 6.2, col, 'center', 800);
      txt((it.rarity ? HL.RARITY[it.rarity] + ' ' : '') + ({ weapon: 'weapon', armor: 'armour', relic: 'relic', consumable: 'consumable', material: 'material', key: 'key item', doc: 'document' }[it.kind] || ''), dx + dw / 2, 65.5 * S, 3.6, 'rgba(236,228,209,0.55)', 'center', 700, false);
      let y = 73 * S;
      for (const l of wrap(it.desc, dw - 10 * S, 4.2, 500)) { txt(l, dx + dw / 2, y, 4.2, '#d8cfbe', 'center', 500, false); y += 5.8 * S; }
      const w = HL.WEAPONS[id];
      if (w) {
        y += 2 * S; const lv = G.wlv[id] || 0;
        const sw = Math.min(dw - 12 * S, 130 * S), sx = dx + dw / 2 - sw / 2, cw = sw / 2;
        const stat = (k, v, i) => { const cx = sx + (i % 2) * cw, cy = y + Math.floor(i / 2) * 7 * S; rr(cx + S, cy - 1 * S, cw - 2 * S, 6 * S, 1.5 * S); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill(); txt(k, cx + 3 * S, cy, 3.6, 'rgba(236,228,209,0.55)', 'left', 700, false); txt(v, cx + cw - 3 * S, cy, 3.8, '#f6ecd6', 'right', 800, false); };
        stat('Damage', String(Math.round(w.dmg * (1 + lv * HL.UPGRADE.perLevel))), 0); stat('Reach', String(w.reach), 1); stat('Temper', '+' + lv, 2); stat('Ultimate', HL.ULTS[w.ult] ? HL.ULTS[w.ult].name : '-', 3);
        y += 14 * S;
      } else if (it.kind === 'armor') { txt('Harm taken  -' + Math.round((it.def || 0) * 100) + '%' + (it.slow ? '   ·   ' + Math.round(it.slow * 100) + '% slower' : ''), dx + dw / 2, y + 2 * S, 3.8, '#f6ecd6', 'center', 700, false); y += 9 * S; }
      const act = HL.UI.actionName(G, id);
      if (!act && (Object.values(G.eq).includes(id) || G.quick === id)) txt('EQUIPPED', dx + dw / 2, Math.min(y + 5 * S, Ht - 22 * S), 4.2, '#7fe8e0', 'center', 900, false);
      if (act) {
        const bw = 44 * S, bh = 10 * S, bx = dx + dw / 2 - bw / 2, by = Math.min(y + 3 * S, Ht - 24 * S);
        rr(bx, by, bw, bh, bh / 2); ctx.fillStyle = col; ctx.fill(); txt(act.toUpperCase(), dx + dw / 2, by + 2.6 * S, 4.4, '#1a1414', 'center', 900, false);
        region(bx, by, bw, bh, () => HL.UI.itemAction(G, id));
      }
    } else txt('Tap an item to see it.', dx + dw / 2, 60 * S, 4.4, 'rgba(236,228,209,0.5)', 'center', 600, false);
    ctx.restore();
  };
  return H;
})();
