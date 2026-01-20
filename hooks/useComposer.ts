/**
 * useComposer Hook
 *
 * Manages composer state, form submission, and API calls based on mode (chat vs block).
 *
 * Reference: legacy/app.js lines 901-1002 (respondToPrompt function)
 *
 * CRITICAL DISTINCTION:
 * - Chat Mode (no block selected): Creates user/assistant messages
 * - Block Mode (block selected): Result goes to composer (editable draft)
 */

'use client';

import { useState, useCallback } from 'react';
import { useStore, selectSelectedBlock } from '@/lib/store/useStore';
import { fetchChatCompletion, fetchBlockAction } from '@/lib/api';
import { splitIntoBlocks } from '@/lib/state/parser';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import type { BlockAction } from '@/types/api';

export interface UseComposerReturn {
  prompt: string;
  setPrompt: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  clearPrompt: () => void;
  handleBlockAction: (action: BlockAction) => Promise<void>;
}

export function useComposer(): UseComposerReturn {
  const [prompt, setPrompt] = useState('');

  // Store state
  const selectedBlockId = useStore((state) => state.selectedBlockId);
  const selectedBlock = useStore(selectSelectedBlock);
  const addUserMessage = useStore((state) => state.addUserMessage);
  const addAssistantMessage = useStore((state) => state.addAssistantMessage);
  const clearSelectedBlock = useStore((state) => state.clearSelectedBlock);
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const createThread = useStore((state) => state.createThread);
  const activeThreadId = useStore((state) => state.activeThreadId);
  const setHasInitialResponse = useStore((state) => state.setHasInitialResponse);
  const updateThreadTitle = useStore((state) => state.updateThreadTitle);
  const isSubmitting = useStore((state) => state.isAwaitingResponse);
  const setAwaitingResponse = useStore((state) => state.setAwaitingResponse);
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);

  /**
   * Clear prompt and error
   */
  const clearPrompt = useCallback(() => {
    setPrompt('');
    setError(null);
  }, []);

  /**
   * Handle block action (ELI5, Translate, Expand, Example, Ask)
   * Result goes to composer (NOT as new message)
   *
   * Reference: legacy/app.js lines 835-856 (handleBlockCommand)
   */
  const handleBlockAction = useCallback(
    async (action: BlockAction) => {
      if (!selectedBlock) {
        setError('No block selected');
        return;
      }

      // For "ask" action, prompt is required
      if (action === 'ask' && !prompt.trim()) {
        setError('Please enter a question');
        return;
      }

      setError(null);

      try {
        const result = await fetchBlockAction(
          action,
          selectedBlock.text,
          action === 'ask' ? prompt : undefined
        );

        // CRITICAL: Result goes to composer (editable draft), NOT as message
        setPrompt(result.text);

        // Clear error on success
        setError(null);
      } catch (err) {
        const errorMessage = getErrorMessage(err, 'Failed to transform block');
        setError(errorMessage);
        // Don't clear prompt on error (allow retry)
      }
    },
    [selectedBlock, prompt]
  );

  /**
   * Handle form submission
   *
   * Reference: legacy/app.js lines 901-1033 (respondToPrompt)
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      const trimmedPrompt = prompt.trim();

      // Early returns
      if (isSubmitting) return;
      if (!trimmedPrompt) return;

      // BLOCK MODE: Result goes to composer
      if (selectedBlockId && selectedBlock) {
        await handleBlockAction('ask');
        return;
      }

      // CHAT MODE: Creates messages
      setAwaitingResponse(true);
      setError(null);

      try {
        // Create thread if in landing mode
        const isNewThread = mode === 'landing';
        if (isNewThread) {
          createThread();
          setMode('chat');
        }

        // Add user message
        const { message: userMessage, blocks: userBlocks } = addUserMessage(trimmedPrompt);

        // IMPORTANT: Get fresh activeThreadId from store (after potential createThread())
        const currentThreadId = useStore.getState().activeThreadId;

        // Update thread title ONLY for the first message (when creating new thread)
        if (isNewThread) {
          const threadTitle = trimmedPrompt.length > 50
            ? trimmedPrompt.substring(0, 50) + '...'
            : trimmedPrompt;
          updateThreadTitle(currentThreadId, threadTitle);
        }

        // Clear prompt immediately (optimistic)
        setPrompt('');

        // Fetch AI response (use fresh thread ID)
        const response = await fetchChatCompletion(trimmedPrompt, currentThreadId);

        // Parse response into blocks
        const parsedBlocks = splitIntoBlocks(response.text);

        if (parsedBlocks.length === 0) {
          throw new Error('No response returned. Please try again.');
        }

        // Add assistant message
        addAssistantMessage(parsedBlocks);

        // Mark that we have initial response
        setHasInitialResponse(true);

        // Clear any selected block
        clearSelectedBlock();

        // Clear error on success
        setError(null);
      } catch (err) {
        const errorMessage = getErrorMessage(err, 'We hit a snag getting that response. Try again.');
        setError(errorMessage);
        // Restore prompt on error (allow retry)
        // Note: prompt is already cleared optimistically, user can use up arrow or retype
      } finally {
        setAwaitingResponse(false);
      }
    },
    [
      prompt,
      isSubmitting,
      selectedBlockId,
      selectedBlock,
      mode,
      activeThreadId,
      handleBlockAction,
      createThread,
      setMode,
      addUserMessage,
      addAssistantMessage,
      clearSelectedBlock,
      setHasInitialResponse,
      updateThreadTitle,
      setAwaitingResponse,
    ]
  );

  return {
    prompt,
    setPrompt,
    handleSubmit,
    isSubmitting,
    error,
    clearPrompt,
    handleBlockAction,
  };
}
