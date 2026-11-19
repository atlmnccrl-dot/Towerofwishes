// Records the in-game trailer (js/trailer.js), or one of the promotional cuts (tools/promo-cuts.js), to a video file,
// frame by frame, with its sound.
//   NODE_PATH=$(npm root -g) node tools/record-trailer.js <out-dir> [--cut reveal|gameplay|short-bosses|short-ultimates|short-story|all]
//        [--fps 60] [--w 1920 --h 1080] [--every N] [--url http://localhost:8123/index.html]
// The page's clock is replaced by one this script steps a frame at a time, so every frame is drawn in full however
// slow the machine is. Sounds are not played: the game writes them on a tape with the film's time (BB.audioClock), and
// BB.audioRender plays the tape into a WAV. ffmpeg joins the two as <out-dir>/<name>.mp4 (H.264, AAC, 4:2:0: what
// phones and the social networks take). Without --cut it records the game's own trailer at 1280x720, 30 frames a second.
// --every N keeps only every Nth frame and skips the video: a quick contact sheet of the cut.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const args = process.argv.slice(2), out = path.resolve(args[0] || 'trailer-out');
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const every = +opt('every', 1), url = opt('url', 'http://localhost:8123/index.html'), which = opt('cut', '');
const CUTS = require('./promo-cuts.js');
const jobs = which === 'all' ? Object.keys(CUTS) : which ? which.split(',') : [null];

async function record(name) {
  const job = name ? CUTS[name] : { file: 'bannerborn-trailer', w: 1280, h: 720, opts: {}, cut: null };
  if (!job) throw new Error('no cut called ' + name);
  const W = +opt('w', job.w), H = +opt('h', job.h), FPS = +opt('fps', name ? 60 : 30), scale = Math.max(W, H) > 1400 ? 2 : 1; // the page is laid out at a phone's size and drawn at two device pixels a point
  const frames = path.join(out, 'frames-' + job.file); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W / scale, height: H / scale }, deviceScaleFactor: scale });
  const p = await ctx.newPage();
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
  await p.addStyleTag({ content: '#rotate{display:none!important}' }); // a vertical short is drawn on a tall page: nobody is asked to turn it
  const step = () => p.evaluate((ms) => window.__step(ms), 1000 / FPS);
  const until = async (fn, what) => { for (let i = 0; i < 4000; i++) { if (await p.evaluate(fn)) return; await step(); await p.waitForTimeout(40); } throw new Error('timed out waiting for ' + what + (errs.length ? '\n' + errs.join('\n') : '')); };
  await until(() => window.BB && BB.UI && BB.UI.current === 'title', 'the title');
  await p.evaluate(([cut, o]) => { BB.playTrailer(null, Object.assign({ record: true }, o, cut ? { cut } : null)); }, [job.cut, job.opts]);
  await until(() => BB.Trailer.on && !BB.Trailer.loading, 'the trailer to load');
  await until(() => !BB.Trailer.prime, 'the sprites to be coloured'); // that step paints one black frame: it is not part of the film
  const total = await p.evaluate(() => BB.Trailer.total);
  console.log((name || 'trailer') + ': ' + total.toFixed(2) + ' s, ' + Math.ceil(total * FPS) + ' frames at ' + W + 'x' + H + ', ' + FPS + ' a second');
  let n = 0, kept = 0; const t0 = Date.now();
  for (;;) {
    await step();
    if (!(await p.evaluate(() => BB.Trailer.on))) break;
    if (n % every === 0) { await p.screenshot({ path: path.join(frames, 'f' + String(kept).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 96 }); kept++; }
    n++;
    if (n % 300 === 0) console.log('  frame ' + n + ' (' + (n / FPS).toFixed(1) + ' s of film, ' + Math.round((Date.now() - t0) / 1000) + ' s taken)');
    if (n > total * FPS + 180) throw new Error('the trailer did not end');
  }
  console.log('  frames: ' + n + ' stepped, ' + kept + ' kept');
  if (every === 1) {
    const b64 = await p.evaluate(async (dur) => { const u8 = await BB.audioRender(dur); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }, total + 0.5);
    const wav = path.join(out, job.file + '.wav'); fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
    const mp4 = path.join(out, job.file + '.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'), '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
      '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', mp4], { stdio: 'inherit' });
    fs.rmSync(frames, { recursive: true, force: true }); fs.rmSync(wav, { force: true });
    console.log('  wrote ' + mp4 + ' (' + (fs.statSync(mp4).size / 1e6).toFixed(1) + ' MB)');
  }
  console.log(errs.length ? errs.join('\n') : '  no page errors');
  await b.close();
  return errs.length;
}
(async () => { let bad = 0; for (const j of jobs) bad += await record(j); process.exit(bad ? 1 : 0); })().catch((e) => { console.error(e); process.exit(1); });
