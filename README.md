<h1 align="center">📊 Performance Stats</h1>

<p align="center">
  A real-time, cross-platform (macOS, Windows, Linux) system performance monitor — track CPU, memory, disk, and network stats from a beautiful web dashboard.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/macOS-Compatible-000000?style=for-the-badge&logo=apple&logoColor=white" />
  <img src="https://img.shields.io/badge/Windows-Compatible-0078D6?style=for-the-badge&logo=windows&logoColor=white" />
  <img src="https://img.shields.io/badge/Linux-Compatible-FCC624?style=for-the-badge&logo=linux&logoColor=black" />
  <img src="https://img.shields.io/badge/Real--time-WebSocket-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

---

## ✨ Features

- ⚡ **Real-time Metrics** — Live CPU, memory and disk usage
- 🌐 **Network Monitor** — Upload/download speed tracking
- 📈 **History** — Rolling 60-second CPU and memory charts
- 🧮 **Top Processes** — Top 5 processes by CPU, with a red badge above 80%
- 💻 **Cross-platform** — macOS, Windows and Linux; picks the right main disk per OS and shows host/OS info
- 🌙 **Dark Dashboard** — Sleek dark UI optimized for extended monitoring sessions
- 🔄 **WebSocket Updates** — Push-based streaming via Socket.io

---

## 🏗️ Architecture

```
performanceStats/
├── roadmap.md
└── system-monitor/
    ├── backend/                # Node.js metrics server
    │   ├── server.js           # Express + Socket.io + systeminformation
    │   └── package.json
    └── frontend/               # Next.js dashboard
        ├── package.json
        └── src/
            ├── app/            # layout.tsx, page.tsx, globals.css
            ├── components/     # ui/{card,progress,table,badge}.tsx, sparkline.tsx
            ├── hooks/useStats.ts
            └── lib/            # types.ts, utils.ts
```

---

## 🚀 Getting Started

### Backend

```bash
cd system-monitor/backend
npm install
npm start
```

Backend runs at **http://localhost:4000** (Socket.io on the same port). `GET /stats` returns a JSON snapshot.
Run `npm run check` to print one sample and exit (a quick sanity check on any OS), or `npm run dev` to auto-restart on changes.
Env vars: `PORT` (default 4000), `INTERVAL_MS` (default 1000), `CORS_ORIGIN` (default `*`).

### Frontend

```bash
cd system-monitor/frontend
npm install
npm run dev
```

Dashboard runs at **http://localhost:3000**. To point it at a different backend, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_BACKEND_URL`.

---

## 💻 Platform notes

| OS | Disk shown | Notes |
|---|---|---|
| macOS | APFS Data volume (`/System/Volumes/Data`), else `/` | Memory "used" matches Activity Monitor |
| Windows | System drive (`%SystemDrive%`, usually `C:`) | "System Idle Process" is hidden from Top processes. Allow Node through Windows Firewall if prompted |
| Linux | Root filesystem `/` | tmpfs/overlay/snap (squashfs) mounts are ignored. Memory "used" excludes buffers/cache |

All commands work the same in macOS Terminal, Linux shells, PowerShell and cmd.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Metrics | systeminformation |
| Styling | Tailwind CSS v4 + Geist fonts + lucide-react |

---

## 📜 License

MIT © [Sithum Raigamage](https://github.com/SithumRaigamage)
