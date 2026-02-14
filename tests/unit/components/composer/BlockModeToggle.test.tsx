import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockModeToggle } from '@/components/composer/BlockModeToggle';

describe('BlockModeToggle', () => {
  it('renders Ask and Edit buttons', () => {
    render(<BlockModeToggle mode="ask" onModeChange={() => {}} />);
    expect(screen.getByText('Ask')).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('sets aria-pressed=true on Ask when mode is ask', () => {
    render(<BlockModeToggle mode="ask" onModeChange={() => {}} />);
    expect(screen.getByText('Ask').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Edit').getAttribute('aria-pressed')).toBe('false');
  });

  it('sets aria-pressed=true on Edit when mode is edit', () => {
    render(<BlockModeToggle mode="edit" onModeChange={() => {}} />);
    expect(screen.getByText('Ask').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Edit').getAttribute('aria-pressed')).toBe('true');
  });

  it('calls onModeChange("ask") when Ask clicked', () => {
    const onChange = vi.fn();
    render(<BlockModeToggle mode="edit" onModeChange={onChange} />);
    fireEvent.click(screen.getByText('Ask'));
    expect(onChange).toHaveBeenCalledWith('ask');
  });

  it('calls onModeChange("edit") when Edit clicked', () => {
    const onChange = vi.fn();
    render(<BlockModeToggle mode="ask" onModeChange={onChange} />);
    fireEvent.click(screen.getByText('Edit'));
    expect(onChange).toHaveBeenCalledWith('edit');
  });

  it('disables both buttons when disabled is true', () => {
    render(<BlockModeToggle mode="ask" onModeChange={() => {}} disabled />);
    expect((screen.getByText('Ask') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Edit') as HTMLButtonElement).disabled).toBe(true);
  });

  it('applies disabled styling when disabled', () => {
    render(<BlockModeToggle mode="ask" onModeChange={() => {}} disabled />);
    const askBtn = screen.getByText('Ask');
    expect(askBtn.className).toContain('opacity-50');
  });
});
