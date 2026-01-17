/**
 * ChatContainer Component
 *
 * Client Component - Main orchestrator for entire chat UI
 * Connects MessageList, Composer, BlockControls with real functionality
 *
 * Reference: legacy/app.js (overall structure)
 * Phase 7b: Wired up with custom hooks
 * Phase 8: Updated to accept initial server-loaded data
 */

'use client';

import { MessageList } from './MessageList';
import { Composer } from '@/components/composer/Composer';
import {
  useComposer,
  useBlockSelection,
  useTextSelection,
  useKeyboardShortcuts,
  useThreadSync,
} from '@/hooks';
import { useShallow } from 'zustand/react/shallow';
import { useStore, selectBlocksByThread, selectMessagesByThread } from '@/lib/store/useStore';
import type { Thread } from '@/types/thread';
import type { Message } from '@/types/message';
import type { Block } from '@/types/block';

interface ChatContainerProps {
  threadId: string;
  /** Server-loaded initial data (optional) */
  initialThread?: Thread;
  initialMessages?: Message[];
  initialBlocks?: Block[];
}

export function ChatContainer({
  threadId,
  initialThread,
  initialMessages,
  initialBlocks,
}: ChatContainerProps) {
  // Load thread from Supabase on mount (or use initial data)
  const { isLoading: isLoadingThread, error: threadError } = useThreadSync(threadId, {
    initialThread,
    initialMessages,
    initialBlocks,
  });

  // Store state
  const mode = useStore((state) => state.mode);
  const messages = useStore(useShallow(selectMessagesByThread(threadId)));
  // Get blocks for this specific thread only
  const blocks = useStore(useShallow(selectBlocksByThread(threadId)));

  // Composer hook (handles submission and block actions)
  const {
    prompt,
    setPrompt,
    handleSubmit,
    isSubmitting,
    error: composerError,
    handleBlockAction,
  } = useComposer();

  // Block selection hook
  const { selectedBlockId, selectBlock, clearSelection } = useBlockSelection();

  // Text selection hook (for prompt input)
  const {
    captureSelection,
    removeSelection: removeSelectionFromHook,
    clearSelections: clearSelectionsFromHook,
  } = useTextSelection(selectedBlockId);

  // Wrap handlers to match MessageList expected signatures
  const handleRemoveSelection = (blockId: string, index: number) => {
    // Verify blockId matches selectedBlockId
    if (blockId === selectedBlockId) {
      removeSelectionFromHook(index);
    }
  };

  const handleClearSelections = (blockId: string) => {
    // Verify blockId matches selectedBlockId
    if (blockId === selectedBlockId) {
      clearSelectionsFromHook();
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    Escape: clearSelection,
  });

  // Handle rewrite action (special case - modifies block directly)
  const handleRewrite = async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // Get selections as comma-separated list
    const selectionsText = block.selections.join(', ');

    if (!selectionsText) {
      return;
    }

    // Call rewrite via block action API
    try {
      const { fetchBlockAction } = await import('@/lib/api');
      const result = await fetchBlockAction('rewrite', block.text, selectionsText);

      // Update block with rewrite using store action
      const toggleRewrite = useStore.getState().toggleRewrite;
      toggleRewrite(blockId, result.text);

      // Clear selections after rewrite
      clearSelectionsFromHook();
    } catch (error) {
      console.error('Rewrite failed:', error);
    }
  };

  // Handle retry after error
  const handleRetry = () => {
    handleSubmit();
  };

  // Combined error (thread loading or composer)
  const error = threadError || composerError;

  return (
    <div className="app chat">
      <MessageList
        messages={messages}
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        isPending={isSubmitting}
        error={error}
        onBlockSelect={selectBlock}
        onRemoveSelection={handleRemoveSelection}
        onClearSelections={handleClearSelections}
        onRewrite={handleRewrite}
        onRetry={handleRetry}
      />

      <Composer
        mode={mode}
        selectedBlockId={selectedBlockId}
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
        onSelectionCapture={captureSelection}
        onBlockAction={handleBlockAction}
        disabled={isSubmitting || isLoadingThread}
      />
    </div>
  );
}
