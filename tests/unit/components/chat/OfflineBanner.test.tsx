import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from '@/components/chat/OfflineBanner';

describe('OfflineBanner', () => {
  it('renders with alert role', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('renders offline message text', () => {
    render(<OfflineBanner />);
    expect(screen.getByText(/Offline mode/)).toBeTruthy();
    expect(screen.getByText(/data is not saved/)).toBeTruthy();
  });
});
