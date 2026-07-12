import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Separate build dir for the Playwright e2e dev server (COO_E2E=1) so it can
  // run alongside a manual `npm run dev` — otherwise Next can't acquire its
  // dev lock (.next/dev/lock) and the second server refuses to start.
  distDir: process.env.COO_E2E === '1' ? '.next-e2e' : '.next',

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
