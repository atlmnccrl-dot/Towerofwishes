// THE BLEEDING MOON - the desktop build (Windows, macOS, Linux; for Steam). The web game in an Electron window:
// fullscreen by default (F11 toggles, Esc stays the game's), no menu bar, saves in the app's own storage (Electron
// keeps localStorage under the user-data folder, which Steam Auto-Cloud can sync: see vesper/RELEASE.md). The web
// build has no ads and no purchases (window.VESPER_WEB_RELEASE). Steam, when steam.json has an App ID, gets the
// achievements through preload.js.
const { app, BrowserWindow, ipcMain, globalShortcut, protocol, net } = require('electron');
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
// The game fetches its data, which file:// pages cannot: it is served from app://game/ out of www/ instead.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
const WWW = path.join(__dirname, 'www');
const cfg = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'steam.json'), 'utf8')); } catch (e) { return { appId: 0 }; } })();

let steam = null;
if (cfg.appId) {
  try { steam = require('steamworks.js').init(cfg.appId); } catch (e) { console.warn('Steam is not running or steamworks.js is missing:', e.message); }
}
ipcMain.on('steam-unlock', (_e, id) => {
  if (!steam) return;
  const name = (cfg.achievements && cfg.achievements[id]) || id;
  try { if (!steam.achievement.isActivated(name)) steam.achievement.activate(name); } catch (e) { /* unknown achievement */ }
});

function create() {
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 960, minHeight: 540, fullscreen: true, backgroundColor: '#07040a', autoHideMenuBar: true, title: 'The Bleeding Moon',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  win.removeMenu();
  win.loadURL('app://game/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { require('electron').shell.openExternal(url); return { action: 'deny' }; });   // links (credits, privacy) open in the browser
  globalShortcut.register('F11', () => win.setFullScreen(!win.isFullScreen()));
}
app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, ''), file = path.normalize(path.join(WWW, rel));
    if (!file.startsWith(WWW)) return new Response('no', { status: 403 });   // nothing outside www/
    return net.fetch(pathToFileURL(file).toString());
  });
  create();
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
if (steam) { try { require('steamworks.js').electronEnableSteamOverlay(); } catch (e) { /* older steamworks.js */ } }
