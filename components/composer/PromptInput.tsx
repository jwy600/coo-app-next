'use client';

import { useRef, useEffect } from 'react';

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
}

export function PromptInput({
  value,
  onChange,
  onSelectionCapture,
  onSubmit,
  placeholder,
  disabled = false,
  hasBlockSelected = false,
}: PromptInputProps) {
  // Set default placeholder based on block selection state
  const defaultPlaceholder = hasBlockSelected
    ? 'Ask about the selected block'
    : 'Ask coo anything';

  const finalPlaceholder = placeholder || defaultPlaceholder;
  const inputRef = useRef<HTMLDivElement>(null);
  const isUserInputRef = useRef<boolean>(false);

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

  const handleSelectionCapture = () => {
    if (!onSelectionCapture || !inputRef.current) return;

    // Check if entire text is selected (Ctrl+A / Cmd+A behavior)
    // If so, skip creating a highlight chip - user probably wants to delete/replace text
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const fullText = (inputRef.current.textContent || '').trim();
      const selectedText = selection.toString().trim();

      // If selected text equals full text, it's likely Ctrl+A - don't create chip
      if (selectedText === fullText) {
        return;
      }
    }

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
      onMouseUp={handleSelectionCapture}
      onKeyUp={handleSelectionCapture}
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
