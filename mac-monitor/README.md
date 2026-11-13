# Mac Monitor

A real-time system monitor for macOS using a Node.js backend (Express + Socket.io + systeminformation) and a Next.js frontend (App Router + Tailwind + minimal shadcn-style UI components).

## Project Structure

```
mac-monitor/
├── backend/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app/{layout,page}.tsx, globals.css
│   │   ├── components/ui/{card,progress,table,badge}.tsx
│   │   ├── components/sparkline.tsx
│   │   ├── hooks/useStats.ts
│   │   └── lib/{types,utils}.ts
└── README.md
```

## Prerequisites
- Node.js 18+
- macOS (tested with `systeminformation` defaults)

## Quick Start

### 1) Start the backend
```bash
cd mac-monitor/backend
npm install
npm run start
```
Backend listens on `http://localhost:4000` and emits `stats` events via Socket.io.

### 2) Start the frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:3000` to see the dashboard.

## Notes
- CPU/Memory/Disk/Network cards update every second via Socket.io; one shared sampling loop serves all clients and pauses when nobody is connected.
- On macOS the Disk card reports the APFS Data volume (`/System/Volumes/Data`), falling back to `/`.
- Processes table shows the Top 5 by CPU usage.
- A red badge indicates high CPU usage (>= 80%).

## Environment
- Frontend: set `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local` (see `.env.example`). Default `http://localhost:4000`.
- Backend: `PORT` (4000), `INTERVAL_MS` (1000), `CORS_ORIGIN` (`*`).

## Troubleshooting
- If the frontend shows no data, ensure the backend is running and reachable.
- Some icons/components may differ based on library versions. We used Tailwind-based UI components compatible with shadcn styling conventions.
