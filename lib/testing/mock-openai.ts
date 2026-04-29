/**
 * Test-mode mock responses for OpenAI SDK calls.
 *
 * When NEXT_PUBLIC_TEST_MODE=true, the SDK client is patched to use this
 * mock instead of making real network requests. Responses are keyed by
 * (action, passage hash) for determinism.
 *
 * Browser path: state stored on window.__cooMock__ (realm-safe).
 * Node path (unit tests): state stored locally (no window object).
 */

export type MockAction =
  | 'chat'
  | 'translate'
  | 'eli5'
  | 'summarize'
  | 'ask'
  | 'rewrite'
  | 'thread-title';

export interface MockCall {
  action: MockAction;
  passage: string;
  notes?: string[];
  previousResponseId?: string;
}

interface MockResponse {
  text: string;
  responseId: string;
}

interface MockState {
  calls: MockCall[];
  failures: Set<MockAction>;
  nextCallId: number;
  responses: Map<string, string>;
  delays: Map<MockAction, number>;
}

let localMockState: MockState = {
  calls: [],
  failures: new Set(),
  nextCallId: 1,
  responses: new Map(),
  delays: new Map(),
};

function getBrowserMockState(): MockState {
  if (typeof window === 'undefined') {
    return localMockState;
  }
  if (!(window as any).__cooMock__) {
    (window as any).__cooMock__ = {
      calls: [],
      failures: new Set(),
      nextCallId: 1,
      responses: new Map(),
      delays: new Map(),
    };
  }
  return (window as any).__cooMock__;
}

function fnv1a(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function getMockCalls(): MockCall[] {
  const state = getBrowserMockState();
  return [...state.calls];
}

export function resetMockCalls(): void {
  const state = getBrowserMockState();
  state.calls = [];
  state.nextCallId = 1;
}

export function mockFail(action: MockAction): void {
  const state = getBrowserMockState();
  state.failures.add(action);
}

function generateResponseId(): string {
  const state = getBrowserMockState();
  return `resp-test-${state.nextCallId++}`;
}

function defaultResponse(action: MockAction, passage: string): string {
  if (action === 'chat') {
    return `[chat] ${passage.slice(0, 50).trim()}…`;
  }
  if (action === 'translate') {
    return `[translated] ${passage}`;
  }
  if (action === 'eli5') {
    return `Think of "${passage.slice(0, 40).trim()}" like explaining it to a 5-year-old.`;
  }
  if (action === 'summarize') {
    return `Summary: ${passage.slice(0, 60).trim()}…`;
  }
  if (action === 'ask') {
    return `Based on "${passage.slice(0, 40).trim()}": that's a good question.`;
  }
  if (action === 'rewrite') {
    return `Rewritten: ${passage}`;
  }
  if (action === 'thread-title') {
    return passage.slice(0, 40).trim();
  }
  return 'Mock response';
}

export function setMockResponse(
  action: MockAction,
  passage: string,
  response: string,
): void {
  const state = getBrowserMockState();
  const key = `${action}:${fnv1a(passage)}`;
  state.responses.set(key, response);
}

export function resetMockResponses(): void {
  const state = getBrowserMockState();
  state.responses.clear();
}

export function setMockDelay(action: MockAction, ms: number): void {
  const state = getBrowserMockState();
  state.delays.set(action, ms);
}

export function getMockedResponse(
  action: MockAction,
  passage: string,
  notes?: string[],
  previousResponseId?: string,
): MockResponse {
  const state = getBrowserMockState();

  state.calls.push({
    action,
    passage,
    notes,
    previousResponseId,
  });

  if (state.failures.has(action)) {
    state.failures.delete(action);
    throw new Error(`Mock failure injected for action: ${action}`);
  }

  const key = `${action}:${fnv1a(passage)}`;
  const text = state.responses.get(key) || defaultResponse(action, passage);
  const responseId = generateResponseId();

  return { text, responseId };
}

export function resetAllMocks(): void {
  resetMockCalls();
  resetMockResponses();
  const state = getBrowserMockState();
  state.failures.clear();
  state.delays.clear();
}
