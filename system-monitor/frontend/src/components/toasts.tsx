'use client';

import { X } from 'lucide-react';
import type { AlertEvent } from '@/lib/types';

export function Toasts({ items, onDismiss }: { items: AlertEvent[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {items.map((a) => (
        <div key={a.id} className="flex gap-3 rounded-lg border border-red-500/30 bg-zinc-900 p-3 shadow-lg">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-red-300">{a.title}</p>
            <p className="text-zinc-400">{a.message}</p>
          </div>
          <button onClick={() => onDismiss(a.id)} className="text-zinc-500 hover:text-white" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
