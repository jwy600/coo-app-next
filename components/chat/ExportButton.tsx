'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useShallow } from 'zustand/react/shallow';
import {
  useStore,
  selectActiveThread,
  selectActiveThreadBlocks,
} from '@/lib/store/useStore';
import {
  threadToMarkdown,
  generateExportFilename,
  downloadMarkdown,
} from '@/lib/export';

/**
 * Export button for downloading the current thread as markdown
 */
export function ExportButton() {
  const activeThread = useStore(selectActiveThread);
  const blocks = useStore(useShallow(selectActiveThreadBlocks));

  const hasMessages = activeThread && activeThread.messages.length > 0;

  const handleExport = () => {
    if (!activeThread) return;

    const markdown = threadToMarkdown(
      activeThread,
      activeThread.messages,
      blocks
    );
    const filename = generateExportFilename(activeThread.title);
    downloadMarkdown(markdown, filename);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={!hasMessages}
      title={hasMessages ? 'Export thread as markdown' : 'No messages to export'}
      aria-label="Export thread"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      <span>Export</span>
    </Button>
  );
}
