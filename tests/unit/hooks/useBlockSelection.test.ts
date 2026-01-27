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
      selectedBlockIds: [],
      mode: 'thread',
      threads: [],
      blocks: [],
      activeThreadId: '',
      isAwaitingResponse: false,
    });
  });

  it('should initialize with no selection', () => {
    const { result } = renderHook(() => useBlockSelection());

    expect(result.current.selectedBlockIds).toEqual([]);
    expect(result.current.selectedBlockCount).toBe(0);
    expect(result.current.hasSelection).toBe(false);
    expect(result.current.isSingleBlockMode).toBe(false);
    expect(result.current.isMultiSelectMode).toBe(false);
  });

  it('should select a block', () => {
    const { result } = renderHook(() => useBlockSelection());

    act(() => {
      result.current.toggleBlockSelection('block-1');
    });

    expect(result.current.selectedBlockIds).toEqual(['block-1']);
    expect(result.current.selectedBlockCount).toBe(1);
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.isSingleBlockMode).toBe(true);
    expect(result.current.isMultiSelectMode).toBe(false);
    expect(result.current.isBlockSelected('block-1')).toBe(true);
  });

  it('should toggle block selection (add and remove)', () => {
    const { result } = renderHook(() => useBlockSelection());

    // Select block
    act(() => {
      result.current.toggleBlockSelection('block-1');
    });
    expect(result.current.selectedBlockIds).toEqual(['block-1']);

    // Toggle same block (should deselect)
    act(() => {
      result.current.toggleBlockSelection('block-1');
    });
    expect(result.current.selectedBlockIds).toEqual([]);
    expect(result.current.hasSelection).toBe(false);
  });

  it('should support multi-select (add multiple blocks)', () => {
    const { result } = renderHook(() => useBlockSelection());

    // Select first block
    act(() => {
      result.current.toggleBlockSelection('block-1');
    });
    expect(result.current.selectedBlockIds).toEqual(['block-1']);
    expect(result.current.isSingleBlockMode).toBe(true);
    expect(result.current.isMultiSelectMode).toBe(false);

    // Select second block
    act(() => {
      result.current.toggleBlockSelection('block-2');
    });
    expect(result.current.selectedBlockIds).toEqual(['block-1', 'block-2']);
    expect(result.current.selectedBlockCount).toBe(2);
    expect(result.current.isSingleBlockMode).toBe(false);
    expect(result.current.isMultiSelectMode).toBe(true);
    expect(result.current.isBlockSelected('block-1')).toBe(true);
    expect(result.current.isBlockSelected('block-2')).toBe(true);
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useBlockSelection());

    // Select multiple blocks
    act(() => {
      result.current.toggleBlockSelection('block-1');
      result.current.toggleBlockSelection('block-2');
    });
    expect(result.current.selectedBlockIds).toEqual(['block-1', 'block-2']);

    // Clear selection
    act(() => {
      result.current.clearSelection();
    });
    expect(result.current.selectedBlockIds).toEqual([]);
    expect(result.current.hasSelection).toBe(false);
  });

  it('should maintain selection order', () => {
    const { result } = renderHook(() => useBlockSelection());

    act(() => {
      result.current.toggleBlockSelection('block-3');
      result.current.toggleBlockSelection('block-1');
      result.current.toggleBlockSelection('block-2');
    });

    // Order should be preserved (selection order, not block order)
    expect(result.current.selectedBlockIds).toEqual(['block-3', 'block-1', 'block-2']);
  });

  it('should check if specific block is selected', () => {
    const { result } = renderHook(() => useBlockSelection());

    act(() => {
      result.current.toggleBlockSelection('block-1');
    });

    expect(result.current.isBlockSelected('block-1')).toBe(true);
    expect(result.current.isBlockSelected('block-2')).toBe(false);
  });
});
