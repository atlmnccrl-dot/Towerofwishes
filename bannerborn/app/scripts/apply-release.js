// Writes what is in release.json everywhere it belongs, so a store build needs one file filled in, once:
//   node scripts/apply-release.js [path/to/release.json]
// - ../js/config.js                 version, the test-ads switch, ad unit ids, the links
// - capacitor.config.json          app id and name
// - android/                       namespace, applicationId, version, app name, AdMob app id, the activity's package
// - ios/                           bundle id, version, display name, AdMob app id
// - ../docs/store/site/            privacy, terms and support pages with your name and contact in them, ready to host,
//                                  and app-ads.txt once your own AdMob id is in
// Safe to run again. Run scripts/configure-native.js after `npx cap add …`, then this.
const fs = require('fs'), path = require('path');
const app = path.resolve(__dirname, '..'), root = path.resolve(app, '..');
const R = JSON.parse(fs.readFileSync(path.resolve(process.argv[2] || path.join(app, 'release.json')), 'utf8'));
const TEST = /ca-app-pub-3940256099942544/;
const say = [];
const edit = (p, fn) => { if (!fs.existsSync(p)) { say.push('  (no ' + path.relative(app, p) + ')'); return; } const a = fs.readFileSync(p, 'utf8'), b = fn(a); if (a !== b) { fs.writeFileSync(p, b); say.push('  changed ' + path.relative(app, p)); } };
const write = (p, text) => { fs.mkdirSync(path.dirname(p), { recursive: true }); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { fs.writeFileSync(p, text); say.push('  wrote   ' + path.relative(app, p)); } };
const bad = [];
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(R.appId)) bad.push('appId must look like com.yourname.bannerborn (lower case, dots, no dashes)');
if (!/^\d+\.\d+\.\d+$/.test(R.version)) bad.push('version must look like 1.0.0');
if (!(R.build >= 1)) bad.push('build must be a whole number, raised by one for every upload');
for (const os of ['android', 'ios']) for (const k of ['appId', 'rewarded', 'interstitial']) if (!/^ca-app-pub-\d+[~/]\d+$/.test(R.admob[os][k])) bad.push('admob.' + os + '.' + k + ' does not look like an AdMob id');
if (!R.admob.testAds && (TEST.test(JSON.stringify(R.admob)))) bad.push('testAds is false but an id is still Google\'s test id: real ads need your own ids');
if (bad.length) { console.error('release.json:\n  ' + bad.join('\n  ')); process.exit(1); }
const q = (s) => JSON.stringify(String(s || '')).replace(/^"|"$/g, "'").replace(/\\"/g, '"');

// ---- the game's own config
write(path.join(root, 'js', 'config.js'), `// Bannerborn — what changes between a test build and the release. WRITTEN BY app/scripts/apply-release.js from
// app/release.json: change it there, not here. Nothing secret lives here: ad unit ids and links are public by
// nature. The AdMob *app* ids go in the native projects (the same script puts them there).
(function () {
  const BB = window.BB;
  BB.CONFIG = {
    version: ${q(R.version)},
    // true: every ad is a Google test ad (safe to tap). False only in the build sent to the stores, with your own
    // ad unit ids below. Tapping your own live ads in testing can get an AdMob account closed.
    testAds: ${R.admob.testAds ? 'true' : 'false'},
    admob: {
      android: { rewarded: ${q(R.admob.android.rewarded)}, interstitial: ${q(R.admob.android.interstitial)} },
      ios: { rewarded: ${q(R.admob.ios.rewarded)}, interstitial: ${q(R.admob.ios.interstitial)} },
    },
    // Ads are for a general audience (no gambling, no mature themes); see docs/RELEASE.md before changing.
    maxAdRating: 'ParentalGuidance',
    // Pages the stores require the app to link to (docs/store/site, hosted somewhere public).
    links: { privacy: ${q(R.links.privacy)}, terms: ${q(R.links.terms)}, support: ${q(R.links.support)} },
  };
})();
`);

// ---- Capacitor
edit(path.join(app, 'capacitor.config.json'), (s) => { const c = JSON.parse(s); c.appId = R.appId; c.appName = R.appName; return JSON.stringify(c, null, 2) + '\n'; });

// ---- Android
const A = path.join(app, 'android');
edit(path.join(A, 'app', 'build.gradle'), (s) => s.replace(/namespace = "[^"]*"/, 'namespace = "' + R.appId + '"').replace(/applicationId "[^"]*"/, 'applicationId "' + R.appId + '"').replace(/versionCode \d+/, 'versionCode ' + R.build).replace(/versionName "[^"]*"/, 'versionName "' + R.version + '"'));
edit(path.join(A, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), (s) => {
  const set = (k, v) => { s = new RegExp('<string name="' + k + '">').test(s) ? s.replace(new RegExp('(<string name="' + k + '">)[^<]*(</string>)'), '$1' + v + '$2') : s.replace('</resources>', '    <string name="' + k + '">' + v + '</string>\n</resources>'); };
  set('app_name', R.appName); set('title_activity_main', R.appName); set('package_name', R.appId); set('custom_url_scheme', R.appId); set('admob_app_id', R.admob.android.appId); return s;
});
{ // the activity lives in a folder named after the app id
  const java = path.join(A, 'app', 'src', 'main', 'java'), want = path.join(java, ...R.appId.split('.'), 'MainActivity.java');
  if (fs.existsSync(java)) {
    const find = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) { const f = find(p); if (f) return f; } else if (n === 'MainActivity.java') return p; } return null; };
    const have = find(java);
    if (have) {
      const src = fs.readFileSync(have, 'utf8').replace(/^package [^;]+;/m, 'package ' + R.appId + ';');
      if (have !== want) { fs.rmSync(have); let d = path.dirname(have); while (d !== java && !fs.readdirSync(d).length) { fs.rmdirSync(d); d = path.dirname(d); } say.push('  moved   MainActivity.java to ' + path.relative(app, path.dirname(want))); }
      write(want, src);
    }
  }
}

// ---- iOS
edit(path.join(app, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'), (s) => s.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, 'PRODUCT_BUNDLE_IDENTIFIER = ' + R.appId + ';').replace(/MARKETING_VERSION = [^;]+;/g, 'MARKETING_VERSION = ' + R.version + ';').replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, 'CURRENT_PROJECT_VERSION = ' + R.build + ';'));
edit(path.join(app, 'ios', 'App', 'App', 'Info.plist'), (s) => s.replace(/(<key>GADApplicationIdentifier<\/key>\s*<string>)[^<]*(<\/string>)/, '$1' + R.admob.ios.appId + '$2').replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, '$1' + R.appName + '$2'));

// ---- the pages to host
{
  const src = path.join(root, 'docs', 'store'), out = path.join(src, 'site'), today = new Date().toISOString().slice(0, 10);
  const fill = (html) => html.replace(/<span class="todo">\[YOUR NAME OR STUDIO\]<\/span>/g, R.studio || '<span class="todo">[YOUR NAME OR STUDIO]</span>').replace(/<span class="todo">\[CONTACT EMAIL\]<\/span>/g, R.contactEmail ? '<a href="mailto:' + R.contactEmail + '">' + R.contactEmail + '</a>' : '<span class="todo">[CONTACT EMAIL]</span>')
    .replace(/<span class="todo">\[DATE\]<\/span>/g, today).replace(/<span class="todo">\[COUNTRY \/ STATE\]<\/span>/g, R.lawOf || '<span class="todo">[COUNTRY / STATE]</span>').replace(/<!-- Before publishing:[\s\S]*?-->\n/, '');
  for (const n of ['privacy.html', 'terms.html']) if (fs.existsSync(path.join(src, n))) write(path.join(out, n), fill(fs.readFileSync(path.join(src, n), 'utf8')));
  const page = (title, body) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + title + '</title>\n<style>body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1f26;background:#fbfaf7;max-width:760px;margin:0 auto;padding:28px 20px 60px}h1{font-size:28px}a{color:#8a4b12}</style>\n</head>\n<body>\n' + body + '\n</body>\n</html>\n';
  const who = R.studio || '[YOUR NAME OR STUDIO]', mail = R.contactEmail ? '<a href="mailto:' + R.contactEmail + '">' + R.contactEmail + '</a>' : '[CONTACT EMAIL]';
  write(path.join(out, 'support.html'), page(R.appName + ' — Support', '<h1>' + R.appName + ' — Support</h1>\n<p>Something not working, or a purchase that did not arrive? Write to ' + mail + '.</p>\n<p>It helps to include the report from the game: <i>Settings → Report for support → Copy</i>. It holds the game’s version, your device model and the last errors, and nothing personal.</p>\n<p><b>A purchase did not arrive.</b> Open <i>Settings → Restore purchases</i> first. Things bought for good come back; a crystal pack is given when the store confirms it, which can take a few minutes.</p>\n<p><b>Moving to a new phone.</b> <i>Settings → Back up or move save</i> gives a code that carries your progress.</p>\n<p><b>Refunds</b> are handled by the App Store or Google Play.</p>'));
  write(path.join(out, 'index.html'), page(R.appName, '<h1>' + R.appName + '</h1>\n<p>Raise your banner. Earn your heroes. Shut the Gravegates.</p>\n<p>A game by ' + who + '.</p>\n<p><a href="support.html">Support</a> · <a href="privacy.html">Privacy policy</a> · <a href="terms.html">Terms of use</a></p>'));
  const pub = (R.admob.android.appId.match(/ca-app-(pub-\d+)/) || [])[1];
  if (pub && !TEST.test(R.admob.android.appId)) write(path.join(out, 'app-ads.txt'), 'google.com, ' + pub + ', DIRECT, f08c47fec0942fa0\n');
  else say.push('  (app-ads.txt is written once your own AdMob app id is in release.json)');
}
console.log('applied ' + R.appId + ' ' + R.version + ' (' + R.build + ')' + (R.admob.testAds ? ' · test ads' : ' · REAL ads')); console.log(say.join('\n') || '  nothing needed changing');
