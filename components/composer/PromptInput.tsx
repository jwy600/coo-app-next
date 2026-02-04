'use client';

import { useRef, useEffect } from 'react';
import type { ComposerMode } from '@/types/state/ui';

/**
 * Client Component - Contenteditable input with text selection capture
 * Reference: MIGRATION_PLAN.md Section 10.2, legacy/app.js lines 858-897
 * Needs 'use client' for contenteditable, text selection, onChange
 *
 * CRITICAL: Uses contenteditable (not textarea) to support text selection capture
 */
interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionCapture?: (element: HTMLElement | null) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  hasBlockSelected?: boolean;
  composerMode?: ComposerMode;
}

export function PromptInput({
  value,
  onChange,
  onSelectionCapture,
  onSubmit,
  placeholder,
  disabled = false,
  hasBlockSelected = false,
  composerMode = 'chat',
}: PromptInputProps) {
  // Set default placeholder based on composer mode
  const getDefaultPlaceholder = () => {
    if (composerMode === 'edit') {
      return 'Type new content to replace the selected block';
    }
    if (hasBlockSelected) {
      return 'Ask about the selected block';
    }
    return 'Ask coo anything';
  };

  const finalPlaceholder = placeholder || getDefaultPlaceholder();
  const inputRef = useRef<HTMLDivElement>(null);
  const isUserInputRef = useRef<boolean>(false);
  // Track mouse drag state for selection capture (only drag creates chips, not clicks)
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Sync value to DOM (preserve cursor position)
  useEffect(() => {
    if (!inputRef.current) return;

    // Don't sync if this is a user input change - it would reset cursor position
    if (isUserInputRef.current) {
      isUserInputRef.current = false;
      return;
    }

    // Only sync if value is actually different (external change)
    const currentText = inputRef.current.textContent || '';
    if (currentText.trim() !== value.trim()) {
      // Save cursor position
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const offset = range?.startOffset || 0;

      // Update content
      inputRef.current.textContent = value;

      // Restore cursor position
      if (selection && inputRef.current.firstChild) {
        try {
          const newRange = document.createRange();
          const textNode = inputRef.current.firstChild;
          const maxOffset = (textNode.textContent || '').length;
          newRange.setStart(textNode, Math.min(offset, maxOffset));
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch (e) {
          // Ignore cursor restoration errors
        }
      }
    }
  }, [value]);

  const handleInput = () => {
    if (inputRef.current) {
      isUserInputRef.current = true;
      const text = inputRef.current.textContent || '';
      onChange(text.replace(/\u00a0/g, ' ').trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (but allow Shift+Enter for newlines)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onSubmit) {
        onSubmit();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Record mouse position to detect drag vs click
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!onSelectionCapture || !inputRef.current) return;

    // Check if this was a drag (mouse moved significantly from mousedown position)
    const startPos = mouseDownPosRef.current;
    mouseDownPosRef.current = null;

    if (!startPos) return;

    const dx = Math.abs(e.clientX - startPos.x);
    const dy = Math.abs(e.clientY - startPos.y);
    const wasDrag = dx > 3 || dy > 3; // 3px threshold for drag detection

    if (!wasDrag) return;

    // Pass the input element to the handler from useTextSelection
    // The hook will handle all the DOM manipulation
    onSelectionCapture(inputRef.current);
  };

  return (
    <div
      ref={inputRef}
      id="prompt"
      contentEditable={!disabled}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`min-h-[48px] max-h-[300px] h-full px-4 py-3 border border-border rounded-lg bg-white overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9375rem] leading-[1.5] ${
        disabled ? 'bg-gray-100 cursor-not-allowed' : ''
      }`}
      data-placeholder={finalPlaceholder}
      role="textbox"
      aria-multiline="true"
      aria-label="Prompt"
      suppressContentEditableWarning
    />
  );
}
