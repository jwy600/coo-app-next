import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DocBlock } from '@/components/chat/DocBlock';
import { createBlock } from '@/tests/mocks/fixtures';

// Stub child components to isolate DocBlock logic
vi.mock('@/components/content/BlockContent', () => ({
  BlockContent: ({ text, type }: { text: string; type: string }) => (
    <div data-testid="block-content" data-type={type}>{text}</div>
  ),
}));

vi.mock('@/components/chat/SelectionChips', () => ({
  SelectionChips: ({ block, onRewrite, onUndo }: {
    block: { selections: string[] };
    onRewrite?: () => void;
    onUndo?: () => void;
  }) => (
    <div data-testid="selection-chips">
      {block.selections.map((s: string, i: number) => <span key={i}>{s}</span>)}
      <button onClick={onRewrite}>Rewrite</button>
      {onUndo && <button onClick={onUndo}>Undo</button>}
    </div>
  ),
}));

describe('DocBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders block content', () => {
    const block = createBlock({ text: 'Hello world' });
    render(<DocBlock block={block} isSelected={false} />);
    expect(screen.getByTestId('block-content').textContent).toBe('Hello world');
  });

  it('sets data-block-id attribute', () => {
    const block = createBlock({ id: 'block-42' });
    const { container } = render(<DocBlock block={block} isSelected={false} />);
    expect(container.querySelector('[data-block-id="block-42"]')).toBeTruthy();
  });

  it('sets data-card-id when cardId provided', () => {
    const block = createBlock();
    const { container } = render(<DocBlock block={block} isSelected={false} cardId="card-1" />);
    expect(container.querySelector('[data-card-id="card-1"]')).toBeTruthy();
  });

  it('renders gutter button with "Select block" for paragraph', () => {
    const block = createBlock({ type: 'paragraph' });
    render(<DocBlock block={block} isSelected={false} />);
    expect(screen.getByLabelText('Select block')).toBeTruthy();
  });

  it('renders gutter button with "Select heading" for heading', () => {
    const block = createBlock({ type: 'heading' });
    render(<DocBlock block={block} isSelected={false} />);
    expect(screen.getByLabelText('Select heading')).toBeTruthy();
  });

  it('applies is-selected class when isSelected is true', () => {
    const block = createBlock();
    const { container } = render(<DocBlock block={block} isSelected={true} />);
    expect(container.querySelector('.is-selected')).toBeTruthy();
  });

  it('applies is-muted class when not selected, not in card, and onSelect provided', () => {
    const block = createBlock();
    const { container } = render(
      <DocBlock block={block} isSelected={false} onSelect={vi.fn()} />
    );
    expect(container.querySelector('.is-muted')).toBeTruthy();
  });

  it('does not apply is-muted when no onSelect callback', () => {
    const block = createBlock();
    const { container } = render(<DocBlock block={block} isSelected={false} />);
    expect(container.querySelector('.is-muted')).toBeNull();
  });

  describe('click behavior', () => {
    it('calls onSelect after CLICK_DELAY on single click', () => {
      const onSelect = vi.fn();
      const block = createBlock({ id: 'block-1' });
      render(<DocBlock block={block} isSelected={false} onSelect={onSelect} />);

      fireEvent.click(screen.getByLabelText('Select block'));
      expect(onSelect).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(200); });
      expect(onSelect).toHaveBeenCalledWith('block-1');
    });

    it('calls onAddCard on double-click and cancels single-click', () => {
      const onSelect = vi.fn();
      const onAddCard = vi.fn();
      const block = createBlock({ id: 'block-1' });
      render(
        <DocBlock block={block} isSelected={false} onSelect={onSelect} onAddCard={onAddCard} />
      );

      const gutter = screen.getByLabelText('Select block');
      fireEvent.click(gutter);
      fireEvent.doubleClick(gutter);

      act(() => { vi.advanceTimersByTime(300); });
      expect(onAddCard).toHaveBeenCalledWith('block-1');
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('calls onSelect immediately on Enter key', () => {
      const onSelect = vi.fn();
      const block = createBlock({ id: 'block-1' });
      render(<DocBlock block={block} isSelected={false} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText('Select block'), { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledWith('block-1');
    });

    it('calls onSelect immediately on Space key', () => {
      const onSelect = vi.fn();
      const block = createBlock({ id: 'block-1' });
      render(<DocBlock block={block} isSelected={false} onSelect={onSelect} />);

      fireEvent.keyDown(screen.getByLabelText('Select block'), { key: ' ' });
      expect(onSelect).toHaveBeenCalledWith('block-1');
    });
  });

  describe('selection chips', () => {
    it('shows SelectionChips when selected and block has selections', () => {
      const block = createBlock({ selections: ['word1'] });
      render(<DocBlock block={block} isSelected={true} />);
      expect(screen.getByTestId('selection-chips')).toBeTruthy();
    });

    it('does not show SelectionChips when not selected', () => {
      const block = createBlock({ selections: ['word1'] });
      render(<DocBlock block={block} isSelected={false} />);
      expect(screen.queryByTestId('selection-chips')).toBeNull();
    });

    it('shows standalone Undo button when selected, has prevText, but no selections', () => {
      const block = createBlock({ selections: [], prevText: 'old text' });
      render(<DocBlock block={block} isSelected={true} />);
      expect(screen.getByText('Undo')).toBeTruthy();
    });

    it('does not show standalone Undo when selections exist (chips handle it)', () => {
      const block = createBlock({ selections: ['word1'], prevText: 'old text' });
      render(<DocBlock block={block} isSelected={true} />);
      // Undo is in SelectionChips, not standalone
      const chipUndoButtons = screen.getAllByText('Undo');
      // Only the one from SelectionChips mock
      expect(chipUndoButtons.length).toBe(1);
    });
  });
});
