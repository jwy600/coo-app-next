'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useStore } from '@/lib/store/useStore';
import { domToSource } from '@/lib/selection';

interface UseFocusSelectionOptions {
  messageId: string;
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
}

/**
 * Listens for `mouseup` and `touchend` inside the message container and
 * opens the focus editor when the active selection meets the criteria
 * (single message, ≥1 word, anchored inside this message). Disabled while
 * the message is streaming.
 */
export function useFocusSelection({
  messageId,
  containerRef,
  enabled,
}: UseFocusSelectionOptions): void {
  const openEditor = useStore((s) => s.openEditor);

  useEffect(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root) return;

    const handle = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const result = domToSource(range);
      if (!result || result.messageId !== messageId) return;

      // Drop the visual selection — the editor takes over with its own.
      selection.removeAllRanges();
      openEditor(result.messageId, [result.start, result.end]);
    };

    root.addEventListener('mouseup', handle);
    root.addEventListener('touchend', handle);
    return () => {
      root.removeEventListener('mouseup', handle);
      root.removeEventListener('touchend', handle);
    };
  }, [enabled, messageId, containerRef, openEditor]);
}
