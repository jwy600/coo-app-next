import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'coo',
  },

  // Optimize bundle
  experimental: {
    optimizePackageImports: ['katex'],
  },
};

export default nextConfig;
