'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExportCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (title: string) => void;
  selectedBlockCount: number;
  defaultTitle?: string;
}

export function ExportCardDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedBlockCount,
  defaultTitle = 'My Card',
}: ExportCardDialogProps) {
  const [title, setTitle] = useState(defaultTitle);

  // Reset title when dialog opens
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
    }
  }, [open, defaultTitle]);

  const handleConfirm = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle) {
      onConfirm(trimmedTitle);
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Card</DialogTitle>
          <DialogDescription>
            Export {selectedBlockCount} selected block{selectedBlockCount !== 1 ? 's' : ''} as a markdown card.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="card-title" className="text-sm font-medium">
            Card Title
          </Label>
          <Input
            id="card-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter card title"
            className="mt-2"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!title.trim()}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
