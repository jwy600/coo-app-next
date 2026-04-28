'use client';

import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useStore, selectActiveThread } from '@/lib/store/useStore';
import {
  threadToMarkdown,
  generateExportFilename,
  exportMarkdown,
} from '@/lib/export';

export function ExportButton() {
  const activeThread = useStore(selectActiveThread);
  const settings = useStore((state) => state.settings);

  const hasMessages = !!activeThread && activeThread.messages.length > 0;

  const handleExport = () => {
    if (!activeThread) return;
    const markdown = threadToMarkdown(activeThread, activeThread.messages);
    const filename = generateExportFilename(activeThread.title);
    const result = exportMarkdown(markdown, filename, settings);

    if (settings.exportDestination !== 'obsidian') return;
    if (result.success) {
      toast.success('Opened in Obsidian');
    } else {
      toast.error(`Failed: ${result.error}`);
    }
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
      <span>Export Thread</span>
    </Button>
  );
}
