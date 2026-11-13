// Bellmourn uses no pre-made assets: every texture, model, font, sound and piece of music is made in code
// at runtime. This check fails if a game file loads anything from outside the game folder, any image,
// audio, font or model file, or anything from the network. (The only vendored file is the three.js
// rendering library, which is code, under vendor/.)
// node bellmourn/test/no-assets.mjs
import fs from 'fs'; import path from 'path'; import url from 'url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const bad = []; const BIN = /\.(png|jpe?g|gif|webp|bmp|svg|mp3|ogg|wav|m4a|flac|ttf|otf|woff2?|glb|gltf|fbx|obj|json)(['"?#]|$)/i;
function scan(file) {
  const src = fs.readFileSync(file, 'utf8'); const rel = path.relative(root, file);
  src.split('\n').forEach((line, i) => {
    const strs = line.match(/(['"`])(?:(?!\1).)*\1/g) || [];
    for (const s of strs) {
      const v = s.slice(1, -1);
      if (v.startsWith('.') && /\.m?js$/.test(v)) { const target = path.resolve(path.dirname(file), v); if (!target.startsWith(root + path.sep)) bad.push(`${rel}:${i + 1} reaches outside the game: ${v}`); }
      if (/(^|\/)assets\/|art_source|emberfall|\bv2\//.test(v)) bad.push(`${rel}:${i + 1} reaches into the repository's assets: ${v}`);
      if (BIN.test(v)) bad.push(`${rel}:${i + 1} loads a file: ${v}`);
      if (/^(https?:)?\/\//.test(v)) bad.push(`${rel}:${i + 1} loads from the network: ${v}`);
    }
    if (/\b(fetch|XMLHttpRequest|new Audio|new Image|TextureLoader|GLTFLoader|FontFace|loadAsync)\s*\(/.test(line)) bad.push(`${rel}:${i + 1} loader call: ${line.trim().slice(0, 100)}`);
  });
}
function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!['vendor', 'test', 'tools'].includes(f)) walk(p); } else if (/\.(js|mjs|html|css)$/.test(f)) scan(p); } }
walk(root);
// nothing but code, the README and the three.js licence may live in the folder
for (const f of fs.readdirSync(root, { recursive: true })) { const p = String(f); if (fs.statSync(path.join(root, p)).isFile() && !/\.(js|mjs|html|md)$/.test(p) && p !== 'vendor/THREE_LICENSE') bad.push('non-code file in the game folder: ' + p); }
console.log(bad.length ? bad.join('\n') : 'no pre-made assets: everything is generated in code');
process.exit(bad.length ? 1 : 0);
