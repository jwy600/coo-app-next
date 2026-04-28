import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Propagates each mdast node's source position (character offsets into the
 * original markdown) onto the rendered HTML element as `data-md-start` /
 * `data-md-end`. Lets the focus-mode selection layer map DOM ranges back to
 * source markdown character ranges.
 */
export const remarkSourcePositions: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start === undefined || end === undefined) return;

    const data = (node.data ??= {});
    const hProperties = ((data as { hProperties?: Record<string, unknown> })
      .hProperties ??= {});
    hProperties.dataMdStart = String(start);
    hProperties.dataMdEnd = String(end);
  });
};
