import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Composer } from '@/components/composer/Composer';

// Stub children to isolate Composer logic
vi.mock('@/components/composer/PromptInput', () => ({
  PromptInput: ({ value, disabled, hasBlockSelected, composerMode }: {
    value: string;
    disabled: boolean;
    hasBlockSelected: boolean;
    composerMode: string;
  }) => (
    <div
      data-testid="prompt-input"
      data-value={value}
      data-disabled={disabled}
      data-has-block={hasBlockSelected}
      data-mode={composerMode}
    />
  ),
}));

vi.mock('@/components/composer/ComposerHint', () => ({
  ComposerHint: ({ hidden }: { hidden: boolean }) =>
    hidden ? null : <div data-testid="composer-hint">Hint</div>,
}));

vi.mock('@/components/composer/BlockModeToggle', () => ({
  BlockModeToggle: ({ mode, onModeChange }: { mode: string; onModeChange: (m: string) => void }) => (
    <div data-testid="mode-toggle" data-mode={mode}>
      <button onClick={() => onModeChange('ask')}>Ask</button>
      <button onClick={() => onModeChange('edit')}>Edit</button>
    </div>
  ),
}));

vi.mock('@/components/chat/BlockControls', () => ({
  BlockControls: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="block-controls" data-disabled={disabled}>Controls</div>
  ),
}));

describe('Composer', () => {
  const baseProps = {
    selectedBlockId: null as string | null,
    prompt: '',
    onPromptChange: vi.fn(),
    onSubmit: vi.fn(),
  };

  describe('chat mode (no block selected)', () => {
    it('renders PromptInput and Send button', () => {
      render(<Composer {...baseProps} />);
      expect(screen.getByTestId('prompt-input')).toBeTruthy();
      expect(screen.getByText('Send')).toBeTruthy();
    });

    it('renders ComposerHint', () => {
      render(<Composer {...baseProps} />);
      expect(screen.getByTestId('composer-hint')).toBeTruthy();
    });

    it('does not render BlockModeToggle', () => {
      render(<Composer {...baseProps} />);
      expect(screen.queryByTestId('mode-toggle')).toBeNull();
    });

    it('does not render BlockControls', () => {
      render(<Composer {...baseProps} />);
      expect(screen.queryByTestId('block-controls')).toBeNull();
    });

    it('shows arrow icon for Send', () => {
      render(<Composer {...baseProps} />);
      expect(screen.getByText('→')).toBeTruthy();
    });
  });

  describe('block selected - ask mode', () => {
    const blockProps = {
      ...baseProps,
      selectedBlockId: 'block-1',
      composerMode: 'ask' as const,
      onComposerModeChange: vi.fn(),
    };

    it('renders BlockModeToggle', () => {
      render(<Composer {...blockProps} />);
      expect(screen.getByTestId('mode-toggle')).toBeTruthy();
    });

    it('renders BlockControls in ask mode', () => {
      render(<Composer {...blockProps} />);
      expect(screen.getByTestId('block-controls')).toBeTruthy();
    });

    it('hides ComposerHint when block selected', () => {
      render(<Composer {...blockProps} />);
      expect(screen.queryByTestId('composer-hint')).toBeNull();
    });
  });

  describe('block selected - edit mode', () => {
    const editProps = {
      ...baseProps,
      selectedBlockId: 'block-1',
      composerMode: 'edit' as const,
      onComposerModeChange: vi.fn(),
    };

    it('does not render BlockControls in edit mode', () => {
      render(<Composer {...editProps} />);
      expect(screen.queryByTestId('block-controls')).toBeNull();
    });

    it('shows "Replace" button text', () => {
      render(<Composer {...editProps} />);
      expect(screen.getByText('Replace')).toBeTruthy();
    });

    it('shows refresh icon for Replace', () => {
      render(<Composer {...editProps} />);
      expect(screen.getByText('↻')).toBeTruthy();
    });
  });

  describe('disabled state', () => {
    it('disables Submit button when disabled', () => {
      render(<Composer {...baseProps} disabled />);
      const button = screen.getByText('Send').closest('button') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('passes disabled to PromptInput', () => {
      render(<Composer {...baseProps} disabled />);
      expect(screen.getByTestId('prompt-input').getAttribute('data-disabled')).toBe('true');
    });
  });

  describe('form submission', () => {
    it('calls onSubmit on form submit', () => {
      const onSubmit = vi.fn((e: Event) => e.preventDefault());
      render(<Composer {...baseProps} onSubmit={onSubmit} />);
      fireEvent.submit(screen.getByTestId('prompt-input').closest('form')!);
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
