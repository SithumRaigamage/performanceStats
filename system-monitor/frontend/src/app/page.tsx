'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bell, BadgeCheck, History, LayoutDashboard, Monitor, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DashboardView } from '@/components/views/dashboard';
import { HistoryView } from '@/components/views/history';
import { AlertsView } from '@/components/views/alerts';
import { MachinesView } from '@/components/views/machines';
import { ActivationScreen, LicenseView } from '@/components/views/license';
import { Toasts } from '@/components/toasts';
import { useMonitor } from '@/hooks/useMonitor';
import { api, LOCAL_TARGET } from '@/lib/api';
import { desktop, PRODUCT } from '@/lib/desktop';
import type { AlertEvent, LicenseState, Machine, Target } from '@/lib/types';
import { cn, formatUptime, platformLabel } from '@/lib/utils';

type Tab = 'dashboard' | 'history' | 'alerts' | 'machines' | 'license';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; localOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'history', label: 'History', icon: History },
  { id: 'alerts', label: 'Alerts', icon: Bell, localOnly: true },
  { id: 'machines', label: 'Machines', icon: Server, localOnly: true },
  { id: 'license', label: 'Licence & settings', icon: BadgeCheck, localOnly: true }
];

export default function App() {
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [licenseError, setLicenseError] = useState(false);

  useEffect(() => {
    api<LicenseState>('/api/license')
      .then(setLicense)
      .catch(() => setLicenseError(true));
  }, []);

  if (!license) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        {licenseError ? 'Starting the monitoring service… If this persists, restart the app.' : 'Loading…'}
      </main>
    );
  }
  if (license.required && !license.licensed) return <ActivationScreen onActivated={setLicense} />;
  return <Shell license={license} setLicense={setLicense} />;
}

function Shell({ license, setLicense }: { license: LicenseState; setLicense: (l: LicenseState) => void }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [targetId, setTargetId] = useState('local');
  const [toasts, setToasts] = useState<AlertEvent[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertEvent[]>([]);

  useEffect(() => {
    api<{ machines: Machine[] }>('/api/machines')
      .then((r) => setMachines(r.machines))
      .catch(() => {});
  }, []);

  const targets: Target[] = useMemo(
    () => [LOCAL_TARGET, ...machines.map((m) => ({ id: m.id, name: m.name, url: m.url, token: m.token, remote: true }))],
    [machines]
  );
  const target = targets.find((t) => t.id === targetId) ?? LOCAL_TARGET;

  const onAlert = useCallback((a: AlertEvent) => {
    setToasts((t) => [a, ...t].slice(0, 3));
    setRecentAlerts((r) => [a, ...r].slice(0, 50));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== a.id)), 10_000);
    // The desktop app shows native notifications from the main process; in a browser use the Web API.
    if (!desktop() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(a.title, { body: a.message });
    }
  }, []);

  // Local stream always runs (alerts + licence events); a second one runs for a remote target.
  const local = useMonitor(LOCAL_TARGET, onAlert);
  const remote = useMonitor(target.remote ? target : null);
  const view = target.remote ? remote : local;

  useEffect(() => {
    if (local.license) setLicense(local.license);
  }, [local.license, setLicense]);

  useEffect(() => {
    if (!desktop() && typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission();
  }, []);

  async function saveMachines(next: Machine[]) {
    const r = await api<{ machines: Machine[] }>('/api/machines', { method: 'PUT', body: JSON.stringify({ machines: next }) });
    setMachines(r.machines);
    if (!r.machines.some((m) => m.id === targetId)) setTargetId('local');
  }

  const activeTab = target.remote && TABS.find((t) => t.id === tab)?.localOnly ? 'dashboard' : tab;
  const s = view.stats;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-3">
        <div className="mb-6 flex items-center gap-2 px-2 pt-2 text-lg font-semibold">
          <Activity className="h-5 w-5 text-sky-400" /> {PRODUCT.name}
        </div>
        <nav className="space-y-1">
          {TABS.map((t) => {
            const disabled = target.remote && t.localOnly;
            return (
              <button
                key={t.id}
                disabled={disabled}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
                  activeTab === t.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
                  disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'
                )}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 px-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Machines</div>
        <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={() => setTargetId(t.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm',
                target.id === t.id ? 'bg-sky-500/15 text-sky-300' : 'text-zinc-400 hover:bg-zinc-900'
              )}
            >
              {t.remote ? <Server className="h-4 w-4 shrink-0" /> : <Monitor className="h-4 w-4 shrink-0" />}
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1 space-y-6 p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{s?.os.hostname ?? target.name}</h1>
            <p className="truncate text-sm text-zinc-400">
              {s
                ? `${platformLabel(s.os.platform)} ${s.os.distro} ${s.os.release} · ${s.os.arch} · up ${formatUptime(s.uptime)}`
                : target.remote
                  ? target.url
                  : 'This computer'}
            </p>
          </div>
          <Badge variant={view.status === 'connected' ? 'success' : view.status === 'connecting' ? 'warning' : 'destructive'}>{view.status}</Badge>
        </header>

        {view.error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{view.error}</div>}

        {activeTab === 'dashboard' && <DashboardView stats={s} live={view.live} />}
        {activeTab === 'history' && <HistoryView target={target} />}
        {activeTab === 'alerts' && <AlertsView recent={recentAlerts} />}
        {activeTab === 'machines' && (
          <MachinesView
            machines={machines}
            onChange={saveMachines}
            onOpen={(m) => {
              setTargetId(m.id);
              setTab('dashboard');
            }}
          />
        )}
        {activeTab === 'license' && <LicenseView license={license} onChange={setLicense} />}
      </main>

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
