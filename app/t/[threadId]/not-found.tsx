/**
 * 404 Page for Invalid Thread IDs
 *
 * Shown when a thread doesn't exist in the database.
 * Phase 8: Pages & Routing Implementation
 */

import Link from 'next/link';

export default function ThreadNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-semibold text-black mb-3">Thread not found</h1>
        <p className="text-base text-gray-600 mb-6">
          The thread you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
