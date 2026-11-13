// Cross-platform stats collection (macOS, Windows, Linux) via systeminformation.
import si from 'systeminformation';

export const PLATFORM = process.platform; // 'darwin' | 'win32' | 'linux' | ...

// Pseudo / virtual filesystems that shouldn't be reported as disks.
const IGNORED_FS = /^(tmpfs|devtmpfs|overlay|squashfs|proc|sysfs|ramfs|autofs|devfs|nullfs|efivarfs)$/i;
const SLOW_REFRESH_MS = 10_000; // temps / GPU / battery are expensive; refresh every 10s

function normMount(m) {
  return (m || '').replace(/\\$/, '').toUpperCase();
}

// Pick the volume the user thinks of as "my disk" on each OS:
// macOS -> APFS Data volume, then root; Windows -> system drive (C:); Linux -> root.
export function pickMainDisk(disks) {
  const real = realDisks(disks);
  const candidates = real.length ? real : disks;
  let preferred;
  if (PLATFORM === 'darwin') preferred = ['/System/Volumes/Data', '/'];
  else if (PLATFORM === 'win32') preferred = [process.env.SystemDrive || 'C:'];
  else preferred = ['/'];
  for (const mount of preferred) {
    const d = candidates.find((x) => normMount(x.mount) === normMount(mount));
    if (d) return d;
  }
  return [...candidates].sort((a, b) => b.size - a.size)[0];
}

export function realDisks(disks) {
  const seen = new Set();
  return disks.filter((d) => {
    if (!(d.size > 0) || IGNORED_FS.test(d.type || '')) return false;
    // macOS APFS: hide the tiny system-internal volumes.
    if (PLATFORM === 'darwin' && /^\/System\/Volumes\/(VM|Preboot|Update|xarts|iSCPreboot|Hardware)/.test(d.mount)) return false;
    if (/^\/(snap|boot\/efi)/.test(d.mount)) return false;
    if (seen.has(d.mount)) return false;
    seen.add(d.mount);
    return true;
  });
}

// Entries that aren't real processes and would dominate a "top CPU" list.
function isRealProcess(p) {
  if (p.pid === 0) return false;
  if (PLATFORM === 'win32') return !/^(System Idle Process|Idle|_Total)$/i.test(p.name);
  return true;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const positive = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

let osInfoCache = null;
export async function getOsInfo() {
  if (!osInfoCache) {
    const [os, cpu] = await Promise.all([si.osInfo(), si.cpu()]);
    osInfoCache = {
      platform: PLATFORM,
      distro: os.distro,
      release: os.release,
      hostname: os.hostname,
      arch: os.arch,
      cpuModel: [cpu.manufacturer, cpu.brand].filter(Boolean).join(' ')
    };
  }
  return osInfoCache;
}

let slowCache = { at: 0, data: { temperature: null, gpus: [], battery: null } };

async function getSlowStats() {
  if (Date.now() - slowCache.at < SLOW_REFRESH_MS) return slowCache.data;
  const [tempR, gfxR, batR] = await Promise.allSettled([si.cpuTemperature(), si.graphics(), si.battery()]);

  // CPU temperature: availability depends on OS and permissions (see README).
  let temperature = null;
  if (tempR.status === 'fulfilled') {
    const t = tempR.value;
    temperature = {
      main: round1(positive(t.main)),
      max: round1(positive(t.max)),
      cores: (t.cores || []).map(positive).map(round1)
    };
    if (temperature.main == null && temperature.max == null) temperature = null;
  }

  // GPU: model is always available; live utilisation/temp mostly on NVIDIA (nvidia-smi).
  const gpus =
    gfxR.status === 'fulfilled'
      ? (gfxR.value.controllers || []).map((g) => ({
          model: g.model || g.name || 'GPU',
          vendor: g.vendor || '',
          utilization: round1(num(g.utilizationGpu)),
          temperature: round1(positive(g.temperatureGpu)),
          memUsed: num(g.memoryUsed),
          memTotal: num(g.memoryTotal) ?? num(g.vram)
        }))
      : [];

  let battery = null;
  if (batR.status === 'fulfilled' && batR.value.hasBattery) {
    const b = batR.value;
    const health = b.designedCapacity > 0 && b.maxCapacity > 0 ? Math.round((b.maxCapacity / b.designedCapacity) * 100) : null;
    battery = {
      percent: num(b.percent),
      isCharging: !!b.isCharging,
      acConnected: !!b.acConnected,
      cycleCount: positive(b.cycleCount),
      health,
      timeRemaining: positive(b.timeRemaining) // minutes
    };
  }

  slowCache = { at: Date.now(), data: { temperature, gpus, battery } };
  return slowCache.data;
}

export async function collect() {
  const [osInfo, load, mem, disks, processes, net, slow] = await Promise.all([
    getOsInfo(),
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.processes(),
    si.networkStats(),
    getSlowStats()
  ]);

  // `active` = memory in use excluding caches/buffers. Matches Activity Monitor
  // on macOS, "used" minus buff/cache on Linux, and equals `used` on Windows.
  const memUsed = mem.active ?? mem.used;
  const main = pickMainDisk(disks) || { use: 0, size: 0, used: 0, fs: 'N/A', mount: '/' };

  const topCpu = processes.list
    .filter(isRealProcess)
    .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
    .slice(0, 5)
    .map((p) => ({ pid: p.pid, name: p.name, cpu: round1(p.cpu || 0), mem: round1(p.mem || 0) }));

  // rx_sec / tx_sec are null on the very first sample.
  const network = net.reduce(
    (acc, n) => ({ rxSec: acc.rxSec + (n.rx_sec || 0), txSec: acc.txSec + (n.tx_sec || 0) }),
    { rxSec: 0, txSec: 0 }
  );

  return {
    timestamp: Date.now(),
    uptime: si.time().uptime,
    os: osInfo,
    cpu: {
      percent: Math.round(load.currentLoad ?? 0),
      cores: load.cpus?.length ?? 0,
      perCore: (load.cpus || []).map((c) => Math.round(c.load ?? 0))
    },
    mem: {
      percent: mem.total ? Math.round((memUsed / mem.total) * 100) : 0,
      total: mem.total,
      used: memUsed,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused
    },
    disk: { percent: Math.round(main.use ?? 0), fs: main.fs, mount: main.mount, size: main.size, used: main.used },
    disks: realDisks(disks).map((d) => ({ mount: d.mount, fs: d.fs, size: d.size, used: d.used, percent: Math.round(d.use ?? 0) })),
    network,
    temperature: slow.temperature,
    gpus: slow.gpus,
    battery: slow.battery,
    topCpu
  };
}
