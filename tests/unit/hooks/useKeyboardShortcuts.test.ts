/**
 * Tests for useKeyboardShortcuts hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let originalAddEventListener: typeof document.addEventListener;
  let originalRemoveEventListener: typeof document.removeEventListener;
  let listeners: Map<string, EventListener>;

  beforeEach(() => {
    listeners = new Map();

    originalAddEventListener = document.addEventListener;
    originalRemoveEventListener = document.removeEventListener;

    // Mock addEventListener to track listeners
    document.addEventListener = vi.fn((event: string, listener: any) => {
      listeners.set(event, listener);
    });

    // Mock removeEventListener
    document.removeEventListener = vi.fn((event: string) => {
      listeners.delete(event);
    });
  });

  afterEach(() => {
    document.addEventListener = originalAddEventListener;
    document.removeEventListener = originalRemoveEventListener;
    listeners.clear();
  });

  it('should register keyboard shortcuts', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        Escape: handler,
      })
    );

    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call handler when key is pressed', () => {
    const escapeHandler = vi.fn();
    const enterHandler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        Escape: escapeHandler,
        Enter: enterHandler,
      })
    );

    const listener = listeners.get('keydown');
    expect(listener).toBeDefined();

    // Simulate Escape key
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    listener!(escapeEvent);

    expect(escapeHandler).toHaveBeenCalledTimes(1);
    expect(enterHandler).not.toHaveBeenCalled();

    // Simulate Enter key
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    listener!(enterEvent);

    expect(enterHandler).toHaveBeenCalledTimes(1);
    expect(escapeHandler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler for unregistered keys', () => {
    const handler = vi.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        Escape: handler,
      })
    );

    const listener = listeners.get('keydown');
    expect(listener).toBeDefined();

    // Simulate unregistered key
    const event = new KeyboardEvent('keydown', { key: 'a' });
    listener!(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should remove listener on unmount', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({
        Escape: handler,
      })
    );

    expect(listeners.has('keydown')).toBe(true);

    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should update handlers when shortcuts change', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(
      ({ shortcuts }) => useKeyboardShortcuts(shortcuts),
      {
        initialProps: { shortcuts: { Escape: handler1 } },
      }
    );

    const listener = listeners.get('keydown');
    expect(listener).toBeDefined();

    // Trigger with first handler
    const event1 = new KeyboardEvent('keydown', { key: 'Escape' });
    listener!(event1);
    expect(handler1).toHaveBeenCalledTimes(1);

    // Update shortcuts
    rerender({ shortcuts: { Escape: handler2 } });

    // Trigger with updated handler
    const event2 = new KeyboardEvent('keydown', { key: 'Escape' });
    const updatedListener = listeners.get('keydown');
    updatedListener!(event2);

    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
