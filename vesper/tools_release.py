# THE BLEEDING MOON - the launch, from one file (2026-11-11). vesper/release.json holds every value the stores need
# (app ID, version, studio, contact, AdMob IDs, Steam App ID, store links); this script writes them where they belong
# and tells you what is still missing.
#   python3 vesper/tools_release.py --check    what is ready and what is not (exit 1 while anything blocks a launch)
#   python3 vesper/tools_release.py --apply    write release.json into: js/shop.js (AdMob unit IDs; test mode off once
#                                              all are real), app/store-ids.json + app/capacitor.config.json + the
#                                              Android and iOS projects (app ID, version), desktop/package.json and
#                                              desktop/steam.json, and site/ (privacy policy, support page, app-ads.txt)
#   python3 vesper/tools_release.py --site     only (re)build site/
# site/ is a small static website to host anywhere (GitHub Pages, Netlify, itch.io page links): the stores need the
# privacy policy at a public address, AdMob needs app-ads.txt at the root of the website you list in the stores.
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(os.path.join(HERE, 'release.json')))
TEST_ADMOB = 'ca-app-pub-3940256099942544'
def path(*p): return os.path.join(HERE, *p)
def read(*p): return open(path(*p), encoding='utf-8').read()
def write(rel, s):
    p = path(rel); old = open(p, encoding='utf-8').read() if os.path.exists(p) else None
    if old != s:
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'w', encoding='utf-8').write(s); print('  wrote', rel)

A = R.get('admob', {})
UNITS = ['androidApp', 'androidRewarded', 'androidInterstitial', 'iosApp', 'iosRewarded', 'iosInterstitial']
def admob_real(): return all(A.get(k, '').startswith('ca-app-pub-') and TEST_ADMOB not in A.get(k, '') for k in UNITS)
def appid_ok(): return bool(re.fullmatch(r'[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}', R['appId'])) and 'yourstudio' not in R['appId']

# ---- the website: privacy policy, support page, app-ads.txt ------------------------------------------------------------
def md_to_html(md):
    out, para, lst = [], [], False
    def inline(t):
        t = html.escape(t, quote=False)
        t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t); t = re.sub(r'\*(.+?)\*', r'<i>\1</i>', t)
        return re.sub(r'&lt;(https?://[^&]+)&gt;', r'<a href="\1">\1</a>', t)
    def flush():
        nonlocal para
        if para: out.append('<p>' + inline(' '.join(para)) + '</p>'); para = []
    for line in md.split('\n'):
        if line.startswith('# '): flush(); out.append('<h1>' + inline(line[2:]) + '</h1>')
        elif line.startswith('## '): flush(); out.append('<h2>' + inline(line[3:]) + '</h2>')
        elif line.startswith('- '):
            flush()
            if not lst: out.append('<ul>'); lst = True
            out.append('<li>' + inline(line[2:]))
        elif line.startswith('  ') and lst and line.strip(): out[-1] += ' ' + inline(line.strip())
        elif not line.strip():
            flush()
            if lst: out.append('</ul>'); lst = False
        else:
            if lst: out.append('</ul>'); lst = False
            para.append(line.strip())
    flush()
    if lst: out.append('</ul>')
    return '\n'.join(out)

PAGE = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title><style>
:root {{ --ink: #07040a; --text: #eee6ea; --dim: #b3a5ad; --red: #ff3a55; }}
body {{ margin: 0; background: var(--ink); color: var(--text); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }}
main {{ max-width: 760px; margin: 0 auto; padding: 32px 16px 64px; }}
h1 {{ color: var(--red); font-size: 30px; line-height: 1.2; }} h2 {{ margin-top: 32px; font-size: 20px; }}
a {{ color: #ff8a9c; }} p, li {{ color: var(--text); }} small, .dim {{ color: var(--dim); }}
nav a {{ margin-right: 16px; }} .stores a {{ display: inline-block; margin: 6px 12px 6px 0; padding: 8px 14px; border: 1px solid var(--red); border-radius: 6px; text-decoration: none; }}
</style></head><body><main><nav><a href="index.html">{app}</a><a href="privacy.html">Privacy</a></nav>
{body}
<p class="dim"><small>© {studio}. {app}.</small></p></main></body></html>
'''

def build_site():
    studio = R['studio'] or '[YOUR NAME OR STUDIO]'; email = R['email'] or '[YOUR CONTACT EMAIL]'
    import datetime
    md = read('PRIVACY.md')
    md = re.sub(r'^\*Last updated: \[DATE\]\..*?\*\n', '*Last updated: %s.*\n' % datetime.date.today().strftime('%d %B %Y'), md, flags=re.S | re.M)
    md = md.replace('[YOUR NAME OR STUDIO]', studio).replace('[YOUR CONTACT EMAIL]', email)
    md = re.sub(r' \[If you change the audience.*?\]', '', md, flags=re.S)
    write('site/privacy.html', PAGE.format(title='Privacy Policy · ' + R['appName'], app=html.escape(R['appName']), studio=html.escape(studio), body=md_to_html(md)))
    links = ''.join(f'<a href="{html.escape(u)}">{n}</a>' for n, u in [('App Store', R['storeLinks'].get('appStore')), ('Google Play', R['storeLinks'].get('googlePlay')), ('Steam', R['storeLinks'].get('steam')), ('itch.io', R['storeLinks'].get('itch'))] if u)
    body = f'''<h1>{html.escape(R['appName'])}</h1>
<p>Seven hundred years ago a swordsman cut down five kings, and with their souls he cast the spell that wakes every grave.
From that night the moon has bled red. Tonight it bleeds out. One blade can stop him, at the top of the Spire.</p>
<p>A hand-crafted pixel-art action game: hordes of the risen dead, six guardians, bound souls, eight heroes. Plays offline.
In English, Spanish, Portuguese, French and German.</p>
<div class="stores">{links or '<span class="dim">Coming soon.</span>'}</div>
<h2>Support</h2>
<p>Questions, a lost purchase or a bug: write to <a href="mailto:{html.escape(email)}">{html.escape(email)}</a>.
Purchases can be restored in the game: Settings → Restore purchases (same store account).</p>
<h2>Your save</h2>
<p>Progress is kept on your device only. Settings → Export save makes a file you can import on another device.</p>'''
    write('site/index.html', PAGE.format(title=R['appName'], app=html.escape(R['appName']), studio=html.escape(studio), body=body))
    pub = A.get('publisherId', '')
    write('site/app-ads.txt', (f'google.com, {pub}, DIRECT, f08c47fec0942fa0\n' if pub.startswith('pub-') else
          '# app-ads.txt: put your AdMob publisher ID in release.json (admob.publisherId, "pub-..."), then run tools_release.py --apply\n'))

# ---- apply ------------------------------------------------------------------------------------------------------------
def apply():
    print('applying release.json')
    v, b = R['version'], int(R['build'])
    # The shop: the real unit IDs and test mode off, only when every ID is real (else Google's test IDs stay, with test ads).
    s = read('js', 'shop.js')
    if admob_real():
        s = re.sub(r"android: \{ app: '[^']*', rewarded: '[^']*', interstitial: '[^']*' \}", f"android: {{ app: '{A['androidApp']}', rewarded: '{A['androidRewarded']}', interstitial: '{A['androidInterstitial']}' }}", s)
        s = re.sub(r"ios: \{ app: '[^']*', rewarded: '[^']*', interstitial: '[^']*' \}", f"ios: {{ app: '{A['iosApp']}', rewarded: '{A['iosRewarded']}', interstitial: '{A['iosInterstitial']}' }}", s)
        s = s.replace('testing: true,', 'testing: false,')
    else: print('  shop: AdMob IDs incomplete, keeping Google\'s test IDs and test ads')
    write('js/shop.js', s)
    ids = json.loads(read('app', 'store-ids.json'))
    if admob_real(): ids['admobAppIdAndroid'], ids['admobAppIdIos'] = A['androidApp'], A['iosApp']
    write('app/store-ids.json', json.dumps(ids, indent=2, ensure_ascii=False) + '\n')
    cap = json.loads(read('app', 'capacitor.config.json')); cap['appId'], cap['appName'] = R['appId'], R['appName']
    write('app/capacitor.config.json', json.dumps(cap, indent=2) + '\n')
    pkg = json.loads(read('app', 'package.json')); pkg['version'] = v; write('app/package.json', json.dumps(pkg, indent=2) + '\n')
    g = read('app', 'android', 'app', 'build.gradle')
    g = re.sub(r'applicationId "[^"]*"', f'applicationId "{R["appId"]}"', g); g = re.sub(r'versionCode \d+', f'versionCode {b}', g); g = re.sub(r'versionName "[^"]*"', f'versionName "{v}"', g)
    write('app/android/app/build.gradle', g)
    px = read('app', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj')
    px = re.sub(r'PRODUCT_BUNDLE_IDENTIFIER = [^;]*;', f'PRODUCT_BUNDLE_IDENTIFIER = {R["appId"]};', px)
    px = re.sub(r'MARKETING_VERSION = [^;]*;', f'MARKETING_VERSION = {v};', px); px = re.sub(r'CURRENT_PROJECT_VERSION = [^;]*;', f'CURRENT_PROJECT_VERSION = {b};', px)
    write('app/ios/App/App.xcodeproj/project.pbxproj', px)
    d = json.loads(read('desktop', 'package.json')); d['version'] = v; d['build']['appId'] = R['appId']; d['build']['productName'] = d['productName'] = R['appName']
    if R['studio']: d['author'] = R['studio']
    write('desktop/package.json', json.dumps(d, indent=2, ensure_ascii=False) + '\n')
    st = json.loads(read('desktop', 'steam.json')); st['appId'] = int(R.get('steamAppId') or 0); write('desktop/steam.json', json.dumps(st, indent=2) + '\n')
    build_site()
    print('done: now cd vesper/app && npm run sync (the apps), and host vesper/site/')

# ---- check ------------------------------------------------------------------------------------------------------------
def check():
    rows = []   # (ok, blocks launch, what, how)
    def row(ok, what, how, blocks=True): rows.append((ok, blocks, what, how))
    row(appid_ok(), 'App ID (permanent: never changes after the first upload)', 'release.json "appId", e.g. com.yourname.bleedingmoon')
    row(bool(R['studio']), 'Studio or developer name', 'release.json "studio"')
    row(bool(re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', R['email'] or '')), 'Contact email (stores, privacy policy, support page)', 'release.json "email"')
    row(bool(R['privacyUrl'].startswith('https://')), 'Privacy policy at a public https address', 'host vesper/site/ (after --apply), put its privacy.html address in "privacyUrl"')
    row(bool(R['website'].startswith('https://')), 'Developer website (the stores list it; AdMob reads app-ads.txt from its root)', 'host vesper/site/ there, put the address in "website"')
    row(admob_real(), 'AdMob: 2 app IDs and 4 ad unit IDs', 'AdMob console → Apps; release.json "admob"')
    row(A.get('publisherId', '').startswith('pub-'), 'AdMob publisher ID (for app-ads.txt)', 'AdMob → Settings → Account information')
    shop = read('js', 'shop.js'); row('testing: false' in shop and TEST_ADMOB not in shop, 'The shop uses the real ads (test mode off)', 'run --apply once the AdMob IDs are in')
    cap = json.loads(read('app', 'capacitor.config.json')); row(cap['appId'] == R['appId'] and appid_ok(), 'The apps carry the App ID', 'run --apply')
    row(os.path.exists(path('site', 'privacy.html')) and '[YOUR' not in read('site', 'privacy.html') if os.path.exists(path('site', 'privacy.html')) else False, 'Privacy page built with your details', 'run --apply (or --site)')
    row(bool(int(R.get('steamAppId') or 0)), 'Steam App ID (only for the Steam release)', 'Steamworks → your app; release.json "steamAppId"', blocks=False)
    keystore = any(f.endswith(('.jks', '.keystore')) for r_, _, fs in os.walk(path('app', 'android')) for f in fs)
    row(not keystore, 'No Android keystore inside the repository (keep it outside, backed up)', 'move any .jks/.keystore out of vesper/app/android')
    manual = ['Google Play Console and Apple Developer accounts, payments and tax profiles', 'The 9 in-app products in both stores (IDs in STORE.md)',
              'A signed Android .aab (Android Studio) and an iOS archive (Xcode on a Mac)', 'Google Play closed test: 12 testers for 14 days (new personal accounts)',
              'Data safety (Google) and App Privacy (Apple) forms; ratings questionnaires (answers in STORE.md)', 'Licences without a file in the repo confirmed (RELEASE.md → Licences)',
              'The characters shared with Tower of Wishes: your decision', 'Played on real phones; translations read by native speakers']
    print('THE BLEEDING MOON - launch check\n')
    for ok, blocks, what, how in rows: print(f"  [{'x' if ok else ' '}] {what}" + ('' if ok else f"\n        → {how}" + ('' if blocks else ' (optional)')))
    print('\n  Outside this repository (tick them yourself):'); [print('  [ ] ' + m) for m in manual]
    n = sum(1 for ok, blocks, *_ in rows if blocks and not ok)
    print(f"\n{'READY for the store builds' if not n else str(n) + ' item(s) above block the launch'} (and the list outside the repository).")
    return n

if __name__ == '__main__':
    a = sys.argv[1:] or ['--check']
    if '--apply' in a: apply()
    elif '--site' in a: build_site()
    sys.exit(1 if check() else 0)
