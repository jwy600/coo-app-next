import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComposerHint } from '@/components/composer/ComposerHint';

describe('ComposerHint', () => {
  it('renders the hint copy', () => {
    render(<ComposerHint />);
    expect(screen.getByText(/Ask anything/i)).toBeTruthy();
  });
});
