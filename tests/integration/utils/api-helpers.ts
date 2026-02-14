import {
  getOpenAIModelConfig,
  calculateCost,
  getDeveloperPrompt,
} from "@/lib/config/openai";
import {
  testReporter,
  analyzeResponseQuality,
  type ApiCallMetrics,
} from "./test-reporter";
import type {
  ChatRequest,
  ChatResponse,
  BlockActionRequest,
  BlockActionResponse,
} from "@/types/api";

// Check if we should run integration tests
export function shouldRunIntegrationTests(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;

  // Skip if no API key
  if (!apiKey) {
    return false;
  }

  // Skip if using a test/mock API key
  if (
    apiKey.includes("test") ||
    apiKey.includes("mock") ||
    apiKey.includes("fake")
  ) {
    return false;
  }

  return true;
}

// Get the base URL for API calls
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
}

interface ChatApiResult {
  text: string;
  metrics: ApiCallMetrics;
}

// Call chat API with metrics collection
export async function callChatApiWithMetrics(
  testName: string,
  prompt: string,
): Promise<ChatApiResult> {
  const modelConfig = getOpenAIModelConfig();
  const startTime = Date.now();

  // We need to make a real OpenAI call to get the metrics
  // Since we're testing the API route, we need to directly call OpenAI
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: modelConfig.model,
    messages: [
      { role: "developer", content: getDeveloperPrompt() },
      { role: "user", content: prompt },
    ],
  });

  const latencyMs = Date.now() - startTime;
  const text = completion.choices[0]?.message?.content?.trim() || "";

  const usage = completion.usage || {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  const quality = analyzeResponseQuality(text);

  const metrics: ApiCallMetrics = {
    testName,
    apiEndpoint: "/api/chat",
    model: modelConfig.model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    estimatedCost: calculateCost(
      modelConfig.model,
      usage.prompt_tokens,
      usage.completion_tokens,
    ),
    latencyMs,
    responseLength: text.length,
    hasMarkdown: quality.hasMarkdown,
    blockCount: quality.blockCount,
    parseErrors: quality.parseErrors,
    responseId: completion.id,
    finishReason: completion.choices[0]?.finish_reason,
    systemFingerprint: completion.system_fingerprint || undefined,
    timestamp: new Date().toISOString(),
  };

  testReporter.recordApiCall(metrics);

  return { text, metrics };
}

interface BlockActionApiResult {
  text: string;
  metrics: ApiCallMetrics;
}

// Call block action API with metrics collection
export async function callBlockActionApiWithMetrics(
  testName: string,
  action: string,
  blockText: string,
  prompt?: string,
): Promise<BlockActionApiResult> {
  const modelConfig = getOpenAIModelConfig();
  const startTime = Date.now();

  // Build action-specific prompt (same logic as in route.ts)
  let actionPrompt = "";
  const trimmedBlock = blockText.trim();

  switch (action) {
    case "translate":
      actionPrompt = `Translate the following text into Chinese:\n\n${trimmedBlock}`;
      break;
    case "example":
      actionPrompt = `Provide a concise example that illustrates the following text:\n\n${trimmedBlock}`;
      break;
    case "expand":
      actionPrompt = `Expand on the following text with more depth and detail:\n\n${trimmedBlock}`;
      break;
    case "eli5":
      actionPrompt = `Explain the following text like I'm five:\n\n${trimmedBlock}`;
      break;
    case "rewrite": {
      const highlightPrompt = prompt?.trim() || "";
      actionPrompt = `Rewrite the following text, preserving meaning while emphasizing the highlighted phrases.\n\nHighlighted phrases:\n${highlightPrompt}\n\nText to rewrite:\n${trimmedBlock}`;
      break;
    }
    case "ask": {
      const trimmedPrompt = prompt?.trim() || "";
      actionPrompt = `You are given a selected paragraph:\n"${trimmedBlock}"\n\nUser's question:\n"${trimmedPrompt}"\n\nAnswer the question about the selected paragraph only.`;
      break;
    }
  }

  // Make real OpenAI call
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: modelConfig.model,
    messages: [{ role: "user", content: actionPrompt }],
  });

  const latencyMs = Date.now() - startTime;
  const text = completion.choices[0]?.message?.content?.trim() || "";

  const usage = completion.usage || {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  const quality = analyzeResponseQuality(text);

  const metrics: ApiCallMetrics = {
    testName: `${testName} (${action})`,
    apiEndpoint: "/api/block-action",
    model: modelConfig.model,
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    estimatedCost: calculateCost(
      modelConfig.model,
      usage.prompt_tokens,
      usage.completion_tokens,
    ),
    latencyMs,
    responseLength: text.length,
    hasMarkdown: quality.hasMarkdown,
    blockCount: quality.blockCount,
    parseErrors: quality.parseErrors,
    responseId: completion.id,
    finishReason: completion.choices[0]?.finish_reason,
    systemFingerprint: completion.system_fingerprint || undefined,
    timestamp: new Date().toISOString(),
  };

  testReporter.recordApiCall(metrics);

  return { text, metrics };
}
