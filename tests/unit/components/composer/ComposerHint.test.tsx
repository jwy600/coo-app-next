import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComposerHint } from '@/components/composer/ComposerHint';

describe('ComposerHint', () => {
  it('renders tip text when not hidden', () => {
    render(<ComposerHint />);
    expect(screen.getByText(/Tip: click the 4-dot handle/)).toBeTruthy();
  });

  it('returns null when hidden is true', () => {
    const { container } = render(<ComposerHint hidden />);
    expect(container.innerHTML).toBe('');
  });

  it('renders tip text when hidden is explicitly false', () => {
    render(<ComposerHint hidden={false} />);
    expect(screen.getByText(/Tip: click the 4-dot handle/)).toBeTruthy();
  });
});
