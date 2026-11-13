<h1 align="center">📊 System Monitor</h1>

<p align="center">
  A real-time system monitor for <b>macOS, Windows and Linux</b>, with alerts, history and monitoring of other machines on your network, all in one desktop app.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white" />
  <img src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" />
  <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" />
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" />
</p>

---

## ✨ Features

| | |
|---|---|
| ⚡ **Live dashboard** | CPU (total + per core), memory and swap, all drives, network up/down, top 5 processes |
| 🌡️ **Hardware** | CPU temperature, GPU model / load / VRAM, battery level, health and charge cycles |
| 🔔 **Alerts** | Desktop notifications when CPU, RAM, disk or temperature stay above your limit |
| 📈 **History + CSV export** | Kept on disk for 1–90 days, with charts for 15 min to 7 days and one-click CSV export |
| 🖥️ **Multiple machines** | Watch other PCs (with the app installed) or headless Linux servers (agent) from one dashboard |
| 🔒 **Private** | Everything stays on your computers. No accounts, no cloud, no tracking |
| 🧩 **Runs in the background** | Stays in the tray / menu bar so alerts and history keep working with the window closed |

> **Note on temperatures and GPU stats:** availability depends on the OS and hardware. NVIDIA GPUs report live load;
> on Windows, CPU temperature may need the app to run as administrator; on Apple Silicon Macs, CPU temperature
> isn't exposed. The app shows "Not available" instead of guessing.

---

## 🏗️ Project structure

```
performanceStats/
├── LICENSE                     # Commercial EULA
└── system-monitor/
    ├── backend/                # Node.js monitoring service (also the headless agent)
    │   ├── server.js           # CLI: dev mode, --agent, --once
    │   ├── src/                # collector, history, alerts, settings, licence, server
    │   └── test/               # node --test
    ├── frontend/               # Next.js dashboard (static export)
    ├── desktop/                # Electron app + installers (electron-builder)
    └── licensing/              # Licence key tools (private key is gitignored)
```

---

## 🚀 Development

```bash
# 1. backend (dev mode, no licence needed)
cd system-monitor/backend && npm install && npm run dev      # http://localhost:4000

# 2. dashboard with hot reload
cd system-monitor/frontend && npm install && npm run dev     # http://localhost:3000

# 3. the real desktop app
cd system-monitor/desktop && npm install && npm start
```

Backend checks: `npm test` (unit + API tests) and `npm run check` (one real sample on this OS).
To test the licence screen in dev mode: `REQUIRE_LICENSE=1 npm run dev`.

## 📦 Releasing

1. Bump `version` in `system-monitor/desktop/package.json`.
2. `git tag v1.0.0 && git push --tags`
3. GitHub Actions (`release.yml`) builds `.dmg`/`.zip` (macOS, Intel + Apple Silicon), `.exe` (Windows),
   `.AppImage`/`.deb` (Linux) and the Linux agent package, then drafts a GitHub release with them.
4. Upload the files to wherever buyers download from (your website).

Code signing: see `system-monitor/desktop/README.md`.

## 💳 Selling licences

See `system-monitor/licensing/README.md`. In short: customer pays on your site →
`node licensing/issue-license.mjs --name "…" --email "…"` → email them the key.

---

## 📜 License

Proprietary, see [LICENSE](LICENSE). © 2026 Sithum Lisitha Raigamage. Versions published before
this licence change remain available under the MIT licence they were released with.
