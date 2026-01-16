import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PendingMessage } from '@/components/chat/PendingMessage';

describe('PendingMessage Component', () => {
  it('should render assistant label', () => {
    render(<PendingMessage />);
    expect(screen.getByText('Coo')).toBeDefined();
  });

  it('should render thinking text', () => {
    render(<PendingMessage />);
    expect(screen.getByText('Thinking…')).toBeDefined();
  });

  it('should render skeleton lines', () => {
    const { container } = render(<PendingMessage />);
    const skeletonLines = container.querySelectorAll('.animate-pulse-slow');
    expect(skeletonLines.length).toBe(3);
  });
});
