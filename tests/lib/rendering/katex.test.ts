/**
 * Tests for KaTeX rendering utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderMathToString, isValidTex, getKatexVersion } from '@/lib/rendering/katex';

describe('renderMathToString', () => {
  it('should render valid inline math', () => {
    const result = renderMathToString('x^2', false);
    expect(result).toContain('x');
    expect(result).toContain('katex'); // KaTeX adds class names
  });

  it('should render valid display math', () => {
    const result = renderMathToString('x^2', true);
    expect(result).toContain('x');
    expect(result).toContain('katex');
  });

  it('should handle simple expressions', () => {
    const result = renderMathToString('E = mc^2', false);
    expect(result).toContain('E');
    expect(result).toContain('mc');
  });

  it('should handle fractions', () => {
    const result = renderMathToString('\\frac{a}{b}', false);
    expect(result).toContain('frac');
  });

  it('should handle Greek letters', () => {
    const result = renderMathToString('\\alpha + \\beta', false);
    expect(result).toContain('α'); // KaTeX converts to Unicode
  });

  it('should return raw TeX on error', () => {
    const result = renderMathToString('\\invalid{command}', false);
    // KaTeX with throwOnError: false should still render something
    expect(result).toBeTruthy();
  });

  it('should handle empty string', () => {
    const result = renderMathToString('', false);
    expect(result).toBeDefined();
  });

  it('should respect displayMode option', () => {
    const inline = renderMathToString('x', false);
    const display = renderMathToString('x', true);
    // Display mode adds different classes
    expect(display).not.toBe(inline);
  });
});

describe('isValidTex', () => {
  it('should return true for valid expressions', () => {
    expect(isValidTex('x^2')).toBe(true);
    expect(isValidTex('E = mc^2')).toBe(true);
    expect(isValidTex('\\frac{a}{b}')).toBe(true);
  });

  it('should return false for invalid expressions', () => {
    expect(isValidTex('\\invalid')).toBe(false);
  });

  it('should handle empty string', () => {
    expect(isValidTex('')).toBe(true); // Empty is technically valid
  });

  it('should validate complex expressions', () => {
    expect(isValidTex('\\sum_{i=1}^{n} x_i')).toBe(true);
  });

  it('should validate fractions', () => {
    expect(isValidTex('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}')).toBe(true);
  });
});

describe('getKatexVersion', () => {
  it('should return a version string', () => {
    const version = getKatexVersion();
    expect(version).toBeTruthy();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/\d+\.\d+\.\d+/);
  });
});

describe('KaTeX edge cases', () => {
  it('should handle multiline expressions', () => {
    const tex = 'x = 1\\\\ y = 2';
    const result = renderMathToString(tex, true);
    expect(result).toBeTruthy();
  });

  it('should handle matrices', () => {
    const tex = '\\begin{matrix} a & b \\\\ c & d \\end{matrix}';
    const result = renderMathToString(tex, false);
    expect(result).toBeTruthy();
  });

  it('should handle subscripts and superscripts', () => {
    const tex = 'x_1^2 + x_2^2';
    const result = renderMathToString(tex, false);
    expect(result).toContain('x');
  });

  it('should handle square roots', () => {
    const tex = '\\sqrt{x^2 + y^2}';
    const result = renderMathToString(tex, false);
    expect(result).toBeTruthy();
  });

  it('should handle summation notation', () => {
    const tex = '\\sum_{i=1}^{n} i';
    const result = renderMathToString(tex, false);
    expect(result).toBeTruthy();
  });

  it('should handle integral notation', () => {
    const tex = '\\int_0^1 x^2 dx';
    const result = renderMathToString(tex, false);
    expect(result).toBeTruthy();
  });
});
