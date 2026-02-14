import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionChips } from '@/components/chat/SelectionChips';
import { createBlock } from '@/tests/mocks/fixtures';

describe('SelectionChips', () => {
  it('returns null when selections array is empty', () => {
    const block = createBlock({ selections: [] });
    const { container } = render(<SelectionChips block={block} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a chip for each selection', () => {
    const block = createBlock({ selections: ['word1', 'word2', 'word3'] });
    render(<SelectionChips block={block} />);
    expect(screen.getByText('word1')).toBeTruthy();
    expect(screen.getByText('word2')).toBeTruthy();
    expect(screen.getByText('word3')).toBeTruthy();
  });

  it('sets title attribute on chip for long text', () => {
    const block = createBlock({ selections: ['a long selection text'] });
    render(<SelectionChips block={block} />);
    const chip = screen.getByTitle('a long selection text');
    expect(chip).toBeTruthy();
  });

  it('calls onRemoveSelection with correct index when X clicked', () => {
    const onRemove = vi.fn();
    const block = createBlock({ selections: ['first', 'second'] });
    render(<SelectionChips block={block} onRemoveSelection={onRemove} />);

    const removeButtons = screen.getAllByLabelText('Remove selection');
    fireEvent.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('always shows Rewrite button when selections exist', () => {
    const block = createBlock({ selections: ['some text'] });
    render(<SelectionChips block={block} />);
    expect(screen.getByText('Rewrite')).toBeTruthy();
  });

  it('calls onRewrite when Rewrite clicked', () => {
    const onRewrite = vi.fn();
    const block = createBlock({ selections: ['some text'] });
    render(<SelectionChips block={block} onRewrite={onRewrite} />);

    fireEvent.click(screen.getByText('Rewrite'));
    expect(onRewrite).toHaveBeenCalledTimes(1);
  });

  it('shows Undo button when block.prevText is not null', () => {
    const block = createBlock({ selections: ['text'], prevText: 'old text' });
    render(<SelectionChips block={block} />);
    expect(screen.getByText('Undo')).toBeTruthy();
  });

  it('does not show Undo button when block.prevText is null', () => {
    const block = createBlock({ selections: ['text'], prevText: null });
    render(<SelectionChips block={block} />);
    expect(screen.queryByText('Undo')).toBeNull();
  });

  it('calls onUndo when Undo clicked', () => {
    const onUndo = vi.fn();
    const block = createBlock({ selections: ['text'], prevText: 'old' });
    render(<SelectionChips block={block} onUndo={onUndo} />);

    fireEvent.click(screen.getByText('Undo'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
