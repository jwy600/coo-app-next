'use client';

import { useRef, useEffect } from 'react';

/**
 * Contenteditable prompt input. Submits on Enter (Shift+Enter inserts a
 * newline). The contenteditable element keeps text-selection events available
 * to the focus-mode "selection-to-note" flow that lands in a later phase.
 */
interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask anything',
  disabled = false,
}: PromptInputProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const isUserInputRef = useRef<boolean>(false);

  // Sync external value into the DOM, preserving cursor position when possible.
  useEffect(() => {
    if (!inputRef.current) return;
    if (isUserInputRef.current) {
      isUserInputRef.current = false;
      return;
    }

    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const offset = range?.startOffset || 0;

    const currentText = inputRef.current.textContent || '';
    if (currentText.trim() === value.trim()) return;

    inputRef.current.textContent = value;

    if (selection && inputRef.current.firstChild) {
      try {
        const newRange = document.createRange();
        const textNode = inputRef.current.firstChild;
        const maxOffset = (textNode.textContent || '').length;
        newRange.setStart(textNode, Math.min(offset, maxOffset));
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch {
        // Cursor restoration is best-effort.
      }
    }
  }, [value]);

  const handleInput = () => {
    if (!inputRef.current) return;
    isUserInputRef.current = true;
    const text = inputRef.current.textContent || '';
    onChange(text.replace(/ /g, ' ').trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div
      ref={inputRef}
      id="prompt"
      contentEditable={!disabled}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      className={`min-h-[48px] max-h-[300px] h-full px-4 py-3 border border-border rounded-lg bg-white overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 text-[0.9375rem] leading-[1.5] ${
        disabled ? 'bg-gray-100 cursor-not-allowed' : ''
      }`}
      data-placeholder={placeholder}
      role="textbox"
      aria-multiline="true"
      aria-label="Prompt"
      suppressContentEditableWarning
    />
  );
}
