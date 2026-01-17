/**
 * PendingMessage component
 * Loading skeleton for assistant responses
 * Reference: legacy/app.js lines 597-629
 */

'use client';

export function PendingMessage() {
  return (
    <div className="assistant-message">
      <span className="assistant-label">Coo</span>
      <div className="assistant-placeholder">
        <span className="assistant-thinking">Thinking…</span>
        <div className="assistant-skeleton">
          <span className="assistant-skeleton-line"></span>
          <span className="assistant-skeleton-line"></span>
          <span className="assistant-skeleton-line is-short"></span>
        </div>
      </div>
    </div>
  );
}
