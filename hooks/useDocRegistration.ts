'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store/useStore';
import { registerDocument } from '@/lib/api';

/**
 * Embeds imported documents with the OpenAI Responses API.
 *
 * Imported messages are created with `meta.registerState: 'registering'` and no
 * `openaiResponseId`. This hook scans the active thread for such messages and
 * registers each once (guarded by an in-flight ref). On success it stores the
 * returned `responseId` so chat/ask chain from the doc; on failure it removes
 * the optimistic message and surfaces an error (the caller's "abort" path).
 *
 * Running from ChatContainer — which mounts after the upload-Send creates the
 * doc — also gives reload recovery for free: a half-registered doc loaded from
 * localStorage is re-registered on mount.
 */
export function useDocRegistration(threadId: string | undefined): void {
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!threadId) return;

    const { threads, settings } = useStore.getState();
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;

    const pending = thread.messages.filter(
      (m) =>
        m.role === 'assistant' &&
        m.meta?.source === 'import' &&
        m.meta?.registerState === 'registering' &&
        !m.meta?.openaiResponseId,
    );

    for (const msg of pending) {
      if (inFlightRef.current.has(msg.id)) continue;
      inFlightRef.current.add(msg.id);

      const fileName = (msg.meta?.fileName as string | undefined) ?? 'document';

      void (async () => {
        try {
          const responseId = await registerDocument(msg.text, settings);
          const store = useStore.getState();
          // Bail if the message was removed or already resolved elsewhere.
          const stillRegistering = store.threads
            .find((t) => t.id === threadId)
            ?.messages.some(
              (m) => m.id === msg.id && m.meta?.registerState === 'registering',
            );
          if (!stillRegistering) return;
          store.setMessageResponseId(msg.id, responseId);
          store.setRegisterState(msg.id, 'registered');
        } catch (err) {
          console.error('[doc registration] failed', err);
          const store = useStore.getState();
          store.removeMessage(msg.id);
          store.setError(
            `Couldn't embed "${fileName}". Please go back and reattach the file to try again.`,
          );
        } finally {
          inFlightRef.current.delete(msg.id);
        }
      })();
    }
  }, [threadId]);
}
