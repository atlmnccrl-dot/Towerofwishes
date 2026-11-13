// Rewrites bare `from 'three'` imports to relative paths to the vendored build, so the game also runs
// on browsers without import maps (iOS Safari before 16.4). Run after adding files:
//   node bellmourn/tools/fix-imports.mjs
import fs from 'fs'; import path from 'path'; import url from 'url';
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'vendor', 'three.module.min.js');
let n = 0;
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f); const st = fs.statSync(p);
    if (st.isDirectory()) { if (f !== 'node_modules') walk(p); continue; }
    if (!f.endsWith('.js') || p === vendor) continue;
    const src = fs.readFileSync(p, 'utf8');
    let rel = path.relative(path.dirname(p), vendor).split(path.sep).join('/'); if (!rel.startsWith('.')) rel = './' + rel;
    const out = src.replace(/from\s+['"]three['"]/g, `from '${rel}'`);
    if (out !== src) { fs.writeFileSync(p, out); n++; console.log('fixed', path.relative(root, p)); }
  }
}
walk(path.join(root, 'js')); walk(path.join(root, 'vendor'));
console.log(n + ' files rewritten');
