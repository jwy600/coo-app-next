import { describe, it, expect } from 'vitest';
import {
  threadToMarkdown,
  sanitizeFilename,
  generateExportFilename,
  blocksToCardMarkdown,
  generateCardFilename,
} from '@/lib/export/markdownExport';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';
import { Block } from '@/types/block';

describe('markdownExport', () => {
  describe('threadToMarkdown', () => {
    it('should generate valid markdown with frontmatter', () => {
      const thread: Thread = {
        id: 'thread-1',
        title: 'Test Thread',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        messages: [
          {
            id: 'msg-1',
            threadId: 'thread-1',
            role: 'user',
            createdAt: 1700000000000,
            content: [{ blockId: 'block-1' }],
            meta: {},
          },
          {
            id: 'msg-2',
            threadId: 'thread-1',
            role: 'assistant',
            createdAt: 1700000001000,
            content: [{ blockId: 'block-2' }],
            meta: {},
          },
        ],
      };

      const blocks: Block[] = [
        {
          id: 'block-1',
          messageId: 'msg-1',
          type: 'paragraph',
          text: 'Hello, how are you?',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
        {
          id: 'block-2',
          messageId: 'msg-2',
          type: 'paragraph',
          text: 'I am doing well, thank you!',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      const result = threadToMarkdown(thread, thread.messages, blocks);

      // Check frontmatter
      expect(result).toMatch(/^---\n/);
      expect(result).toContain('title: "Test Thread"');
      expect(result).toMatch(/exported: \d{4}-\d{2}-\d{2}T/);
      expect(result).toMatch(/---\n## User/);

      // Check message structure
      expect(result).toContain('## User');
      expect(result).toContain('Hello, how are you?');
      expect(result).toContain('## Assistant');
      expect(result).toContain('I am doing well, thank you!');
    });

    it('should handle multiple blocks per message', () => {
      const thread: Thread = {
        id: 'thread-1',
        title: 'Multi-block Thread',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        messages: [
          {
            id: 'msg-1',
            threadId: 'thread-1',
            role: 'assistant',
            createdAt: 1700000000000,
            content: [{ blockId: 'block-1' }, { blockId: 'block-2' }],
            meta: {},
          },
        ],
      };

      const blocks: Block[] = [
        {
          id: 'block-1',
          messageId: 'msg-1',
          type: 'paragraph',
          text: 'First paragraph.',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
        {
          id: 'block-2',
          messageId: 'msg-1',
          type: 'paragraph',
          text: 'Second paragraph.',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      const result = threadToMarkdown(thread, thread.messages, blocks);

      expect(result).toContain('First paragraph.\n\nSecond paragraph.');
    });

    it('should handle empty thread', () => {
      const thread: Thread = {
        id: 'thread-1',
        title: 'Empty Thread',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        messages: [],
      };

      const result = threadToMarkdown(thread, [], []);

      expect(result).toContain('title: "Empty Thread"');
      expect(result).toMatch(/---\n$/);
    });

    it('should escape double quotes in title', () => {
      const thread: Thread = {
        id: 'thread-1',
        title: 'Thread with "quotes"',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        messages: [],
      };

      const result = threadToMarkdown(thread, [], []);

      expect(result).toContain('title: "Thread with \\"quotes\\""');
    });

    it('should preserve code blocks in markdown', () => {
      const thread: Thread = {
        id: 'thread-1',
        title: 'Code Thread',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        messages: [
          {
            id: 'msg-1',
            threadId: 'thread-1',
            role: 'assistant',
            createdAt: 1700000000000,
            content: [{ blockId: 'block-1' }],
            meta: {},
          },
        ],
      };

      const codeContent = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      const blocks: Block[] = [
        {
          id: 'block-1',
          messageId: 'msg-1',
          type: 'code',
          text: codeContent,
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      const result = threadToMarkdown(thread, thread.messages, blocks);

      expect(result).toContain(codeContent);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('test/file\\name:with*invalid?"chars<>|'))
        .toBe('test-file-name-with-invalid--chars---');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeFilename('valid-filename_123')).toBe('valid-filename_123');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFilename('  test  ')).toBe('test');
    });
  });

  describe('generateExportFilename', () => {
    it('should generate filename with sanitized title and date', () => {
      const result = generateExportFilename('My Thread');
      expect(result).toMatch(/^My Thread-\d{4}-\d{2}-\d{2}\.md$/);
    });

    it('should sanitize special characters in title', () => {
      const result = generateExportFilename('Thread/with:special*chars');
      expect(result).toMatch(/^Thread-with-special-chars-\d{4}-\d{2}-\d{2}\.md$/);
    });
  });

  describe('blocksToCardMarkdown', () => {
    it('should generate card markdown with frontmatter', () => {
      const blocks: Block[] = [
        {
          id: 'block-1',
          messageId: 'msg-1',
          type: 'paragraph',
          text: 'First selected block.',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
        {
          id: 'block-2',
          messageId: 'msg-2',
          type: 'paragraph',
          text: 'Second selected block.',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      const result = blocksToCardMarkdown('My Card', 'What is React?', blocks);

      // Check frontmatter
      expect(result).toMatch(/^---\n/);
      expect(result).toContain('title: "My Card"');
      expect(result).toContain('original question: "What is React?"');
      expect(result).toMatch(/exported: \d{4}-\d{2}-\d{2}T/);
      expect(result).toContain('type: card');
      expect(result).not.toContain('blocks:');

      // Check content
      expect(result).toContain('First selected block.');
      expect(result).toContain('Second selected block.');
      expect(result).toContain('First selected block.\n\nSecond selected block.');
    });

    it('should handle single block', () => {
      const blocks: Block[] = [
        {
          id: 'block-1',
          messageId: 'msg-1',
          type: 'paragraph',
          text: 'Only block content.',
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      const result = blocksToCardMarkdown('Single Block Card', 'How does it work?', blocks);

      expect(result).toContain('title: "Single Block Card"');
      expect(result).toContain('original question: "How does it work?"');
      expect(result).toContain('Only block content.');
    });

    it('should escape double quotes in title and original question', () => {
      const blocks: Block[] = [];
      const result = blocksToCardMarkdown('Card with "quotes"', 'What is "this"?', blocks);

      expect(result).toContain('title: "Card with \\"quotes\\""');
      expect(result).toContain('original question: "What is \\"this\\"?"');
    });

    it('should preserve code blocks', () => {
      const codeContent = '```typescript\nconst x: number = 1;\n```';
      const blocks: Block[] = [
        {
          id: 'block-1',
          messageId: 'msg-1',
          type: 'code',
          text: codeContent,
          edited: false,
          selections: [],
          prevText: null,
          isRewritten: false,
        },
      ];

      const result = blocksToCardMarkdown('Code Card', 'Show me TypeScript', blocks);

      expect(result).toContain(codeContent);
    });
  });

  describe('generateCardFilename', () => {
    it('should generate filename with sanitized title', () => {
      const result = generateCardFilename('My Card');
      expect(result).toBe('My Card.md');
    });

    it('should sanitize special characters in title', () => {
      const result = generateCardFilename('Card/with:special*chars');
      expect(result).toBe('Card-with-special-chars.md');
    });

    it('should not include date', () => {
      const result = generateCardFilename('Simple Card');
      expect(result).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result).toBe('Simple Card.md');
    });
  });
});
