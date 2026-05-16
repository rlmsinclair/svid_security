import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: '2gb' } },
};
export default config;
