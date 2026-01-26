/**
 * useComposer Hook
 *
 * Manages composer state, form submission, and API calls based on composer mode (chat vs block).
 *
 * Reference: legacy/app.js lines 901-1002 (respondToPrompt function)
 *
 * CRITICAL DISTINCTION (Composer Modes):
 * - Chat Mode (no block selected): Creates user/assistant messages
 * - Block Mode (block selected): Result goes to composer (editable draft)
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, selectSingleSelectedBlock, selectContentForTransform } from '@/lib/store/useStore';
import { fetchChatCompletionStream, fetchBlockAction } from '@/lib/api';
import { getLastAssistantResponseId } from '@/lib/state';
import { getErrorMessage } from '@/lib/utils/errorHandling';
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
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);
  const sectionHeadingId = useStore((state) => state.sectionHeadingId);
  const selectedBlock = useStore(selectSingleSelectedBlock);
  const contentForTransform = useStore(useShallow(selectContentForTransform));
  const addUserMessage = useStore((state) => state.addUserMessage);
  const addAssistantMessage = useStore((state) => state.addAssistantMessage);
  const clearSelectedBlocks = useStore((state) => state.clearSelectedBlocks);
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

  // Streaming state
  const startStreaming = useStore((state) => state.startStreaming);
  const appendStreamToken = useStore((state) => state.appendStreamToken);
  const setStreamResponseId = useStore((state) => state.setStreamResponseId);
  const clearStream = useStore((state) => state.clearStream);

  // Track response ID during streaming
  const streamResponseIdRef = useRef<string | undefined>(undefined);

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
   * Uses contentForTransform which handles:
   * - Section mode: all content blocks in section (or narrowed selection)
   * - Direct heading selection: heading text
   * - Normal selection: selected blocks
   *
   * Reference: legacy/app.js lines 835-856 (handleBlockCommand)
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
          action === 'translate' ? settings.translateLanguage : undefined
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
    [contentForTransform, prompt, setAwaitingResponse, settings.translateLanguage]
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
      // - Section mode (heading clicked): uses section content
      // - Single block selected: uses that block
      const hasContent = contentForTransform.length > 0;
      if (hasContent && (sectionHeadingId || selectedBlockIds.length === 1)) {
        await handleBlockAction('ask');
        return;
      }

      // CHAT MODE (composer): Creates messages
      setAwaitingResponse(true);
      setError(null);

      try {
        // Create thread if in landing mode
        const isNewThread = mode === 'landing';
        if (isNewThread) {
          createThread();
          setMode('thread');
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

        // Get previous response ID for contextual chat (chains conversation)
        const currentState = useStore.getState();
        const previousResponseId = getLastAssistantResponseId(currentState, currentThreadId);

        // Clear prompt immediately (optimistic)
        setPrompt('');

        // Start streaming state
        const streamingMessageId = idFactory();
        startStreaming(streamingMessageId, currentThreadId);
        streamResponseIdRef.current = undefined;

        // Get settings from store
        const settings = useStore.getState().settings;

        // Fetch AI response with streaming
        await fetchChatCompletionStream(
          trimmedPrompt,
          {
            onToken: (token: string) => {
              appendStreamToken(token);
            },
            onResponseId: (responseId: string) => {
              streamResponseIdRef.current = responseId;
              setStreamResponseId(responseId);
            },
            onComplete: () => {
              // Get final streaming state and convert to message
              const finalState = useStore.getState();
              const streamingMessage = finalState.streamingMessage;

              if (streamingMessage && streamingMessage.blocks.length > 0) {
                // Store blocks locally before clearing streaming state
                // This prevents both streaming and final message from rendering simultaneously
                const finalBlocks = [...streamingMessage.blocks];
                const finalResponseId = streamResponseIdRef.current;

                // Clear streaming state FIRST to prevent double-rendering
                clearStream();

                // Then add assistant message with accumulated blocks
                addAssistantMessage(finalBlocks, finalResponseId);
              } else {
                // No blocks to add, just clear
                clearStream();
              }

              // Mark that we have initial response
              setHasInitialResponse(true);

              // Clear any selected blocks
              clearSelectedBlocks();

              // Clear error on success
              setError(null);

              // Done submitting
              setAwaitingResponse(false);
            },
            onError: (error: Error) => {
              clearStream();
              const errorMessage = getErrorMessage(error, 'We hit a snag getting that response. Try again.');
              setError(errorMessage);
              setAwaitingResponse(false);
            },
          },
          currentThreadId,
          previousResponseId,
          settings
        );
      } catch (err) {
        clearStream();
        const errorMessage = getErrorMessage(err, 'We hit a snag getting that response. Try again.');
        setError(errorMessage);
        setAwaitingResponse(false);
      }
    },
    [
      prompt,
      isSubmitting,
      selectedBlockIds,
      selectedBlock,
      mode,
      activeThreadId,
      handleBlockAction,
      createThread,
      setMode,
      addUserMessage,
      addAssistantMessage,
      clearSelectedBlocks,
      setHasInitialResponse,
      updateThreadTitle,
      setAwaitingResponse,
      startStreaming,
      appendStreamToken,
      setStreamResponseId,
      clearStream,
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
