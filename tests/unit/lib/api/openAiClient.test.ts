import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { MockOpenAI } = vi.hoisted(() => {
  // Must be a function usable with `new` (constructor)
  const MockOpenAI = vi.fn(function (this: Record<string, unknown>) {
    return this;
  });
  return { MockOpenAI };
});

vi.mock("openai", () => ({
  default: MockOpenAI,
}));

import {
  getOpenAiClient,
  createResponse,
  createResponseStream,
} from "@/lib/api/openAiClient";
import type { StreamEventHandler } from "@/lib/api/openAiClient";

describe("openAiClient", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  describe("getOpenAiClient", () => {
    it("should throw when API key is not configured", () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => getOpenAiClient()).toThrow("Missing OpenAI API key");
    });

    it("should create OpenAI client when key is set", () => {
      MockOpenAI.prototype.responses = {};
      const client = getOpenAiClient();
      expect(client).toBeDefined();
      expect(MockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test-key",
          timeout: 60000,
          maxRetries: 2,
        }),
      );
    });
  });

  describe("createResponse", () => {
    it("should call responses.create and return result", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        output_text: "Hello world",
        id: "resp-123",
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      const result = await createResponse({
        model: "gpt-5.4-mini",
        input: "Hello",
        instructions: "Be helpful",
      });

      expect(result.text).toBe("Hello world");
      expect(result.responseId).toBe("resp-123");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5.4-mini",
          input: "Hello",
          instructions: "Be helpful",
          store: true,
        }),
      );
    });

    it("should pass previousResponseId when provided", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        output_text: "Follow up",
        id: "resp-2",
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      await createResponse({
        model: "gpt-5.4-mini",
        input: "Continue",
        previousResponseId: "resp-1",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          previous_response_id: "resp-1",
        }),
      );
    });

    it("should pass reasoning effort when not none", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        output_text: "Thought about it",
        id: "resp-3",
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      await createResponse({
        model: "gpt-5.4-mini",
        input: "Think hard",
        reasoningEffort: "high",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoning: { effort: "high" },
        }),
      );
    });

    it("should not pass reasoning when effort is none", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        output_text: "Quick answer",
        id: "resp-4",
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      await createResponse({
        model: "gpt-5.4-mini",
        input: "Quick",
        reasoningEffort: "none",
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.reasoning).toBeUndefined();
    });

    it("should pass web search tool when enabled", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        output_text: "Searched result",
        id: "resp-5",
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      await createResponse({
        model: "gpt-5.4-mini",
        input: "Search this",
        webSearchEnabled: true,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [{ type: "web_search" }],
        }),
      );
    });

    it("should handle empty output_text", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        output_text: null,
        id: "resp-6",
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      const result = await createResponse({
        model: "gpt-5.4-mini",
        input: "Hello",
      });

      expect(result.text).toBe("");
    });

    it("should rethrow errors from API", async () => {
      const mockCreate = vi
        .fn()
        .mockRejectedValue(new Error("API rate limited"));

      MockOpenAI.prototype.responses = { create: mockCreate };

      await expect(
        createResponse({ model: "gpt-5.4-mini", input: "Hello" }),
      ).rejects.toThrow("API rate limited");
    });
  });

  describe("createResponseStream", () => {
    it("should handle streaming events", async () => {
      const events = [
        { type: "response.created", response: { id: "resp-stream-1" } },
        { type: "response.output_text.delta", delta: "Hello" },
        { type: "response.output_text.delta", delta: " world" },
        { type: "response.completed" },
      ];

      const mockCreate = vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const event of events) {
            yield event;
          }
        },
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      const handler: StreamEventHandler = {
        onToken: vi.fn(),
        onResponseId: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await createResponseStream(
        { model: "gpt-5.4-mini", input: "Hello" },
        handler,
      );

      expect(handler.onResponseId).toHaveBeenCalledWith("resp-stream-1");
      expect(handler.onToken).toHaveBeenCalledWith("Hello");
      expect(handler.onToken).toHaveBeenCalledWith(" world");
      expect(handler.onComplete).toHaveBeenCalled();
      expect(handler.onError).not.toHaveBeenCalled();
    });

    it("should call onError when stream throws", async () => {
      const mockCreate = vi
        .fn()
        .mockRejectedValue(new Error("Stream failed"));

      MockOpenAI.prototype.responses = { create: mockCreate };

      const handler: StreamEventHandler = {
        onToken: vi.fn(),
        onResponseId: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await createResponseStream(
        { model: "gpt-5.4-mini", input: "Hello" },
        handler,
      );

      expect(handler.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Stream failed" }),
      );
    });

    it("should skip delta events with no delta content", async () => {
      const events = [
        { type: "response.output_text.delta", delta: "" },
        { type: "response.output_text.delta", delta: null },
        { type: "response.completed" },
      ];

      const mockCreate = vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          for (const event of events) {
            yield event;
          }
        },
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      const handler: StreamEventHandler = {
        onToken: vi.fn(),
        onResponseId: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await createResponseStream(
        { model: "gpt-5.4-mini", input: "Hello" },
        handler,
      );

      // Empty string is falsy, so onToken should not be called
      expect(handler.onToken).not.toHaveBeenCalled();
      expect(handler.onComplete).toHaveBeenCalled();
    });

    it("should pass streaming flag to API", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield { type: "response.completed" };
        },
      });

      MockOpenAI.prototype.responses = { create: mockCreate };

      const handler: StreamEventHandler = {
        onToken: vi.fn(),
        onResponseId: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await createResponseStream(
        { model: "gpt-5.4-mini", input: "Hello" },
        handler,
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ stream: true }),
      );
    });
  });
});
