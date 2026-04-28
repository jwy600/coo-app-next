import type { Plugin } from 'unified';
import type { Element, ElementContent, Root, RootContent, Text } from 'hast';

/**
 * Adds source-position markers to the hast tree so DOM selections can be
 * mapped back to source markdown character offsets.
 *
 *  - Wraps every text node that carries a `position` in
 *    `<span data-md-start data-md-end data-md-text="true">`.
 *  - Wraps `math-inline` / `math-display` / `language-math` elements (from
 *    `remark-math`) in an outer `<span data-md-atomic="true">` carrying the
 *    same source offsets, so the offsets survive `rehype-katex`'s element
 *    replacement.
 *
 * Must run BEFORE `rehype-katex`. Inside math elements text nodes are not
 * wrapped (KaTeX needs to read the raw text content).
 */
export const rehypeWrapText: Plugin<[], Root> = () => (tree) => {
  walk(tree as Root | Element);
};

const MATH_CLASS_RE = /^(math-inline|math-display|language-math)$/;

function walk(parent: Root | Element): void {
  const next: (RootContent | ElementContent)[] = [];
  for (const child of parent.children) {
    if (child.type === 'element') {
      if (isMathElement(child)) {
        const wrapped = wrapMath(child);
        next.push(wrapped ?? child);
        continue;
      }
      walk(child);
      next.push(child);
    } else if (child.type === 'text') {
      const wrapped = wrapTextNode(child);
      next.push(wrapped ?? child);
    } else {
      next.push(child);
    }
  }
  parent.children = next as typeof parent.children;
}

function wrapTextNode(text: Text): Element | null {
  const start = text.position?.start.offset;
  const end = text.position?.end.offset;
  if (start === undefined || end === undefined) return null;
  if (text.value.length === 0) return null;

  return {
    type: 'element',
    tagName: 'span',
    properties: {
      dataMdStart: String(start),
      dataMdEnd: String(end),
      dataMdText: 'true',
    },
    children: [text],
    position: text.position,
  };
}

function wrapMath(el: Element): Element | null {
  const start = el.position?.start.offset;
  const end = el.position?.end.offset;
  if (start === undefined || end === undefined) return null;

  return {
    type: 'element',
    tagName: 'span',
    properties: {
      dataMdStart: String(start),
      dataMdEnd: String(end),
      dataMdAtomic: 'true',
    },
    children: [el],
    position: el.position,
  };
}

function isMathElement(el: Element): boolean {
  const cls = el.properties?.className;
  if (!Array.isArray(cls)) return false;
  return cls.some((c) => typeof c === 'string' && MATH_CLASS_RE.test(c));
}
