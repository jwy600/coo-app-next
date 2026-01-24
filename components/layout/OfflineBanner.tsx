'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * Warning banner shown when Supabase is not configured
 * Informs users that data is not being persisted
 */
export function OfflineBanner() {
  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      role="alert"
    >
      <AlertTriangle className="h-4 w-4" />
      <span>Offline mode — data is not saved. Export to keep your work.</span>
    </div>
  );
}
