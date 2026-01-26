/**
 * Tests for block type detection utilities
 */

import { describe, it, expect } from 'vitest';
import {
  isListText,
  isCodeBlock,
  hasHeading,
  getCodeLanguage,
  extractCodeContent,
  detectBlockType,
  parseListItems,
  parseHeading,
  getHeadingTag,
  isBlankLine,
  normalizeIndentation,
  isOrderedListItem,
  isUnorderedListItem,
  countBlockTypes,
} from '@/lib/rendering/blocks';

describe('isListText', () => {
  it('should detect bulleted lists', () => {
    expect(isListText('- Item 1')).toBe(true);
    expect(isListText('* Item 1')).toBe(true);
    expect(isListText('+ Item 1')).toBe(true);
  });

  it('should detect numbered lists', () => {
    expect(isListText('1. Item 1')).toBe(true);
    expect(isListText('10. Item 10')).toBe(true);
  });

  it('should detect multi-line lists', () => {
    expect(isListText('- Item 1\n- Item 2')).toBe(true);
    expect(isListText('1. First\n2. Second')).toBe(true);
  });

  it('should return false for non-lists', () => {
    expect(isListText('Regular text')).toBe(false);
    expect(isListText('Not a list - with dash')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isListText('')).toBe(false);
  });

  it('should handle indented lists', () => {
    expect(isListText('  - Indented item')).toBe(true);
  });
});

describe('isCodeBlock', () => {
  it('should detect code blocks with backticks', () => {
    expect(isCodeBlock('```javascript')).toBe(true);
    expect(isCodeBlock('```\ncode\n```')).toBe(true);
  });

  it('should detect code blocks with tildes', () => {
    expect(isCodeBlock('~~~python')).toBe(true);
  });

  it('should return false for non-code', () => {
    expect(isCodeBlock('Regular text')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isCodeBlock('')).toBe(false);
  });

  it('should handle indented code fences', () => {
    expect(isCodeBlock('  ```code')).toBe(true);
  });
});

describe('hasHeading', () => {
  it('should detect headings', () => {
    expect(hasHeading('# Heading 1')).toBe(true);
    expect(hasHeading('## Heading 2')).toBe(true);
    expect(hasHeading('###### Heading 6')).toBe(true);
  });

  it('should return false for non-headings', () => {
    expect(hasHeading('Regular text')).toBe(false);
    expect(hasHeading('Text with # inside')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(hasHeading('')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(hasHeading('  # Heading')).toBe(true);
  });
});

describe('getCodeLanguage', () => {
  it('should extract language from fence', () => {
    expect(getCodeLanguage('```javascript')).toBe('javascript');
    expect(getCodeLanguage('```typescript')).toBe('typescript');
    expect(getCodeLanguage('```python')).toBe('python');
  });

  it('should return null for no language', () => {
    expect(getCodeLanguage('```')).toBe(null);
    expect(getCodeLanguage('```\ncode')).toBe(null);
  });

  it('should return null for non-code', () => {
    expect(getCodeLanguage('Regular text')).toBe(null);
  });

  it('should return null for empty string', () => {
    expect(getCodeLanguage('')).toBe(null);
  });
});

describe('extractCodeContent', () => {
  it('should extract code without fences', () => {
    const code = '```javascript\nconst x = 1;\n```';
    expect(extractCodeContent(code)).toBe('const x = 1;');
  });

  it('should handle multi-line code', () => {
    const code = '```\nline 1\nline 2\nline 3\n```';
    expect(extractCodeContent(code)).toBe('line 1\nline 2\nline 3');
  });

  it('should handle code without closing fence', () => {
    const code = '```javascript\nconst x = 1;';
    expect(extractCodeContent(code)).toBe('const x = 1;');
  });

  it('should return empty for empty input', () => {
    expect(extractCodeContent('')).toBe('');
  });

  it('should handle code with only fences', () => {
    const code = '```\n```';
    expect(extractCodeContent(code)).toBe('');
  });
});

describe('detectBlockType', () => {
  it('should detect code blocks', () => {
    expect(detectBlockType('```javascript')).toBe('code');
  });

  it('should detect lists', () => {
    expect(detectBlockType('- Item')).toBe('list');
    expect(detectBlockType('1. Item')).toBe('list');
  });

  it('should detect headings', () => {
    expect(detectBlockType('# Heading')).toBe('heading');
    expect(detectBlockType('## Heading 2')).toBe('heading');
    expect(detectBlockType('###### Heading 6')).toBe('heading');
  });

  it('should default to paragraph', () => {
    expect(detectBlockType('Regular text')).toBe('paragraph');
  });

  it('should return paragraph for empty', () => {
    expect(detectBlockType('')).toBe('paragraph');
  });
});

describe('parseListItems', () => {
  it('should parse bulleted list items', () => {
    const result = parseListItems('- Item 1\n- Item 2');
    expect(result).toEqual([
      { marker: '-', content: 'Item 1', indent: 0 },
      { marker: '-', content: 'Item 2', indent: 0 },
    ]);
  });

  it('should parse numbered list items', () => {
    const result = parseListItems('1. First\n2. Second');
    expect(result).toEqual([
      { marker: '1.', content: 'First', indent: 0 },
      { marker: '2.', content: 'Second', indent: 0 },
    ]);
  });

  it('should handle indentation', () => {
    const result = parseListItems('- Item\n  - Nested');
    expect(result[0].indent).toBe(0);
    expect(result[1].indent).toBe(2);
  });

  it('should return empty for non-list', () => {
    expect(parseListItems('Not a list')).toEqual([]);
  });

  it('should return empty for empty string', () => {
    expect(parseListItems('')).toEqual([]);
  });

  it('should trim content', () => {
    const result = parseListItems('- Item with spaces   ');
    expect(result[0].content).toBe('Item with spaces');
  });

  it('should handle mixed markers', () => {
    const result = parseListItems('- Bullet\n* Another\n+ Plus');
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.marker)).toEqual(['-', '*', '+']);
  });
});

describe('parseHeading', () => {
  it('should parse headings', () => {
    expect(parseHeading('# Heading 1')).toEqual({ level: 1, text: 'Heading 1' });
    expect(parseHeading('## Heading 2')).toEqual({ level: 2, text: 'Heading 2' });
    expect(parseHeading('###### Heading 6')).toEqual({ level: 6, text: 'Heading 6' });
  });

  it('should trim text', () => {
    expect(parseHeading('# Heading   ')).toEqual({ level: 1, text: 'Heading' });
  });

  it('should return null for non-headings', () => {
    expect(parseHeading('Regular text')).toBe(null);
  });

  it('should return null for empty string', () => {
    expect(parseHeading('')).toBe(null);
  });

  it('should handle whitespace before heading', () => {
    expect(parseHeading('  ## Heading')).toEqual({ level: 2, text: 'Heading' });
  });
});

describe('getHeadingTag', () => {
  it('should return correct heading tags', () => {
    expect(getHeadingTag(1)).toBe('h1');
    expect(getHeadingTag(2)).toBe('h2');
    expect(getHeadingTag(6)).toBe('h6');
  });

  it('should clamp to valid range', () => {
    expect(getHeadingTag(0)).toBe('h1');
    expect(getHeadingTag(7)).toBe('h6');
    expect(getHeadingTag(100)).toBe('h6');
  });
});

describe('isBlankLine', () => {
  it('should detect blank lines', () => {
    expect(isBlankLine('')).toBe(true);
    expect(isBlankLine('   ')).toBe(true);
    expect(isBlankLine('\t')).toBe(true);
  });

  it('should return false for non-blank', () => {
    expect(isBlankLine('text')).toBe(false);
    expect(isBlankLine(' x ')).toBe(false);
  });
});

describe('normalizeIndentation', () => {
  it('should remove common indentation', () => {
    const text = '  line 1\n  line 2\n  line 3';
    expect(normalizeIndentation(text)).toBe('line 1\nline 2\nline 3');
  });

  it('should preserve relative indentation', () => {
    const text = '  line 1\n    nested\n  line 3';
    expect(normalizeIndentation(text)).toBe('line 1\n  nested\nline 3');
  });

  it('should handle no indentation', () => {
    const text = 'line 1\nline 2';
    expect(normalizeIndentation(text)).toBe('line 1\nline 2');
  });

  it('should return empty for empty string', () => {
    expect(normalizeIndentation('')).toBe('');
  });

  it('should preserve blank lines', () => {
    const text = '  line 1\n\n  line 2';
    expect(normalizeIndentation(text)).toBe('line 1\n\nline 2');
  });
});

describe('isOrderedListItem', () => {
  it('should detect ordered list markers', () => {
    expect(isOrderedListItem('1.')).toBe(true);
    expect(isOrderedListItem('10.')).toBe(true);
    expect(isOrderedListItem('999.')).toBe(true);
  });

  it('should return false for unordered markers', () => {
    expect(isOrderedListItem('-')).toBe(false);
    expect(isOrderedListItem('*')).toBe(false);
    expect(isOrderedListItem('+')).toBe(false);
  });

  it('should return false for invalid markers', () => {
    expect(isOrderedListItem('1')).toBe(false);
    expect(isOrderedListItem('a.')).toBe(false);
  });
});

describe('isUnorderedListItem', () => {
  it('should detect unordered list markers', () => {
    expect(isUnorderedListItem('-')).toBe(true);
    expect(isUnorderedListItem('*')).toBe(true);
    expect(isUnorderedListItem('+')).toBe(true);
  });

  it('should return false for ordered markers', () => {
    expect(isUnorderedListItem('1.')).toBe(false);
  });

  it('should return false for invalid markers', () => {
    expect(isUnorderedListItem('x')).toBe(false);
    expect(isUnorderedListItem('--')).toBe(false);
  });
});

describe('countBlockTypes', () => {
  it('should count block types', () => {
    const blocks = [
      { type: 'paragraph' as const },
      { type: 'paragraph' as const },
      { type: 'list' as const },
      { type: 'code' as const },
      { type: 'heading' as const },
    ];
    const result = countBlockTypes(blocks);
    expect(result).toEqual({
      paragraph: 2,
      list: 1,
      code: 1,
      heading: 1,
    });
  });

  it('should return zero counts for empty array', () => {
    const result = countBlockTypes([]);
    expect(result).toEqual({
      paragraph: 0,
      list: 0,
      code: 0,
      heading: 0,
    });
  });

  it('should count single type', () => {
    const blocks = [
      { type: 'paragraph' as const },
      { type: 'paragraph' as const },
    ];
    const result = countBlockTypes(blocks);
    expect(result.paragraph).toBe(2);
    expect(result.list).toBe(0);
    expect(result.code).toBe(0);
    expect(result.heading).toBe(0);
  });

  it('should count heading blocks', () => {
    const blocks = [
      { type: 'heading' as const },
      { type: 'paragraph' as const },
      { type: 'heading' as const },
    ];
    const result = countBlockTypes(blocks);
    expect(result.heading).toBe(2);
    expect(result.paragraph).toBe(1);
  });
});
