'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store/useStore';
import { EditorControls } from './EditorControls';

interface FocusEditorProps {
  /**
   * Set true while a Rewrite is in flight: the textarea is locked and a
   * loading indicator replaces the controls.
   */
  disabled?: boolean;
}

/**
 * In-place editor for a slice of an assistant message.
 *
 * The editor is bound to `focus.active.buffer`. On mount it focuses the
 * textarea and selects all the buffer text so Ctrl+C copies, Delete
 * deletes, and the first printable keystroke replaces. A document-level
 * mousedown listener auto-saves and closes when the user clicks outside.
 */
export function FocusEditor({ disabled = false }: FocusEditorProps) {
  const focus = useStore((s) => s.focus);
  const updateBuffer = useStore((s) => s.updateBuffer);
  const closeEditor = useStore((s) => s.closeEditor);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const active = focus !== null;

  useEffect(() => {
    if (!active) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const handler = (event: MouseEvent) => {
      const root = containerRef.current;
      if (!root) return;
      const target = event.target as Element | null;
      if (root.contains(target)) return;
      // The composer is a working surface for the active editor (notes,
      // ask context). Clicking it must not auto-save & close.
      if (target?.closest('.composer')) return;
      closeEditor();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active, closeEditor]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [focus?.buffer]);

  if (!focus) return null;

  return (
    <div
      ref={containerRef}
      data-testid="focus-editor"
      className="focus-editor my-2 rounded-lg border border-border bg-background dark:bg-muted shadow-sm p-3"
    >
      <textarea
        ref={textareaRef}
        value={focus.buffer}
        onChange={(e) => updateBuffer(e.target.value)}
        disabled={disabled}
        aria-label="Focus editor"
        className="w-full bg-transparent outline-none resize-none font-mono text-sm leading-relaxed text-foreground"
      />

      {disabled && (
        <div
          data-testid="focus-editor-loading"
          className="mt-2 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          Rewriting…
        </div>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <EditorControls />
      </div>
    </div>
  );
}
