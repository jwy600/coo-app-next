/**
 * Thread Detail Page
 *
 * Uses new AppLayout with sidebar.
 * Data is loaded via useThreadSync hook which checks store first, then Supabase.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DbThread } from '@/lib/supabase/types';
import { Thread } from '@/types/thread';
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

  let threads: Thread[] = [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('threads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      threads = (data as DbThread[]).map((dbThread) => ({
        id: dbThread.id,
        title: dbThread.title,
        createdAt: new Date(dbThread.created_at).getTime(),
        updatedAt: new Date(dbThread.updated_at).getTime(),
        messages: [],
      }));
    }
  } catch {
    // Supabase not configured or other error - continue with empty threads
  }

  return (
    <AppLayout threads={threads}>
      <ThreadContent threadId={threadId} />
    </AppLayout>
  );
}
