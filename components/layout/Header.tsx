'use client';

import { Logo } from './Logo';
import { Badge } from '@/components/ui/badge';

/**
 * Client Component - Sticky header with mode-dependent display
 * Reference: legacy/index.html lines 21-35
 * Needs 'use client' for potential future interactivity
 * Phase 8: Removed onLogoClick since Logo handles navigation directly
 */
interface HeaderProps {
  mode: 'landing' | 'thread';
}

export function Header({ mode }: HeaderProps) {
  const showDetails = mode === 'landing';
  const isSticky = mode === 'thread';

  return (
    <header
      className={`bg-white border-b border-border px-6 py-4 ${
        isSticky ? 'sticky top-0 z-10' : ''
      }`}
    >
      <Logo />

      {showDetails && (
        <div className="mt-3">
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
        </div>
      )}
    </header>
  );
}
