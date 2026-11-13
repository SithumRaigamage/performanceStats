// Electron main process: starts the local monitoring service, the window and the tray.
import { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, shell, dialog } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP_NAME = 'System Monitor';
const startHidden = process.argv.includes('--hidden') || app.getLoginItemSettings().wasOpenedAsHidden;

let win = null;
let tray = null;
let monitor = null;
let baseUrl = null;
let quitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  app.whenReady().then(start).catch((err) => {
    dialog.showErrorBox(`${APP_NAME} could not start`, String(err?.stack || err));
    app.exit(1);
  });
}

if (process.platform === 'win32') app.setAppUserModelId('lk.sithum.systemmonitor'); // needed for Windows notifications

async function start() {
  const { createMonitorServer } = await import(pathToFileURL(path.join(here, 'app', 'backend', 'src', 'server.js')).href);

  monitor = createMonitorServer({
    mode: 'desktop',
    port: 0, // any free port, local only
    host: '127.0.0.1',
    dataDir: app.getPath('userData'),
    staticDir: path.join(here, 'app', 'ui'),
    requireLicense: true,
    onAlert: (a) => {
      if (!Notification.isSupported()) return;
      const n = new Notification({ title: a.title, body: a.message, silent: false });
      n.on('click', () => showWindow());
      n.show();
    }
  });
  const port = await monitor.start();
  baseUrl = `http://127.0.0.1:${port}`;

  createTray();
  if (!startHidden) createWindow();
  if (process.platform === 'darwin' && startHidden) app.dock?.hide();

  // Live CPU in the macOS menu bar / tray tooltip.
  setInterval(() => {
    const s = monitor?.latest;
    if (!s || !tray) return;
    const text = `CPU ${s.cpu.percent}%  RAM ${s.mem.percent}%`;
    tray.setToolTip(`${APP_NAME}: ${text}`);
    if (process.platform === 'darwin') tray.setTitle(` ${s.cpu.percent}%`, { fontType: 'monospacedDigit' });
  }, 2000);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: APP_NAME,
    backgroundColor: '#09090b',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(here, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(here, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  win.loadURL(baseUrl);
  win.once('ready-to-show', () => win.show());

  // Open external links in the user's browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.startsWith(baseUrl)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(baseUrl)) {
      e.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  // Closing the window keeps monitoring (alerts + history) running in the tray.
  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
    if (process.platform === 'darwin') app.dock?.hide();
  });
  win.on('closed', () => (win = null));
}

function showWindow() {
  if (process.platform === 'darwin') app.dock?.show();
  if (!win) createWindow();
  else {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
}

function createTray() {
  const icon =
    process.platform === 'darwin'
      ? nativeImage.createFromPath(path.join(here, 'assets', 'trayTemplate.png'))
      : nativeImage.createFromPath(path.join(here, 'assets', 'tray.png'));
  if (process.platform === 'darwin') icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Open ${APP_NAME}`, click: showWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  );
  tray.on('click', () => {
    if (process.platform !== 'darwin') showWindow();
  });
}

// --- IPC for the UI -----------------------------------------------------------
ipcMain.on('app:version', (e) => (e.returnValue = app.getVersion()));
ipcMain.on('app:open-external', (_e, url) => {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url);
});
// Launch at login is supported by Electron on macOS and Windows only.
ipcMain.handle('app:get-launch-at-login', () => (process.platform === 'linux' ? null : app.getLoginItemSettings().openAtLogin));
ipcMain.handle('app:set-launch-at-login', (_e, enabled) => {
  if (process.platform === 'linux') return null;
  app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true, args: ['--hidden'] });
  return app.getLoginItemSettings().openAtLogin;
});

// --- lifecycle -----------------------------------------------------------------
app.on('activate', () => showWindow()); // macOS dock click
app.on('window-all-closed', () => {
  /* keep running in the tray */
});
app.on('before-quit', () => {
  quitting = true;
});
app.on('will-quit', async (e) => {
  if (monitor) {
    e.preventDefault();
    const m = monitor;
    monitor = null;
    await m.stop().catch(() => {});
    app.quit();
  }
});
