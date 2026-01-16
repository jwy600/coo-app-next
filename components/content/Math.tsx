/**
 * Math rendering component using KaTeX
 * Handles both inline and block (display) math
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { renderMath } from '@/lib/rendering/katex';

export interface MathProps {
  tex: string;
  display?: boolean; // true for block math, false for inline
  className?: string;
}

/**
 * Math component that renders LaTeX expressions using KaTeX
 *
 * Usage:
 *   <Math tex="E = mc^2" />                    // Inline
 *   <Math tex="E = mc^2" display={true} />    // Block/Display
 */
export function Math({ tex, display = false, className = '' }: MathProps) {
  const mathRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (mathRef.current && tex) {
      renderMath(mathRef.current, tex, display);
    }
  }, [tex, display]);

  const baseClass = display ? 'doc-math-block' : 'doc-math-inline';
  const combinedClass = className ? `${baseClass} ${className}` : baseClass;

  // Use display:block for display math, inline for inline math
  const Element = display ? 'div' : 'span';

  return (
    <Element
      ref={mathRef as any}
      className={combinedClass}
      data-tex={tex}
    >
      {tex}
    </Element>
  );
}

/**
 * Inline math component (convenience wrapper)
 */
export function InlineMath({ tex, className }: Omit<MathProps, 'display'>) {
  return <Math tex={tex} display={false} className={className} />;
}

/**
 * Block math component (convenience wrapper)
 */
export function BlockMath({ tex, className }: Omit<MathProps, 'display'>) {
  return <Math tex={tex} display={true} className={className} />;
}
