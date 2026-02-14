import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("should merge tailwind classes correctly", () => {
    // twMerge should resolve conflicting classes
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle undefined and null values", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
  });
});
