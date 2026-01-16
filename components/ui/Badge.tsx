import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Server Component - Static badge display
 * Reference: .badge class from legacy CSS
 */
export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={`px-2 py-1 text-xs bg-gray-100 rounded-full text-gray-700 ${className}`}
    >
      {children}
    </span>
  );
}
