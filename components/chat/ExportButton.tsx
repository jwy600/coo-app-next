'use client';

import { useState, useMemo } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShallow } from 'zustand/react/shallow';
import {
  useStore,
  selectActiveThread,
  selectActiveThreadBlocks,
  selectBlocksForExport,
} from '@/lib/store/useStore';
import {
  threadToMarkdown,
  generateExportFilename,
  blocksToCardMarkdown,
  generateCardFilename,
  downloadMarkdown,
} from '@/lib/export';
import { ExportCardDialog } from './ExportCardDialog';
import { getSectionBlockIds } from '@/lib/state';

/**
 * Export button for downloading thread or selected blocks as markdown
 *
 * - No blocks selected: "Export" → exports entire thread
 * - Section mode: "Export Card" → exports section content (excluding heading)
 * - Blocks selected: "Export Card" → opens dialog for card title
 */
export function ExportButton() {
  const activeThread = useStore(selectActiveThread);
  const allBlocks = useStore(useShallow(selectActiveThreadBlocks));
  const blocksForExport = useStore(useShallow(selectBlocksForExport));
  const selectedBlockIds = useStore((state) => state.selectedBlockIds);
  const sectionHeadingId = useStore((state) => state.sectionHeadingId);
  const blocks = useStore((state) => state.blocks);

  const [dialogOpen, setDialogOpen] = useState(false);

  const isSelectionOutsideSection = useStore((state) => state.isSelectionOutsideSection);

  const hasMessages = activeThread && activeThread.messages.length > 0;
  const isInSectionMode = sectionHeadingId !== null;
  const hasSelection = selectedBlockIds.length > 0 || isInSectionMode;

  // Get all section blocks (including heading) when in section mode
  const sectionBlockIds = useMemo(() => {
    if (!sectionHeadingId) return [];
    return getSectionBlockIds(blocks, sectionHeadingId);
  }, [sectionHeadingId, blocks]);

  // Compute blocks to export based on mode
  const computedExportBlocks = useMemo(() => {
    if (!isInSectionMode) {
      // Normal mode - use selected blocks
      return blocksForExport;
    }

    if (isSelectionOutsideSection && selectedBlockIds.length > 0) {
      // Section mode + outside selection - combine and preserve document order
      const outsideBlockIds = selectedBlockIds.filter((id) => !sectionBlockIds.includes(id));
      const allExportIds = new Set([...sectionBlockIds, ...outsideBlockIds]);
      return blocks.filter((b) => allExportIds.has(b.id));
    }

    // Section mode only - return section blocks in document order
    return blocks.filter((b) => sectionBlockIds.includes(b.id));
  }, [isInSectionMode, sectionBlockIds, blocks, isSelectionOutsideSection, selectedBlockIds, blocksForExport]);

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
      computedExportBlocks
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

  // Block count for display
  const exportBlockCount = computedExportBlocks.length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={!hasMessages}
        title={
          hasSelection
            ? `Export ${exportBlockCount} block${exportBlockCount !== 1 ? 's' : ''} as card`
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
        selectedBlockCount={exportBlockCount}
      />
    </>
  );
}
