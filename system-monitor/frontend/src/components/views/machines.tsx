'use client';

import { useEffect, useState } from 'react';
import { Copy, Plus, RefreshCw, Server, Share2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, Input } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { Machine, Stats } from '@/lib/types';
import { platformLabel } from '@/lib/utils';

interface Sharing {
  enabled: boolean;
  port: number;
  token: string | null;
  error: string | null;
  ips: string[];
}

function SharingCard() {
  const [s, setS] = useState<Sharing | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Sharing>('/api/sharing').then(setS).catch(() => {});
  }, []);
  async function toggle(enabled: boolean) {
    setBusy(true);
    try {
      setS(await api<Sharing>('/api/sharing', { method: 'PUT', body: JSON.stringify({ enabled, port: s?.port ?? 4100 }) }));
    } finally {
      setBusy(false);
    }
  }
  async function rotate() {
    setS(await api<Sharing>('/api/sharing/rotate-token', { method: 'POST' }));
  }
  if (!s) return null;
  const localIps = s.ips ?? [];
  const addr = (localIps[0] ?? '<this-computer-ip>') + `:${s.port}`;
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>
          <Share2 className="h-4 w-4" /> Allow this computer to be monitored
        </CardTitle>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-sky-500" checked={s.enabled} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
          {s.enabled ? 'On' : 'Off'}
        </label>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {s.error && <p className="text-red-400">{s.error}</p>}
        {s.enabled && s.token ? (
          <>
            <p className="text-zinc-400">On the other computer, add a machine with:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <CopyField label="Address" value={addr} />
              <CopyField label="Token" value={s.token} />
            </div>
            {localIps.length > 1 && <p className="text-xs text-zinc-500">Other addresses for this computer: {localIps.slice(1).map((ip) => `${ip}:${s.port}`).join(', ')}</p>}
            <Button variant="ghost" onClick={rotate} className="px-0 text-xs">
              <RefreshCw className="h-3 w-3" /> New token (disconnects dashboards using the old one)
            </Button>
          </>
        ) : (
          <p className="text-zinc-400">Turn this on to watch this computer from System Monitor on another machine. Anyone with the token on your network can see its stats, so share it only with people you trust.</p>
        )}
      </CardContent>
    </Card>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-950 px-3 py-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{value}</code>
      <button onClick={() => navigator.clipboard?.writeText(value)} className="text-zinc-400 hover:text-white" aria-label={`Copy ${label}`}>
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

type Health = { state: 'checking' | 'online' | 'offline' | 'unauthorized'; stats?: Stats };

async function probe(m: Machine): Promise<Health> {
  try {
    const stats = await api<Stats>('/api/stats', {}, { id: m.id, name: m.name, url: m.url, token: m.token, remote: true });
    return { state: 'online', stats };
  } catch (e) {
    return { state: (e as { status?: number }).status === 401 ? 'unauthorized' : 'offline' };
  }
}

export function MachinesView({
  machines,
  onChange,
  onOpen
}: {
  machines: Machine[];
  onChange: (m: Machine[]) => Promise<void>;
  onOpen: (m: Machine) => void;
}) {
  const [health, setHealth] = useState<Record<string, Health>>({});
  const [form, setForm] = useState({ name: '', url: '', token: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = () =>
      machines.forEach(async (m) => {
        const h = await probe(m);
        if (alive) setHealth((prev) => ({ ...prev, [m.id]: h }));
      });
    check();
    const id = setInterval(check, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [machines]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let url = form.url.trim();
    if (!/^https?:\/\//.test(url)) url = `http://${url}`;
    if (!/:\d+$/.test(url.replace(/\/+$/, ''))) url = `${url.replace(/\/+$/, '')}:4100`;
    const m: Machine = { id: crypto.randomUUID(), name: form.name.trim() || url, url, token: form.token.trim() };
    const h = await probe(m);
    if (h.state === 'unauthorized') return setError('That machine rejected the token. Copy it again from the agent output.');
    if (h.state === 'offline') return setError(`Couldn't reach ${url}. Is the agent running, and is port open in the firewall?`);
    await onChange([...machines, { ...m, name: form.name.trim() || h.stats?.os.hostname || url }]);
    setForm({ name: '', url: '', token: '' });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <SharingCard />
      <Card>
        <CardHeader>
          <CardTitle>
            <Server className="h-4 w-4" /> Monitored machines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {machines.length === 0 ? (
            <p className="py-8 text-sm text-zinc-500">No remote machines yet. Install the agent on another computer or server, then add it here.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {machines.map((m) => {
                const h = health[m.id] ?? { state: 'checking' };
                const s = h.stats;
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(m)}>
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{m.name}</span>
                        <Badge variant={h.state === 'online' ? 'success' : h.state === 'checking' ? 'default' : 'destructive'}>{h.state}</Badge>
                      </div>
                      <div className="truncate text-xs text-zinc-500">
                        {m.url}
                        {s ? ` · ${platformLabel(s.os.platform)} · CPU ${s.cpu.percent}% · RAM ${s.mem.percent}% · Disk ${s.disk.percent}%` : ''}
                      </div>
                    </button>
                    <Button variant="ghost" onClick={() => onChange(machines.filter((x) => x.id !== m.id))} aria-label={`Remove ${m.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Plus className="h-4 w-4" /> Add a machine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-3">
            <Input placeholder="Name (optional), e.g. Office server" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input required placeholder="Address, e.g. 192.168.1.20:4100" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            <Input required placeholder="Access token" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
            <Button type="submit" className="w-full">Connect</Button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </form>
          <div className="mt-5 space-y-2 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">Where do I get the address and token?</p>
            <p>
              <span className="text-zinc-300">Another PC or Mac:</span> install System Monitor there and turn on{' '}
              <em>Allow this computer to be monitored</em> below. It shows the address and token.
            </p>
            <p>
              <span className="text-zinc-300">A headless Linux server:</span> run the agent package (needs Node.js 18+):
            </p>
            <pre className="overflow-x-auto rounded-md bg-zinc-950 p-2 font-mono text-[11px] text-zinc-300">npm ci --omit=dev{'\n'}node server.js --agent</pre>
            <p>Only use this on networks you trust, or over a VPN such as Tailscale.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
