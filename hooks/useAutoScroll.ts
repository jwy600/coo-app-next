/**
 * useAutoScroll Hook
 *
 * Auto-scrolls message list to bottom when new messages arrive.
 *
 * Reference: Already implemented in MessageList component, extracted as hook.
 */

'use client';

import { useRef, useEffect } from 'react';

export interface UseAutoScrollReturn {
  scrollRef: React.RefObject<HTMLElement | null>;
}

/**
 * Auto-scroll to bottom when dependency changes
 *
 * @param dependency - Value that triggers scroll (e.g., messages.length)
 * @param options - Scroll behavior options
 */
export function useAutoScroll(
  dependency: any,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'end' }
): UseAutoScrollReturn {
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const lastChild = scrollRef.current.lastElementChild;
          if (lastChild) {
            lastChild.scrollIntoView(options);
          } else {
            // Fallback to scrollTo if no children
            scrollRef.current.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: options.behavior as ScrollBehavior,
            });
          }
        }
      });
    }
  }, [dependency, options]);

  return {
    scrollRef,
  };
}
