import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptInput } from '@/components/composer/PromptInput';

describe('PromptInput', () => {
  const baseProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders contenteditable div with role="textbox"', () => {
    render(<PromptInput {...baseProps} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('has aria-label "Prompt"', () => {
    render(<PromptInput {...baseProps} />);
    expect(screen.getByLabelText('Prompt')).toBeTruthy();
  });

  it('sets default placeholder for chat mode', () => {
    render(<PromptInput {...baseProps} />);
    const el = screen.getByRole('textbox');
    expect(el.getAttribute('data-placeholder')).toBe('Ask coo anything');
  });

  it('sets placeholder for edit mode', () => {
    render(<PromptInput {...baseProps} composerMode="edit" />);
    const el = screen.getByRole('textbox');
    expect(el.getAttribute('data-placeholder')).toBe(
      'Type new content to replace the selected block'
    );
  });

  it('sets placeholder for ask mode with block selected', () => {
    render(<PromptInput {...baseProps} hasBlockSelected composerMode="ask" />);
    const el = screen.getByRole('textbox');
    expect(el.getAttribute('data-placeholder')).toBe('Ask about the selected block');
  });

  it('uses custom placeholder when provided', () => {
    render(<PromptInput {...baseProps} placeholder="Custom" />);
    const el = screen.getByRole('textbox');
    expect(el.getAttribute('data-placeholder')).toBe('Custom');
  });

  it('disables contenteditable when disabled', () => {
    render(<PromptInput {...baseProps} disabled />);
    const el = screen.getByRole('textbox');
    expect(el.getAttribute('contenteditable')).toBe('false');
  });

  it('enables contenteditable when not disabled', () => {
    render(<PromptInput {...baseProps} />);
    const el = screen.getByRole('textbox');
    expect(el.getAttribute('contenteditable')).toBe('true');
  });

  it('calls onSubmit on Enter key', () => {
    const onSubmit = vi.fn();
    render(<PromptInput {...baseProps} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('does not call onSubmit on Shift+Enter', () => {
    const onSubmit = vi.fn();
    render(<PromptInput {...baseProps} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('has id="prompt"', () => {
    const { container } = render(<PromptInput {...baseProps} />);
    expect(container.querySelector('#prompt')).toBeTruthy();
  });

  it('applies disabled styling class', () => {
    render(<PromptInput {...baseProps} disabled />);
    const el = screen.getByRole('textbox');
    expect(el.className).toContain('cursor-not-allowed');
  });
});
