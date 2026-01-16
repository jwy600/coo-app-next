'use client';

import { ThreadPill } from './ThreadPill';
import { Thread } from '@/types/thread';

/**
 * Client Component - Display list of threads
 * Reference: legacy/index.html lines 38-41
 * Needs 'use client' for potential Zustand store access and updates
 */
interface ThreadListProps {
  threads: Thread[];
}

export function ThreadList({ threads }: ThreadListProps) {
  if (!threads || threads.length === 0) {
    return (
      <section className="px-6 py-4" aria-label="Artifacts">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Artifacts</h2>
        <p className="text-sm text-gray-500">No threads yet. Start a conversation below.</p>
      </section>
    );
  }

  return (
    <section className="px-6 py-4" aria-label="Artifacts">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Artifacts</h2>
      <div className="space-y-2">
        {threads.map((thread) => (
          <ThreadPill key={thread.id} thread={thread} />
        ))}
      </div>
    </section>
  );
}
