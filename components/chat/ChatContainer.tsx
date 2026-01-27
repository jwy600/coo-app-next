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

import { useEffect, useState } from 'react';
import { MessageList } from './MessageList';
import { Composer } from '@/components/composer/Composer';
import { ExportButton } from './ExportButton';
import { OfflineBanner } from './OfflineBanner';
import { isOfflineMode } from '@/lib/utils/offlineMode';
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
  const setMode = useStore((state) => state.setMode);
  const setActiveThread = useStore((state) => state.setActiveThread);
  const messages = useStore(useShallow(selectMessagesByThread(threadId)));
  // Get blocks for this specific thread only
  const blocks = useStore(useShallow(selectBlocksByThread(threadId)));
  // Get streaming message state
  const streamingMessage = useStore((state) => state.streamingMessage);

  // Set active thread and ensure chat mode when component mounts or threadId changes
  useEffect(() => {
    if (threadId) {
      setActiveThread(threadId);
      // Set thread mode on mount (don't check current mode to avoid fighting with Logo)
      setMode('thread');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, setActiveThread, setMode]);

  // Composer hook (handles submission and block actions)
  const {
    prompt,
    setPrompt,
    handleSubmit,
    isSubmitting,
    handleBlockAction,
  } = useComposer();

  // Error state from store (persists across navigation)
  const composerError = useStore((state) => state.error);

  // Block selection hook
  const {
    selectedBlockIds,
    sectionHeadingId,
    toggleBlockSelection,
    enterSectionMode,
    clearSelection,
    isSingleBlockMode,
    hasSelection,
    isInSectionMode,
    isComposerDisabled,
  } = useBlockSelection();

  // Text selection hook (for prompt input) - only active in single block mode
  const singleSelectedBlockId = isSingleBlockMode ? selectedBlockIds[0] : null;
  const {
    captureSelection,
    removeSelection: removeSelectionFromHook,
    clearSelections: clearSelectionsFromHook,
  } = useTextSelection(singleSelectedBlockId);

  // Wrap handlers to match MessageList expected signatures
  const handleRemoveSelection = (blockId: string, index: number) => {
    // Verify blockId matches the single selected block
    if (blockId === singleSelectedBlockId) {
      removeSelectionFromHook(index);
    }
  };

  const handleClearSelections = (blockId: string) => {
    // Verify blockId matches the single selected block
    if (blockId === singleSelectedBlockId) {
      clearSelectionsFromHook();
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    Escape: clearSelection,
  });

  // Global click handler to deselect when clicking outside blocks or composer
  // Reference: legacy/app.js lines 1154-1163
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle if any blocks are selected
      if (!hasSelection) return;

      const target = event.target as HTMLElement;

      // Don't deselect if clicking inside composer, doc-block, toolbar, or dialog
      if (
        target.closest('.composer') ||
        target.closest('.doc-block') ||
        target.closest('.chat-toolbar') ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      // Click was outside - clear selection
      clearSelection();
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [hasSelection, clearSelection]);

  // Clear prompt when exiting block mode (returning to chat mode)
  useEffect(() => {
    // When no blocks are selected, we're exiting block mode
    if (!hasSelection) {
      setPrompt('');
    }
  }, [hasSelection, setPrompt]);

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

      // DON'T clear selections - they should persist until user exits block mode
      // clearSelectionsFromHook(); ← REMOVED
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

  // Check offline mode only on client to avoid hydration mismatch
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  useEffect(() => {
    setShowOfflineBanner(isOfflineMode());
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar with offline banner and export button */}
      <div className="chat-toolbar relative flex items-center justify-center px-4 border-b border-border/50 min-h-[52px]">
        {showOfflineBanner && <OfflineBanner />}
        <div className="absolute right-4">
          <ExportButton />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-chat mx-auto">
          <MessageList
            messages={messages}
            blocks={blocks}
            selectedBlockIds={selectedBlockIds}
            sectionHeadingId={sectionHeadingId}
            isPending={isSubmitting}
            error={error}
            streamingMessage={streamingMessage}
            onBlockSelect={toggleBlockSelection}
            onEnterSectionMode={enterSectionMode}
            onRemoveSelection={handleRemoveSelection}
            onClearSelections={handleClearSelections}
            onRewrite={handleRewrite}
            onRetry={handleRetry}
          />
        </div>
      </div>

      <div className="flex-shrink-0 p-4 pb-6">
        <div className="max-w-chat mx-auto">
          <Composer
            selectedBlockId={singleSelectedBlockId}
            isInSectionMode={isInSectionMode}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={handleSubmit}
            onSelectionCapture={captureSelection}
            onBlockAction={handleBlockAction}
            disabled={isSubmitting || isLoadingThread || isComposerDisabled}
          />
        </div>
      </div>
    </div>
  );
}
