/**
 * KaTeX wrapper utilities for React
 * Provides hooks and components for math rendering
 */

'use client';

import { useEffect, useRef } from 'react';
import katex, { KatexOptions as KatexLibOptions } from 'katex';

export type KatexOptions = KatexLibOptions;

/**
 * Hook to typeset math expressions after component renders
 * Usage: const mathRef = useMathTypesetting([dependencies])
 *
 * Automatically finds all elements with [data-tex] attribute
 * and renders them with KaTeX
 */
export function useMathTypesetting(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const mathNodes = containerRef.current.querySelectorAll('[data-tex]');

    mathNodes.forEach((node) => {
      const tex = node.getAttribute('data-tex');
      if (!tex) return;

      const isBlock = node.classList.contains('math-block') ||
                      node.classList.contains('doc-math-block');

      try {
        katex.render(tex, node as HTMLElement, {
          displayMode: isBlock,
          throwOnError: false,
          errorColor: '#cc0000',
        });
      } catch (error) {
        console.warn('KaTeX render error:', error);
        // Fallback: show raw TeX
        node.textContent = tex;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is passed dynamically by the caller
  }, deps);

  return containerRef;
}

/**
 * Render a single math expression to HTML string
 * Useful for SSR or when you need HTML output
 */
export function renderMathToString(
  tex: string,
  displayMode = false,
  options?: KatexOptions
): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      ...options,
    });
  } catch (error) {
    console.warn('KaTeX renderToString error:', error);
    return tex; // Fallback to raw TeX
  }
}

/**
 * Render math expression directly to a DOM element
 * Synchronous, for when you already have the DOM node
 */
export function renderMath(
  element: HTMLElement,
  tex: string,
  displayMode = false,
  options?: KatexOptions
): void {
  try {
    katex.render(tex, element, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      ...options,
    });
  } catch (error) {
    console.warn('KaTeX render error:', error);
    element.textContent = tex; // Fallback to raw TeX
  }
}

/**
 * Check if a TeX expression is valid without rendering
 */
export function isValidTex(tex: string): boolean {
  try {
    katex.renderToString(tex, { throwOnError: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get KaTeX version
 */
export function getKatexVersion(): string {
  // KaTeX doesn't expose version in runtime, return known version
  return '0.16.27';
}
