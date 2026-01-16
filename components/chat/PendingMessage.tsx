/**
 * Server-compatible PendingMessage component
 * Loading skeleton for assistant responses
 * Reference: legacy/app.js lines 597-629
 */
export function PendingMessage() {
  return (
    <div className="flex gap-3">
      <span className="text-sm font-medium text-gray-700">Coo</span>
      <div className="flex-1">
        <span className="text-sm text-gray-500 mb-2 block">Thinking…</span>
        <div className="space-y-2">
          <span className="h-4 bg-gray-200 rounded animate-pulse-slow block"></span>
          <span className="h-4 bg-gray-200 rounded animate-pulse-slow block"></span>
          <span className="h-4 bg-gray-200 rounded animate-pulse-slow block w-2/3"></span>
        </div>
      </div>
    </div>
  );
}
