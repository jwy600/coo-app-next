/**
 * State Types - Re-exports and combined AppState
 *
 * AppState = CoreState & UIState
 *
 * This separation allows:
 * - Pure functions to accept only the fields they need
 * - Clear distinction between persistent and ephemeral state
 * - Better reasoning about what each function depends on
 */

export * from './core';
export * from './ui';

import { CoreState } from './core';
import { UIState } from './ui';

/**
 * Combined application state
 *
 * Note: StreamingState and SettingsState are managed separately
 * and not included here.
 */
export type AppState = CoreState & UIState;
