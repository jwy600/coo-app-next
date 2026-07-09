/**
 * Pure state transformation functions.
 *
 * All functions in this module are pure — they take state as input and
 * return new state objects without mutating the original. Functions accept
 * only the fields they need, making dependencies explicit.
 */

import { AppState, AppMode } from '@/types/state';

export * from './thread';
export * from './message';
export * from './focus';
export * from './settings';

export const createInitialState = (
  _idFactory: () => string,
  _nowFactory: () => number,
): AppState => {
  return {
    mode: 'landing',
    activeThreadId: null,
    threads: [],
    isAwaitingResponse: false,
    error: null,
    focus: null,
    composerPrompt: '',
    composerAttachment: null,
    landingComposerMode: 'chat',
  };
};

export interface SetModeResult {
  mode: AppMode;
}

export const setMode = (mode: AppMode): SetModeResult => ({ mode });
