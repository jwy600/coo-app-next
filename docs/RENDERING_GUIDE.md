# Rendering Utilities Guide

This guide explains how to use the rendering utilities for markdown parsing, math rendering, and block content rendering in the Next.js application.

## Overview

The rendering system consists of three main parts:

1. **Markdown Parsing** (`lib/rendering/markdown.ts`) - Parse inline markdown syntax (bold, math)
2. **KaTeX Integration** (`lib/rendering/katex.ts`) - Render LaTeX math expressions
3. **Block Detection** (`lib/rendering/blocks.ts`) - Detect and classify block types
4. **React Components** (`components/content/`) - Pre-built components for rendering content

## Installation

All dependencies are already installed:
- `katex` - Math rendering library
- `react-katex` - React bindings for KaTeX

KaTeX CSS must be imported in your app layout:

```tsx
// app/layout.tsx
import 'katex/dist/katex.min.css';
```

## Markdown Parsing

### parseInlineMarkdown

Parse text with inline markdown and math syntax into structured segments.

```typescript
import { parseInlineMarkdown } from '@/lib/rendering/markdown';

const text = 'This is **bold** and \\(E = mc^2\\) math';
const segments = parseInlineMarkdown(text);

// Returns:
// [
//   { type: 'text', content: 'This is ' },
//   { type: 'bold', content: 'bold' },
//   { type: 'text', content: ' and ' },
//   { type: 'inline-math', content: 'E = mc^2' },
//   { type: 'text', content: ' math' }
// ]
```

**Supported Syntax:**
- **Bold text**: `**text**` → `{ type: 'bold' }`
- **Inline math**: `\(tex\)` → `{ type: 'inline-math' }`
- **Block math**: `\[tex\]` → `{ type: 'block-math' }`
- **Line breaks**: `\n` → `{ type: 'break' }`

### hasMath

Check if text contains LaTeX math notation:

```typescript
import { hasMath } from '@/lib/rendering/markdown';

hasMath('Some text with \\(x^2\\)'); // true
hasMath('Plain text'); // false
```

### extractMathExpressions

Extract all math expressions with their positions:

```typescript
import { extractMathExpressions } from '@/lib/rendering/markdown';

const expressions = extractMathExpressions('Inline \\(x\\) and block \\[y\\]');

// Returns:
// [
//   { type: 'inline', expression: 'x', position: 7, length: 5 },
//   { type: 'block', expression: 'y', position: 22, length: 5 }
// ]
```

### stripMarkdown

Remove all markdown formatting, useful for search and accessibility:

```typescript
import { stripMarkdown } from '@/lib/rendering/markdown';

stripMarkdown('**Bold** \\(x^2\\)\nNew line');
// Returns: "Bold x^2 New line"
```

## Math Rendering (KaTeX)

### useMathTypesetting Hook

Automatically render all math expressions in a container:

```tsx
'use client';

import { useMathTypesetting } from '@/lib/rendering/katex';

export function MathContainer({ content }) {
  const mathRef = useMathTypesetting([content]);

  return (
    <div ref={mathRef}>
      <span data-tex="E = mc^2" className="doc-math-inline">E = mc^2</span>
      <div data-tex="x^2 + y^2 = z^2" className="doc-math-block">x^2 + y^2 = z^2</div>
    </div>
  );
}
```

The hook:
- Finds all elements with `[data-tex]` attribute
- Renders them with KaTeX
- Re-renders when dependencies change
- Handles errors gracefully (shows raw TeX on failure)

### renderMathToString

Render math to HTML string (useful for SSR):

```typescript
import { renderMathToString } from '@/lib/rendering/katex';

const html = renderMathToString('E = mc^2', false); // inline
const htmlBlock = renderMathToString('\\frac{a}{b}', true); // display mode
```

### renderMath

Render directly to a DOM element:

```typescript
import { renderMath } from '@/lib/rendering/katex';

const element = document.getElementById('math');
renderMath(element, 'x^2', false); // inline
renderMath(element, 'x^2', true); // display mode
```

### isValidTex

Validate TeX expressions without rendering:

```typescript
import { isValidTex } from '@/lib/rendering/katex';

isValidTex('x^2'); // true
isValidTex('\\invalid'); // false
```

## Block Type Detection

### detectBlockType

Automatically detect the type of a block:

```typescript
import { detectBlockType } from '@/lib/rendering/blocks';

detectBlockType('```javascript\ncode\n```'); // 'code'
detectBlockType('- List item'); // 'list'
detectBlockType('Regular paragraph'); // 'paragraph'
```

### isListText / isCodeBlock / hasHeading

Check for specific block types:

```typescript
import { isListText, isCodeBlock, hasHeading } from '@/lib/rendering/blocks';

isListText('- Item 1\n- Item 2'); // true
isCodeBlock('```js\ncode\n```'); // true
hasHeading('# Heading 1'); // true
```

### parseListItems

Parse list text into structured items:

```typescript
import { parseListItems } from '@/lib/rendering/blocks';

const items = parseListItems('- Item 1\n  - Nested\n- Item 2');

// Returns:
// [
//   { marker: '-', content: 'Item 1', indent: 0 },
//   { marker: '-', content: 'Nested', indent: 2 },
//   { marker: '-', content: 'Item 2', indent: 0 }
// ]
```

### parseHeading

Extract heading level and text:

```typescript
import { parseHeading } from '@/lib/rendering/blocks';

parseHeading('## Heading 2');
// Returns: { level: 2, text: 'Heading 2' }
```

### getCodeLanguage / extractCodeContent

Work with code blocks:

```typescript
import { getCodeLanguage, extractCodeContent } from '@/lib/rendering/blocks';

const code = '```typescript\nconst x = 1;\n```';

getCodeLanguage(code); // 'typescript'
extractCodeContent(code); // 'const x = 1;'
```

## React Components

### Math Component

Render LaTeX math expressions:

```tsx
import { Math, InlineMath, BlockMath } from '@/components/content';

// Generic (controlled by display prop)
<Math tex="E = mc^2" display={false} />

// Convenience wrappers
<InlineMath tex="x^2" />
<BlockMath tex="\frac{a}{b}" />
```

**Props:**
- `tex: string` - The LaTeX expression
- `display?: boolean` - Block (true) or inline (false) mode
- `className?: string` - Additional CSS classes

### BlockContent Component

Render any block with appropriate formatting:

```tsx
import { BlockContent } from '@/components/content';

// Paragraph with inline markdown
<BlockContent
  text="This is **bold** and \(x^2\) math"
  type="paragraph"
/>

// List
<BlockContent
  text="- Item 1\n- Item 2\n- Item 3"
  type="list"
/>

// Code block
<BlockContent
  text="```typescript\nconst x = 1;\n```"
  type="code"
/>
```

**Features:**
- Automatically parses inline markdown (bold, math)
- Renders lists with proper markers
- Syntax highlighting for code blocks
- Handles headings within paragraphs
- Preserves line breaks

**Props:**
- `text: string` - The block content
- `type: 'paragraph' | 'list' | 'code'` - Block type
- `className?: string` - Additional CSS classes

## Complete Example

Here's a complete example of rendering a message with multiple blocks:

```tsx
'use client';

import { BlockContent } from '@/components/content';
import { splitIntoBlocks } from '@/lib/state/parser';

interface MessageProps {
  content: string;
}

export function Message({ content }: MessageProps) {
  const blocks = splitIntoBlocks(content);

  return (
    <div className="message">
      {blocks.map((block, index) => (
        <BlockContent
          key={index}
          text={block.text}
          type={block.type}
          className="mb-4"
        />
      ))}
    </div>
  );
}
```

## Usage with Existing State

The rendering utilities integrate seamlessly with the existing state management:

```tsx
import { useStore } from '@/lib/store/useStore';
import { BlockContent } from '@/components/content';

export function ChatView() {
  const { messages } = useStore();

  return (
    <div>
      {messages.map((message) =>
        message.blocks.map((block) => (
          <BlockContent
            key={block.id}
            text={block.text}
            type={block.type}
          />
        ))
      )}
    </div>
  );
}
```

## CSS Classes

The components use these CSS classes for styling:

**Math:**
- `.doc-math-inline` - Inline math expressions
- `.doc-math-block` - Block/display math expressions

**Blocks:**
- `.doc-paragraph` - Paragraph blocks
- `.doc-heading` - Heading elements
- `.doc-list` - List containers (ul/ol)
- `.doc-code` - Code blocks

Add these styles to your global CSS:

```css
/* Math */
.doc-math-inline {
  display: inline;
}

.doc-math-block {
  display: block;
  margin: 1rem 0;
  text-align: center;
}

/* Blocks */
.doc-paragraph {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.doc-heading {
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.doc-list {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.doc-list li {
  margin-bottom: 0.5rem;
}

.doc-code {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}

.doc-code code {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}
```

## Testing

All utilities have comprehensive test coverage:

```bash
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

Test files:
- `tests/lib/rendering/markdown.test.ts` - 30 tests
- `tests/lib/rendering/katex.test.ts` - 20 tests
- `tests/lib/rendering/blocks.test.ts` - 58 tests

## Performance Considerations

1. **Memoization**: The Math component re-renders only when `tex` or `display` changes
2. **Lazy Rendering**: Use `useMathTypesetting` hook to defer rendering until after DOM update
3. **Error Handling**: Invalid TeX expressions fallback to raw text without crashing
4. **Parsing Cache**: Consider memoizing `parseInlineMarkdown` results for static content

## Migration Notes

These utilities replace the legacy DOM manipulation code from `legacy/app.js`:

- **Old**: `appendInlineSegments` (DOM manipulation)
- **New**: `parseInlineMarkdown` (returns React-compatible segments)

- **Old**: Direct KaTeX calls on DOM elements
- **New**: `useMathTypesetting` hook + React components

- **Old**: `createParagraphElement`, `createListElement`, etc.
- **New**: `BlockContent` component with type detection

## Troubleshooting

### Math not rendering

1. Ensure KaTeX CSS is imported in your layout
2. Check that `data-tex` attribute is set correctly
3. Verify the component is using `'use client'` directive

### Bold text not showing

1. Verify the text uses double asterisks: `**text**`
2. Check that you're rendering the segments (not just parsing)

### Code blocks without syntax highlighting

1. Install a syntax highlighting library (optional)
2. The current implementation renders code without highlighting
3. Language detection works via `getCodeLanguage()`

## API Reference

See the TypeScript definitions for complete API documentation:
- `/lib/rendering/markdown.ts`
- `/lib/rendering/katex.ts`
- `/lib/rendering/blocks.ts`

All functions are fully typed and include JSDoc comments.
