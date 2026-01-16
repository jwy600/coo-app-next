/**
 * Logo Component - Navigates to landing page
 *
 * Reference: legacy/index.html line 22
 * Phase 8: Updated with Next.js Link for proper navigation
 */

import Link from 'next/link';

export function Logo() {
  return (
    <Link
      href="/"
      className="font-semibold text-base text-black cursor-pointer no-underline hover:opacity-80 transition-opacity"
      aria-label="Coo home"
    >
      coo
    </Link>
  );
}
