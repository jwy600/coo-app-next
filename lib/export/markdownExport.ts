/**
 * Pure function to convert a thread to markdown format
 */

import { Thread } from '@/types/thread';
import { Message } from '@/types/message';
import { Block } from '@/types/block';

/**
 * Convert a thread with its messages and blocks to markdown format
 *
 * @param thread - The thread to export
 * @param messages - Messages in the thread (should be ordered by createdAt)
 * @param blocks - All blocks for the thread
 * @returns Markdown string with YAML frontmatter
 */
export const threadToMarkdown = (
  thread: Thread,
  messages: Message[],
  blocks: Block[]
): string => {
  const exportDate = new Date().toISOString();

  // Build YAML frontmatter
  const frontmatter = [
    '---',
    `title: "${escapeYamlString(thread.title)}"`,
    `exported: ${exportDate}`,
    '---',
    '',
  ].join('\n');

  // Build message content
  const messageContent = messages
    .map((message) => {
      const roleHeader =
        message.role === 'user' ? '## User' : '## Assistant';
      const messageBlocks = getBlocksForMessage(message, blocks);
      const blockContent = messageBlocks
        .map((block) => block.text)
        .join('\n\n');

      return `${roleHeader}\n\n${blockContent}`;
    })
    .join('\n\n');

  return frontmatter + messageContent;
};

/**
 * Get blocks for a specific message, ordered by their position in content array
 */
const getBlocksForMessage = (message: Message, blocks: Block[]): Block[] => {
  // Get blocks in order based on message.content array
  return message.content
    .map((contentItem) => blocks.find((b) => b.id === contentItem.blockId))
    .filter((block): block is Block => block !== undefined);
};

/**
 * Escape special characters for YAML string values
 */
const escapeYamlString = (str: string): string => {
  // Replace double quotes with escaped quotes
  return str.replace(/"/g, '\\"');
};

/**
 * Sanitize filename by removing invalid characters
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove characters that are invalid in filenames: / \ : * ? " < > |
  return filename.replace(/[/\\:*?"<>|]/g, '-').trim();
};

/**
 * Generate export filename for a thread
 *
 * @param title - Thread title
 * @returns Sanitized filename in format: {title}-{date}.md
 */
export const generateExportFilename = (title: string): string => {
  const sanitizedTitle = sanitizeFilename(title);
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${sanitizedTitle}-${date}.md`;
};
