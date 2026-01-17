/**
 * Logo Component - Navigates to landing page
 *
 * Reference: legacy/index.html line 22, legacy/app.js lines 1174-1180
 * Phase 8: Updated with Next.js Link for proper navigation
 */

'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store/useStore';

export function Logo() {
  const setMode = useStore((state) => state.setMode);
  const clearSelectedBlock = useStore((state) => state.clearSelectedBlock);

  const handleClick = () => {
    // Clear any selected blocks
    clearSelectedBlock();
    // Set mode to landing (will happen on navigation, but doing it early for smooth UX)
    setMode('landing');
  };

  return (
    <Link
      href="/"
      onClick={handleClick}
      className="font-semibold text-base text-black cursor-pointer no-underline hover:opacity-80 transition-opacity"
      aria-label="Coo home"
    >
      coo
    </Link>
  );
}
