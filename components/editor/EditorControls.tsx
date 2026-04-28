'use client';

import { useCallback, useState } from 'react';
import { fetchBlockAction, fetchRewrite } from '@/lib/api';
import type { BlockAction } from '@/types/api';
import { useStore } from '@/lib/store/useStore';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/utils/errorHandling';

type DraftAction = Extract<BlockAction, 'translate' | 'eli5' | 'summarize'>;

/**
 * Buttons rendered at the foot of the focus editor:
 *
 *  - Revert: undo the most recent Rewrite (single-step).
 *  - Rewrite: bundle buffer + notes, replace the buffer atomically.
 *  - Translate / ELI5 / Summarize: send buffer to the API and drop the
 *    response into the composer as a draft (does not modify the editor).
 */
export function EditorControls() {
  const focus = useStore((s) => s.focus);
  const setRewriteResult = useStore((s) => s.setRewriteResult);
  const revertRewrite = useStore((s) => s.revertRewrite);
  const appendNote = useStore((s) => s.appendNote);
  const setError = useStore((s) => s.setError);

  const [busy, setBusy] = useState<'rewrite' | DraftAction | null>(null);

  const handleRewrite = useCallback(async () => {
    if (!focus) return;
    const settings = useStore.getState().settings;
    setBusy('rewrite');
    setError(null);
    try {
      const result = await fetchRewrite(focus.buffer, focus.notes, settings);
      // Re-check the active editor — the user may have closed it during the request.
      if (useStore.getState().focus?.messageId !== focus.messageId) return;
      setRewriteResult(result.text);
    } catch (err) {
      setError(getErrorMessage(err, 'Rewrite failed.'));
    } finally {
      setBusy(null);
    }
  }, [focus, setRewriteResult, setError]);

  const handleDraftAction = useCallback(
    async (action: DraftAction) => {
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
        // Drop the result if the user has closed or moved the editor mid-flight.
        if (useStore.getState().focus?.messageId !== focus.messageId) return;
        appendNote(result.text);
      } catch (err) {
        setError(getErrorMessage(err, `${action} failed.`));
      } finally {
        setBusy(null);
      }
    },
    [focus, appendNote, setError],
  );

  if (!focus) return null;

  const isBusy = busy !== null;
  const canRevert = focus.prevBuffer !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={revertRewrite}
        disabled={!canRevert || isBusy}
      >
        Revert
      </Button>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={handleRewrite}
        disabled={isBusy}
      >
        {busy === 'rewrite' ? 'Rewriting…' : 'Rewrite'}
      </Button>
      <span className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleDraftAction('translate')}
          disabled={isBusy}
        >
          {busy === 'translate' ? 'Translating…' : 'Translate'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleDraftAction('eli5')}
          disabled={isBusy}
        >
          {busy === 'eli5' ? 'Simplifying…' : 'ELI5'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => handleDraftAction('summarize')}
          disabled={isBusy}
        >
          {busy === 'summarize' ? 'Summarizing…' : 'Summarize'}
        </Button>
      </span>
    </div>
  );
}
