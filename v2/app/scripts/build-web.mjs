// Builds the game in v2/ into a folder of its own: index.html becomes a full document (the artifact
// host adds the skeleton on the web; the app and a web host need their own), with the code and art.
//   node scripts/build-web.mjs          -> www/      for the iOS and Android app (Capacitor)
//   node scripts/build-web.mjs --pwa    -> web/      an installable web app for any static host:
//                                                    a manifest and an offline cache (sw.js)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const app = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), game = path.join(app, '..');
const pwa = process.argv.includes('--pwa'), www = path.join(app, pwa ? 'web' : 'www');
fs.rmSync(www, { recursive: true, force: true }); fs.mkdirSync(www);
const body = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
fs.writeFileSync(path.join(www, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="color-scheme" content="dark"><meta name="theme-color" content="#0a0d14">
<title>Vael</title>${pwa ? `
<link rel="manifest" href="manifest.json"><link rel="apple-touch-icon" href="assets/icons/icon-192.webp">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));</script>` : ''}
</head><body>
${body}
</body></html>
`);
if (pwa) { fs.copyFileSync(path.join(app, 'web-manifest.json'), path.join(www, 'manifest.json')); fs.copyFileSync(path.join(app, 'sw.js'), path.join(www, 'sw.js')); }
for (const dir of ['src', 'assets']) fs.cpSync(path.join(game, dir), path.join(www, dir), { recursive: true });
let n = 0; const count = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? count(path.join(d, f.name)) : n++; }; count(www);
console.log(path.basename(www), 'built:', n, 'files');
