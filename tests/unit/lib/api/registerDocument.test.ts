import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateResponse } = vi.hoisted(() => ({
  mockCreateResponse: vi.fn(),
}));

vi.mock("@/lib/api/openAiClient", () => ({
  createResponse: mockCreateResponse,
}));

vi.mock("@/lib/config/prompts", () => ({
  getRegisterDocumentPrompt: vi.fn(() => "register prompt"),
}));

import { registerDocument } from "@/lib/api/registerDocument";
import type { Settings } from "@/types/settings";

const baseSettings: Settings = {
  apiKey: "sk-test",
  model: "gpt-5.6-luna",
  reasoningEffort: "none",
  responseLanguage: "en",
  translateLanguage: "Chinese",
  webSearchEnabled: false,
  exportDestination: "local",
  obsidianVaultName: "",
};

describe("registerDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the responseId from createResponse", async () => {
    mockCreateResponse.mockResolvedValue({
      text: "Document received.",
      responseId: "resp-1",
    });
    const id = await registerDocument("# Hello", baseSettings);
    expect(id).toBe("resp-1");
  });

  it("sends the doc text as input with the register-doc label", async () => {
    mockCreateResponse.mockResolvedValue({ text: "ok", responseId: "resp-1" });
    await registerDocument("# Hello", baseSettings);
    const params = mockCreateResponse.mock.calls[0][0];
    expect(params.input).toBe("# Hello");
    expect(params.instructions).toBe("register prompt");
    expect(params.label).toBe("register-doc");
    expect(params.model).toBe("gpt-5.6-luna");
    expect(params.apiKey).toBe("sk-test");
  });

  it("throws when apiKey is missing and never calls the API", async () => {
    await expect(
      registerDocument("# Hello", { ...baseSettings, apiKey: "" }),
    ).rejects.toThrow("Missing OpenAI API key");
    expect(mockCreateResponse).not.toHaveBeenCalled();
  });

  it("propagates errors from createResponse", async () => {
    mockCreateResponse.mockRejectedValue(new Error("network down"));
    await expect(registerDocument("# Hello", baseSettings)).rejects.toThrow(
      "network down",
    );
  });
});
