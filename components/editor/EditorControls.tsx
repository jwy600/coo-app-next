'use client';

import { FormEvent, useCallback, useState } from 'react';
import { fetchBlockAction, fetchRewrite } from '@/lib/api';
import { useStore } from '@/lib/store/useStore';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import { splitNotes } from '@/lib/state/focus';
import { EditorActions, type EditorActionId } from './EditorActions';

/**
 * Unified action row at the foot of the focus editor.
 *
 * Left → right:
 *   - Shortcut badges (Translate / ELI5 / Summarize): mutate the buffer
 *     in place via setShortcutResult; Revert undoes the most recent.
 *   - Ask input: Enter submits a question about the buffer; the answer
 *     is appended to notes; the input clears.
 *   - Revert: undo the most recent buffer mutation (shortcut or rewrite).
 *   - Rewrite: bundle buffer + notes, replace the buffer atomically.
 *
 * One action runs at a time; whichever is in flight disables the others.
 */
export function EditorControls() {
  const focus = useStore((s) => s.focus);
  const setShortcutResult = useStore((s) => s.setShortcutResult);
  const setRewriteResult = useStore((s) => s.setRewriteResult);
  const revertRewrite = useStore((s) => s.revertRewrite);
  const setFocusLastResponseId = useStore((s) => s.setFocusLastResponseId);
  const appendNoteToBuffer = useStore((s) => s.appendNoteToBuffer);
  const setError = useStore((s) => s.setError);

  const [shortcutBusy, setShortcutBusy] = useState<EditorActionId | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [askInput, setAskInput] = useState('');

  const anyBusy = shortcutBusy !== null || askBusy || rewriteBusy;

  // Returns true iff the editor session that started this API call is still
  // the active one. Compares both messageId AND range, since the user can
  // close + reopen the editor on the *same* message at a *different* range
  // while a request is in flight.
  const isSameSession = (
    started: { messageId: string; range: [number, number] },
  ): boolean => {
    const current = useStore.getState().focus;
    if (!current) return false;
    if (current.messageId !== started.messageId) return false;
    return (
      current.range[0] === started.range[0] &&
      current.range[1] === started.range[1]
    );
  };

  const handleShortcut = useCallback(
    async (action: EditorActionId) => {
      if (!focus || anyBusy) return;
      const settings = useStore.getState().settings;
      const language =
        action === 'translate' ? settings.translateLanguage : undefined;
      const previousResponseId = focus.lastResponseId;
      const referenceQuestion = previousResponseId
        ? undefined
        : focus.referenceQuestion;
      // Shortcuts (translate / eli5 / summarize) transform the whole buffer,
      // notes included — translating a passage and its annotations together
      // is what the user expects.
      setShortcutBusy(action);
      setError(null);
      try {
        const result = await fetchBlockAction(
          action,
          focus.buffer,
          undefined,
          language,
          settings,
          previousResponseId,
          referenceQuestion,
        );
        if (!isSameSession(focus)) return;
        setShortcutResult(result.text);
        if (result.responseId) setFocusLastResponseId(result.responseId);
      } catch (err) {
        setError(getErrorMessage(err, `${action} failed.`));
      } finally {
        setShortcutBusy(null);
      }
    },
    [
      focus,
      anyBusy,
      setShortcutResult,
      setFocusLastResponseId,
      setError,
    ],
  );

  const handleAskSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!focus || anyBusy) return;
      const trimmed = askInput.trim();
      if (!trimmed) return;
      const settings = useStore.getState().settings;
      const previousResponseId = focus.lastResponseId;
      const referenceQuestion = previousResponseId
        ? undefined
        : focus.referenceQuestion;
      const { passage } = splitNotes(focus.buffer);
      setAskBusy(true);
      setError(null);
      try {
        const result = await fetchBlockAction(
          'ask',
          passage,
          trimmed,
          undefined,
          settings,
          previousResponseId,
          referenceQuestion,
        );
        if (!isSameSession(focus)) return;
        appendNoteToBuffer(result.text);
        if (result.responseId) setFocusLastResponseId(result.responseId);
        setAskInput('');
      } catch (err) {
        setError(getErrorMessage(err, 'Ask failed.'));
      } finally {
        setAskBusy(false);
      }
    },
    [
      focus,
      anyBusy,
      askInput,
      appendNoteToBuffer,
      setFocusLastResponseId,
      setError,
    ],
  );

  const handleRewrite = useCallback(async () => {
    if (!focus || anyBusy) return;
    const settings = useStore.getState().settings;
    const { passage, notes } = splitNotes(focus.buffer);
    setRewriteBusy(true);
    setError(null);
    try {
      const result = await fetchRewrite(passage, notes, settings);
      if (!isSameSession(focus)) return;
      setRewriteResult(result.text);
    } catch (err) {
      setError(getErrorMessage(err, 'Rewrite failed.'));
    } finally {
      setRewriteBusy(false);
    }
  }, [focus, anyBusy, setRewriteResult, setError]);

  if (!focus) return null;

  const canRevert = focus.prevBuffer !== null;
  const revertInactive = !canRevert || anyBusy;
  const rewriteInactive = anyBusy && !rewriteBusy;

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleAskSubmit} className="relative flex items-center">
        <input
          type="text"
          data-testid="focus-ask-input"
          value={askInput}
          onChange={(e) => setAskInput(e.target.value)}
          placeholder={askBusy ? 'Asking…' : 'Ask about this passage…'}
          disabled={anyBusy && !askBusy}
          aria-label="Ask about this passage"
          className="w-full bg-transparent outline-none border border-border rounded-md pl-2 pr-7 py-1 text-sm focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 text-xs text-muted-foreground"
        >
          ↵
        </span>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <EditorActions
          onAction={handleShortcut}
          busy={shortcutBusy}
          disabled={anyBusy && shortcutBusy === null}
        />

        <Badge
          role="button"
          data-testid="focus-action-revert"
          aria-disabled={revertInactive}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (revertInactive) return;
            revertRewrite();
          }}
          className={
            revertInactive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }
        >
          Revert
        </Badge>

        <Badge
          role="button"
          data-testid="focus-action-rewrite"
          aria-disabled={rewriteInactive || rewriteBusy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (rewriteInactive || rewriteBusy) return;
            handleRewrite();
          }}
          className={
            rewriteInactive || rewriteBusy
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }
        >
          {rewriteBusy ? 'Rewriting…' : 'Rewrite'}
        </Badge>
      </div>
    </div>
  );
}
