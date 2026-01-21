'use client';

import { ThreadPill } from './ThreadPill';
import { Thread } from '@/types/thread';

/**
 * Client Component - Display list of threads
 * Uses shadcn styling patterns
 *
 * Spacing rationale (Tailwind 4px base):
 * - py-6 (24px): Secondary section padding (less than hero's py-8)
 * - mb-4 (16px): Separation between header and list
 */
interface ThreadListProps {
  threads: Thread[];
}

export function ThreadList({ threads }: ThreadListProps) {
  if (!threads || threads.length === 0) {
    return (
      <section className="py-6" aria-label="Artifacts">
        <h2 className="text-lg font-semibold text-foreground mb-2">Artifacts</h2>
        <p className="text-sm text-muted-foreground">
          No threads yet. Start a conversation below.
        </p>
      </section>
    );
  }

  return (
    <section className="py-6" aria-label="Artifacts">
      <h2 className="text-lg font-semibold text-foreground mb-4">Artifacts</h2>
      <div className="space-y-0">
        {threads.map((thread) => (
          <ThreadPill key={thread.id} thread={thread} />
        ))}
      </div>
    </section>
  );
}
