/**
 * Thread Detail Page
 *
 * Client-side page to avoid hydration mismatches when navigating from landing page.
 * Data is loaded via useThreadSync hook which checks store first, then Supabase.
 *
 * Reference: legacy routing hash-based system (#/t/{id})
 * Phase 8: Pages & Routing Implementation
 */

import { ThreadPageClient } from './page-client';

export const dynamic = 'force-dynamic'; // Always fetch fresh data

interface ThreadPageProps {
  params: Promise<{
    threadId: string;
  }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = await params;

  return <ThreadPageClient threadId={threadId} />;
}
