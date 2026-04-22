'use client';

import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useStore, selectActiveThread } from '@/lib/store/useStore';
import {
  blocksToCardMarkdown,
  generateCardFilename,
  exportMarkdown,
} from '@/lib/export';
import { ExportCardDialog } from './ExportCardDialog';
import { Block } from '@/types/block';

interface CardControlsProps {
  cardId: string;
  cardBlocks: Block[];
  onRemove: () => void;
}

/**
 * Controls for a card - Clear and Export buttons
 * Displayed at the top of each card
 */
export function CardControls({ cardId, cardBlocks, onRemove }: CardControlsProps) {
  const activeThread = useStore(selectActiveThread);
  const settings = useStore((state) => state.settings);
  const [dialogOpen, setDialogOpen] = useState(false);

  const blockCount = cardBlocks.length;

  /**
   * Export card blocks as markdown
   */
  const handleExportCard = (title: string) => {
    if (!activeThread) return;

    const markdown = blocksToCardMarkdown(
      title,
      activeThread.title,
      cardBlocks
    );
    const filename = generateCardFilename(title);
    const result = exportMarkdown(markdown, filename, settings);
    if (settings.exportDestination === 'obsidian') {
      if (result.success) {
        toast.success('Opened in Obsidian');
      } else {
        toast.error(`Failed: ${result.error}`);
      }
    }
    setDialogOpen(false);
  };

  return (
    <>
      <div className="card-controls flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDialogOpen(true)}
          title={`Export ${blockCount} block${blockCount !== 1 ? 's' : ''} as card`}
          aria-label="Export card"
          className="h-7 w-7"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          title="Remove card"
          aria-label="Remove card"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ExportCardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleExportCard}
        selectedBlockCount={blockCount}
      />
    </>
  );
}
