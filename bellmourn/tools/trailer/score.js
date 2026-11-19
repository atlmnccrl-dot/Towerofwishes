// A trailer score from cue lists, synthesised offline with the game's own voices (js/engine/audio.js:
// bells, organ pad, choir, drums) plus trailer impacts and risers. Made from scratch: no samples.
//   NODE_PATH=$(npm root -g) node score.js <cues.json> <out.wav> [base]
// cues.json: { "dur": 30, "events": [ { "type": "drone"|"pad"|"choir"|"bell"|"boom"|"riser"|"drums"|"hit"|"toll", "t": 0, ... } ] }
const fs = require('fs'); const { chromium } = require('playwright');
const [cueFile, outFile, base = 'http://localhost:8791/bellmourn/'] = process.argv.slice(2);
const cues = JSON.parse(fs.readFileSync(cueFile, 'utf8'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(base + 'index.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.BM && window.BM.game, null, { timeout: 60000 });
  const wav = await p.evaluate(async (cues) => {
    const { Sound } = await import('./js/engine/audio.js');
    const SR = 48000; const ctx = new OfflineAudioContext(2, Math.ceil(SR * (cues.dur + 3)), SR);
    const RealAC = window.AudioContext; window.AudioContext = function () { return ctx; };
    const s = new Sound(); s.unlock(); window.AudioContext = RealAC;
    // route everything through a glue compressor; no rain in the score
    s.amb.gain.value = 0; s.master.disconnect(); const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    const out = ctx.createGain(); out.gain.value = 1.0; s.master.connect(comp); comp.connect(out); out.connect(ctx.destination); s.mus.gain.value = 0.9;
    const M = s.mus, D = 36.71; // low D
    const chords = { Dm: [146.8, 174.6, 220], Bb: [116.5, 146.8, 174.6], Gm: [98, 116.5, 146.8], A: [110, 138.6, 164.8], F: [87.3, 110, 130.8], C: [130.8, 164.8, 196] };
    const boom = (t, v = 1) => { s._osc('sine', 70, 28, t, 1.8, 0.9 * v, M, 0.003); s._osc('triangle', 140, 40, t, 0.5, 0.35 * v, M, 0.002); s._nz(t, 1.4, 0.5 * v, 'lowpass', 1800, 60, 0.7, M, 0.002); s._nz(t, 0.25, 0.3 * v, 'highpass', 3000, 3000, 0.5, M, 0.001); s.bell(t, 73.4, 5, 0.12 * v, M); };
    const riser = (t, dur, v = 1) => { s._nz(t, dur, 0.22 * v, 'bandpass', 180, 7000, 2.5, M, dur * 0.9); s._osc('sawtooth', 110, 440, t, dur, 0.05 * v, M, dur * 0.95); s._osc('sawtooth', 112, 445, t, dur, 0.04 * v, M, dur * 0.95); };
    const hit = (t, ch = 'Dm', v = 1) => { for (const f of chords[ch]) for (const det of [-7, 0, 8]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f / 2; o.detune.value = det; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(300, t + 1.2); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t + 1.6); o.connect(lp); lp.connect(g); g.connect(M); o.start(t); o.stop(t + 1.7); } boom(t, 0.6 * v); };
    const tom = (t, f, v) => { s._osc('sine', f, f * 0.55, t, 0.32, 0.45 * v, M, 0.002); s._nz(t, 0.06, 0.12 * v, 'lowpass', 900, 300, 0.8, M, 0.001); };
    const drums = (t0, dur, bpm, v = 1, busy = 1) => { const spb = 60 / bpm / 4; for (let i = 0, t = t0; t < t0 + dur; i++, t = t0 + i * spb) {
      const st = i % 16; if (st === 0 || st === 10) s._drum(t, 1.3 * v); if (st === 4 || st === 12) s._snare(t, 1.1 * v);
      if (busy >= 1 && (st === 7 || st === 14 || st === 15)) tom(t, st === 7 ? 110 : 140, 0.7 * v);
      if (busy >= 2 && st % 2 === 1) s._nz(t, 0.04, 0.05 * v, 'highpass', 6000, 6000, 0.7, M, 0.001);
      if (busy >= 2 && (st === 2 || st === 6)) tom(t, 90, 0.6 * v); } };
    for (const e of cues.events) {
      const t = e.t;
      if (e.type === 'drone') { s._pad(t, D, e.dur, 0.05 * (e.v ?? 1)); s._pad(t, D * 2, e.dur, 0.03 * (e.v ?? 1)); s._osc('sine', D, D, t, e.dur, 0.12 * (e.v ?? 1), M, Math.min(2, e.dur / 3)); }
      else if (e.type === 'pad') { for (const f of chords[e.chord]) s._pad(t, f / 2, e.dur, 0.03 * (e.v ?? 1)); s._pad(t, chords[e.chord][0] / 4, e.dur, 0.035 * (e.v ?? 1)); }
      else if (e.type === 'choir') s._choir(t, chords[e.chord].map((f) => f * (e.oct || 2)), e.dur, 0.016 * (e.v ?? 1), M);
      else if (e.type === 'bell') s.bell(t, e.f || 146.8, e.dur || 5, 0.14 * (e.v ?? 1), M);
      else if (e.type === 'toll') { s.bell(t, 73.4, 7, 0.22 * (e.v ?? 1), M); s._osc('sine', 36.7, 36.7, t, 4, 0.1 * (e.v ?? 1), M, 0.01); }
      else if (e.type === 'boom') boom(t, e.v ?? 1);
      else if (e.type === 'riser') riser(t, e.dur, e.v ?? 1);
      else if (e.type === 'hit') hit(t, e.chord || 'Dm', e.v ?? 1);
      else if (e.type === 'drums') drums(t, e.dur, e.bpm || 120, e.v ?? 1, e.busy ?? 1);
      else if (e.type === 'arp') { const ch = chords[e.chord]; const spb = 60 / (e.bpm || 120) / 4; for (let i = 0; t + i * spb < t + e.dur; i++) s._osc('triangle', ch[i % 3] * 2, ch[i % 3] * 2, t + i * spb, spb * 0.9, 0.035 * (e.v ?? 1), M, 0.002); }
    }
    const buf = await ctx.startRendering();
    const n = Math.ceil(SR * cues.dur), L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); const k = peak > 0 ? 0.89 / peak : 1;
    const ab = new ArrayBuffer(44 + n * 4); const v = new DataView(ab); const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { v.setInt16(44 + i * 4, L[i] * k * 32767, true); v.setInt16(46 + i * 4, R[i] * k * 32767, true); }
    let str = ''; const u8 = new Uint8Array(ab); for (let i = 0; i < u8.length; i += 32768) str += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(str);
  }, cues);
  fs.writeFileSync(outFile, Buffer.from(wav, 'base64')); console.log('score', outFile); await b.close();
})();
