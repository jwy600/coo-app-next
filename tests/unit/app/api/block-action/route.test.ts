import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetOpenAiClient } = vi.hoisted(() => ({
  mockGetOpenAiClient: vi.fn(),
}));

vi.mock("@/lib/api/openAiClient", () => ({
  getOpenAiClient: mockGetOpenAiClient,
}));

import { POST } from "@/app/api/block-action/route";

describe("POST /api/block-action", () => {
  const mockCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOpenAiClient.mockReturnValue({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    });
  });

  function makeRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost:3000/api/block-action", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  describe("validation", () => {
    it("should return 400 when action is missing", async () => {
      const response = await POST(
        makeRequest({ blockText: "some text" }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Missing block action input");
    });

    it("should return 400 when blockText is missing", async () => {
      const response = await POST(makeRequest({ action: "eli5" }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Missing block action input");
    });

    it("should return 400 when ask action lacks prompt", async () => {
      const response = await POST(
        makeRequest({ action: "ask", blockText: "some text" }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Missing prompt");
    });

    it("should return 400 when rewrite action lacks prompt", async () => {
      const response = await POST(
        makeRequest({ action: "rewrite", blockText: "some text" }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Missing prompt");
    });

    it("should return 400 for unsupported action", async () => {
      const response = await POST(
        makeRequest({ action: "unknown_action", blockText: "text" }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Unsupported action");
    });
  });

  describe("eli5 action", () => {
    it("should return simplified text", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Simple explanation" } }],
      });

      const response = await POST(
        makeRequest({ action: "eli5", blockText: "Complex concept" }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.text).toBe("Simple explanation");
    });
  });

  describe("translate action", () => {
    it("should translate with default language (Chinese)", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Translated text" } }],
      });

      const response = await POST(
        makeRequest({ action: "translate", blockText: "Hello world" }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.text).toBe("Translated text");

      // Verify prompt includes "Chinese"
      const userMessage = mockCreate.mock.calls[0][0].messages[1].content;
      expect(userMessage).toContain("Chinese");
    });

    it("should translate with specified language", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Texto traducido" } }],
      });

      await POST(
        makeRequest({
          action: "translate",
          blockText: "Hello",
          translateLanguage: "Spanish",
        }),
      );

      const userMessage = mockCreate.mock.calls[0][0].messages[1].content;
      expect(userMessage).toContain("Spanish");
    });
  });

  describe("expand action", () => {
    it("should expand the text", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Expanded content" } }],
      });

      const response = await POST(
        makeRequest({ action: "expand", blockText: "Short text" }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.text).toBe("Expanded content");
    });
  });

  describe("example action", () => {
    it("should give an example", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Here's an example..." } }],
      });

      const response = await POST(
        makeRequest({ action: "example", blockText: "Abstract concept" }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.text).toBe("Here's an example...");
    });
  });

  describe("ask action", () => {
    it("should answer question about block text", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "The answer is..." } }],
      });

      const response = await POST(
        makeRequest({
          action: "ask",
          blockText: "Some text",
          prompt: "What does this mean?",
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.text).toBe("The answer is...");
    });
  });

  describe("rewrite action", () => {
    it("should rewrite text with highlighted phrases", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Rewritten text" } }],
      });

      const response = await POST(
        makeRequest({
          action: "rewrite",
          blockText: "Original text here",
          prompt: "important phrase",
        }),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.text).toBe("Rewritten text");
    });
  });

  describe("settings", () => {
    it("should pass model from settings", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Result" } }],
      });

      await POST(
        makeRequest({
          action: "eli5",
          blockText: "text",
          settings: { model: "gpt-5.4" },
        }),
      );

      expect(mockCreate.mock.calls[0][0].model).toBe("gpt-5.4");
    });
  });

  describe("error handling", () => {
    it("should return 500 when completion returns no text", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const response = await POST(
        makeRequest({ action: "eli5", blockText: "text" }),
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain("didn't return any text");
    });

    it("should handle API errors with handleApiError", async () => {
      mockCreate.mockRejectedValue(new Error("API failure"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(
        makeRequest({ action: "eli5", blockText: "text" }),
      );

      expect(response.status).toBe(500);
      vi.mocked(console.error).mockRestore();
    });

    it("should handle missing API key error", async () => {
      mockGetOpenAiClient.mockImplementation(() => {
        throw new Error("Missing OpenAI API key configuration.");
      });
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(
        makeRequest({ action: "eli5", blockText: "text" }),
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain("Missing OpenAI API key");
      vi.mocked(console.error).mockRestore();
    });
  });
});
