/**
 * Detects if the application is running in test mode.
 * Test mode can be enabled via:
 * - Setting window.__TEST_MODE__ = true in browser tests
 * - Setting NEXT_PUBLIC_TEST_MODE=true environment variable
 *
 * When in test mode, database persistence is disabled to prevent
 * test data pollution.
 */
export const isTestMode = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    (window as any).__TEST_MODE__ === true ||
    process.env.NEXT_PUBLIC_TEST_MODE === 'true'
  );
};
