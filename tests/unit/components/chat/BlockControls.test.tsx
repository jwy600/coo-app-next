import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockControls } from '@/components/chat/BlockControls';

describe('BlockControls', () => {
  it('renders all 4 action badges', () => {
    render(<BlockControls />);
    expect(screen.getByText('Translate')).toBeTruthy();
    expect(screen.getByText('Example')).toBeTruthy();
    expect(screen.getByText('Expand')).toBeTruthy();
    expect(screen.getByText('ELI5')).toBeTruthy();
  });

  it('calls onAction with correct action string on click', () => {
    const onAction = vi.fn();
    render(<BlockControls onAction={onAction} />);

    fireEvent.click(screen.getByText('Translate'));
    expect(onAction).toHaveBeenCalledWith('translate');

    fireEvent.click(screen.getByText('Example'));
    expect(onAction).toHaveBeenCalledWith('example');

    fireEvent.click(screen.getByText('Expand'));
    expect(onAction).toHaveBeenCalledWith('expand');

    fireEvent.click(screen.getByText('ELI5'));
    expect(onAction).toHaveBeenCalledWith('eli5');
  });

  it('does not call onAction when disabled', () => {
    const onAction = vi.fn();
    render(<BlockControls onAction={onAction} disabled />);

    fireEvent.click(screen.getByText('Translate'));
    expect(onAction).not.toHaveBeenCalled();
  });

  it('applies disabled styling when disabled', () => {
    const { container } = render(<BlockControls disabled />);
    const badges = container.querySelectorAll('.opacity-50');
    expect(badges.length).toBe(4);
  });

  it('applies cursor-pointer when not disabled', () => {
    const { container } = render(<BlockControls />);
    const badges = container.querySelectorAll('.cursor-pointer');
    expect(badges.length).toBe(4);
  });
});
