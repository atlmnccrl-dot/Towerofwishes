// Records the in-game trailer (js/trailer.js) to a video file, frame by frame, with its sound.
//   NODE_PATH=$(npm root -g) node tools/record-trailer.js <out-dir> [--every N] [--url http://localhost:8123/index.html]
// The page's clock is replaced by one this script steps a thirtieth of a second at a time, so every frame is drawn
// in full however slow the machine is. Sounds are not played: the game writes them on a tape with the film's time
// (BB.audioClock), and BB.audioRender plays the tape into a WAV. ffmpeg joins the two as <out-dir>/bannerborn-trailer.mp4.
// --every N keeps only every Nth frame and skips the video: a quick contact sheet of the cut.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const args = process.argv.slice(2), out = path.resolve(args[0] || 'trailer-out');
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const every = +opt('every', 1), url = opt('url', 'http://localhost:8123/index.html'), FPS = 30, W = +opt('w', 1280), H = +opt('h', 720);
const frames = path.join(out, 'frames'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { // the page's clock, in this script's hands
    let now = 0; const q = [];
    performance.now = () => now;
    window.requestAnimationFrame = (f) => { q.push(f); return q.length; };
    window.cancelAnimationFrame = () => {};
    window.__step = (ms) => { now += ms; for (const f of q.splice(0)) f(now); };
  });
  await p.goto(url);
  const step = () => p.evaluate((ms) => window.__step(ms), 1000 / FPS);
  const until = async (fn, what) => { for (let i = 0; i < 1500; i++) { if (await p.evaluate(fn)) return; await step(); await p.waitForTimeout(40); } throw new Error('timed out waiting for ' + what); };
  await until(() => window.BB && BB.UI && BB.UI.current === 'title', 'the title');
  await p.evaluate(() => { BB.playTrailer(null, { record: true }); });
  await until(() => BB.Trailer.on && !BB.Trailer.loading, 'the trailer to load');
  const total = await p.evaluate(() => BB.Trailer.total);
  console.log('trailer: ' + total.toFixed(2) + ' s, ' + Math.ceil(total * FPS) + ' frames');
  let n = 0, kept = 0; const t0 = Date.now();
  for (;;) {
    await step();
    if (!(await p.evaluate(() => BB.Trailer.on))) break;
    if (n % every === 0) { await p.screenshot({ path: path.join(frames, 'f' + String(kept).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 93 }); kept++; }
    n++;
    if (n % 150 === 0) console.log('  frame ' + n + ' (' + (n / FPS).toFixed(1) + ' s of film, ' + Math.round((Date.now() - t0) / 1000) + ' s taken)');
    if (n > total * FPS + 90) throw new Error('the trailer did not end');
  }
  console.log('frames: ' + n + ' stepped, ' + kept + ' kept');
  const tape = await p.evaluate(() => { const c = {}; for (const e of BB.audioTape()) c[e[1]] = (c[e[1]] || 0) + 1; return c; });
  console.log('sound tape: ' + JSON.stringify(tape));
  if (every === 1) {
    const b64 = await p.evaluate(async (dur) => { const u8 = await BB.audioRender(dur); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }, total + 0.5);
    const wav = path.join(out, 'trailer.wav'); fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
    const mp4 = path.join(out, 'bannerborn-trailer.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'), '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
      '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', mp4], { stdio: 'inherit' });
    console.log('wrote ' + mp4 + ' (' + (fs.statSync(mp4).size / 1e6).toFixed(1) + ' MB)');
  }
  console.log(errs.length ? errs.join('\n') : 'no page errors');
  await b.close(); process.exit(errs.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
