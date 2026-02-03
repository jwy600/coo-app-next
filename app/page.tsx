/**
 * Landing Page (Server Component)
 *
 * Loads thread list from Supabase server-side for fast initial render.
 * Uses new AppLayout with sidebar.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DbThread } from '@/lib/supabase/types';
import { Thread } from '@/types/thread';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingContent } from './landing-content';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
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
      <LandingContent />
    </AppLayout>
  );
}
