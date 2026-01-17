/**
 * Thread Detail Page
 *
 * Client-side page to avoid hydration mismatches when navigating from landing page.
 * Data is loaded via useThreadSync hook which checks store first, then Supabase.
 *
 * Reference: legacy routing hash-based system (#/t/{id})
 * Phase 8: Pages & Routing Implementation
 */

'use client';

import dynamicImport from 'next/dynamic';
import { use } from 'react';

// Disable SSR for ThreadPageClient to prevent hydration mismatches
const ThreadPageClient = dynamicImport(() => import('./page-client').then(mod => ({ default: mod.ThreadPageClient })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  ),
});

export const dynamic = 'force-dynamic'; // Always fetch fresh data

interface ThreadPageProps {
  params: Promise<{
    threadId: string;
  }>;
}

export default function ThreadPage({ params }: ThreadPageProps) {
  const { threadId } = use(params);

  return <ThreadPageClient threadId={threadId} />;
}
