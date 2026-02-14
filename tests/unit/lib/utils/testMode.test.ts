import { describe, it, expect, afterEach } from "vitest";
import { isTestMode } from "@/lib/utils/testMode";

describe("isTestMode", () => {
  afterEach(() => {
    delete (window as any).__TEST_MODE__;
    delete process.env.NEXT_PUBLIC_TEST_MODE;
  });

  it("should return false by default", () => {
    expect(isTestMode()).toBe(false);
  });

  it("should return true when window.__TEST_MODE__ is true", () => {
    (window as any).__TEST_MODE__ = true;
    expect(isTestMode()).toBe(true);
  });

  it("should return false when window.__TEST_MODE__ is not true", () => {
    (window as any).__TEST_MODE__ = "yes";
    expect(isTestMode()).toBe(false);
  });

  it("should return true when NEXT_PUBLIC_TEST_MODE env is 'true'", () => {
    process.env.NEXT_PUBLIC_TEST_MODE = "true";
    expect(isTestMode()).toBe(true);
  });

  it("should return false when NEXT_PUBLIC_TEST_MODE is other value", () => {
    process.env.NEXT_PUBLIC_TEST_MODE = "false";
    expect(isTestMode()).toBe(false);
  });
});
