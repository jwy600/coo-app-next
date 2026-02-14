import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Store original so we can restore
const originalMatchMedia = window.matchMedia;
const originalInnerWidth = Object.getOwnPropertyDescriptor(
  window,
  "innerWidth",
);

describe("useIsMobile", () => {
  let changeHandler: (() => void) | null = null;

  beforeEach(() => {
    changeHandler = null;

    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: (_event: string, handler: () => void) => {
        changeHandler = handler;
      },
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    if (originalInnerWidth) {
      Object.defineProperty(window, "innerWidth", originalInnerWidth);
    }
    vi.resetModules();
  });

  it("returns false for desktop width", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
      configurable: true,
    });

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("returns true for mobile width", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 500,
      writable: true,
      configurable: true,
    });

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("returns false at exactly 768px (breakpoint boundary)", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 768,
      writable: true,
      configurable: true,
    });

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("returns true at 767px (just below breakpoint)", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 767,
      writable: true,
      configurable: true,
    });

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("updates when window resizes across breakpoint", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
      configurable: true,
    });

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, "innerWidth", {
      value: 500,
      writable: true,
      configurable: true,
    });

    act(() => {
      changeHandler?.();
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listener on unmount", async () => {
    const removeEventListener = vi.fn();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      addEventListener: vi.fn(),
      removeEventListener,
    }));

    Object.defineProperty(window, "innerWidth", {
      value: 1024,
      writable: true,
      configurable: true,
    });

    const { useIsMobile } = await import("@/hooks/use-mobile");
    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
