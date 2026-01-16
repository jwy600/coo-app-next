/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard event handling.
 *
 * Reference: legacy/app.js lines 1146-1152 (Escape key listener)
 */

'use client';

import { useEffect } from 'react';

export interface Shortcuts {
  [key: string]: () => void;
}

/**
 * Sets up global keyboard shortcuts
 *
 * @param shortcuts - Map of key names to handler functions
 *
 * @example
 * useKeyboardShortcuts({
 *   'Escape': () => clearSelectedBlock(),
 *   'Enter': () => handleSubmit(),
 * });
 */
export function useKeyboardShortcuts(shortcuts: Shortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = shortcuts[event.key];
      if (handler) {
        handler();
      }
    };

    // Add global listener
    document.addEventListener('keydown', handleKeyDown);

    // Clean up on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
