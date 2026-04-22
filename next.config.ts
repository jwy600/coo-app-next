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

  // Baseline security response headers. Contains the blast radius of any
  // future XSS: the API key lives in localStorage, so any script injection
  // on this origin can read it. These headers block framing, MIME sniffing,
  // and leak referrers beyond same-origin.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
