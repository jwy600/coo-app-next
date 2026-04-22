/**
 * KaTeX wrapper utilities for math rendering
 */

import katex, { KatexOptions as KatexLibOptions } from 'katex';

export type KatexOptions = KatexLibOptions;

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
      trust: false,
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
      trust: false,
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
