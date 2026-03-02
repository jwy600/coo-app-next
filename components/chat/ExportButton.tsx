'use client';

import { useState } from 'react';
import { Download, ChevronDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
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
  exportMarkdown,
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
  const cards = useStore(useShallow(selectCards));
  const allCardBlocks = useStore(useShallow(selectAllCardBlocks));
  const settings = useStore((state) => state.settings);

  const [dialogOpen, setDialogOpen] = useState(false);

  const hasMessages = activeThread && activeThread.messages.length > 0;
  const hasCards = cards.length > 0;

  /**
   * Handle the result of an export (show toast for Obsidian)
   */
  const handleExportResult = (result: { success: boolean; error?: string }) => {
    if (settings.exportDestination !== 'obsidian') return;
    if (result.success) {
      toast.success('Saved to Obsidian vault');
    } else {
      toast.error(`Failed: ${result.error}`);
    }
  };

  /**
   * Export entire thread as markdown
   */
  const handleExportThread = async () => {
    if (!activeThread) return;

    const markdown = threadToMarkdown(
      activeThread,
      activeThread.messages,
      allBlocks
    );
    const filename = generateExportFilename(activeThread.title);
    const result = await exportMarkdown(markdown, filename, settings);
    handleExportResult(result);
  };

  /**
   * Export all cards as a combined markdown file
   */
  const handleExportAllCards = async (title: string) => {
    if (!activeThread) return;

    const markdown = blocksToCardMarkdown(
      title,
      activeThread.title,
      allCardBlocks
    );
    const filename = generateCardFilename(title);
    const result = await exportMarkdown(markdown, filename, settings);
    handleExportResult(result);
  };

  // Block count for display
  const exportBlockCount = allCardBlocks.length;

  // When no cards exist, show simple "Export Thread" button
  if (!hasCards) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportThread}
        disabled={!hasMessages}
        title={hasMessages ? 'Export thread as markdown' : 'No messages to export'}
        aria-label="Export thread"
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        <span>Export Thread</span>
      </Button>
    );
  }

  // When cards exist, show split button with dropdown
  return (
    <>
      <div className="flex">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          disabled={!hasMessages}
          title={`Export ${exportBlockCount} block${exportBlockCount !== 1 ? 's' : ''} from ${cards.length} card${cards.length !== 1 ? 's' : ''}`}
          aria-label="Export all cards"
          className="gap-2 rounded-r-none"
        >
          <Download className="h-4 w-4" />
          <span>Export Cards</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMessages}
              className="rounded-l-none border-l-0 px-2"
              aria-label="More export options"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportThread}>
              <FileText className="h-4 w-4 mr-2" />
              Export Thread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ExportCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleExportAllCards}
        selectedBlockCount={exportBlockCount}
      />
    </>
  );
}
