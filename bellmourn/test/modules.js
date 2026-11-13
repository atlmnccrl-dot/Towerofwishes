// Imports every game module in a real browser and reports any that fail to parse or load (Node's
// syntax check is not enough: the browser is the judge). Run before publishing.
// NODE_PATH=$(npm root -g) node bellmourn/test/modules.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const port = process.env.PORT || 8790; const repo = path.resolve(__dirname, '../..'); const files = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js') && !p.endsWith(path.join('js', 'main.js'))) files.push(path.relative(repo, p).split(path.sep).join('/')); } })(path.join(repo, 'bellmourn', 'js'));
  const b = await chromium.launch(); const p = await b.newPage(); await p.goto(`http://127.0.0.1:${port}/`);
  let bad = 0;
  for (const f of files) { const r = await p.evaluate(async (u) => { try { await import(u); return null; } catch (e) { return e.message; } }, '/' + f); if (r) { bad++; console.log('FAIL', f, '->', r); } }
  console.log(bad ? bad + ' modules fail' : files.length + ' modules load');
  await b.close(); process.exit(bad ? 1 : 0);
})();
