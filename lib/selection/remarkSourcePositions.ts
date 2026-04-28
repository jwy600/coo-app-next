import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

export interface SourcePositionsOptions {
  /**
   * Translates a parsed-text offset into an original-text offset. Used when
   * the input has been normalized before parsing (e.g. converting `\(...\)`
   * inline math to `$...$`) so the emitted `data-md-*` values correspond to
   * positions in the user-visible `message.text`, not the normalized form.
   */
  translate?: (offset: number) => number;
}

/**
 * Propagates each mdast node's source position (character offsets into the
 * original markdown) onto the rendered HTML element as `data-md-start` /
 * `data-md-end`. Lets the focus-mode selection layer map DOM ranges back to
 * source markdown character ranges.
 */
export const remarkSourcePositions: Plugin<[SourcePositionsOptions?], Root> =
  (options = {}) => (tree) => {
    const translate = options.translate ?? identity;
    visit(tree, (node) => {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined) return;

      const data = (node.data ??= {});
      const hProperties = ((data as { hProperties?: Record<string, unknown> })
        .hProperties ??= {});
      hProperties.dataMdStart = String(translate(start));
      hProperties.dataMdEnd = String(translate(end));
    });
  };

function identity(n: number): number {
  return n;
}
