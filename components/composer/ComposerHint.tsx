'use client';

import { useStore } from '@/lib/store/useStore';

export function ComposerHint() {
  const focusActive = useStore((s) => s.focus !== null);

  return (
    <p className="text-xs text-gray-500 mt-2 flex-shrink-0">
      {focusActive
        ? 'Ask about the selected text. Drag-select inside this composer to add a note.'
        : 'Drag-select assistant text to focus on a passage.'}
    </p>
  );
}
