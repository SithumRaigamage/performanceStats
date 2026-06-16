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

- ⚡ **Real-time Metrics** — Live CPU usage, memory pressure, disk I/O
- 🌐 **Network Monitor** — Upload/download speed tracking
- 📈 **Historical Charts** — Time-series graphs for all metrics
- 🖥️ **macOS Native** — Uses native system APIs via Node.js backend
- 🌙 **Dark Dashboard** — Sleek dark UI optimized for extended monitoring sessions
- 🔄 **WebSocket Updates** — Push-based data streaming for instant readings

---

## 🏗️ Architecture

```
performanceStats/
├── roadmap.md
└── mac-monitor/
    ├── backend/            # Node.js metrics server
    │   ├── server.js       # Express + WebSocket server
    │   └── package.json
    └── frontend/           # Next.js dashboard
        └── src/
            └── app/
                └── globals.css
```

---

## 🚀 Getting Started

### Backend

```bash
cd mac-monitor/backend
npm install
node server.js
```

Backend runs at **http://localhost:3001** (WebSocket on same port)

### Frontend

```bash
cd mac-monitor/frontend
npm install
npm run dev
```

Dashboard runs at **http://localhost:3000**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) |
| Backend | Node.js + Express |
| Real-time | WebSocket (ws) |
| Metrics | systeminformation / os module |
| Styling | Tailwind CSS + Geist fonts |

---

## 📜 License

MIT © [Sithum Raigamage](https://github.com/SithumRaigamage)
