import { Badge } from '@/components/ui/Badge';

/**
 * Server Component - Static hero section for landing page
 * Reference: legacy/index.html lines 24-35
 * No 'use client' needed - static content
 */
interface HeroProps {
  mode: 'landing' | 'chat';
}

export function Hero({ mode }: HeroProps) {
  const showDetails = mode === 'landing';

  return (
    <div className="px-6 py-4">
      {showDetails && (
        <>
          <div className="mb-3">
            <h1 className="text-4xl font-semibold text-black mb-3">
              Edit AI answers in place.
            </h1>
            <p className="text-base leading-relaxed text-gray-600 max-w-xl">
              coo turns long responses into clean paragraphs you can translate,
              expand, and simplify—right where they appear.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge>In-context edits</Badge>
            <Badge>Notion-inspired blocks</Badge>
          </div>
        </>
      )}
    </div>
  );
}
