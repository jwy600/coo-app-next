/**
 * useComposer Hook
 *
 * Manages composer state, form submission, and API calls based on composer mode (chat vs block).
 *
 * CRITICAL DISTINCTION (Composer Modes):
 * - Chat Mode (no block selected): Creates user/assistant messages
 * - Block Mode (block selected): Result goes to composer (editable draft)
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, selectSelectedBlock, selectContentForTransform } from '@/lib/store/useStore';
import { fetchBlockAction } from '@/lib/api';
import { getLastAssistantResponseId } from '@/lib/state';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import { useStreaming } from './useStreaming';
import type { BlockAction } from '@/types/api';
import { idFactory } from '@/lib/utils/idFactory';

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
  const settings = useStore((state) => state.settings);
  const selectedBlockId = useStore((state) => state.selectedBlockId);

  // Track previous selectedBlockId to detect block switches
  const prevSelectedBlockIdRef = useRef(selectedBlockId);

  // Clear prompt when switching FROM one block TO another block
  // (Not when entering block mode from chat mode, or when exiting)
  useEffect(() => {
    const prev = prevSelectedBlockIdRef.current;
    const curr = selectedBlockId;

    if (prev !== null && curr !== null && prev !== curr) {
      setPrompt('');
    }

    prevSelectedBlockIdRef.current = curr;
  }, [selectedBlockId]);

  const selectedBlock = useStore(selectSelectedBlock);
  const contentForTransform = useStore(useShallow(selectContentForTransform));
  const addUserMessage = useStore((state) => state.addUserMessage);
  const addAssistantMessage = useStore((state) => state.addAssistantMessage);
  const clearSelection = useStore((state) => state.clearSelection);
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const createThread = useStore((state) => state.createThread);
  const activeThreadId = useStore((state) => state.activeThreadId);
  const updateThreadTitle = useStore((state) => state.updateThreadTitle);
  const isSubmitting = useStore((state) => state.isAwaitingResponse);
  const setAwaitingResponse = useStore((state) => state.setAwaitingResponse);
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);

  // Streaming hook
  const { streamChat } = useStreaming();

  /**
   * Clear prompt and error
   */
  const clearPrompt = useCallback(() => {
    setPrompt('');
    setError(null);
  }, [setError]);

  /**
   * Handle block action (ELI5, Translate, Expand, Example, Ask)
   * Result goes to composer (NOT as new message)
   *
   * Uses contentForTransform which is the selected block
   */
  const handleBlockAction = useCallback(
    async (action: BlockAction) => {
      if (contentForTransform.length === 0) {
        setError('No content selected');
        return;
      }

      // For "ask" action, prompt is required
      if (action === 'ask' && !prompt.trim()) {
        setError('Please enter a question');
        return;
      }

      setError(null);
      setAwaitingResponse(true);

      try {
        // Join all content blocks for transformation
        const contentText = contentForTransform.map((b) => b.text).join('\n\n');

        const result = await fetchBlockAction(
          action,
          contentText,
          action === 'ask' ? prompt : undefined,
          action === 'translate' ? settings.translateLanguage : undefined,
          settings
        );

        // CRITICAL: Result goes to composer (editable draft), NOT as message
        setPrompt(result.text);

        // Clear error on success
        setError(null);
      } catch (err) {
        const errorMessage = getErrorMessage(err, 'Failed to transform block');
        setError(errorMessage);
        // Don't clear prompt on error (allow retry)
      } finally {
        setAwaitingResponse(false);
      }
    },
    [contentForTransform, prompt, setAwaitingResponse, settings, setError]
  );

  /**
   * Handle form submission
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

      // BLOCK MODE: Result goes to composer when a block is selected
      if (selectedBlockId && contentForTransform.length > 0) {
        await handleBlockAction('ask');
        return;
      }

      // CHAT MODE (composer): Creates messages
      setAwaitingResponse(true);
      setError(null);

      // Create thread if in landing mode
      const isNewThread = mode === 'landing';
      if (isNewThread) {
        createThread();
        setMode('thread');
      }

      // Add user message
      addUserMessage(trimmedPrompt);

      // IMPORTANT: Get fresh activeThreadId from store (after potential createThread())
      const currentThreadId = useStore.getState().activeThreadId;

      // Update thread title ONLY for the first message (when creating new thread)
      if (isNewThread) {
        const threadTitle =
          trimmedPrompt.length > 50 ? trimmedPrompt.substring(0, 50) + '...' : trimmedPrompt;
        updateThreadTitle(currentThreadId, threadTitle);
      }

      // Get previous response ID for contextual chat (chains conversation)
      const currentState = useStore.getState();
      const previousResponseId = getLastAssistantResponseId(currentState, currentThreadId);

      // Clear prompt immediately (optimistic)
      setPrompt('');

      // Generate message ID for streaming
      const streamingMessageId = idFactory();

      // Get settings from store
      const currentSettings = useStore.getState().settings;

      // Stream the chat completion
      await streamChat(
        {
          prompt: trimmedPrompt,
          threadId: currentThreadId,
          messageId: streamingMessageId,
          previousResponseId,
          settings: currentSettings,
        },
        {
          onComplete: (blocks, responseId) => {
            if (blocks.length > 0) {
              addAssistantMessage(blocks, responseId);
            }
            clearSelection();
            setError(null);
            setAwaitingResponse(false);
          },
          onError: (errorMessage) => {
            setError(errorMessage);
            setAwaitingResponse(false);
          },
        }
      );
    },
    [
      prompt,
      isSubmitting,
      selectedBlockId,
      contentForTransform,
      mode,
      handleBlockAction,
      createThread,
      setMode,
      addUserMessage,
      addAssistantMessage,
      clearSelection,
      updateThreadTitle,
      setAwaitingResponse,
      streamChat,
      setError,
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
