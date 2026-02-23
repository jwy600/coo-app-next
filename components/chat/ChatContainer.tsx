/**
 * ChatContainer Component
 *
 * Client Component - Main orchestrator for entire chat UI
 * Connects MessageList, Composer, BlockControls with real functionality
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageList } from "./MessageList";
import { Composer } from "@/components/composer/Composer";
import { DeleteThreadButton } from "./DeleteThreadButton";
import { ExportButton } from "./ExportButton";
import { OfflineBanner } from "./OfflineBanner";
import { isOfflineMode } from "@/lib/supabase/client";
import { useComposer } from "@/hooks/useComposer";
import { useBlockSelection } from "@/hooks/useBlockSelection";
import { useTextSelection } from "@/hooks/useTextSelection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useThreadSync } from "@/hooks/useThreadSync";
import { useShallow } from "zustand/react/shallow";
import {
  useStore,
  selectBlocksByThread,
  selectMessagesByThread,
} from "@/lib/store/useStore";
import type { Thread } from "@/types/thread";
import type { Message } from "@/types/message";
import type { Block } from "@/types/block";

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
  const { isLoading: isLoadingThread, error: threadError } = useThreadSync(
    threadId,
    {
      initialThread,
      initialMessages,
      initialBlocks,
    },
  );

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
      setMode("thread");
    }
  }, [threadId, setActiveThread, setMode]);

  // Composer hook (handles submission and block actions)
  const {
    prompt,
    setPrompt,
    handleSubmit,
    isSubmitting,
    handleBlockAction,
    composerMode,
    setComposerMode,
    populateWithBlockText,
  } = useComposer();

  // Error state from store (persists across navigation)
  const composerError = useStore((state) => state.error);

  // Block selection hook
  const {
    selectedBlockId,
    selectBlock,
    clearSelection,
    hasSelection,
    cards,
    addCard,
    removeCard,
  } = useBlockSelection();

  // Text selection hook (for prompt input) - only active when a block is selected
  const { captureSelection, removeSelection: removeSelectionFromHook } =
    useTextSelection(selectedBlockId);

  // Wrap handlers to match MessageList expected signatures
  const handleRemoveSelection = (blockId: string, index: number) => {
    // Verify blockId matches the selected block
    if (blockId === selectedBlockId) {
      removeSelectionFromHook(index);
    }
  };

  // Keyboard shortcuts - Escape clears selection only (cards remain)
  useKeyboardShortcuts({
    Escape: clearSelection,
  });

  // Global click handler to deselect when clicking outside blocks or composer
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle if a block is selected
      if (!hasSelection) return;

      const target = event.target as HTMLElement;

      // Don't deselect if clicking inside composer, doc-block, toolbar, or dialog
      if (
        target.closest(".composer") ||
        target.closest(".doc-block") ||
        target.closest(".chat-toolbar") ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      // Click was outside - clear selection
      clearSelection();
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [hasSelection, clearSelection]);

  // Clear prompt when exiting block mode (returning to chat mode)
  useEffect(() => {
    // When no blocks are selected, we're exiting block mode
    if (!hasSelection) {
      setPrompt("");
    }
  }, [hasSelection, setPrompt]);

  // Handle rewrite action (special case - modifies block directly)
  const handleRewrite = async (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // Get selections as comma-separated list
    const selectionsText = block.selections.join(", ");

    if (!selectionsText) {
      return;
    }

    // Call rewrite via block action API
    try {
      const { fetchBlockAction } = await import("@/lib/api");
      const currentSettings = useStore.getState().settings;
      const result = await fetchBlockAction(
        "rewrite",
        block.text,
        selectionsText,
        undefined,
        currentSettings,
      );

      // Update block with rewrite using store action
      const rewriteBlock = useStore.getState().rewriteBlock;
      rewriteBlock(blockId, result.text);

      // DON'T clear selections - they should persist until user exits block mode
    } catch (error) {
      console.error("Rewrite failed:", error);
    }
  };

  // Handle undo action - reverts to previous text
  const handleUndo = (blockId: string) => {
    const undoRewrite = useStore.getState().undoRewrite;
    undoRewrite(blockId);
  };

  // Handle retry after error
  const handleRetry = () => {
    handleSubmit();
  };

  // Handle composer mode change (Ask/Edit toggle)
  const handleComposerModeChange = useCallback(
    (mode: "ask" | "edit") => {
      setComposerMode(mode);
      if (mode === "edit") {
        // Populate composer with block text when switching to edit mode
        populateWithBlockText();
      } else if (mode === "ask") {
        // Clear prompt when switching to ask mode
        setPrompt("");
      }
    },
    [setComposerMode, populateWithBlockText, setPrompt],
  );

  // Combined error (thread loading or composer)
  const error = threadError || composerError;

  // Check offline mode only on client to avoid hydration mismatch
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  useEffect(() => {
    setShowOfflineBanner(isOfflineMode());
  }, []);

  // Composer is disabled during submission or loading
  const isComposerDisabled = isSubmitting || isLoadingThread;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar with offline banner, delete and export buttons */}
      <div className="chat-toolbar relative flex items-center justify-center px-4 border-b border-border/50 min-h-[52px]">
        {showOfflineBanner && <OfflineBanner />}
        <div className="absolute right-4 flex items-center gap-2">
          <DeleteThreadButton />
          <ExportButton />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-chat mx-auto">
          <MessageList
            messages={messages}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            cards={cards}
            isPending={isSubmitting}
            error={error}
            streamingMessage={streamingMessage}
            onBlockSelect={selectBlock}
            onAddCard={addCard}
            onRemoveCard={removeCard}
            onRemoveSelection={handleRemoveSelection}
            onRewrite={handleRewrite}
            onUndo={handleUndo}
            onRetry={handleRetry}
          />
        </div>
      </div>

      <div className="flex-shrink-0 p-4 pb-6">
        <div className="max-w-chat mx-auto">
          <Composer
            selectedBlockId={selectedBlockId}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={handleSubmit}
            onSelectionCapture={captureSelection}
            onBlockAction={handleBlockAction}
            composerMode={composerMode}
            onComposerModeChange={handleComposerModeChange}
            disabled={isComposerDisabled}
          />
        </div>
      </div>
    </div>
  );
}
