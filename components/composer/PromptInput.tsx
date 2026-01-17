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
  mode?: 'landing' | 'chat';
}

export function PromptInput({
  value,
  onChange,
  onSelectionCapture,
  onSubmit,
  placeholder,
  disabled = false,
  mode = 'landing',
}: PromptInputProps) {
  // Set default placeholder based on mode
  const defaultPlaceholder = mode === 'landing'
    ? 'Explain Cobb-Douglas function and its implications of capital/labour substitution.'
    : 'Can you find a counter argument about this statement?';

  const finalPlaceholder = placeholder || defaultPlaceholder;
  const inputRef = useRef<HTMLDivElement>(null);

  // Sync value to DOM (preserve cursor position)
  useEffect(() => {
    if (inputRef.current && inputRef.current.textContent !== value) {
      inputRef.current.textContent = value;
    }
  }, [value]);

  const handleInput = () => {
    if (inputRef.current) {
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
      className={`min-h-[48px] px-4 py-3 border border-border rounded-lg bg-white overflow-auto focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9375rem] leading-[1.5] ${
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
