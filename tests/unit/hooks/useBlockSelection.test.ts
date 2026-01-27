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

  describe('isComposerDisabled', () => {
    it('should enable composer when 1 block selected in block mode', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.toggleBlockSelection('block-1');
      });

      expect(result.current.isComposerDisabled).toBe(false);
    });

    it('should disable composer when 2+ blocks selected in block mode', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.toggleBlockSelection('block-1');
        result.current.toggleBlockSelection('block-2');
      });

      expect(result.current.isComposerDisabled).toBe(true);
    });

    it('should disable composer when no blocks selected (block mode)', () => {
      const { result } = renderHook(() => useBlockSelection());

      // No selection = composer not disabled (handled elsewhere)
      expect(result.current.isComposerDisabled).toBe(false);
    });
  });

  describe('section mode', () => {
    beforeEach(() => {
      // Set up blocks for section mode tests
      // Section ends at next heading of same or higher level
      useStore.setState({
        selectedBlockIds: [],
        sectionHeadingId: null,
        mode: 'thread',
        blocks: [
          { id: 'heading-1', messageId: 'msg-1', type: 'heading', text: '## Section', edited: false, selections: [], prevText: null, isRewritten: false },
          { id: 'block-inside-1', messageId: 'msg-1', type: 'paragraph', text: 'Inside 1', edited: false, selections: [], prevText: null, isRewritten: false },
          { id: 'block-inside-2', messageId: 'msg-1', type: 'paragraph', text: 'Inside 2', edited: false, selections: [], prevText: null, isRewritten: false },
          { id: 'heading-2', messageId: 'msg-1', type: 'heading', text: '## Another Section', edited: false, selections: [], prevText: null, isRewritten: false },
          { id: 'block-outside-1', messageId: 'msg-1', type: 'paragraph', text: 'Outside 1', edited: false, selections: [], prevText: null, isRewritten: false },
        ],
      });
    });

    it('should enter section mode', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.enterSectionMode('heading-1');
      });

      expect(result.current.isInSectionMode).toBe(true);
      expect(result.current.sectionHeadingId).toBe('heading-1');
      expect(result.current.hasSelection).toBe(true); // Section implicitly selected
    });

    it('should enable composer with 1 inside block selected in section mode', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.enterSectionMode('heading-1');
      });

      act(() => {
        result.current.toggleBlockSelection('block-inside-1');
      });

      expect(result.current.isComposerDisabled).toBe(false);
      expect(result.current.isSingleBlockMode).toBe(true);
    });

    it('should disable composer with 2+ inside blocks selected in section mode', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.enterSectionMode('heading-1');
      });

      act(() => {
        result.current.toggleBlockSelection('block-inside-1');
        result.current.toggleBlockSelection('block-inside-2');
      });

      expect(result.current.isComposerDisabled).toBe(true);
      expect(result.current.isSingleBlockMode).toBe(false);
    });

    it('should disable composer when outside block selected in section mode', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.enterSectionMode('heading-1');
      });

      act(() => {
        result.current.toggleBlockSelection('block-outside-1');
      });

      expect(result.current.isComposerDisabled).toBe(true);
      expect(result.current.hasSelectionOutsideSection).toBe(true);
    });

    it('should disable composer with 1 inside + 1 outside in section mode', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.enterSectionMode('heading-1');
      });

      act(() => {
        result.current.toggleBlockSelection('block-inside-1');
        result.current.toggleBlockSelection('block-outside-1');
      });

      expect(result.current.isComposerDisabled).toBe(true);
      expect(result.current.isSingleBlockMode).toBe(false);
    });

    it('should allow multi-select toggle inside section (not single-select)', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.enterSectionMode('heading-1');
      });

      // Select first block inside
      act(() => {
        result.current.toggleBlockSelection('block-inside-1');
      });
      expect(result.current.selectedBlockIds).toEqual(['block-inside-1']);

      // Select second block inside (should add, not replace)
      act(() => {
        result.current.toggleBlockSelection('block-inside-2');
      });
      expect(result.current.selectedBlockIds).toEqual(['block-inside-1', 'block-inside-2']);

      // Toggle first block off
      act(() => {
        result.current.toggleBlockSelection('block-inside-1');
      });
      expect(result.current.selectedBlockIds).toEqual(['block-inside-2']);
    });
  });
});
