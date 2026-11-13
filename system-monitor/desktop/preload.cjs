// Minimal, safe bridge between the UI and the Electron main process.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('systemMonitor', {
  isDesktop: true,
  version: ipcRenderer.sendSync('app:version'),
  platform: process.platform,
  openExternal: (url) => ipcRenderer.send('app:open-external', url),
  getLaunchAtLogin: () => ipcRenderer.invoke('app:get-launch-at-login'),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke('app:set-launch-at-login', !!enabled)
});
