import { describe, it, expect } from 'vitest';
import {
  computeDefaultCardTitle,
  stripHeadingMarkdown,
} from '@/lib/export/defaultCardTitle';
import type { Block } from '@/types/block';
import type { Card } from '@/types/card';

const makeBlock = (overrides: Partial<Block>): Block => ({
  id: 'b1',
  messageId: 'm1',
  type: 'paragraph',
  text: 'some text',
  edited: false,
  selections: [],
  prevText: null,
  isRewritten: false,
  ...overrides,
});

const makeCard = (overrides: Partial<Card>): Card => ({
  id: 'c1',
  messageId: 'm1',
  anchorBlockId: 'b1',
  blockIds: ['b1'],
  createdAt: 0,
  ...overrides,
});

describe('stripHeadingMarkdown', () => {
  it('strips a single leading #', () => {
    expect(stripHeadingMarkdown('# Title')).toBe('Title');
  });

  it('strips multiple leading #', () => {
    expect(stripHeadingMarkdown('### Title')).toBe('Title');
  });

  it('trims whitespace', () => {
    expect(stripHeadingMarkdown('##   Title  ')).toBe('Title');
  });

  it('returns empty when only hashes', () => {
    expect(stripHeadingMarkdown('###')).toBe('');
  });

  it('leaves non-heading text alone', () => {
    expect(stripHeadingMarkdown('Just text')).toBe('Just text');
  });
});

describe('computeDefaultCardTitle', () => {
  const threadTitle = 'Thread Title';

  it('returns thread title when no cards exist', () => {
    expect(computeDefaultCardTitle(threadTitle, [], [])).toBe('Thread Title');
  });

  it('returns thread title when no card anchors a heading', () => {
    const blocks = [
      makeBlock({ id: 'b1', type: 'paragraph', text: 'Para 1' }),
      makeBlock({ id: 'b2', type: 'paragraph', text: 'Para 2' }),
    ];
    const cards = [makeCard({ id: 'c1', anchorBlockId: 'b1' })];
    expect(computeDefaultCardTitle(threadTitle, cards, blocks)).toBe(
      'Thread Title',
    );
  });

  it('uses heading text when a card anchors a heading', () => {
    const blocks = [
      makeBlock({ id: 'b1', type: 'heading', text: '## Introduction' }),
      makeBlock({ id: 'b2', type: 'paragraph', text: 'Body' }),
    ];
    const cards = [makeCard({ id: 'c1', anchorBlockId: 'b1' })];
    expect(computeDefaultCardTitle(threadTitle, cards, blocks)).toBe(
      'Introduction - Thread Title',
    );
  });

  it('ignores a heading later in the card — only the anchor matters', () => {
    const blocks = [
      makeBlock({ id: 'b1', type: 'paragraph', text: 'Para' }),
      makeBlock({ id: 'b2', type: 'heading', text: '# Later' }),
    ];
    const cards = [makeCard({ id: 'c1', anchorBlockId: 'b1' })];
    expect(computeDefaultCardTitle(threadTitle, cards, blocks)).toBe(
      'Thread Title',
    );
  });

  it('picks the first heading-anchored card in document order', () => {
    const blocks = [
      makeBlock({ id: 'b1', type: 'paragraph', text: 'p1' }),
      makeBlock({ id: 'b2', type: 'heading', text: '# First Heading' }),
      makeBlock({ id: 'b3', type: 'paragraph', text: 'p2' }),
      makeBlock({ id: 'b4', type: 'heading', text: '# Second Heading' }),
    ];
    const cards = [
      makeCard({ id: 'c2', anchorBlockId: 'b4' }),
      makeCard({ id: 'c1', anchorBlockId: 'b2' }),
    ];
    expect(computeDefaultCardTitle(threadTitle, cards, blocks)).toBe(
      'First Heading - Thread Title',
    );
  });

  it('falls back to thread title when heading text is empty after stripping', () => {
    const blocks = [makeBlock({ id: 'b1', type: 'heading', text: '###' })];
    const cards = [makeCard({ id: 'c1', anchorBlockId: 'b1' })];
    expect(computeDefaultCardTitle(threadTitle, cards, blocks)).toBe(
      'Thread Title',
    );
  });

  it('uses "Untitled" when thread title is empty', () => {
    const blocks = [
      makeBlock({ id: 'b1', type: 'paragraph', text: 'Para' }),
    ];
    const cards = [makeCard({ id: 'c1', anchorBlockId: 'b1' })];
    expect(computeDefaultCardTitle('', cards, blocks)).toBe('Untitled');
  });

  it('uses "Untitled" when thread title is whitespace only', () => {
    expect(computeDefaultCardTitle('   ', [], [])).toBe('Untitled');
  });

  it('combines heading with Untitled when thread title is empty', () => {
    const blocks = [
      makeBlock({ id: 'b1', type: 'heading', text: '# Anchor' }),
    ];
    const cards = [makeCard({ id: 'c1', anchorBlockId: 'b1' })];
    expect(computeDefaultCardTitle('', cards, blocks)).toBe(
      'Anchor - Untitled',
    );
  });

  it('truncates a very long heading', () => {
    const longHeading = 'A'.repeat(200);
    const blocks = [
      makeBlock({ id: 'b1', type: 'heading', text: `# ${longHeading}` }),
    ];
    const cards = [makeCard({ id: 'c1', anchorBlockId: 'b1' })];
    const result = computeDefaultCardTitle(threadTitle, cards, blocks);
    expect(result.length).toBeLessThan(longHeading.length + threadTitle.length);
    expect(result.endsWith(' - Thread Title')).toBe(true);
  });

  it('falls back to thread title when anchor block is missing from allBlocks', () => {
    const blocks = [
      makeBlock({ id: 'b2', type: 'paragraph', text: 'Para' }),
    ];
    const cards = [makeCard({ id: 'c1', anchorBlockId: 'missing' })];
    expect(computeDefaultCardTitle(threadTitle, cards, blocks)).toBe(
      'Thread Title',
    );
  });

  it('skips non-heading-anchored cards and uses a later heading-anchored one', () => {
    const blocks = [
      makeBlock({ id: 'b1', type: 'paragraph', text: 'Para' }),
      makeBlock({ id: 'b2', type: 'heading', text: '## Real Heading' }),
    ];
    const cards = [
      makeCard({ id: 'c1', anchorBlockId: 'b1' }),
      makeCard({ id: 'c2', anchorBlockId: 'b2' }),
    ];
    expect(computeDefaultCardTitle(threadTitle, cards, blocks)).toBe(
      'Real Heading - Thread Title',
    );
  });
});
