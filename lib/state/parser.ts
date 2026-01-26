import { BlockData, BlockType } from '@/types/block';

/**
 * Block parsing utilities
 */

interface GetCommandOutputParams {
  blockText: string;
  command: string;
  prompt?: string;
  copy: {
    rewriteSentence?: string;
    rewriteTranslation?: string | string[];
    exampleTemplate?: string | string[];
    askTemplate?: string | string[];
  };
  specialOutputs: {
    translate?: string | string[];
    expand?: string | string[];
    example?: string | string[];
    eli5?: string | string[];
  };
}

export const getCommandOutput = ({
  blockText,
  command,
  prompt,
  copy,
  specialOutputs,
}: GetCommandOutputParams): string => {
  if (!blockText) return '';
  const normalizeText = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) {
      return value.join('\n\n');
    }
    return typeof value === 'string' ? value : '';
  };
  const diminishingPrefix = 'Diminishing returns to each input';
  const isDiminishing = blockText.trim().startsWith(diminishingPrefix);
  const isRewriteSentence =
    copy.rewriteSentence && blockText.trim() === copy.rewriteSentence.trim();

  if (command === 'translate') {
    if (isRewriteSentence && copy.rewriteTranslation) {
      return normalizeText(copy.rewriteTranslation);
    }
    if (isDiminishing) {
      return normalizeText(specialOutputs.translate);
    }
    const hasCjk = /[\u3040-\u30ff\u3400-\u9fff]/.test(blockText);
    return hasCjk
      ? `Translation (mock): ${blockText.replace(/。/g, '.')}`
      : `【中文翻译】${blockText}`;
  }

  if (command === 'expand') {
    return isDiminishing
      ? normalizeText(specialOutputs.expand)
      : `Expanded:\n${blockText}\n\nContext: This idea connects to everyday choices and long-term planning.\nExample: A small change in one neighborhood can ripple outward and shift habits.\nDetail: It adds texture, clarity, and a more human pace to the original claim.`;
  }

  if (command === 'example') {
    if (isDiminishing && specialOutputs.example) {
      return normalizeText(specialOutputs.example);
    }
    if (copy.exampleTemplate) {
      return normalizeText(copy.exampleTemplate).replace('{block}', blockText);
    }
    return `Example:\n${blockText}\n\nIllustration: Imagine a small team with one machine. Adding a second machine helps a lot at first, but adding a third helps less because the team is still the same size. The point is the balance between inputs.`;
  }

  if (command === 'eli5') {
    return isDiminishing
      ? normalizeText(specialOutputs.eli5)
      : `ELI5:\n- ${blockText.split('.')[0].trim()}.\n- This means it helps people in simple, everyday ways.\n- Think of it as making things easier and cooler.`;
  }

  if (command === 'ask') {
    if (!prompt) return '';
    if (copy.askTemplate) {
      return normalizeText(copy.askTemplate)
        .replace('{block}', blockText)
        .replace('{prompt}', prompt);
    }
    return `Answer (mock): Based on "${blockText}", the question "${prompt}" points to the core idea and its practical impact.`;
  }

  return '';
};

const isListLine = (line: string): boolean => /^(\s*)([-*+]|\d+\.)\s+/.test(line);

/**
 * Get the indent level of a list line (number of leading spaces)
 * Returns null if not a list line
 */
const getListIndent = (line: string): number | null => {
  const match = line.match(/^(\s*)([-*+]|\d+\.)\s+/);
  if (!match) return null;
  return match[1].length;
};

const normalizeBlocks = (blocks: BlockData[]): BlockData[] => {
  const result: BlockData[] = [];

  blocks.forEach((block) => {
    const trimmed = block.text.trim();
    if (!trimmed) return;

    // If this is a paragraph block with multiple lines that might contain headings, split it
    if (block.type === 'paragraph' && trimmed.includes('\n')) {
      const lines = trimmed.split('\n');
      let buffer: string[] = [];

      lines.forEach((line) => {
        const isHeading = /^#{1,6}\s+/.test(line.trim());

        if (isHeading) {
          // Flush buffer before heading
          if (buffer.length > 0) {
            result.push({ type: 'paragraph', text: buffer.join('\n').trim() });
            buffer = [];
          }
          // Add heading as separate block
          result.push({ type: 'heading', text: line.trim() });
        } else {
          buffer.push(line);
        }
      });

      // Flush remaining buffer
      if (buffer.length > 0) {
        result.push({ type: 'paragraph', text: buffer.join('\n').trim() });
      }
    } else {
      result.push({ type: block.type, text: trimmed });
    }
  });

  return result.filter((block) => block.text.length > 0);
};

export const splitIntoBlocks = (content: string): BlockData[] => {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const blocks: BlockData[] = [];
  let buffer: string[] = [];
  let inCode = false;
  let codeFence = '';

  const flushParagraph = () => {
    if (!buffer.length) return;
    const text = buffer.join('\n').trim();
    if (text) {
      blocks.push({ type: 'paragraph', text });
    }
    buffer = [];
  };

  const flushList = () => {
    if (!buffer.length) return;
    const text = buffer.join('\n').trim();
    if (text) {
      blocks.push({ type: 'list', text });
    }
    buffer = [];
  };

  const flushCode = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      blocks.push({ type: 'code', text: trimmed });
    }
  };

  type Mode = 'paragraph' | 'list';
  let currentMode: Mode = 'paragraph';
  let codeBuffer: string[] = [];

  lines.forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (fenceMatch) {
      if (!inCode) {
        flushParagraph();
        flushList();
        inCode = true;
        codeFence = fenceMatch[1];
        codeBuffer = [line];
        return;
      }
      if (inCode && fenceMatch[1] === codeFence) {
        codeBuffer.push(line);
        flushCode(codeBuffer.join('\n'));
        codeBuffer = [];
        inCode = false;
        codeFence = '';
        currentMode = 'paragraph';
        return;
      }
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    const isBlank = line.trim() === '';
    const listLine = isListLine(line);
    const isHeading = /^#{1,6}\s+/.test(line.trim());

    if (isBlank) {
      if (currentMode === 'list') {
        flushList();
      } else {
        flushParagraph();
      }
      currentMode = 'paragraph';
      return;
    }

    if (isHeading) {
      if (currentMode === 'list') {
        flushList();
      } else {
        flushParagraph();
      }
      blocks.push({ type: 'heading', text: line.trim() });
      currentMode = 'paragraph';
      return;
    }

    if (listLine) {
      const indent = getListIndent(line);

      if (currentMode !== 'list') {
        // Starting a new list section
        flushParagraph();
        currentMode = 'list';
        buffer.push(line);
      } else if (indent === 0 && buffer.length > 0) {
        // New top-level item - flush current buffer as block, start new one
        flushList();
        buffer.push(line);
      } else {
        // Nested item or continuation - add to current buffer
        buffer.push(line);
      }
      return;
    }

    if (currentMode === 'list') {
      flushList();
    }
    currentMode = 'paragraph';
    buffer.push(line);

    if (index === lines.length - 1) {
      flushParagraph();
    }
  });

  if (inCode && codeBuffer.length) {
    flushCode(codeBuffer.join('\n'));
  }

  // Final flush - need to check mode at end of iteration
  if (buffer.length) {
    // Capture the current mode value to avoid TypeScript narrowing issues
    const mode = currentMode as Mode;
    mode === 'list' ? flushList() : flushParagraph();
  }

  return normalizeBlocks(blocks);
};
