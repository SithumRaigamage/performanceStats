'use client';

import { useEffect, useState } from 'react';
import { Activity, BadgeCheck, KeyRound, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { desktop, PRODUCT } from '@/lib/desktop';
import type { LicenseState } from '@/lib/types';

function openBuy() {
  const d = desktop();
  if (d) d.openExternal(PRODUCT.buyUrl);
  else window.open(PRODUCT.buyUrl, '_blank', 'noopener');
}

function ActivateForm({ onActivated }: { onActivated: (l: LicenseState) => void }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<LicenseState & { ok: boolean }>('/api/license', { method: 'POST', body: JSON.stringify({ key }) });
      onActivated({ required: true, licensed: r.licensed, license: r.license });
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { error?: string } | null) : null;
      setError(body?.error ?? 'Could not activate. Check the key and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Paste your licence key (starts with SM1-)"
        rows={4}
        className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500"
      />
      <Button type="submit" className="w-full" disabled={busy || !key.trim()}>
        <KeyRound className="h-4 w-4" /> {busy ? 'Activating…' : 'Activate'}
      </Button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

/** Full-screen gate shown until a valid licence is activated. */
export function ActivationScreen({ onActivated }: { onActivated: (l: LicenseState) => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-8">
          <div className="space-y-2 text-center">
            <Activity className="mx-auto h-10 w-10 text-sky-400" />
            <h1 className="text-xl font-semibold">Activate {PRODUCT.name}</h1>
            <p className="text-sm text-zinc-400">Enter the licence key from your purchase email. You only need to do this once on each computer.</p>
          </div>
          <ActivateForm onActivated={onActivated} />
          <div className="border-t border-zinc-800 pt-4 text-center text-sm text-zinc-400">
            Don&apos;t have a key?{' '}
            <button onClick={openBuy} className="font-medium text-sky-400 hover:underline">
              Buy a licence
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function LicenseView({ license, onChange }: { license: LicenseState | null; onChange: (l: LicenseState) => void }) {
  const [settings, setSettings] = useState<{ history: { retentionDays: number }; dataDir: string } | null>(null);
  const [launch, setLaunch] = useState<boolean | null>(null);
  const d = desktop();

  useEffect(() => {
    api<{ history: { retentionDays: number }; dataDir: string }>('/api/settings').then(setSettings).catch(() => {});
    d?.getLaunchAtLogin().then(setLaunch);
  }, [d]);

  async function saveRetention(days: number) {
    setSettings(await api('/api/settings', { method: 'PUT', body: JSON.stringify({ history: { retentionDays: days } }) }));
  }

  async function deactivate() {
    if (!confirm('Remove the licence from this computer? You can activate it again later with the same key.')) return;
    const s = await api<LicenseState>('/api/license', { method: 'DELETE' });
    onChange({ ...s, required: license?.required ?? true });
  }

  const l = license?.license;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>
            <BadgeCheck className="h-4 w-4" /> Licence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {license?.licensed && l ? (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-zinc-500">Licensed to</dt>
                <dd>{l.name}</dd>
                <dt className="text-zinc-500">Email</dt>
                <dd>{l.email}</dd>
                <dt className="text-zinc-500">Edition</dt>
                <dd className="capitalize">{l.edition ?? 'pro'}</dd>
                <dt className="text-zinc-500">Issued</dt>
                <dd>{l.issued}</dd>
                <dt className="text-zinc-500">Licence ID</dt>
                <dd className="truncate font-mono text-xs">{l.id}</dd>
              </dl>
              {license.required && (
                <Button variant="danger" onClick={deactivate}>
                  Deactivate on this computer
                </Button>
              )}
            </>
          ) : license?.required === false ? (
            <p className="text-zinc-400">Development mode: no licence needed.</p>
          ) : (
            <ActivateForm onActivated={onChange} />
          )}
          <p className="text-xs text-zinc-500">
            One licence covers up to 3 computers you own. Support: {PRODUCT.supportEmail}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Settings2 className="h-4 w-4" /> Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {settings && (
            <label className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Keep history for</span>
              <select
                value={settings.history.retentionDays}
                onChange={(e) => saveRetention(Number(e.target.value))}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5"
              >
                {[1, 3, 7, 14, 30, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'day' : 'days'}
                  </option>
                ))}
              </select>
            </label>
          )}
          {d && launch != null && (
            <label className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Start when I log in</span>
              <input
                type="checkbox"
                className="accent-sky-500"
                checked={launch}
                onChange={async (e) => setLaunch(await d.setLaunchAtLogin(e.target.checked))}
              />
            </label>
          )}
          {settings && <p className="break-all text-xs text-zinc-500">Data folder: {settings.dataDir}</p>}
          <p className="text-xs text-zinc-500">
            {PRODUCT.name} {d ? `v${d.version}` : ''} · Your stats stay on your computers. Nothing is sent to us.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

