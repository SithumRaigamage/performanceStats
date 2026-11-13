# System Monitor

| Folder | What it is |
|---|---|
| `backend/` | Node.js service: collects stats (systeminformation), stores history, evaluates alerts, checks the licence, serves the UI. `node server.js --agent` runs it as a headless agent. |
| `frontend/` | Next.js dashboard, exported as static files and bundled into the desktop app. |
| `desktop/` | Electron shell: window, tray / menu bar, native notifications, installers. |
| `licensing/` | Scripts to create your signing key and issue licence keys. |

## Modes

| Mode | Started by | Listens on | Licence | History | Alerts |
|---|---|---|---|---|---|
| desktop | the Electron app | 127.0.0.1 (random port) | required | on disk | yes |
| dev | `npm run dev` in backend | localhost:4000 | optional (`REQUIRE_LICENSE=1`) | on disk (`backend/.data`) | yes |
| agent | `node server.js --agent`, or **Allow this computer to be monitored** in the app | 0.0.0.0:4100 | not needed | last hour in memory | no (the dashboard watching it shows the stats) |

Agents require a token on every request. Share it only with people you trust, and expose port 4100
only on trusted networks or over a VPN.

## API (all JSON)

| Route | Notes |
|---|---|
| `GET /api/health` | always open |
| `GET /api/stats` | latest sample |
| `GET /api/history?range=15m\|1h\|6h\|24h\|7d` | or `from` / `to` in ms, `points` to downsample |
| `GET /api/history.csv?range=…` | full-resolution CSV download |
| `GET/PUT /api/alerts` | rules + recent alert log |
| `GET/PUT /api/machines` | remote machines shown in the dashboard |
| `GET/PUT /api/sharing` | turn the built-in agent on or off |
| `GET/POST/DELETE /api/license` | licence status / activate / deactivate |

Socket.io events: `stats`, `alert`, `license`, `license_required`, `stats_error`.

## Platform notes

| OS | Main disk | Notes |
|---|---|---|
| macOS | APFS Data volume (`/System/Volumes/Data`), else `/` | Memory "used" matches Activity Monitor. CPU temperature isn't available on Apple Silicon. |
| Windows | System drive (`%SystemDrive%`, usually `C:`) | Idle pseudo-process hidden. Temperatures may need admin rights. Allow the app through the firewall if you turn on remote monitoring. |
| Linux | `/` | tmpfs/overlay/snap mounts ignored. Memory "used" excludes buffers/cache. Launch at login isn't available (use your desktop's autostart settings). |
