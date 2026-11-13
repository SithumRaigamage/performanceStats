export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
}

export interface OsInfo {
  platform: 'darwin' | 'win32' | 'linux' | string;
  distro: string;
  release: string;
  hostname: string;
  arch: string;
}

export interface Stats {
  timestamp: number;
  os: OsInfo;
  cpu: { percent: number; cores: number };
  mem: { percent: number; total: number; used: number };
  disk: { percent: number; fs: string; mount: string; size: number; used: number };
  network: { rxSec: number; txSec: number };
  topCpu: ProcessInfo[];
}
