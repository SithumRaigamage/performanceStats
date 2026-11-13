import type { Target } from './types';

/** Base URL of this computer's backend. Empty string = same origin (packaged app). */
export const LOCAL_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export const LOCAL_TARGET: Target = { id: 'local', name: 'This computer', url: LOCAL_BASE, remote: false };

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`HTTP ${status}`);
  }
}

export async function api<T>(path: string, init: RequestInit = {}, target: Target = LOCAL_TARGET): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (target.token) headers.set('Authorization', `Bearer ${target.token}`);
  const res = await fetch(`${target.url}${path}`, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

/** URL usable in an <a href> (adds the token as a query param for remote agents). */
export function apiUrl(path: string, target: Target = LOCAL_TARGET): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${target.url}${path}${target.token ? `${sep}token=${encodeURIComponent(target.token)}` : ''}`;
}
