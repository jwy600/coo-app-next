import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptInput } from '@/components/composer/PromptInput';

describe('PromptInput', () => {
  const baseProps = { value: '', onChange: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a contenteditable div with role="textbox"', () => {
    render(<PromptInput {...baseProps} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('uses the default placeholder when none is provided', () => {
    render(<PromptInput {...baseProps} />);
    expect(screen.getByRole('textbox').getAttribute('data-placeholder')).toBe(
      'Ask anything',
    );
  });

  it('uses a custom placeholder when provided', () => {
    render(<PromptInput {...baseProps} placeholder="Custom" />);
    expect(screen.getByRole('textbox').getAttribute('data-placeholder')).toBe('Custom');
  });

  it('respects the disabled prop on contenteditable', () => {
    render(<PromptInput {...baseProps} disabled />);
    expect(screen.getByRole('textbox').getAttribute('contenteditable')).toBe('false');
  });

  it('submits on Enter and inserts newline on Shift+Enter', () => {
    const onSubmit = vi.fn();
    render(<PromptInput {...baseProps} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
