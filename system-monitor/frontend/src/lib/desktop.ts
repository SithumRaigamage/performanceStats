/** Bridge exposed by the Electron preload script (undefined in a normal browser). */
export interface DesktopBridge {
  isDesktop: true;
  version: string;
  platform: string;
  openExternal: (url: string) => void;
  getLaunchAtLogin: () => Promise<boolean>;
  setLaunchAtLogin: (enabled: boolean) => Promise<boolean>;
}

declare global {
  interface Window {
    systemMonitor?: DesktopBridge;
  }
}

export function desktop(): DesktopBridge | undefined {
  return typeof window === 'undefined' ? undefined : window.systemMonitor;
}

export const PRODUCT = {
  name: 'System Monitor',
  // TODO: replace with your real sales page before release.
  buyUrl: 'https://sithum-raigamage.vercel.app/system-monitor',
  supportEmail: 'support@example.com'
};
