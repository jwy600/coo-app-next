'use client';

/**
 * Client Component - Ambient background orbs with CSS animations
 * Reference: legacy/index.html lines 14-18
 * Needs 'use client' for animations/transitions
 */
export function Orbs() {
  return (
    <div className="ambient">
      <span className="orb orb-a" aria-hidden="true"></span>
      <span className="orb orb-b" aria-hidden="true"></span>
      <span className="orb orb-c" aria-hidden="true"></span>
    </div>
  );
}
