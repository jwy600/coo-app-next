'use client';

import { useCallback, useState } from 'react';
import { fetchRewrite } from '@/lib/api';
import { useStore } from '@/lib/store/useStore';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/utils/errorHandling';

/**
 * Buttons rendered at the foot of the focus editor:
 *
 *  - Revert: undo the most recent Rewrite (single-step).
 *  - Rewrite: bundle buffer + notes, replace the buffer atomically.
 *
 * One-shot shortcuts (Translate / ELI5 / Summarize) live on the composer
 * so the result is co-located with the button that produced it.
 */
export function EditorControls() {
  const focus = useStore((s) => s.focus);
  const setRewriteResult = useStore((s) => s.setRewriteResult);
  const revertRewrite = useStore((s) => s.revertRewrite);
  const setError = useStore((s) => s.setError);

  const [busy, setBusy] = useState(false);

  const handleRewrite = useCallback(async () => {
    if (!focus) return;
    const settings = useStore.getState().settings;
    setBusy(true);
    setError(null);
    try {
      const result = await fetchRewrite(focus.buffer, focus.notes, settings);
      // Re-check the active editor — the user may have closed it during the request.
      if (useStore.getState().focus?.messageId !== focus.messageId) return;
      setRewriteResult(result.text);
    } catch (err) {
      setError(getErrorMessage(err, 'Rewrite failed.'));
    } finally {
      setBusy(false);
    }
  }, [focus, setRewriteResult, setError]);

  if (!focus) return null;

  const canRevert = focus.prevBuffer !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={revertRewrite}
        disabled={!canRevert || busy}
      >
        Revert
      </Button>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={handleRewrite}
        disabled={busy}
      >
        {busy ? 'Rewriting…' : 'Rewrite'}
      </Button>
    </div>
  );
}
