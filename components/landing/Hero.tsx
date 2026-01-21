import { Badge } from '@/components/ui/badge';

/**
 * Server Component - Static hero section for landing page
 * Uses shadcn styling patterns
 *
 * Spacing rationale (Tailwind 4px base):
 * - py-8 (32px): Generous vertical padding for hero prominence
 * - mb-2 (8px): Tight coupling between h1 and description (same concept)
 * - mb-6 (24px): Clear separation between text block and badges (different concepts)
 * - gap-2 (8px): Standard inline element spacing for badges
 */
interface HeroProps {
  mode: 'landing' | 'chat';
}

export function Hero({ mode }: HeroProps) {
  const showDetails = mode === 'landing';

  return (
    <div className="py-8">
      {showDetails && (
        <>
          <div className="mb-6">
            <h1 className="text-4xl font-semibold text-foreground mb-2">
              Edit AI answers in place.
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground max-w-xl">
              coo turns long responses into clean paragraphs you can translate,
              expand, and simplify—right where they appear.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">In-context edits</Badge>
            <Badge variant="secondary">Notion-inspired blocks</Badge>
          </div>
        </>
      )}
    </div>
  );
}
