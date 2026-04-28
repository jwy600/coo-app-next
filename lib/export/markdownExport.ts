/**
 * Pure function to convert a thread to markdown format.
 *
 * Each message is a single text block; the export alternates user and
 * assistant messages with a role header.
 */

import { Thread } from '@/types/thread';
import { Message } from '@/types/message';

export const threadToMarkdown = (thread: Thread, messages: Message[]): string => {
  const createdDate = new Date().toISOString().split('T')[0];
  const firstUser = messages.find((m) => m.role === 'user');
  const firstQuestion = (firstUser?.text ?? '').trim();

  const frontmatter = [
    '---',
    `title: "${escapeYamlString(thread.title)}"`,
    `question: "${escapeYamlString(firstQuestion)}"`,
    `created: ${createdDate}`,
    '---',
    '',
  ].join('\n');

  const body = messages
    .map((message) => {
      const header = message.role === 'user' ? '## User' : '## Assistant';
      return `${header}\n\n${message.text}`;
    })
    .join('\n\n');

  return frontmatter + body;
};

/**
 * Escape special characters for YAML double-quoted string values.
 *
 * Order matters: backslashes must be escaped first, otherwise escaping
 * quotes would double-escape any user-supplied backslash. Newlines would
 * break out of the quoted string and allow arbitrary frontmatter
 * injection, so they are normalized to spaces (and stray CRs dropped).
 */
const escapeYamlString = (str: string): string => {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '')
    .replace(/\n/g, ' ');
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[/\\:*?"<>|]/g, '-').trim();
};

export const generateExportFilename = (title: string): string => {
  const sanitizedTitle = sanitizeFilename(title);
  const date = new Date().toISOString().split('T')[0];
  return `${sanitizedTitle}-${date}.md`;
};
