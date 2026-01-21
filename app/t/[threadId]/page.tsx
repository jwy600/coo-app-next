/**
 * Thread Detail Page
 *
 * Uses new AppLayout with sidebar.
 * Data is loaded via useThreadSync hook which checks store first, then Supabase.
 */

import { loadAllThreads } from '@/lib/supabase/threads';
import { AppLayout } from '@/components/layout/AppLayout';
import { ThreadContent } from './thread-content';

export const dynamic = 'force-dynamic';

interface ThreadPageProps {
  params: Promise<{
    threadId: string;
  }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;
  const threads = await loadAllThreads();

  return (
    <AppLayout threads={threads}>
      <ThreadContent threadId={threadId} />
    </AppLayout>
  );
}
