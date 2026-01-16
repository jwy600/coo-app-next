/**
 * MessageSkeleton Component
 *
 * Skeleton loader for messages while loading thread data.
 */
export function MessageSkeleton() {
  return (
    <div className="animate-pulse space-y-4 py-8">
      {/* User message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-[70%] bg-slate-200 rounded-2xl px-6 py-4 h-16 w-64" />
      </div>

      {/* Assistant message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-[85%] space-y-3">
          <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ThreadListSkeleton Component
 *
 * Skeleton loader for thread list on landing page.
 */
export function ThreadListSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-12 bg-slate-200 rounded-full w-full"
          style={{ maxWidth: `${Math.random() * 30 + 40}%` }}
        />
      ))}
    </div>
  );
}
