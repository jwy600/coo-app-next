/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard event handling.
 *
 * Reference: legacy/app.js lines 1146-1152 (Escape key listener)
 */

'use client';

import { useEffect, useRef } from 'react';

export interface Shortcuts {
  [key: string]: () => void;
}

/**
 * Sets up global keyboard shortcuts
 *
 * Uses a ref to store the latest shortcuts to avoid recreating the event
 * listener when the shortcuts object changes (which happens on every render
 * if passed as an inline object).
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
  // Store shortcuts in a ref to avoid stale closures and constant listener re-registration
  const shortcutsRef = useRef<Shortcuts>(shortcuts);

  // Update ref on every render to always have latest handlers
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const handler = shortcutsRef.current[event.key];
      if (handler) {
        handler();
      }
    };

    // Add global listener (only once on mount)
    document.addEventListener('keydown', handleKeyDown);

    // Clean up on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Empty deps - listener registered once, uses ref for latest shortcuts
}
