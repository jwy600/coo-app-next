/**
 * Tests for useBlockSelection hook
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlockSelection } from '@/hooks/useBlockSelection';
import { useStore } from '@/lib/store/useStore';

describe('useBlockSelection', () => {
  beforeEach(() => {
    // Reset store state before each test
    // IMPORTANT: mode must be 'thread' for block selection to work
    useStore.setState({
      selectedBlockId: null,
      mode: 'thread',
      threads: [],
      blocks: [],
      activeThreadId: '',
      hasInitialResponse: false,
      isAwaitingResponse: false,
    });
  });

  it('should initialize with no selection', () => {
    const { result } = renderHook(() => useBlockSelection());

    expect(result.current.selectedBlockId).toBe(null);
    expect(result.current.isComposerBlockMode).toBe(false);
  });

  it('should select a block', () => {
    const { result } = renderHook(() => useBlockSelection());

    act(() => {
      result.current.selectBlock('block-1');
    });

    expect(result.current.selectedBlockId).toBe('block-1');
    expect(result.current.isComposerBlockMode).toBe(true);
  });

  it('should toggle block selection', () => {
    const { result } = renderHook(() => useBlockSelection());

    // Select block
    act(() => {
      result.current.selectBlock('block-1');
    });
    expect(result.current.selectedBlockId).toBe('block-1');

    // Toggle same block (should deselect)
    act(() => {
      result.current.selectBlock('block-1');
    });
    expect(result.current.selectedBlockId).toBe(null);
    expect(result.current.isComposerBlockMode).toBe(false);
  });

  it('should switch to different block', () => {
    const { result } = renderHook(() => useBlockSelection());

    // Select first block
    act(() => {
      result.current.selectBlock('block-1');
    });
    expect(result.current.selectedBlockId).toBe('block-1');

    // Select different block
    act(() => {
      result.current.selectBlock('block-2');
    });
    expect(result.current.selectedBlockId).toBe('block-2');
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useBlockSelection());

    // Select block
    act(() => {
      result.current.selectBlock('block-1');
    });
    expect(result.current.selectedBlockId).toBe('block-1');

    // Clear selection
    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedBlockId).toBe(null);
    expect(result.current.isComposerBlockMode).toBe(false);
  });
});
