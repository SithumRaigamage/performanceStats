import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import si from 'systeminformation';

const PORT = Number(process.env.PORT) || 4000;
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 1000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] }
});

let latestStats = null;

app.get('/', (_req, res) => {
  res.json({ status: 'ok', clients: io.engine.clientsCount });
});

// Snapshot over HTTP, handy for debugging without a socket client.
app.get('/stats', async (_req, res) => {
  try {
    res.json(latestStats ?? (await getStats()));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stats', detail: String(err) });
  }
});

// On macOS (APFS) fsSize() returns many volumes; the first one is often a
// small system/snapshot volume. Prefer the user data volume, then root.
function pickMainDisk(disks) {
  const preferred = ['/System/Volumes/Data', '/'];
  for (const mount of preferred) {
    const d = disks.find((x) => x.mount === mount);
    if (d) return d;
  }
  return [...disks].sort((a, b) => b.size - a.size)[0];
}

async function getStats() {
  const [load, mem, disks, processes, net] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.processes(),
    si.networkStats()
  ]);

  // systeminformation v5 uses camelCase (`currentLoad`), not `currentload`.
  const cpuPercent = Math.round(load.currentLoad ?? 0);

  // `active` is the closest match to Activity Monitor's "memory used" on macOS.
  const memUsed = mem.active ?? mem.used;
  const memUsedPercent = mem.total ? Math.round((memUsed / mem.total) * 100) : 0;

  const disk = pickMainDisk(disks) || { use: 0, size: 0, used: 0, fs: 'N/A', mount: '/' };
  const diskPercent = Math.round(disk.use ?? 0);

  const topCpu = [...processes.list]
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 5)
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: Number(p.cpu.toFixed(1)),
      mem: Number(p.mem.toFixed(1))
    }));

  // rx_sec / tx_sec are null on the very first sample, so default to 0.
  const network = net.reduce(
    (acc, n) => ({
      rxSec: acc.rxSec + (n.rx_sec || 0),
      txSec: acc.txSec + (n.tx_sec || 0)
    }),
    { rxSec: 0, txSec: 0 }
  );

  return {
    timestamp: Date.now(),
    cpu: { percent: cpuPercent, cores: load.cpus?.length ?? 0 },
    mem: { percent: memUsedPercent, total: mem.total, used: memUsed },
    disk: { percent: diskPercent, fs: disk.fs, mount: disk.mount, size: disk.size, used: disk.used },
    network,
    topCpu
  };
}

// One shared sampling loop for all clients (si.processes() is expensive, so
// don't run it once per connected browser tab). It only runs while someone
// is connected.
let timer = null;
let sampling = false;

async function tick() {
  if (sampling) return; // skip if the previous sample is still running
  sampling = true;
  try {
    latestStats = await getStats();
    io.emit('stats', latestStats);
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    io.emit('stats_error', { message: 'Failed to fetch stats', detail: String(err) });
  } finally {
    sampling = false;
  }
}

function startLoop() {
  if (timer) return;
  timer = setInterval(tick, INTERVAL_MS);
  tick();
}

function stopLoop() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

io.on('connection', (socket) => {
  if (latestStats) socket.emit('stats', latestStats);
  startLoop();

  socket.on('disconnect', () => {
    if (io.engine.clientsCount === 0) stopLoop();
  });
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

function shutdown() {
  stopLoop();
  io.close();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
