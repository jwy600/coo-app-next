'use client';

import { useState, useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShallow } from 'zustand/react/shallow';
import {
  useStore,
  selectActiveThread,
  selectActiveThreadBlocks,
  selectCards,
  selectAllCardBlocks,
} from '@/lib/store/useStore';
import {
  threadToMarkdown,
  generateExportFilename,
  blocksToCardMarkdown,
  generateCardFilename,
  downloadMarkdown,
} from '@/lib/export';
import { ExportCardDialog } from './ExportCardDialog';

/**
 * Export button for downloading thread or all cards as markdown
 *
 * - No cards: "Export" → exports entire thread
 * - Has cards: "Export All Cards" → opens dialog, exports all cards combined
 */
export function ExportButton() {
  const activeThread = useStore(selectActiveThread);
  const allBlocks = useStore(useShallow(selectActiveThreadBlocks));
  const cards = useStore(selectCards);
  const allCardBlocks = useStore(useShallow(selectAllCardBlocks));

  const [dialogOpen, setDialogOpen] = useState(false);

  const hasMessages = activeThread && activeThread.messages.length > 0;
  const hasCards = cards.length > 0;

  /**
   * Export entire thread as markdown
   */
  const handleExportThread = () => {
    if (!activeThread) return;

    const markdown = threadToMarkdown(
      activeThread,
      activeThread.messages,
      allBlocks
    );
    const filename = generateExportFilename(activeThread.title);
    downloadMarkdown(markdown, filename);
  };

  /**
   * Export all cards as a combined markdown file
   */
  const handleExportAllCards = (title: string) => {
    if (!activeThread) return;

    const markdown = blocksToCardMarkdown(
      title,
      activeThread.title,
      allCardBlocks
    );
    const filename = generateCardFilename(title);
    downloadMarkdown(markdown, filename);
  };

  /**
   * Handle button click - either export thread or open card dialog
   */
  const handleClick = () => {
    if (hasCards) {
      setDialogOpen(true);
    } else {
      handleExportThread();
    }
  };

  // Block count for display
  const exportBlockCount = allCardBlocks.length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={!hasMessages}
        title={
          hasCards
            ? `Export ${exportBlockCount} block${exportBlockCount !== 1 ? 's' : ''} from ${cards.length} card${cards.length !== 1 ? 's' : ''}`
            : hasMessages
              ? 'Export thread as markdown'
              : 'No messages to export'
        }
        aria-label={hasCards ? 'Export all cards' : 'Export thread'}
        className="gap-2"
      >
        {hasCards ? (
          <>
            <FileText className="h-4 w-4" />
            <span>Export All Cards</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Export</span>
          </>
        )}
      </Button>

      <ExportCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleExportAllCards}
        selectedBlockCount={exportBlockCount}
      />
    </>
  );
}
