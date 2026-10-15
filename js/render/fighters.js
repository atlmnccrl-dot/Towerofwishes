/*
 * Tower of Wishes — fighters layer: character bodies, hair, cloth, poses.
 *
 * API (called by core.js):
 *   update(s, dt)       per-frame bookkeeping (e.g. hair/cloth springs); runs before drawing
 *   drawUnit(u, s)      draw one fighter at its depth slot
 *   LOOK                per-character appearance table
 *
 * Telegraphs, slash trails and auras belong to fx.js (underUnit/overUnit);
 * bars, icons and speech belong to callouts.js.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  // Placeholder appearances. Final character designs need the author's approval.
  const LOOK = {
    kael:    { coat: '#2f5f8a', trim: '#d8b45a', skin: '#e9c3a0', hair: '#3a2a20', h: 1.0,  w: 1.0,  weapon: 'sword',   hairStyle: 'short' },
    eiryn:   { coat: '#2b2a36', trim: '#4fae7a', skin: '#f1d3bd', hair: '#e9e7f2', h: 0.93, w: 0.88, weapon: 'branch',  hairStyle: 'long' },
    brute:   { coat: '#6b4a33', trim: '#3d2a1d', skin: '#c99a76', hair: '#4a3324', h: 1.12, w: 1.45, weapon: 'club',    hairStyle: 'bald' },
    knife:   { coat: '#4a3a36', trim: '#b8423a', skin: '#d9ad8a', hair: '#1f1a18', h: 0.97, w: 0.85, weapon: 'knife',   hairStyle: 'short' },
    hatchet: { coat: '#4d5b34', trim: '#2f3820', skin: '#d4a684', hair: '#2a2a1e', h: 1.0,  w: 1.05, weapon: 'hatchet', hairStyle: 'hood' },
    lookout: { coat: '#5b5f66', trim: '#3a3d42', skin: '#dcb490', hair: '#6a5038', h: 0.95, w: 0.9,  weapon: 'sling',   hairStyle: 'short' },
  };

  // Pose: rel = weapon angle relative to facing; pitch = weapon elevation.
  function pose(u) {
    let rel = 0.9, pitch = 0.55, lean = 0, crouch = 0;
    const a = u.act;
    switch (u.state) {
      case 'attack':
        if (a.phase === 'windup' || a.phase === 'feint') {
          const k = a.phase === 'feint' ? 1 : Math.min(1, a.t / a.wind);
          rel = 0.9 + k * 1.5; pitch = 0.55 + k * 0.45; lean = -0.12 * k; crouch = 0.06 * k;
        } else if (a.phase === 'strike') {
          const k = Math.min(1, a.t / Math.max(0.05, a.A.active));
          rel = 2.4 - k * 3.8; pitch = 0.25; lean = 0.22;
        } else {
          const k = Math.min(1, a.t / Math.max(0.05, a.A.recover));
          rel = -1.4 + k * 2.3; pitch = 0.1 + k * 0.4; lean = 0.2 * (1 - k);
        }
        break;
      case 'parry': rel = 0.15; pitch = 1.05; lean = -0.05; break;
      case 'dodge': lean = 0.3; crouch = 0.1; break;
      case 'hurt': case 'stagger': rel = 1.7; pitch = -0.2; lean = -0.25; break;
      case 'recover': rel = -0.6; pitch = 0.1; lean = 0.15; break;
      case 'circle': rel = 0.7; pitch = 0.65; crouch = 0.04; break;
    }
    if (u.fleeing) { rel = 2.8; pitch = 1.2; lean = 0.2; }
    if (u.drained > 0) { pitch -= 0.5; lean = 0.18; crouch = 0.08; }
    return { rel, pitch, lean, crouch };
  }

  function create(V) {
    const { ctx } = V;
    const P = V.P;

    function update() { /* no per-frame state yet */ }

    function drawUnit(u) {
      if (u.fled) return;
      const L = LOOK[u.key];
      const sc = V.cam.sc;
      const lying = u.state === 'down' || u.state === 'out';
      const alpha = u.state === 'out' ? 0.55 : 1;
      V.shadow(u.x, u.y, u.r * 1.25 * (lying ? 1.8 : 1), 0.38);

      ctx.globalAlpha = alpha;
      const f = u.facing, fx = Math.cos(f), fy = Math.sin(f);
      const H = 1.72 * L.h;
      const outline = '#141012';

      if (lying) {
        // Laid out along the facing axis (fell backward).
        const hx = u.x - fx * 0.75 * L.h, hy = u.y - fy * 0.75 * L.h;
        const a = P(u.x + fx * 0.15, u.y + fy * 0.15, 0.18), b = P(hx, hy, 0.2);
        ctx.lineCap = 'round';
        ctx.strokeStyle = outline; ctx.lineWidth = 0.42 * sc * L.w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = L.coat; ctx.lineWidth = 0.34 * sc * L.w;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const hp = P(hx - fx * 0.18, hy - fy * 0.18, 0.18);
        ctx.fillStyle = L.hairStyle === 'bald' ? L.skin : L.hair;
        ctx.beginPath(); ctx.arc(hp.x, hp.y, 0.14 * sc, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      const ps = pose(u);
      const sx = -fy, sy = fx; // body's right-hand side
      const bob = u.state === 'move' ? Math.abs(Math.sin(u.walk * 3.2)) * 0.04 : 0;
      const hip = { x: u.x, y: u.y, z: H * (0.52 - ps.crouch) + bob };
      const sh = { x: u.x + fx * ps.lean, y: u.y + fy * ps.lean, z: H * (0.83 - ps.crouch) + bob };
      if (u.state === 'dodge' && u.dodgeDir != null) { sh.x += Math.cos(u.dodgeDir) * 0.25; sh.y += Math.sin(u.dodgeDir) * 0.25; }
      if (u.state === 'hurt' || u.state === 'stagger') { const j = Math.sin(u.st * 60) * 0.03; sh.x += sx * j; sh.y += sy * j; }

      // Legs
      const sw = u.state === 'move' || u.fleeing ? Math.sin(u.walk * 3.2) * 0.32 : u.state === 'circle' ? Math.sin(u.walk * 3.2) * 0.16 : 0;
      const legs = [-1, 1].map((side) => {
        const fwd = side * sw + (u.state === 'attack' && u.act && u.act.phase !== 'windup' ? side * 0.18 : 0);
        return { x: u.x + sx * side * 0.13 * L.w + fx * fwd, y: u.y + sy * side * 0.13 * L.w + fy * fwd, z: 0 };
      });
      const hip2 = (side) => ({ x: hip.x + sx * side * 0.1 * L.w, y: hip.y + sy * side * 0.1 * L.w, z: hip.z });

      // Weapon hand and tip
      const ha = f + ps.rel * 0.55;
      const hand = { x: sh.x + Math.cos(ha) * 0.42 + sx * 0.12, y: sh.y + Math.sin(ha) * 0.42 + sy * 0.12, z: sh.z - 0.18 + ps.pitch * 0.12 };
      const wl = { sword: 1.05, branch: 1.1, club: 1.0, knife: 0.42, hatchet: 0.62, sling: 0.5 }[L.weapon];
      const wa = f + ps.rel;
      const cp = Math.cos(ps.pitch);
      let tip = { x: hand.x + Math.cos(wa) * wl * cp, y: hand.y + Math.sin(wa) * wl * cp, z: hand.z + Math.sin(ps.pitch) * wl };
      if (u.state === 'parry') tip = { x: hand.x - sx * wl * 0.9, y: hand.y - sy * wl * 0.9, z: hand.z + 0.35 }; // blade across the body

      // Draw the far-side limbs first.
      const P0 = (q) => P(q.x, q.y, q.z);
      const pHip = P0(hip), pSh = P0(sh), pHand = P0(hand), pTip = P0(tip);
      const handFront = pHand.d > pSh.d;

      const strokeLimb = (a, b, w, col) => {
        ctx.lineCap = 'round';
        ctx.strokeStyle = outline; ctx.lineWidth = w * sc + 2.2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = w * sc;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      };
      const drawWeapon = () => {
        const wc = { sword: '#dfe7ee', branch: '#7a5a3a', club: '#6a4a2c', knife: '#cfd6dc', hatchet: '#b9bfc4', sling: '#8a6a48' }[L.weapon];
        const ww = { sword: 0.07, branch: 0.09, club: 0.16, knife: 0.06, hatchet: 0.07, sling: 0.04 }[L.weapon];
        strokeLimb(pHand, pTip, ww, wc);
        if (L.weapon === 'hatchet' || L.weapon === 'club') {
          ctx.fillStyle = L.weapon === 'club' ? '#5a3c22' : '#c9cfd4';
          ctx.beginPath(); ctx.arc(pTip.x, pTip.y, (L.weapon === 'club' ? 0.13 : 0.1) * sc, 0, Math.PI * 2); ctx.fill();
        }
        if (L.weapon === 'sword') {
          const g = { x: hand.x + Math.cos(wa) * 0.1 * cp, y: hand.y + Math.sin(wa) * 0.1 * cp, z: hand.z };
          const pa = P0({ x: g.x + sx * 0.12, y: g.y + sy * 0.12, z: g.z }), pb = P0({ x: g.x - sx * 0.12, y: g.y - sy * 0.12, z: g.z });
          strokeLimb(pa, pb, 0.04, '#d8b45a');
        }
      };

      if (!handFront) { strokeLimb(pSh, pHand, 0.1, L.coat); drawWeapon(); }
      legs.forEach((ft, i) => strokeLimb(P0(hip2(i ? 1 : -1)), P0(ft), 0.13 * L.w, i ? '#2a2420' : '#332b25'));
      strokeLimb(pHip, pSh, 0.36 * L.w, u.flash > 0 ? '#ffffff' : L.coat); // torso
      const col = P0({ x: sh.x, y: sh.y, z: sh.z - 0.04 }); // collar
      ctx.fillStyle = L.trim;
      ctx.beginPath(); ctx.ellipse(col.x, col.y, 0.15 * sc * L.w, 0.06 * sc, 0, 0, Math.PI * 2); ctx.fill();
      const head = P0({ x: sh.x + fx * 0.04, y: sh.y + fy * 0.04, z: sh.z + 0.25 });
      const hr = 0.15 * sc;
      ctx.fillStyle = outline; ctx.beginPath(); ctx.arc(head.x, head.y, hr + 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = u.flash > 0 ? '#fff' : L.skin; ctx.beginPath(); ctx.arc(head.x, head.y, hr, 0, Math.PI * 2); ctx.fill();
      // Hair, placed on the side away from the face.
      const back = P0({ x: sh.x - fx * 0.06, y: sh.y - fy * 0.06, z: sh.z + 0.3 });
      ctx.fillStyle = L.hair;
      if (L.hairStyle === 'long') {
        const tail = P0({ x: sh.x - fx * 0.2, y: sh.y - fy * 0.2, z: sh.z - 0.25 });
        ctx.beginPath(); ctx.arc(back.x, back.y, hr * 1.02, 0, Math.PI * 2); ctx.fill();
        ctx.lineCap = 'round'; ctx.strokeStyle = L.hair; ctx.lineWidth = hr * 1.4;
        ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(tail.x, tail.y); ctx.stroke();
      } else if (L.hairStyle === 'hood') {
        ctx.fillStyle = L.coat; ctx.beginPath(); ctx.arc(back.x, back.y, hr * 1.18, 0, Math.PI * 2); ctx.fill();
      } else if (L.hairStyle === 'short') {
        ctx.beginPath(); ctx.arc(back.x, back.y - hr * 0.15, hr * 0.95, 0, Math.PI * 2); ctx.fill();
      }
      if (handFront) { strokeLimb(pSh, pHand, 0.1, L.coat); drawWeapon(); }
      ctx.globalAlpha = 1;
    }

    return { update, drawUnit, LOOK };
  }

  NS.fighters = { create, LOOK, pose };
})();
