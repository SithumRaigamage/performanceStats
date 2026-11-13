export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
}

export interface Stats {
  timestamp: number;
  cpu: { percent: number; cores: number };
  mem: { percent: number; total: number; used: number };
  disk: { percent: number; fs: string; mount: string; size: number; used: number };
  network: { rxSec: number; txSec: number };
  topCpu: ProcessInfo[];
}
