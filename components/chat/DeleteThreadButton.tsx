'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useStore, selectActiveThread } from '@/lib/store/useStore';

/**
 * Delete thread button with confirmation dialog
 *
 * - Shows trash icon button in toolbar
 * - Opens confirmation dialog with thread title and message count
 * - Navigates to adjacent thread or home page after deletion
 */
export function DeleteThreadButton() {
  const router = useRouter();
  const activeThread = useStore(selectActiveThread);
  const deleteThread = useStore((state) => state.deleteThread);
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const messageCount = activeThread?.messages.length ?? 0;

  const handleDelete = async () => {
    if (!activeThread) return;

    setIsDeleting(true);
    try {
      const nextThreadId = deleteThread(activeThread.id);

      // Navigate to next thread or home page
      if (nextThreadId) {
        router.push(`/t/${nextThreadId}`);
      } else {
        router.push('/');
      }
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Delete thread"
          aria-label="Delete thread"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Thread</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{activeThread?.title ?? 'this thread'}&quot;?
            {messageCount > 0 && (
              <span className="block mt-2">
                This thread contains {messageCount} message{messageCount !== 1 ? 's' : ''}.
              </span>
            )}
            <span className="block mt-2 text-destructive">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
