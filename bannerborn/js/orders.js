// Bannerborn — the commander's hand in a fight. Heroes still fight on their own, but a battle is no longer won by
// watching: the dead wind up HEAVY BLOWS that have to be answered, and the answers are yours to give.
//   Heavy blow   every so often one of the dead stops, glows and winds up (a ring closing on it, a mark over its
//                head). Left alone it lands for a large part of a hero's health and splashes those beside them.
//   Break        tap that foe (or any foe): your heroes turn on it and it takes more harm for a few seconds; a foe
//                winding up is BROKEN OFF: the blow never lands and it reels. Costs one command.
//   Shield wall  everyone braces for a moment and takes far less; a heavy blow that lands on the wall staggers the
//                one who threw it. Costs one command.
//   Rally        the banner goes up: everyone is mended a little and their ultimates charge. Costs two.
// Command fills with time and with kills, three at most. AUTO casts ultimates; it does not give orders.
(function () {
  const BB = (typeof window !== 'undefined' ? window : globalThis).BB, Battle = BB.Battle, TAU = Math.PI * 2;
  const hyp = Math.hypot;
  BB.ORDERS = {
    max: 3, start: 1.5, every: 7.5, kill: 0.18,
    brace: { cost: 1, dur: 2.8, cut: 0.7 }, mark: { cost: 1, dur: 6, amp: 0.4, reel: 2.4 }, rally: { cost: 2, heal: 0.24, energy: 30 },
    heavy: { first: 5.5, every: [6.5, 9.5], wind: 1.9, dmg: 0.42, elite: 0.5, splash: 1.7, splashK: 0.4, held: 2.2, few: [1.45, 1.45, 1.35, 1.2, 1.1, 1] }, // few: how much rarer for a small team
  };
  Battle.prototype.ordersInit = function () { const O = BB.ORDERS; this.cmd = O.start; this.braceT = 0; this.heavyT = O.heavy.first; this.heavies = 0; this.heaviesBroken = 0; this.heaviesHeld = 0; this.ordersUsed = 0; };
  Battle.prototype.canOrder = function (what) { return !this.result && !this.intro && !this.peaceful && !this.noOrders && this.cmd !== undefined && this.cmd >= BB.ORDERS[what].cost; };
  // who is winding one up right now (the most advanced first)
  Battle.prototype.heavyFoes = function () { return this.ents.filter((e) => e.heavy && !e.dead).sort((a, b) => b.heavy.t - a.heavy.t); };
  Battle.prototype.endHeavy = function (e) { if (e.heavy) { e.heavy = null; e.lock = Math.min(e.lock || 0, 0.15); } };

  Battle.prototype.ordersTick = function (dt) {
    if (this.cmd === undefined) this.ordersInit();
    if (this.peaceful || this.result || this.noOrders || this.intro) return;
    const O = BB.ORDERS, Hv = O.heavy;
    this.cmd = Math.min(O.max, this.cmd + dt / O.every);
    if (this.braceT > 0) this.braceT -= dt;
    if (this.order && this.order.focus && !(this.order.focus.marked > 0)) this.order.focus = null; // a mark runs out
    for (const e of this.ents) {
      if (e.marked > 0) e.marked -= dt;
      const H = e.heavy; if (!H) continue;
      if (e.dead || e.stunT > 0 || e.brokenT > 0) { e.heavy = null; continue; } // knocked out of it
      H.t += dt; e.lock = Math.max(e.lock || 0, 0.25); e.state = 'idle';
      if (H.t >= H.dur) this.landHeavy(e);
    }
    this.heavyT -= dt;
    if (this.heavyT <= 0) {
      const heroes = this.heroesAlive(); let best = null, bs = -1;
      if (heroes.length) for (const e of this.ents) {
        if (e.side !== 'foe' || e.dead || e.prop || e.gate || e.turret || e.boss || e.heavy || e.hidden || e.stunT > 0 || e.brokenT > 0 || e.state === 'rise' || e.riseT > 0) continue;
        let d = 99, tg = null; for (const h of heroes) { const q = hyp(h.x - e.x, h.y - e.y); if (q < d) { d = q; tg = h; } }
        if (d > (e.ranged ? 8 : 2.6)) continue;
        const s = (e.elite ? 3 : 0) + e.maxhp / 400 + this.r() * 1.5; if (s > bs) { bs = s; best = { e, tg }; }
      }
      if (best) { const e = best.e; e.heavy = { t: 0, dur: Hv.wind, tgt: best.tg }; e.hitDone = true; e.feint = null; e.state = 'idle'; e.lock = Hv.wind + 0.2; if (this.setClip) this.setClip(e, BB.hasClip(this.artKey(e), 'Taunt') ? 'Taunt' : 'Idle', true); this.heavies++;
        this.heavyT = this.r.range(Hv.every[0], Hv.every[1]) * Hv.few[Math.max(0, Math.min(5, this.teamN | 0))] / Math.sqrt(this.waveK || 1); if (BB.sfx) BB.sfx('charge'); }
      else this.heavyT = 1.2;
    }
  };
  Battle.prototype.landHeavy = function (e) {
    const Hv = BB.ORDERS.heavy, H = e.heavy; e.heavy = null; e.lock = 0.5;
    let tg = H.tgt; if (!tg || tg.dead) { tg = null; let d = 99; for (const h of this.heroesAlive()) { const q = hyp(h.x - e.x, h.y - e.y); if (q < d) { d = q; tg = h; } } }
    if (!tg) return;
    const held = this.braceT > 0, pct = e.elite ? Hv.elite : Hv.dmg, blow = (h, k) => { const want = h.maxhp * pct * k * (held ? 1 - BB.ORDERS.brace.cut : 1); h.hp -= Math.min(want, Math.max(0, h.hp - 1) + (held ? 0 : want)); if (h.hp <= 0 && !h.dead) this.kill(h, e); else { h.flash = 0.25; this.text(h.x, h.y - 0.3, '-' + Math.round(want), held ? '#9fd0ff' : '#ff5a4a', !held); } };
    blow(tg, 1); for (const h of this.heroesAlive()) if (h !== tg && hyp(h.x - tg.x, h.y - tg.y) < Hv.splash) blow(h, Hv.splashK);
    this.addFx('hit2', tg.x, tg.y - 0.2, { sc: 1.6 }); this.shake = Math.max(this.shake || 0, held ? 0.25 : 0.6);
    this.tele.push({ kind: 'circle', x: tg.x, y: tg.y, rad: Hv.splash, t: 0.3, dur: 0.45, col: held ? '140,200,255' : '255,70,50' });
    if (held) { this.heaviesHeld++; this.stun(e, Hv.held, 'held'); this.breakPoise(e, 60); this.banner('HELD!', 0.9); if (BB.sfx) BB.sfx('parry'); }
    else { this.banner('HEAVY BLOW', 0.9); if (BB.sfx) BB.sfx('slam'); }
  };
  // ---- the three orders
  Battle.prototype.orderBrace = function () {
    if (!this.canOrder('brace') || this.braceT > 0.4) return false; const O = BB.ORDERS.brace; this.cmd -= O.cost; this.braceT = O.dur; this.ordersUsed++;
    for (const h of this.heroesAlive()) { h.buffs.guard = Math.max(h.buffs.guard || 0, O.dur); this.addFx('buff9', h.x, h.y - 0.3, { sc: 0.9 }); }
    this.banner('SHIELD WALL', 0.9); if (BB.sfx) BB.sfx('rally'); return true;
  };
  Battle.prototype.orderMark = function (e) {
    if (!e || e.dead || e.side !== 'foe' || e.prop || !this.canOrder('mark')) return false; const O = BB.ORDERS.mark; this.cmd -= O.cost; this.ordersUsed++;
    e.marked = O.dur; if (this.order) this.order.focus = e;
    if (e.heavy) { e.heavy = null; this.heaviesBroken++; this.stun(e, O.reel, 'broken'); this.breakPoise(e, 80); this.addFx('hit2', e.x, e.y - 0.4, { sc: 1.3 }); this.banner('BROKEN OFF!', 0.9); for (const h of this.heroesAlive()) h.energy = Math.min(100, (h.energy || 0) + 6); if (BB.sfx) BB.sfx('parry'); }
    else { this.text(e.x, e.y - 0.6, 'MARKED', '#ffd27a', true); if (BB.sfx) BB.sfx('click'); }
    return true;
  };
  Battle.prototype.orderRally = function () {
    if (!this.canOrder('rally')) return false; const O = BB.ORDERS.rally; this.cmd -= O.cost; this.ordersUsed++;
    for (const h of this.heroesAlive()) { this.heal(null, h, h.maxhp * O.heal); h.energy = Math.min(100, (h.energy || 0) + O.energy); this.addFx('buff3', h.x, h.y - 0.3, { sc: 1 }); }
    this.banner('RALLY TO THE BANNER', 1.1); if (BB.sfx) BB.sfx('rally'); return true;
  };
  // a foe near a point on the field (for a tap): one winding up is easier to hit
  Battle.prototype.foeNear = function (x, y, reach) {
    let best = null, bd = reach || 1.6; for (const e of this.ents) { if (e.side !== 'foe' || e.dead || e.prop || e.hidden) continue; const d = hyp(e.x - x, e.y - y) - (e.heavy ? 1.1 : 0) - (e.r || 0) * 0.5; if (d < bd) { bd = d; best = e; } } return best;
  };
  // what a careful player does (the simulator, ORDERS=1): break off every heavy blow there is command for, brace for
  // one there isn't time to reach, rally when the team is badly hurt
  Battle.prototype.playOrders = function () {
    if (this.cmd === undefined || this.result) return;
    const hv = this.heavyFoes()[0];
    if (hv && hv.heavy.t > 0.55) { if (!this.orderMark(hv) && hv.heavy.dur - hv.heavy.t < 0.5) this.orderBrace(); }
    const hs = this.heroesAlive(); if (hs.length) { let a = 0; for (const h of hs) a += h.hp / h.maxhp; if (a / hs.length < 0.5 && this.cmd >= 2.6) this.orderRally(); else if (a / hs.length < 0.3) this.orderRally(); }
  };
  // ---- how it shows on the field: a ring closing on the foe, a mark over its head; a mark on one you called out
  Battle.prototype.drawHeavy = function (ctx, e, s) {
    if (e.heavy) { const k = Math.min(1, e.heavy.t / e.heavy.dur), r = 30 - k * 17, p = 0.6 + Math.sin(this.time * 18) * 0.4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2.2; ctx.strokeStyle = 'rgba(255,' + Math.round(200 - k * 150) + ',60,' + (0.55 + k * 0.45) + ')'; ctx.beginPath(); ctx.ellipse(s.x, s.y, r, r * 0.5, 0, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,90,60,0.9)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 13, 6.5, 0, 0, TAU); ctx.stroke();
      const hy = s.y - (e.barH || 34) * (e.F && e.F.scale ? e.F.scale : 1) - 8; ctx.fillStyle = 'rgba(255,' + Math.round(210 - k * 150) + ',70,' + p + ')'; ctx.beginPath(); ctx.moveTo(s.x - 5, hy - 12); ctx.lineTo(s.x + 5, hy - 12); ctx.lineTo(s.x + 2, hy - 3); ctx.lineTo(s.x - 2, hy - 3); ctx.closePath(); ctx.fill(); ctx.fillRect(s.x - 2, hy - 1, 4, 4);
      ctx.restore(); }
    if (e.marked > 0) { const a = Math.min(1, e.marked); ctx.save(); ctx.strokeStyle = 'rgba(255,214,120,' + a * 0.9 + ')'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -this.time * 14; ctx.beginPath(); ctx.ellipse(s.x, s.y, 17, 8.5, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
  };
})();
