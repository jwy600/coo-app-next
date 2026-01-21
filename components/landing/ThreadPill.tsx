import Link from 'next/link';
import { Thread } from '@/types/thread';

/**
 * Server-compatible ThreadPill component
 * Compact row-style list item for thread navigation
 *
 * Spacing: py-2 (8px) vertical, inline layout with date on the right
 */
interface ThreadPillProps {
  thread: Thread;
}

export function ThreadPill({ thread }: ThreadPillProps) {
  const title = thread.title?.trim() || 'Untitled';

  return (
    <Link
      href={`/t/${thread.id}`}
      className="flex items-center justify-between gap-4 py-2 px-3 -mx-3 rounded-md text-sm text-foreground hover:bg-muted/50 transition-colors no-underline"
    >
      <span className="truncate font-medium">{title}</span>
      <span className="text-xs text-muted-foreground shrink-0">
        {new Date(thread.updatedAt).toLocaleDateString()}
      </span>
    </Link>
  );
}
