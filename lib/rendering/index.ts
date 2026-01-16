/**
 * Rendering utilities - Barrel export
 * Provides all utilities for rendering markdown, math, and blocks
 */

// Markdown utilities
export {
  parseInlineMarkdown,
  hasMath,
  extractMathExpressions,
  stripMarkdown,
  type MarkdownSegment,
  type MathExpression,
} from './markdown';

// KaTeX utilities
export {
  useMathTypesetting,
  renderMathToString,
  renderMath,
  isValidTex,
  getKatexVersion,
  type KatexOptions,
} from './katex';

// Block utilities
export {
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
  type ListItem,
} from './blocks';
