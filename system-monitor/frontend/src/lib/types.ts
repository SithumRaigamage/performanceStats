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
  cpuModel: string;
}

export interface DiskInfo {
  mount: string;
  fs: string;
  size: number;
  used: number;
  percent: number;
}

export interface GpuInfo {
  model: string;
  vendor: string;
  utilization: number | null;
  temperature: number | null;
  memUsed: number | null;
  memTotal: number | null;
}

export interface BatteryInfo {
  percent: number | null;
  isCharging: boolean;
  acConnected: boolean;
  cycleCount: number | null;
  health: number | null;
  timeRemaining: number | null;
}

export interface Stats {
  timestamp: number;
  uptime: number;
  os: OsInfo;
  cpu: { percent: number; cores: number; perCore: number[] };
  mem: { percent: number; total: number; used: number; swapTotal: number; swapUsed: number };
  disk: DiskInfo;
  disks: DiskInfo[];
  network: { rxSec: number; txSec: number };
  temperature: { main: number | null; max: number | null; cores: (number | null)[] } | null;
  gpus: GpuInfo[];
  battery: BatteryInfo | null;
  topCpu: ProcessInfo[];
}

export interface HistoryRow {
  t: number;
  cpu: number | null;
  mem: number | null;
  disk: number | null;
  rx: number | null;
  tx: number | null;
  temp: number | null;
}

export type MetricKey = 'cpu' | 'mem' | 'disk' | 'temp';

export interface AlertRule {
  id: string;
  metric: MetricKey;
  threshold: number;
  durationSec: number;
  enabled: boolean;
}

export interface AlertConfig {
  enabled: boolean;
  cooldownSec: number;
  rules: AlertRule[];
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  metric: MetricKey;
  value: number;
  threshold: number;
  at: number;
  host?: string;
  title: string;
  message: string;
}

export interface Machine {
  id: string;
  name: string;
  url: string;
  token: string;
}

export interface LicenseInfo {
  id: string;
  name: string;
  email: string;
  issued: string;
  edition?: string;
}

export interface LicenseState {
  required: boolean;
  licensed: boolean;
  license: LicenseInfo | null;
}

/** Where to read stats from: this computer (url '') or a remote agent. */
export interface Target {
  id: string;
  name: string;
  url: string;
  token?: string;
  remote: boolean;
}
