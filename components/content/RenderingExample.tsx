/**
 * Example component demonstrating rendering utilities usage
 * This file serves as a reference for developers
 */

'use client';

import React from 'react';
import { BlockContent } from './BlockContent';
import { Math } from './Math';
import { parseInlineMarkdown } from '@/lib/rendering/markdown';

/**
 * Example 1: Render different block types
 */
export function BlockTypesExample() {
  const paragraphText = 'This is a **bold** statement with \\(x^2\\) math.';
  const listText = '- First item\n- Second item\n- Third item';
  const codeText = '```typescript\nconst x: number = 42;\nconsole.log(x);\n```';

  return (
    <div className="space-y-4">
      <h2>Block Types Example</h2>

      <div>
        <h3>Paragraph with inline formatting</h3>
        <BlockContent text={paragraphText} type="paragraph" />
      </div>

      <div>
        <h3>List</h3>
        <BlockContent text={listText} type="list" />
      </div>

      <div>
        <h3>Code Block</h3>
        <BlockContent text={codeText} type="code" />
      </div>
    </div>
  );
}

/**
 * Example 2: Render math expressions
 */
export function MathExample() {
  return (
    <div className="space-y-4">
      <h2>Math Rendering Example</h2>

      <div>
        <h3>Inline Math</h3>
        <p>
          Einstein&apos;s famous equation: <Math tex="E = mc^2" display={false} />
        </p>
      </div>

      <div>
        <h3>Display Math (Block)</h3>
        <Math
          tex="\frac{-b \pm \sqrt{b^2-4ac}}{2a}"
          display={true}
        />
      </div>

      <div>
        <h3>Complex Math</h3>
        <Math
          tex="\sum_{i=1}^{n} x_i = \int_0^1 f(x) dx"
          display={true}
        />
      </div>
    </div>
  );
}

/**
 * Example 3: Parse and render markdown manually
 */
export function ManualParsingExample() {
  const text = 'This has **bold** text, \\(x^2\\) math, and\nline breaks.';
  const segments = parseInlineMarkdown(text);

  return (
    <div className="space-y-4">
      <h2>Manual Parsing Example</h2>

      <div>
        <h3>Original Text</h3>
        <pre className="bg-gray-100 p-2 rounded">{text}</pre>
      </div>

      <div>
        <h3>Parsed Segments</h3>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(segments, null, 2)}
        </pre>
      </div>

      <div>
        <h3>Rendered Result</h3>
        <BlockContent text={text} type="paragraph" />
      </div>
    </div>
  );
}

/**
 * Example 4: Complete message rendering
 */
export function MessageExample() {
  const messageContent = `# Introduction

This is a comprehensive example with multiple block types.

## Features

Here are the key features:

- **Bold text** support
- Inline math like \\(E = mc^2\\)
- Block math:

\\[
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
\\]

## Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Conclusion

This demonstrates the full rendering capabilities.`;

  // Split into blocks (in real app, use splitIntoBlocks from state/parser)
  const blocks = [
    { type: 'paragraph' as const, text: '# Introduction' },
    { type: 'paragraph' as const, text: 'This is a comprehensive example with multiple block types.' },
    { type: 'paragraph' as const, text: '## Features' },
    { type: 'paragraph' as const, text: 'Here are the key features:' },
    { type: 'list' as const, text: '- **Bold text** support\n- Inline math like \\(E = mc^2\\)\n- Block math:' },
    { type: 'paragraph' as const, text: '\\[\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\\]' },
    { type: 'paragraph' as const, text: '## Code Example' },
    { type: 'code' as const, text: '```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n```' },
    { type: 'paragraph' as const, text: '## Conclusion' },
    { type: 'paragraph' as const, text: 'This demonstrates the full rendering capabilities.' },
  ];

  return (
    <div className="space-y-4">
      <h2>Complete Message Example</h2>

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        {blocks.map((block, index) => (
          <BlockContent
            key={index}
            text={block.text}
            type={block.type}
            className="mb-4 last:mb-0"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Main demo component showcasing all examples
 */
export function RenderingDemo() {
  return (
    <div className="container mx-auto p-8 space-y-12">
      <h1 className="text-3xl font-bold">Rendering Utilities Demo</h1>

      <BlockTypesExample />
      <hr />

      <MathExample />
      <hr />

      <ManualParsingExample />
      <hr />

      <MessageExample />
    </div>
  );
}
