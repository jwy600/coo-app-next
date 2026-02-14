import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateResponse, mockCreateResponseStream } = vi.hoisted(() => ({
  mockCreateResponse: vi.fn(),
  mockCreateResponseStream: vi.fn(),
}));

vi.mock("@/lib/api/openAiClient", () => ({
  createResponse: mockCreateResponse,
  createResponseStream: mockCreateResponseStream,
}));

import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
  }

  describe("validation", () => {
    it("should return 400 for empty prompt", async () => {
      const response = await POST(makeRequest({ prompt: "   " }));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
    });

    it("should return 400 for too-long prompt", async () => {
      const response = await POST(
        makeRequest({ prompt: "a".repeat(5000) }),
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBeDefined();
    });
  });

  describe("non-streaming path", () => {
    it("should return chat response on success", async () => {
      mockCreateResponse.mockResolvedValue({
        text: "Hello there!",
        responseId: "resp-123",
      });

      const response = await POST(makeRequest({ prompt: "Hello" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.text).toBe("Hello there!");
      expect(body.responseId).toBe("resp-123");
    });

    it("should pass settings to createResponse", async () => {
      mockCreateResponse.mockResolvedValue({
        text: "Response",
        responseId: "resp-1",
      });

      const settings = {
        model: "gpt-5.2",
        reasoningEffort: "high",
        responseLanguage: "zh",
        webSearchEnabled: true,
      };

      await POST(makeRequest({ prompt: "Hello", settings }));

      expect(mockCreateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5.2",
          input: "Hello",
          reasoningEffort: "high",
          webSearchEnabled: true,
        }),
      );
    });

    it("should pass previousResponseId", async () => {
      mockCreateResponse.mockResolvedValue({
        text: "Response",
        responseId: "resp-2",
      });

      await POST(
        makeRequest({
          prompt: "Follow up",
          previousResponseId: "resp-1",
        }),
      );

      expect(mockCreateResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          previousResponseId: "resp-1",
        }),
      );
    });

    it("should return 500 when createResponse returns no text", async () => {
      mockCreateResponse.mockResolvedValue({
        text: "",
        responseId: "resp-1",
      });

      const response = await POST(makeRequest({ prompt: "Hello" }));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toContain("didn't return any text");
    });

    it("should return 500 on createResponse error", async () => {
      mockCreateResponse.mockRejectedValue(new Error("API error"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const response = await POST(makeRequest({ prompt: "Hello" }));

      expect(response.status).toBe(500);
      vi.mocked(console.error).mockRestore();
    });
  });

  describe("streaming path", () => {
    it("should return a streaming response", async () => {
      mockCreateResponseStream.mockImplementation(
        async (_params: unknown, handler: Record<string, Function>) => {
          handler.onResponseId("resp-stream-1");
          handler.onToken("Hello");
          handler.onToken(" world");
          handler.onComplete();
        },
      );

      const response = await POST(
        makeRequest({ prompt: "Hello", stream: true }),
      );

      expect(response.headers.get("Content-Type")).toBe(
        "text/event-stream",
      );

      // Read the stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          fullText += decoder.decode(result.value);
        }
      }

      expect(fullText).toContain('"type":"response_id"');
      expect(fullText).toContain('"type":"token"');
      expect(fullText).toContain('"type":"done"');
    });

    it("should handle stream errors via onError callback", async () => {
      mockCreateResponseStream.mockImplementation(
        async (_params: unknown, handler: Record<string, Function>) => {
          handler.onError(new Error("Stream error"));
        },
      );

      const response = await POST(
        makeRequest({ prompt: "Hello", stream: true }),
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          fullText += decoder.decode(result.value);
        }
      }

      expect(fullText).toContain('"type":"error"');
      expect(fullText).toContain("Stream error");
    });

    it("should handle thrown errors in stream start", async () => {
      mockCreateResponseStream.mockRejectedValue(
        new Error("Connection failed"),
      );

      const response = await POST(
        makeRequest({ prompt: "Hello", stream: true }),
      );

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          fullText += decoder.decode(result.value);
        }
      }

      expect(fullText).toContain('"type":"error"');
      expect(fullText).toContain("Connection failed");
    });
  });
});
