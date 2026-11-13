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

const PLATFORM = process.platform; // 'darwin' | 'win32' | 'linux' | ...

// Pseudo / virtual filesystems that shouldn't be reported as "the disk".
const IGNORED_FS = /^(tmpfs|devtmpfs|overlay|squashfs|proc|sysfs|ramfs|autofs|devfs|nullfs)$/i;

// Pick the volume the user thinks of as "my disk" on each OS:
// - macOS (APFS): fsSize() lists many volumes and the first is often a small
//   system/snapshot volume, so prefer the Data volume, then root.
// - Windows: the system drive (usually C:).
// - Linux: root filesystem.
// Falls back to the largest real volume.
function pickMainDisk(disks) {
  const real = disks.filter((d) => d.size > 0 && !IGNORED_FS.test(d.type || ''));
  const candidates = real.length ? real : disks;

  let preferred = [];
  if (PLATFORM === 'darwin') preferred = ['/System/Volumes/Data', '/'];
  else if (PLATFORM === 'win32') preferred = [(process.env.SystemDrive || 'C:').toUpperCase()];
  else preferred = ['/'];

  for (const mount of preferred) {
    const d = candidates.find((x) => (x.mount || '').replace(/\\$/, '').toUpperCase() === mount.toUpperCase());
    if (d) return d;
  }
  return [...candidates].sort((a, b) => b.size - a.size)[0];
}

// Entries that aren't real processes and would dominate a "top CPU" list.
function isRealProcess(p) {
  if (PLATFORM === 'win32') {
    return p.pid !== 0 && !/^(System Idle Process|Idle|_Total)$/i.test(p.name);
  }
  return p.pid !== 0;
}

let osInfoCache = null;
async function getOsInfo() {
  if (!osInfoCache) {
    const os = await si.osInfo();
    osInfoCache = {
      platform: PLATFORM,
      distro: os.distro,
      release: os.release,
      hostname: os.hostname,
      arch: os.arch
    };
  }
  return osInfoCache;
}

async function getStats() {
  const [osInfo, load, mem, disks, processes, net] = await Promise.all([
    getOsInfo(),
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.processes(),
    si.networkStats()
  ]);

  // systeminformation v5 uses camelCase (`currentLoad`), not `currentload`.
  const cpuPercent = Math.round(load.currentLoad ?? 0);

  // `active` = memory in use excluding caches/buffers. Matches Activity
  // Monitor on macOS, "used" minus buff/cache on Linux, and equals `used` on Windows.
  const memUsed = mem.active ?? mem.used;
  const memUsedPercent = mem.total ? Math.round((memUsed / mem.total) * 100) : 0;

  const disk = pickMainDisk(disks) || { use: 0, size: 0, used: 0, fs: 'N/A', mount: '/' };
  const diskPercent = Math.round(disk.use ?? 0);

  const topCpu = processes.list
    .filter(isRealProcess)
    .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
    .slice(0, 5)
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: Number((p.cpu || 0).toFixed(1)),
      mem: Number((p.mem || 0).toFixed(1))
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
    os: osInfo,
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

// `node server.js --once` prints one sample and exits (used by CI on every OS).
if (process.argv.includes('--once')) {
  try {
    const stats = await getStats();
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

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
