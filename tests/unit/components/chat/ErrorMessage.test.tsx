import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from '@/components/chat/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders "Coo" label', () => {
    render(<ErrorMessage error="Something went wrong" />);
    expect(screen.getByText('Coo')).toBeTruthy();
  });

  it('renders error text', () => {
    render(<ErrorMessage error="Network timeout" />);
    expect(screen.getByText('Network timeout')).toBeTruthy();
  });

  it('renders Retry button when onRetry provided', () => {
    render(<ErrorMessage error="Error" onRetry={() => {}} />);
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('does not render Retry button when onRetry is undefined', () => {
    render(<ErrorMessage error="Error" />);
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('calls onRetry when Retry clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorMessage error="Error" onRetry={onRetry} />);

    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
