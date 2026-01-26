import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const isIntegration = process.env.TEST_MODE === 'integration';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: isIntegration ? 'node' : 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: isIntegration
      ? ['tests/integration/**/*.test.ts']
      : ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
    // Higher timeout for real API calls in integration mode
    testTimeout: isIntegration ? 30000 : 5000,
    // Sequential execution for integration tests to avoid rate limits
    fileParallelism: !isIntegration,
    maxConcurrency: isIntegration ? 1 : undefined,
    coverage: {
      enabled: !isIntegration,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '.artifacts/coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.*',
        '**/types/*',
        '.next/',
        'legacy/',
        'data/',
        '.vercel/',
      ],
      include: ['lib/**/*.ts', 'app/**/*.ts', 'components/**/*.tsx', 'hooks/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
