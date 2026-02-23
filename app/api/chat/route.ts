import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse, ApiError } from "@/types/api";
import { createResponse, createResponseStream } from "@/lib/api/openAiClient";
import { parseString, validatePrompt } from "@/lib/utils/validation";
import { getOpenAIModelConfig, getChatPrompt } from "@/lib/config/openai";
import { handleApiError } from "@/lib/api/errorHandler";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ChatRequest = await request.json();
    const prompt = parseString(body?.prompt);
    const previousResponseId = body?.previousResponseId;
    const stream = body?.stream ?? false;
    const settings = body?.settings;

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return NextResponse.json<ApiError>(
        { error: validation.error || "Invalid prompt." },
        { status: 400 },
      );
    }

    // Get model configuration
    const modelConfig = getOpenAIModelConfig();

    // STREAMING PATH: Return Server-Sent Events stream
    if (stream) {
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            await createResponseStream(
              {
                model: settings?.model || modelConfig.model,
                input: prompt,
                instructions: getChatPrompt(
                  settings?.systemPromptFile,
                  settings?.responseLanguage,
                ),
                previousResponseId,
                reasoningEffort: settings?.reasoningEffort,
                webSearchEnabled: settings?.webSearchEnabled,
              },
              {
                onToken: (token) => {
                  const data = JSON.stringify({
                    type: "token",
                    content: token,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                },
                onResponseId: (responseId) => {
                  const data = JSON.stringify({
                    type: "response_id",
                    responseId,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                },
                onComplete: () => {
                  const data = JSON.stringify({ type: "done" });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  controller.close();
                },
                onError: (error) => {
                  const data = JSON.stringify({
                    type: "error",
                    error: error.message,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                  controller.close();
                },
              },
            );
          } catch (error: any) {
            const data = JSON.stringify({
              type: "error",
              error: error.message,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // NON-STREAMING PATH: Return JSON response
    const result = await createResponse({
      model: settings?.model || modelConfig.model,
      input: prompt,
      instructions: getChatPrompt(
        settings?.systemPromptFile,
        settings?.responseLanguage,
      ),
      previousResponseId,
      reasoningEffort: settings?.reasoningEffort,
      webSearchEnabled: settings?.webSearchEnabled,
    });

    if (!result.text) {
      return NextResponse.json<ApiError>(
        { error: "The assistant didn't return any text." },
        { status: 500 },
      );
    }

    // Return successful response with response ID for chaining
    return NextResponse.json<ChatResponse>({
      text: result.text,
      responseId: result.responseId,
    });
  } catch (error) {
    return handleApiError(error, "Chat API");
  }
}
