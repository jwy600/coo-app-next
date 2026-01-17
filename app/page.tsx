/**
 * Landing Page (Server Component)
 *
 * Loads thread list from Supabase server-side for fast initial render.
 * Client components handle interactivity.
 *
 * Reference: legacy/index.html structure
 * Phase 8: Pages & Routing Implementation
 */

import { loadAllThreads } from '@/lib/supabase/threads';
import { Header } from '@/components/layout/Header';
import { LandingContainer } from '@/components/landing/LandingContainer';
import { Orbs } from '@/components/ui/Orbs';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export default async function LandingPage() {
  // Server-side data loading
  const threads = await loadAllThreads();

  return (
    <>
      <Orbs />
      <div className="max-w-chat mx-auto min-h-screen flex flex-col items-center justify-center px-6 pb-32">
        <div className="w-full">
          <Header mode="landing" />
          <main>
            <LandingContainer threads={threads} />
          </main>
        </div>
      </div>
    </>
  );
}
