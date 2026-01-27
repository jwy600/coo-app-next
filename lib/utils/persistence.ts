import { isTestMode } from './testMode';

/**
 * Execute a persistence operation with test mode check and error handling
 *
 * @param operation - Async function to execute
 * @param errorContext - Context string for error logging (e.g., 'persist selection')
 */
export function persistAsync(
  operation: () => Promise<unknown>,
  errorContext: string
): void {
  if (isTestMode()) return;

  operation().catch((error) => console.error(`Failed to ${errorContext}:`, error));
}
