'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { AlertEvent, LicenseState, Stats, Target } from '@/lib/types';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'unauthorized';

export interface LivePoint {
  t: number;
  cpu: number;
  mem: number;
}

const LIVE_POINTS = 60;

/** Live stats stream for one target (this computer or a remote agent). */
export function useMonitor(target: Target | null, onAlert?: (a: AlertEvent) => void) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [live, setLive] = useState<LivePoint[]>([]);
  const [status, setStatus] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [license, setLicense] = useState<LicenseState | null>(null);

  useEffect(() => {
    setStats(null);
    setLive([]);
    setStatus('connecting');
    setError(null);
    if (!target) return;

    const socket = io(target.url || undefined, {
      transports: ['websocket', 'polling'],
      auth: target.token ? { token: target.token } : undefined,
      reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
      setStatus('connected');
      setError(null);
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', (err) => {
      if (err.message === 'unauthorized') {
        setStatus('unauthorized');
        setError('Wrong access token for this machine');
      } else {
        setStatus('disconnected');
        setError(`Can't reach ${target.remote ? target.url : 'the monitoring service'} (${err.message})`);
      }
    });
    socket.on('stats', (s: Stats) => {
      setStats(s);
      setError(null);
      setLive((prev) => [...prev, { t: s.timestamp, cpu: s.cpu.percent, mem: s.mem.percent }].slice(-LIVE_POINTS));
    });
    socket.on('stats_error', (e: { message: string }) => setError(e.message));
    socket.on('license', (l: LicenseState) => setLicense(l));
    socket.on('license_required', () => setLicense((l) => ({ required: true, licensed: false, license: l?.license ?? null })));
    socket.on('alert', (a: AlertEvent) => onAlert?.(a));

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.id, target?.url, target?.token]);

  return { stats, live, status, error, license, setLicense };
}
