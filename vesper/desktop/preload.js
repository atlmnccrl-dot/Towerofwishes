// The bridge between the game and Steam: the game calls window.VESPER_PLATFORM.unlock(id) when it awards an
// achievement (js/main.js platformAch); nothing else crosses.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('VESPER_PLATFORM', { name: 'desktop', unlock: (id) => ipcRenderer.send('steam-unlock', String(id)) });
