'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShallow } from 'zustand/react/shallow';
import {
  useStore,
  selectActiveThread,
  selectActiveThreadBlocks,
  selectSelectedBlocks,
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
 * Export button for downloading thread or selected blocks as markdown
 *
 * - No blocks selected: "Export" → exports entire thread
 * - Blocks selected: "Export Card" → opens dialog for card title
 */
export function ExportButton() {
  const activeThread = useStore(selectActiveThread);
  const allBlocks = useStore(useShallow(selectActiveThreadBlocks));
  const selectedBlocks = useStore(useShallow(selectSelectedBlocks));
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);

  const [dialogOpen, setDialogOpen] = useState(false);

  const hasMessages = activeThread && activeThread.messages.length > 0;
  const hasSelection = selectedBlockIds.length > 0;

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
   * Export selected blocks as a card
   */
  const handleExportCard = (title: string) => {
    if (!activeThread) return;

    const markdown = blocksToCardMarkdown(
      title,
      activeThread.title, // original question
      selectedBlocks
    );
    const filename = generateCardFilename(title);
    downloadMarkdown(markdown, filename);
  };

  /**
   * Handle button click - either export thread or open card dialog
   */
  const handleClick = () => {
    if (hasSelection) {
      setDialogOpen(true);
    } else {
      handleExportThread();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={!hasMessages}
        title={
          hasSelection
            ? `Export ${selectedBlockIds.length} selected block${selectedBlockIds.length !== 1 ? 's' : ''} as card`
            : hasMessages
              ? 'Export thread as markdown'
              : 'No messages to export'
        }
        aria-label={hasSelection ? 'Export card' : 'Export thread'}
        className="gap-2"
      >
        {hasSelection ? (
          <>
            <FileText className="h-4 w-4" />
            <span>Export Card</span>
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
        onConfirm={handleExportCard}
        selectedBlockCount={selectedBlockIds.length}
      />
    </>
  );
}
