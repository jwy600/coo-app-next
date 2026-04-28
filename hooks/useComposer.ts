/**
 * useComposer Hook
 *
 * Owns the composer's text state, submission, and the user→assistant
 * round-trip. Block-level interactions (ask/edit modes, block actions)
 * are gone with the block model; focus-mode integration arrives in a
 * later phase.
 */

'use client';

import { useCallback } from 'react';
import { useStore } from '@/lib/store/useStore';
import { fetchBlockAction, generateThreadTitle } from '@/lib/api';
import { getLastAssistantResponseId, getThreadById } from '@/lib/state';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import { useStreaming } from './useStreaming';

export interface UseComposerReturn {
  prompt: string;
  setPrompt: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  clearPrompt: () => void;
}

export function useComposer(): UseComposerReturn {
  const prompt = useStore((state) => state.composerPrompt);
  const setPrompt = useStore((state) => state.setComposerPrompt);

  const addUserMessage = useStore((state) => state.addUserMessage);
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const createThread = useStore((state) => state.createThread);
  const updateThreadTitle = useStore((state) => state.updateThreadTitle);
  const isSubmitting = useStore((state) => state.isAwaitingResponse);
  const setAwaitingResponse = useStore((state) => state.setAwaitingResponse);
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);

  const { streamChat } = useStreaming();

  const clearPrompt = useCallback(() => {
    setPrompt('');
    setError(null);
  }, [setError]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      const trimmed = prompt.trim();
      if (isSubmitting || !trimmed) return;

      // Focus mode: composer is input AND output. Ask about the editor's
      // buffer; replace the prompt with the answer; do NOT add thread
      // messages, do NOT stream.
      const focus = useStore.getState().focus;
      if (focus) {
        setAwaitingResponse(true);
        setError(null);
        try {
          const settings = useStore.getState().settings;
          const result = await fetchBlockAction(
            'ask',
            focus.buffer,
            trimmed,
            undefined,
            settings,
          );
          setPrompt(result.text);
        } catch (err) {
          setError(getErrorMessage(err, 'Ask failed.'));
        } finally {
          setAwaitingResponse(false);
        }
        return;
      }

      setAwaitingResponse(true);
      setError(null);

      const isNewThread = mode === 'landing';
      if (isNewThread) {
        createThread();
        setMode('thread');
      }

      addUserMessage(trimmed);

      const currentThreadId = useStore.getState().activeThreadId;
      if (!currentThreadId) {
        setError('No active thread');
        setAwaitingResponse(false);
        return;
      }

      if (isNewThread) {
        const fallback =
          trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed;
        updateThreadTitle(currentThreadId, fallback);

        const titleSettings = useStore.getState().settings;
        const titleThreadId = currentThreadId;
        void generateThreadTitle(trimmed, titleSettings).then((generated) => {
          if (!generated) return;
          const thread = getThreadById(useStore.getState(), titleThreadId);
          if (!thread || thread.title !== fallback) return;
          updateThreadTitle(titleThreadId, generated);
        });
      }

      const previousResponseId = getLastAssistantResponseId(
        useStore.getState(),
        currentThreadId,
      );

      setPrompt('');

      const settings = useStore.getState().settings;

      await streamChat(
        {
          prompt: trimmed,
          threadId: currentThreadId,
          previousResponseId,
          settings,
        },
        {
          onComplete: () => {
            setError(null);
            setAwaitingResponse(false);
          },
          onError: (errorMessage) => {
            setError(errorMessage);
            setAwaitingResponse(false);
          },
        },
      );
    },
    [
      prompt,
      isSubmitting,
      mode,
      addUserMessage,
      createThread,
      setMode,
      setPrompt,
      updateThreadTitle,
      setAwaitingResponse,
      setError,
      streamChat,
    ],
  );

  return {
    prompt,
    setPrompt,
    handleSubmit,
    isSubmitting,
    error,
    clearPrompt,
  };
}
