/**
 * Tests for markdown parsing utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseInlineMarkdown,
  hasMath,
  extractMathExpressions,
  stripMarkdown,
  type MarkdownSegment,
} from '@/lib/rendering/markdown';

describe('parseInlineMarkdown', () => {
  it('should return empty array for empty text', () => {
    expect(parseInlineMarkdown('')).toEqual([]);
  });

  it('should parse plain text without formatting', () => {
    const result = parseInlineMarkdown('Hello world');
    expect(result).toEqual([
      { type: 'text', content: 'Hello world' },
    ]);
  });

  it('should parse bold text', () => {
    const result = parseInlineMarkdown('This is **bold** text');
    expect(result).toEqual([
      { type: 'text', content: 'This is ' },
      { type: 'bold', content: 'bold' },
      { type: 'text', content: ' text' },
    ]);
  });

  it('should parse multiple bold segments', () => {
    const result = parseInlineMarkdown('**First** and **second** bold');
    expect(result).toEqual([
      { type: 'bold', content: 'First' },
      { type: 'text', content: ' and ' },
      { type: 'bold', content: 'second' },
      { type: 'text', content: ' bold' },
    ]);
  });

  it('should parse inline math', () => {
    const result = parseInlineMarkdown('The formula is \\(E = mc^2\\).');
    expect(result).toEqual([
      { type: 'text', content: 'The formula is ' },
      { type: 'inline-math', content: 'E = mc^2' },
      { type: 'text', content: '.' },
    ]);
  });

  it('should parse block math', () => {
    const result = parseInlineMarkdown('Equation: \\[x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\]');
    expect(result).toEqual([
      { type: 'text', content: 'Equation: ' },
      { type: 'block-math', content: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' },
    ]);
  });

  it('should preserve line breaks', () => {
    const result = parseInlineMarkdown('Line 1\nLine 2\nLine 3');
    expect(result).toEqual([
      { type: 'text', content: 'Line 1' },
      { type: 'break', content: '' },
      { type: 'text', content: 'Line 2' },
      { type: 'break', content: '' },
      { type: 'text', content: 'Line 3' },
    ]);
  });

  it('should parse bold text with line breaks', () => {
    const result = parseInlineMarkdown('**Bold** text\nNew line');
    expect(result).toEqual([
      { type: 'bold', content: 'Bold' },
      { type: 'text', content: ' text' },
      { type: 'break', content: '' },
      { type: 'text', content: 'New line' },
    ]);
  });

  it('should parse mixed content (bold + math)', () => {
    const result = parseInlineMarkdown('**Einstein** said \\(E = mc^2\\)');
    expect(result).toEqual([
      { type: 'bold', content: 'Einstein' },
      { type: 'text', content: ' said ' },
      { type: 'inline-math', content: 'E = mc^2' },
    ]);
  });

  it('should parse complex mixed content', () => {
    const result = parseInlineMarkdown('**Bold**, \\(x^2\\), more text\nNew line');
    expect(result).toEqual([
      { type: 'bold', content: 'Bold' },
      { type: 'text', content: ', ' },
      { type: 'inline-math', content: 'x^2' },
      { type: 'text', content: ', more text' },
      { type: 'break', content: '' },
      { type: 'text', content: 'New line' },
    ]);
  });

  it('should handle consecutive bold', () => {
    const result = parseInlineMarkdown('**First****Second**');
    expect(result).toEqual([
      { type: 'bold', content: 'First' },
      { type: 'bold', content: 'Second' },
    ]);
  });

  it('should handle math at start and end', () => {
    const result = parseInlineMarkdown('\\(a\\) text \\(b\\)');
    expect(result).toEqual([
      { type: 'inline-math', content: 'a' },
      { type: 'text', content: ' text ' },
      { type: 'inline-math', content: 'b' },
    ]);
  });

  it('should handle empty bold markers gracefully', () => {
    const result = parseInlineMarkdown('Text with ** incomplete bold');
    expect(result).toEqual([
      { type: 'text', content: 'Text with ** incomplete bold' },
    ]);
  });

  it('should trim whitespace in math expressions', () => {
    const result = parseInlineMarkdown('\\(  x + y  \\)');
    expect(result).toEqual([
      { type: 'inline-math', content: 'x + y' },
    ]);
  });
});

describe('hasMath', () => {
  it('should detect inline math', () => {
    expect(hasMath('\\(x^2\\)')).toBe(true);
  });

  it('should detect block math', () => {
    expect(hasMath('\\[x^2\\]')).toBe(true);
  });

  it('should return false for plain text', () => {
    expect(hasMath('No math here')).toBe(false);
  });

  it('should detect math in mixed content', () => {
    expect(hasMath('Text with \\(math\\) inside')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(hasMath('')).toBe(false);
  });
});

describe('extractMathExpressions', () => {
  it('should extract inline math', () => {
    const result = extractMathExpressions('Text \\(x^2\\) more');
    expect(result).toEqual([
      {
        type: 'inline',
        expression: 'x^2',
        position: 5,
        length: 7,
      },
    ]);
  });

  it('should extract block math', () => {
    const result = extractMathExpressions('Equation: \\[a + b\\]');
    expect(result).toEqual([
      {
        type: 'block',
        expression: 'a + b',
        position: 10,
        length: 9,
      },
    ]);
  });

  it('should extract multiple expressions', () => {
    const result = extractMathExpressions('\\(a\\) and \\[b\\]');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      type: 'inline',
      expression: 'a',
    });
    expect(result[1]).toMatchObject({
      type: 'block',
      expression: 'b',
    });
  });

  it('should return empty array for no math', () => {
    expect(extractMathExpressions('No math')).toEqual([]);
  });

  it('should trim expressions', () => {
    const result = extractMathExpressions('\\(  x  \\)');
    expect(result[0].expression).toBe('x');
  });
});

describe('stripMarkdown', () => {
  it('should remove bold formatting', () => {
    expect(stripMarkdown('**bold** text')).toBe('bold text');
  });

  it('should remove inline math delimiters', () => {
    expect(stripMarkdown('Formula: \\(x^2\\)')).toBe('Formula: x^2');
  });

  it('should remove block math delimiters', () => {
    expect(stripMarkdown('\\[x^2\\]')).toBe('x^2');
  });

  it('should replace line breaks with spaces', () => {
    expect(stripMarkdown('Line 1\nLine 2')).toBe('Line 1 Line 2');
  });

  it('should handle mixed formatting', () => {
    expect(stripMarkdown('**Bold** \\(x^2\\)\nNew line')).toBe('Bold x^2 New line');
  });

  it('should return empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });
});
