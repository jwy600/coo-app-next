import { describe, it, expect } from 'vitest';
import {
  threadToMarkdown,
  sanitizeFilename,
  generateExportFilename,
} from '@/lib/export/markdownExport';
import { Thread } from '@/types/thread';
import { Message } from '@/types/message';

const makeThread = (overrides: Partial<Thread> = {}): Thread => ({
  id: 'thread-1',
  title: 'Test Thread',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  messages: [],
  ...overrides,
});

const makeMessage = (overrides: Partial<Message>): Message => ({
  id: 'msg-1',
  threadId: 'thread-1',
  role: 'user',
  text: '',
  createdAt: 1700000000000,
  meta: {},
  ...overrides,
});

describe('threadToMarkdown', () => {
  it('emits frontmatter and alternates user / assistant headers', () => {
    const messages: Message[] = [
      makeMessage({ id: 'm1', role: 'user', text: 'Hello, how are you?' }),
      makeMessage({ id: 'm2', role: 'assistant', text: 'I am doing well, thank you!' }),
    ];
    const thread = makeThread({ messages });

    const result = threadToMarkdown(thread, messages);

    expect(result).toMatch(/^---\n/);
    expect(result).toContain('title: "Test Thread"');
    expect(result).toContain('question: "Hello, how are you?"');
    expect(result).toMatch(/created: \d{4}-\d{2}-\d{2}\n/);
    expect(result).toContain('## User\n\nHello, how are you?');
    expect(result).toContain('## Assistant\n\nI am doing well, thank you!');
  });

  it('handles an empty thread', () => {
    const thread = makeThread({ messages: [] });
    const result = threadToMarkdown(thread, []);
    expect(result).toContain('title: "Test Thread"');
    expect(result).toContain('question: ""');
  });

  it('escapes double quotes in the title', () => {
    const thread = makeThread({ title: 'Thread with "quotes"' });
    const result = threadToMarkdown(thread, []);
    expect(result).toContain('title: "Thread with \\"quotes\\""');
  });

  it('preserves fenced code blocks in the message body', () => {
    const code = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
    const messages = [makeMessage({ id: 'm1', role: 'assistant', text: code })];
    const thread = makeThread({ messages });
    const result = threadToMarkdown(thread, messages);
    expect(result).toContain(code);
  });
});

describe('sanitizeFilename', () => {
  it('replaces invalid characters with dashes', () => {
    expect(sanitizeFilename('test/file\\name:with*invalid?"chars<>|')).toBe(
      'test-file-name-with-invalid--chars---',
    );
  });

  it('preserves valid characters and trims whitespace', () => {
    expect(sanitizeFilename('  valid-filename_123  ')).toBe('valid-filename_123');
  });
});

describe('generateExportFilename', () => {
  it('emits a date-stamped filename', () => {
    expect(generateExportFilename('My Thread')).toMatch(
      /^My Thread-\d{4}-\d{2}-\d{2}\.md$/,
    );
  });
});
