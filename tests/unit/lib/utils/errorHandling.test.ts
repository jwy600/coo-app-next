import { describe, it, expect } from "vitest";
import { getErrorMessage } from "@/lib/utils/errorHandling";

describe("getErrorMessage", () => {
  it("extracts message from Error instance", () => {
    expect(getErrorMessage(new Error("Something failed"))).toBe(
      "Something failed",
    );
  });

  it("returns string error directly", () => {
    expect(getErrorMessage("Direct error string")).toBe(
      "Direct error string",
    );
  });

  it("returns default fallback for unknown types", () => {
    expect(getErrorMessage(42)).toBe("An error occurred");
    expect(getErrorMessage(null)).toBe("An error occurred");
    expect(getErrorMessage(undefined)).toBe("An error occurred");
    expect(getErrorMessage({ code: 500 })).toBe("An error occurred");
  });

  it("returns custom fallback when provided", () => {
    expect(getErrorMessage(42, "Custom fallback")).toBe("Custom fallback");
  });

  it("handles Error subclasses", () => {
    expect(getErrorMessage(new TypeError("Type error"))).toBe("Type error");
    expect(getErrorMessage(new RangeError("Range error"))).toBe(
      "Range error",
    );
  });
});
