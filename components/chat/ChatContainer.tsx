"use client";

import { useEffect, useCallback } from "react";
import { MessageList } from "./MessageList";
import { Composer } from "@/components/composer/Composer";
import { DeleteThreadButton } from "./DeleteThreadButton";
import { ExportButton } from "./ExportButton";
import { useComposer } from "@/hooks/useComposer";
import { useBlockSelection } from "@/hooks/useBlockSelection";
import { useTextSelection } from "@/hooks/useTextSelection";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useShallow } from "zustand/react/shallow";
import {
  useStore,
  selectBlocksByThread,
  selectMessagesByThread,
} from "@/lib/store/useStore";

interface ChatContainerProps {
  threadId: string;
}

export function ChatContainer({ threadId }: ChatContainerProps) {
  const setMode = useStore((state) => state.setMode);
  const setActiveThread = useStore((state) => state.setActiveThread);
  const messages = useStore(useShallow(selectMessagesByThread(threadId)));
  const blocks = useStore(useShallow(selectBlocksByThread(threadId)));
  const streamingMessage = useStore((state) => state.streamingMessage);

  useEffect(() => {
    if (threadId) {
      setActiveThread(threadId);
      setMode("thread");
    }
  }, [threadId, setActiveThread, setMode]);

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

  const error = useStore((state) => state.error);

  const {
    selectedBlockId,
    selectBlock,
    clearSelection,
    hasSelection,
    cards,
    addCard,
    removeCard,
  } = useBlockSelection();

  const { captureSelection, removeSelection: removeSelectionFromHook } =
    useTextSelection(selectedBlockId);

  const handleRemoveSelection = useCallback(
    (blockId: string, index: number) => {
      if (blockId === selectedBlockId) {
        removeSelectionFromHook(index);
      }
    },
    [selectedBlockId, removeSelectionFromHook],
  );

  useKeyboardShortcuts({
    Escape: clearSelection,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!hasSelection) return;

      const target = event.target as HTMLElement;

      if (
        target.closest(".composer") ||
        target.closest(".doc-block") ||
        target.closest(".chat-toolbar") ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      clearSelection();
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [hasSelection, clearSelection]);

  useEffect(() => {
    if (!hasSelection) {
      setPrompt("");
    }
  }, [hasSelection, setPrompt]);

  const handleRewrite = useCallback(
    async (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      const selectionsText = block.selections.join(", ");

      if (!selectionsText) {
        return;
      }

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

        const rewriteBlock = useStore.getState().rewriteBlock;
        rewriteBlock(blockId, result.text);
      } catch (error) {
        console.error("Rewrite failed:", error);
      }
    },
    [blocks],
  );

  const handleUndo = useCallback((blockId: string) => {
    const undoRewrite = useStore.getState().undoRewrite;
    undoRewrite(blockId);
  }, []);

  const handleRetry = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  const handleComposerModeChange = useCallback(
    (newMode: "ask" | "edit") => {
      setComposerMode(newMode);
      if (newMode === "edit") {
        populateWithBlockText();
      } else if (newMode === "ask") {
        setPrompt("");
      }
    },
    [setComposerMode, populateWithBlockText, setPrompt],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="chat-toolbar relative flex items-center justify-center px-4 border-b border-border/50 min-h-[52px]">
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
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
