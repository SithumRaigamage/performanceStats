'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { Stats } from '@/lib/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const HISTORY_LENGTH = 60;

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface HistoryPoint {
  t: number;
  cpu: number;
  mem: number;
}

export function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [status, setStatus] = useState<ConnectionState>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      setStatus('connected');
      setError(null);
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', (err) => {
      setStatus('disconnected');
      setError(`Cannot reach backend at ${BACKEND_URL} (${err.message})`);
    });
    socket.on('stats', (data: Stats) => {
      setStats(data);
      setError(null);
      setHistory((prev) =>
        [...prev, { t: data.timestamp, cpu: data.cpu.percent, mem: data.mem.percent }].slice(-HISTORY_LENGTH)
      );
    });
    socket.on('stats_error', (e: { message: string }) => setError(e.message));

    return () => {
      socket.disconnect();
    };
  }, []);

  return { stats, history, status, error, backendUrl: BACKEND_URL };
}
