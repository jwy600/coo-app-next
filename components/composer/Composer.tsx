'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { PromptInput } from './PromptInput';
import { ComposerHint } from './ComposerHint';
import { EditorActions, type EditorActionId } from './EditorActions';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store/useStore';
import { fetchBlockAction } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils/errorHandling';

interface ComposerProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
  /**
   * Test-only: extra DOM rendered inside the composer, used to simulate
   * drag-selection of arbitrary text. Production callers don't pass this.
   */
  children?: ReactNode;
}

export function Composer({
  prompt,
  onPromptChange,
  onSubmit,
  disabled = false,
  children,
}: ComposerProps) {
  const focus = useStore((s) => s.focus);
  const setComposerPrompt = useStore((s) => s.setComposerPrompt);
  const setError = useStore((s) => s.setError);
  const appendNote = useStore((s) => s.appendNote);

  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState<EditorActionId | null>(null);

  const handleDraftAction = useCallback(
    async (action: EditorActionId) => {
      if (!focus) return;
      const settings = useStore.getState().settings;
      const language = action === 'translate' ? settings.translateLanguage : undefined;
      setBusy(action);
      setError(null);
      try {
        const result = await fetchBlockAction(
          action,
          focus.buffer,
          undefined,
          language,
          settings,
        );
        setComposerPrompt(result.text);
      } catch (err) {
        setError(getErrorMessage(err, `${action} failed.`));
      } finally {
        setBusy(null);
      }
    },
    [focus, setComposerPrompt, setError],
  );

  // Drag-select inside the composer → append the highlighted text to the
  // active editor's notes.
  useEffect(() => {
    if (!focus) return;
    const root = formRef.current;
    if (!root) return;

    const handle = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      const text = sel.toString().trim();
      if (!text) return;
      appendNote(text);
      sel.removeAllRanges();
    };

    root.addEventListener('mouseup', handle);
    root.addEventListener('touchend', handle);
    return () => {
      root.removeEventListener('mouseup', handle);
      root.removeEventListener('touchend', handle);
    };
  }, [focus, appendNote]);

  const showShortcuts = focus !== null;

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="composer bg-background rounded-xl border border-border composer-shadow p-4 max-h-[50vh] flex flex-col overflow-hidden w-full"
    >
      {showShortcuts && (
        <div className="mb-3">
          <EditorActions
            onAction={handleDraftAction}
            busy={busy}
            disabled={disabled}
          />
        </div>
      )}

      <div className="flex gap-2 items-stretch flex-1 min-h-0">
        <div className="flex-1 min-h-0 min-w-0">
          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            onSubmit={() => onSubmit(new Event('submit') as unknown as FormEvent)}
            disabled={disabled}
          />
        </div>
        <Button
          type="submit"
          variant="default"
          disabled={disabled}
          className="flex-shrink-0 self-end"
        >
          <span>Send</span>
          <span aria-hidden="true" className="ml-1">
            →
          </span>
        </Button>
      </div>

      <ComposerHint />
      {children}
    </form>
  );
}
