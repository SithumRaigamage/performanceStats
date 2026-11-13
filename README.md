<h1 align="center">📊 Performance Stats</h1>

<p align="center">
  A real-time macOS system performance monitor — track CPU, memory, disk, and network stats from a beautiful web dashboard.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/macOS-Compatible-000000?style=for-the-badge&logo=apple&logoColor=white" />
  <img src="https://img.shields.io/badge/Real--time-WebSocket-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

---

## ✨ Features

- ⚡ **Real-time Metrics** — Live CPU, memory and disk usage
- 🌐 **Network Monitor** — Upload/download speed tracking
- 📈 **History** — Rolling 60-second CPU and memory charts
- 🧮 **Top Processes** — Top 5 processes by CPU, with a red badge above 80%
- 🌙 **Dark Dashboard** — Sleek dark UI optimized for extended monitoring sessions
- 🔄 **WebSocket Updates** — Push-based streaming via Socket.io

---

## 🏗️ Architecture

```
performanceStats/
├── roadmap.md
└── mac-monitor/
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
cd mac-monitor/backend
npm install
npm start
```

Backend runs at **http://localhost:4000** (Socket.io on the same port). `GET /stats` returns a JSON snapshot.
Env vars: `PORT` (default 4000), `INTERVAL_MS` (default 1000), `CORS_ORIGIN` (default `*`).

### Frontend

```bash
cd mac-monitor/frontend
npm install
npm run dev
```

Dashboard runs at **http://localhost:3000**. To point it at a different backend, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_BACKEND_URL`.

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
