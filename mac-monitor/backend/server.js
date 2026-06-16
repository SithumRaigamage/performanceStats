import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import si from 'systeminformation';

const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

async function getStats() {
  const [load, mem, disks, processes] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.processes()
  ]);

  const cpuPercent = Math.round(load.currentload);
  const memUsedPercent = Math.round((mem.active / mem.total) * 100);
  const disk = disks[0] || { use: 0, size: 0, used: 0, fs: 'N/A', mount: '/' };
  const diskPercent = Math.round(disk.use);

  const topCpu = processes.list
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 5)
    .map(p => ({ pid: p.pid, name: p.name, cpu: p.cpu, mem: p.mem }));

  return {
    cpu: { percent: cpuPercent },
    mem: { percent: memUsedPercent, total: mem.total, active: mem.active },
    disk: { percent: diskPercent, fs: disk.fs, mount: disk.mount, size: disk.size, used: disk.used },
    topCpu
  };
}

io.on('connection', (socket) => {
  const intervalMs = 1000;
  let timer = null;

  async function tick() {
    try {
      const stats = await getStats();
      socket.emit('stats', stats);
    } catch (err) {
      socket.emit('error', { message: 'Failed to fetch stats', detail: String(err) });
    }
  }

  timer = setInterval(tick, intervalMs);
  tick();

  socket.on('disconnect', () => {
    if (timer) clearInterval(timer);
  });
});

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
