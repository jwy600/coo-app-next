import type { Plugin } from 'unified';
import type { Element, ElementContent, Root, RootContent, Text } from 'hast';

export interface WrapTextOptions {
  /**
   * Translates a parsed-text offset into an original-text offset. Mirrors
   * the option on `remarkSourcePositions`.
   */
  translate?: (offset: number) => number;
}

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
export const rehypeWrapText: Plugin<[WrapTextOptions?], Root> =
  (options = {}) => (tree) => {
    const translate = options.translate ?? ((n: number) => n);
    walk(tree as Root | Element, translate);
  };

const MATH_CLASS_RE = /^(math-inline|math-display|language-math)$/;

function walk(parent: Root | Element, translate: (n: number) => number): void {
  const next: (RootContent | ElementContent)[] = [];
  for (const child of parent.children) {
    if (child.type === 'element') {
      // Block math arrives as <pre><code class="language-math math-display">.
      // rehype-katex strips BOTH the <pre> and the <code>, replacing them
      // with KaTeX output spans — so a wrapper around just the <code> would
      // be torn off too. Wrap the <pre> instead.
      const innerMath = getMathChildOfPre(child);
      if (innerMath) {
        const wrapped = wrapMath(child, innerMath, translate);
        next.push(wrapped ?? child);
        continue;
      }
      if (isMathElement(child)) {
        const wrapped = wrapMath(child, child, translate);
        next.push(wrapped ?? child);
        continue;
      }
      walk(child, translate);
      next.push(child);
    } else if (child.type === 'text') {
      const wrapped = wrapTextNode(child, translate);
      next.push(wrapped ?? child);
    } else {
      next.push(child);
    }
  }
  parent.children = next as typeof parent.children;
}

function getMathChildOfPre(el: Element): Element | null {
  if (el.tagName !== 'pre') return null;
  const elementChildren = el.children.filter((c) => c.type === 'element') as Element[];
  if (elementChildren.length !== 1) return null;
  const inner = elementChildren[0];
  return isMathElement(inner) ? inner : null;
}

function wrapTextNode(text: Text, translate: (n: number) => number): Element | null {
  const start = text.position?.start.offset;
  const end = text.position?.end.offset;
  if (start === undefined || end === undefined) return null;
  if (text.value.length === 0) return null;

  return {
    type: 'element',
    tagName: 'span',
    properties: {
      dataMdStart: String(translate(start)),
      dataMdEnd: String(translate(end)),
      dataMdText: 'true',
    },
    children: [text],
    position: text.position,
  };
}

function wrapMath(
  outerEl: Element,
  mathEl: Element,
  translate: (n: number) => number,
): Element | null {
  // Prefer the outer element's position; fall back to the math node's
  // own position when the outer wrapper (e.g. a remark-rehype-inserted
  // <pre>) was synthesized without one.
  const start = outerEl.position?.start.offset ?? mathEl.position?.start.offset;
  const end = outerEl.position?.end.offset ?? mathEl.position?.end.offset;
  if (start === undefined || end === undefined) return null;

  // Block-level math (<pre>… or <div>…) needs a block wrapper; an inline
  // <span> around a block element is invalid HTML and the browser unwraps
  // it, taking our offsets with it.
  const tagName =
    outerEl.tagName === 'pre' || outerEl.tagName === 'div' ? 'div' : 'span';
  return {
    type: 'element',
    tagName,
    properties: {
      dataMdStart: String(translate(start)),
      dataMdEnd: String(translate(end)),
      dataMdAtomic: 'true',
    },
    children: [outerEl],
    position: outerEl.position,
  };
}

function isMathElement(el: Element): boolean {
  const cls = el.properties?.className;
  if (!Array.isArray(cls)) return false;
  return cls.some((c) => typeof c === 'string' && MATH_CLASS_RE.test(c));
}
