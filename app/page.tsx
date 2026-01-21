/**
 * Landing Page (Server Component)
 *
 * Loads thread list from Supabase server-side for fast initial render.
 * Uses new AppLayout with sidebar.
 */

import { loadAllThreads } from '@/lib/supabase/threads';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingContent } from './landing-content';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const threads = await loadAllThreads();

  return (
    <AppLayout threads={threads}>
      <LandingContent />
    </AppLayout>
  );
}
