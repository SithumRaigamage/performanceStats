import type { NextConfig } from 'next';

// Static export: the desktop app bundles `out/` and serves it from its local backend.
const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: true
};

export default nextConfig;
