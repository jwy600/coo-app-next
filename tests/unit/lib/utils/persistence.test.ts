import { describe, it, expect, vi, afterEach } from "vitest";
import { persistAsync } from "@/lib/utils/persistence";

vi.mock("@/lib/utils/testMode", () => ({
  isTestMode: vi.fn(),
}));

import { isTestMode } from "@/lib/utils/testMode";

describe("persistAsync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should skip operation when in test mode", () => {
    vi.mocked(isTestMode).mockReturnValue(true);
    const operation = vi.fn().mockResolvedValue(undefined);

    persistAsync(operation, "test operation");

    expect(operation).not.toHaveBeenCalled();
  });

  it("should execute operation when not in test mode", () => {
    vi.mocked(isTestMode).mockReturnValue(false);
    const operation = vi.fn().mockResolvedValue(undefined);

    persistAsync(operation, "save data");

    expect(operation).toHaveBeenCalled();
  });

  it("should catch and log errors from operation", async () => {
    vi.mocked(isTestMode).mockReturnValue(false);
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const error = new Error("DB failed");
    const operation = vi.fn().mockRejectedValue(error);

    persistAsync(operation, "persist selection");

    // Wait for the promise rejection to be handled
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to persist selection:",
      error,
    );
    consoleSpy.mockRestore();
  });
});
