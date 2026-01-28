/**
 * Tests for useBlockSelection hook
 *
 * Tests single-select block selection and card management
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
      cards: [],
      mode: 'thread',
      threads: [],
      blocks: [],
      activeThreadId: '',
      isAwaitingResponse: false,
    });
  });

  it('should initialize with no selection', () => {
    const { result } = renderHook(() => useBlockSelection());

    expect(result.current.selectedBlockId).toBeNull();
    expect(result.current.hasSelection).toBe(false);
  });

  it('should select a block', () => {
    const { result } = renderHook(() => useBlockSelection());

    act(() => {
      result.current.selectBlock('block-1');
    });

    expect(result.current.selectedBlockId).toBe('block-1');
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.isBlockSelected('block-1')).toBe(true);
  });

  it('should toggle block selection (select and deselect same block)', () => {
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
    expect(result.current.selectedBlockId).toBeNull();
    expect(result.current.hasSelection).toBe(false);
  });

  it('should replace selection when selecting different block (single-select)', () => {
    const { result } = renderHook(() => useBlockSelection());

    // Select first block
    act(() => {
      result.current.selectBlock('block-1');
    });
    expect(result.current.selectedBlockId).toBe('block-1');

    // Select second block (should replace, not add)
    act(() => {
      result.current.selectBlock('block-2');
    });
    expect(result.current.selectedBlockId).toBe('block-2');
    expect(result.current.isBlockSelected('block-1')).toBe(false);
    expect(result.current.isBlockSelected('block-2')).toBe(true);
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
    expect(result.current.selectedBlockId).toBeNull();
    expect(result.current.hasSelection).toBe(false);
  });

  it('should check if specific block is selected', () => {
    const { result } = renderHook(() => useBlockSelection());

    act(() => {
      result.current.selectBlock('block-1');
    });

    expect(result.current.isBlockSelected('block-1')).toBe(true);
    expect(result.current.isBlockSelected('block-2')).toBe(false);
  });

  describe('card management', () => {
    beforeEach(() => {
      // Set up blocks for card tests
      useStore.setState({
        selectedBlockId: null,
        cards: [],
        mode: 'thread',
        blocks: [
          { id: 'block-1', messageId: 'msg-1', type: 'paragraph', text: 'Block 1', edited: false, selections: [], prevText: null, isRewritten: false },
          { id: 'block-2', messageId: 'msg-1', type: 'paragraph', text: 'Block 2', edited: false, selections: [], prevText: null, isRewritten: false },
          { id: 'block-3', messageId: 'msg-1', type: 'paragraph', text: 'Block 3', edited: false, selections: [], prevText: null, isRewritten: false },
        ],
        threads: [],
        activeThreadId: '',
        isAwaitingResponse: false,
      });
    });

    it('should initialize with no cards', () => {
      const { result } = renderHook(() => useBlockSelection());

      expect(result.current.cards).toEqual([]);
    });

    it('should add a card', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.addCard('block-1');
      });

      expect(result.current.cards).toHaveLength(1);
      expect(result.current.cards[0].anchorBlockId).toBe('block-1');
    });

    it('should check if block is in card', () => {
      const { result } = renderHook(() => useBlockSelection());

      expect(result.current.isBlockInCard('block-1')).toBe(false);

      act(() => {
        result.current.addCard('block-1');
      });

      expect(result.current.isBlockInCard('block-1')).toBe(true);
      expect(result.current.isBlockInCard('block-2')).toBe(false);
    });

    it('should get card for block', () => {
      const { result } = renderHook(() => useBlockSelection());

      expect(result.current.getCardForBlock('block-1')).toBeUndefined();

      act(() => {
        result.current.addCard('block-1');
      });

      const card = result.current.getCardForBlock('block-1');
      expect(card).toBeDefined();
      expect(card?.anchorBlockId).toBe('block-1');
    });

    it('should remove a card', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.addCard('block-1');
      });

      const cardId = result.current.cards[0].id;
      expect(result.current.cards).toHaveLength(1);

      act(() => {
        result.current.removeCard(cardId);
      });

      expect(result.current.cards).toHaveLength(0);
      expect(result.current.isBlockInCard('block-1')).toBe(false);
    });

    it('should not add duplicate cards for same block', () => {
      const { result } = renderHook(() => useBlockSelection());

      act(() => {
        result.current.addCard('block-1');
      });

      act(() => {
        result.current.addCard('block-1');
      });

      // Should toggle off (remove the card) when adding to same block
      expect(result.current.cards).toHaveLength(0);
    });
  });
});
