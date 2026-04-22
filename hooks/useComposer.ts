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
import { fetchBlockAction, generateThreadTitle } from '@/lib/api';
import { getLastAssistantResponseId, getThreadById } from '@/lib/state';
import { getErrorMessage } from '@/lib/utils/errorHandling';
import { useStreaming } from './useStreaming';
import type { BlockAction } from '@/types/api';
import type { ComposerMode } from '@/types/state/ui';
import { idFactory } from '@/lib/utils/idFactory';

export interface UseComposerReturn {
  prompt: string;
  setPrompt: (value: string) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  clearPrompt: () => void;
  handleBlockAction: (action: BlockAction) => Promise<void>;
  // Edit mode support
  composerMode: ComposerMode;
  setComposerMode: (mode: ComposerMode) => void;
  populateWithBlockText: () => void;
}

export function useComposer(): UseComposerReturn {
  const [prompt, setPrompt] = useState('');
  const [composerMode, setComposerMode] = useState<ComposerMode>('chat');

  // Store state
  const settings = useStore((state) => state.settings);
  const selectedBlockId = useStore((state) => state.selectedBlockId);
  const rewriteBlock = useStore((state) => state.rewriteBlock);

  // Track previous selectedBlockId to detect block switches
  const prevSelectedBlockIdRef = useRef(selectedBlockId);

  // Chain of prior 'ask' responses for the current block session.
  // Lets follow-up questions include the last answer as context via
  // OpenAI's previous_response_id. Reset whenever the selected block changes
  // (entering, switching, or leaving block mode) — chain is per-session.
  const askResponseIdRef = useRef<string | null>(null);

  // Clear prompt when switching FROM one block TO another block
  // (Not when entering block mode from chat mode, or when exiting)
  useEffect(() => {
    const prev = prevSelectedBlockIdRef.current;
    const curr = selectedBlockId;

    if (prev !== null && curr !== null && prev !== curr) {
      setPrompt('');
    }

    if (prev !== curr) {
      askResponseIdRef.current = null;
    }

    prevSelectedBlockIdRef.current = curr;
  }, [selectedBlockId]);

  // Manage composer mode based on block selection
  useEffect(() => {
    if (selectedBlockId) {
      // Default to 'ask' when block is selected
      setComposerMode('ask');
    } else {
      // Return to 'chat' when no block is selected
      setComposerMode('chat');
    }
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
   * Populate composer with selected block's text (for edit mode)
   */
  const populateWithBlockText = useCallback(() => {
    if (selectedBlock) {
      setPrompt(selectedBlock.text);
    }
  }, [selectedBlock]);

  /**
   * Handle direct edit submission (replace block text)
   * No API call - text comes directly from user input
   * Keeps block selected so user can continue editing or undo
   */
  const handleDirectEdit = useCallback(() => {
    if (!selectedBlockId || !prompt.trim()) return;

    rewriteBlock(selectedBlockId, prompt.trim());
    // Don't clear selection - keep block selected for further edits or undo
  }, [selectedBlockId, prompt, rewriteBlock]);

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

        // Only 'ask' chains context; other actions are one-shot transforms.
        const previousResponseId =
          action === 'ask' ? askResponseIdRef.current ?? undefined : undefined;

        const result = await fetchBlockAction(
          action,
          contentText,
          action === 'ask' ? prompt : undefined,
          action === 'translate' ? settings.translateLanguage : undefined,
          settings,
          previousResponseId
        );

        // CRITICAL: Result goes to composer (editable draft), NOT as message
        setPrompt(result.text);

        // Extend the ask chain so follow-up questions carry prior context.
        if (action === 'ask') {
          askResponseIdRef.current = result.responseId;
        }

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

      // EDIT MODE: Direct block replacement (no API call)
      if (composerMode === 'edit' && selectedBlockId) {
        handleDirectEdit();
        return;
      }

      // ASK MODE: Result goes to composer when a block is selected
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
      if (!currentThreadId) {
        setError('No active thread');
        setAwaitingResponse(false);
        return;
      }

      // Update thread title ONLY for the first message (when creating new thread)
      if (isNewThread) {
        const fallbackTitle =
          trimmedPrompt.length > 50 ? trimmedPrompt.substring(0, 50) + '...' : trimmedPrompt;
        updateThreadTitle(currentThreadId, fallbackTitle);

        // Fire AI title generation in the background — does not block streaming
        const titleSettings = useStore.getState().settings;
        const titleThreadId = currentThreadId;
        void generateThreadTitle(trimmedPrompt, titleSettings).then((generatedTitle) => {
          if (!generatedTitle) return;
          // Guard: only apply if thread still exists and title hasn't been changed
          const currentThread = getThreadById(useStore.getState(), titleThreadId);
          if (!currentThread) return;
          if (currentThread.title !== fallbackTitle) return;
          updateThreadTitle(titleThreadId, generatedTitle);
        });
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
      composerMode,
      handleBlockAction,
      handleDirectEdit,
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
    // Edit mode support
    composerMode,
    setComposerMode,
    populateWithBlockText,
  };
}
