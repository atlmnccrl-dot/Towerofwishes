// Copies the game as it is played on the web into app/www, which Capacitor packs into the app.
//   node scripts/build-www.js
// Only what the game loads is copied: the page, its scripts, its art and sound, the manifest.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', '..'), out = path.resolve(__dirname, '..', 'www');
const copy = (from, to) => {
  const st = fs.statSync(from);
  if (st.isDirectory()) { fs.mkdirSync(to, { recursive: true }); for (const n of fs.readdirSync(from)) copy(path.join(from, n), path.join(to, n)); }
  else fs.copyFileSync(from, to);
};
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const n of ['index.html', 'manifest.webmanifest', 'js', 'assets']) copy(path.join(root, n), path.join(out, n));
// the trailer film is for the store page, not for the app
for (const n of fs.readdirSync(path.join(out, 'assets'))) if (/\.(mp4|webm|mov)$/i.test(n)) fs.rmSync(path.join(out, 'assets', n));
let bytes = 0; const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n), s = fs.statSync(p); if (s.isDirectory()) walk(p); else bytes += s.size; } }; walk(out);
console.log('www built: ' + (bytes / 1048576).toFixed(1) + ' MB');
