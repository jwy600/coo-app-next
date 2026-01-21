'use client';

import { Spinner } from '@/components/ui/spinner';

export function TypingIndicator() {
  return (
    <div className="assistant-message">
      <span className="assistant-label">Coo</span>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner className="h-4 w-4" />
        <span className="text-sm">Coo is thinking...</span>
      </div>
    </div>
  );
}
