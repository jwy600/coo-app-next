import Link from 'next/link';
import { Thread } from '@/types/thread';

/**
 * Server-compatible ThreadPill component
 * Displays thread title and links to thread page
 * Reference: legacy/app.js lines 398-407
 */
interface ThreadPillProps {
  thread: Thread;
}

export function ThreadPill({ thread }: ThreadPillProps) {
  const title = thread.title?.trim() || 'Untitled';

  return (
    <Link
      href={`/t/${thread.id}`}
      className="block px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-gray-900 no-underline"
    >
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-gray-500 mt-1">
        {new Date(thread.updatedAt).toLocaleDateString()}
      </div>
    </Link>
  );
}
