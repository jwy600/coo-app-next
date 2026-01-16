# API Usage Guide

Quick reference for using the Next.js API routes and client functions.

---

## Table of Contents
1. [API Client Functions](#api-client-functions)
2. [API Routes Reference](#api-routes-reference)
3. [Error Handling](#error-handling)
4. [TypeScript Types](#typescript-types)
5. [Examples](#examples)

---

## API Client Functions

Import from `@/lib/api`:

```typescript
import {
  fetchChatCompletion,
  fetchBlockAction,
  fetchConfig,
  ApiClientError
} from '@/lib/api';
```

### fetchChatCompletion

Send a chat message to OpenAI.

```typescript
async function fetchChatCompletion(
  prompt: string,
  threadId?: string
): Promise<ChatResponse>
```

**Example:**
```typescript
try {
  const response = await fetchChatCompletion('Explain React hooks');
  console.log(response.text); // AI response
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(error.message, error.status);
  }
}
```

**Validation:**
- Prompt cannot be empty
- Max 4000 characters

---

### fetchBlockAction

Transform a block of text with AI.

```typescript
async function fetchBlockAction(
  action: BlockAction,
  blockText: string,
  prompt?: string
): Promise<BlockActionResponse>
```

**Actions:**
- `'translate'` - Translate to Chinese
- `'example'` - Provide example
- `'expand'` - Expand with detail
- `'eli5'` - Explain like I'm 5
- `'rewrite'` - Rewrite (requires prompt)
- `'ask'` - Ask question (requires prompt)

**Examples:**

```typescript
// Translate
const result = await fetchBlockAction(
  'translate',
  'Hello world'
);

// ELI5
const eli5 = await fetchBlockAction(
  'eli5',
  'Quantum computing uses qubits...'
);

// Ask (requires prompt)
const answer = await fetchBlockAction(
  'ask',
  'React is a JavaScript library...',
  'What is React?'
);

// Rewrite (requires prompt)
const rewritten = await fetchBlockAction(
  'rewrite',
  'The cat sat on the mat',
  'cat, mat' // highlighted phrases
);
```

**Validation:**
- Block text cannot be empty
- `ask` and `rewrite` require prompt parameter

---

### fetchConfig

Get Supabase configuration (cached).

```typescript
async function fetchConfig(): Promise<ConfigResponse>
```

**Example:**
```typescript
const config = await fetchConfig();
console.log(config.supabaseUrl);
console.log(config.supabaseAnonKey);
```

**Note:** Results are cached. Config doesn't change at runtime.

---

## API Routes Reference

### POST /api/chat

**Request:**
```json
{
  "prompt": "Your message here",
  "threadId": "optional-thread-id",
  "mode": "chat"
}
```

**Response (Success):**
```json
{
  "text": "AI response text"
}
```

**Response (Error):**
```json
{
  "error": "Error message",
  "details": "Optional details"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (missing/too long prompt)
- `500` - Server error (API key missing, OpenAI error)

**curl Example:**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "mode": "chat"}'
```

---

### POST /api/block-action

**Request:**
```json
{
  "action": "translate" | "example" | "expand" | "eli5" | "rewrite" | "ask",
  "blockText": "Text to transform",
  "prompt": "Optional prompt (required for ask/rewrite)",
  "mode": "block"
}
```

**Response (Success):**
```json
{
  "text": "Transformed text"
}
```

**Response (Error):**
```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid request (missing fields, unsupported action, too long)
- `500` - Server error (API key missing, OpenAI error)

**curl Examples:**
```bash
# Translate
curl -X POST http://localhost:3000/api/block-action \
  -H "Content-Type: application/json" \
  -d '{"action": "translate", "blockText": "Hello", "mode": "block"}'

# Ask (requires prompt)
curl -X POST http://localhost:3000/api/block-action \
  -H "Content-Type: application/json" \
  -d '{
    "action": "ask",
    "blockText": "React is a JavaScript library",
    "prompt": "What is React?",
    "mode": "block"
  }'
```

---

### GET /api/config

**Response:**
```json
{
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseAnonKey": "eyJ..."
}
```

**Status Codes:**
- `200` - Success (even if config is empty)
- `500` - Server error

**curl Example:**
```bash
curl http://localhost:3000/api/config
```

---

## Error Handling

### ApiClientError

All client functions throw `ApiClientError` on failure:

```typescript
class ApiClientError extends Error {
  message: string;   // Error message
  status?: number;   // HTTP status code (0 for network errors)
  details?: string;  // Optional additional details
}
```

**Example:**
```typescript
import { fetchChatCompletion, ApiClientError } from '@/lib/api';

try {
  const response = await fetchChatCompletion('Hello');
  console.log(response.text);
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(`Error ${error.status}: ${error.message}`);
    if (error.details) {
      console.error('Details:', error.details);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Errors

**400 Errors:**
- "Prompt cannot be empty"
- "Prompt is too long. Maximum 4000 characters."
- "Block text cannot be empty"
- "Action 'ask' requires a prompt"
- "Unsupported action"

**500 Errors:**
- "Missing OpenAI API key configuration."
- "The assistant didn't return any text."
- "We couldn't reach the assistant. Please try again in a moment."

**Network Errors (status 0):**
- "Network error. Please check your connection."

---

## TypeScript Types

### Import Types
```typescript
import type {
  ChatRequest,
  ChatResponse,
  BlockAction,
  BlockActionRequest,
  BlockActionResponse,
  ConfigResponse,
  ApiError
} from '@/types/api';
```

### Type Definitions

```typescript
// Chat API
interface ChatRequest {
  prompt: string;
  threadId?: string;
  mode?: 'chat';
}

interface ChatResponse {
  text: string;
}

// Block Action API
type BlockAction = 'translate' | 'example' | 'expand' | 'eli5' | 'rewrite' | 'ask';

interface BlockActionRequest {
  action: BlockAction;
  blockText: string;
  prompt?: string;
  mode?: 'block';
}

interface BlockActionResponse {
  text: string;
}

// Config API
interface ConfigResponse {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

// Error Response
interface ApiError {
  error: string;
  details?: string;
}
```

---

## Examples

### Example 1: Chat Component

```typescript
'use client';

import { useState } from 'react';
import { fetchChatCompletion, ApiClientError } from '@/lib/api';

export default function ChatBox() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await fetchChatCompletion(input);
      setResponse(result.text);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
      {error && <div className="error">{error}</div>}
      {response && <div className="response">{response}</div>}
    </form>
  );
}
```

---

### Example 2: Block Action Menu

```typescript
'use client';

import { useState } from 'react';
import { fetchBlockAction, type BlockAction, ApiClientError } from '@/lib/api';

interface BlockActionsProps {
  blockText: string;
}

export default function BlockActions({ blockText }: BlockActionsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleAction = async (action: BlockAction) => {
    setLoading(true);
    try {
      const response = await fetchBlockAction(action, blockText);
      setResult(response.text);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => handleAction('translate')} disabled={loading}>
        Translate
      </button>
      <button onClick={() => handleAction('eli5')} disabled={loading}>
        ELI5
      </button>
      <button onClick={() => handleAction('expand')} disabled={loading}>
        Expand
      </button>
      <button onClick={() => handleAction('example')} disabled={loading}>
        Example
      </button>
      {result && <div className="result">{result}</div>}
    </div>
  );
}
```

---

### Example 3: Ask Question

```typescript
'use client';

import { useState } from 'react';
import { fetchBlockAction, ApiClientError } from '@/lib/api';

interface AskQuestionProps {
  paragraphText: string;
}

export default function AskQuestion({ paragraphText }: AskQuestionProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const response = await fetchBlockAction('ask', paragraphText, question);
      setAnswer(response.text);
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question about this paragraph..."
        disabled={loading}
      />
      <button onClick={handleAsk} disabled={loading}>
        {loading ? 'Asking...' : 'Ask'}
      </button>
      {answer && (
        <div className="answer">
          <strong>Answer:</strong> {answer}
        </div>
      )}
    </div>
  );
}
```

---

### Example 4: Initialize Supabase

```typescript
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { fetchConfig } from '@/lib/api';

export function useSupabase() {
  const [client, setClient] = useState(null);

  useEffect(() => {
    async function initSupabase() {
      try {
        const config = await fetchConfig();
        const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
        setClient(supabase);
      } catch (error) {
        console.error('Failed to initialize Supabase:', error);
      }
    }

    initSupabase();
  }, []);

  return client;
}
```

---

## Testing

### Manual Testing

Use the provided test script:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run API tests
./test-api.sh
```

### Unit Testing

Mock the API functions in your tests:

```typescript
import { vi } from 'vitest';
import * as api from '@/lib/api';

// Mock fetchChatCompletion
vi.spyOn(api, 'fetchChatCompletion').mockResolvedValue({
  text: 'Mocked response'
});

// Use in test
const result = await api.fetchChatCompletion('test');
expect(result.text).toBe('Mocked response');
```

---

## Environment Setup

Ensure these environment variables are set in `.env.local`:

```bash
# OpenAI API (server-side only)
OPENAI_API_KEY=sk-proj-...

# Supabase (client-accessible)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...

# Supabase (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Best Practices

1. **Always handle errors** - Use try/catch with `ApiClientError`
2. **Show loading states** - API calls may take 1-3 seconds
3. **Validate input locally** - Check prompt length before calling API
4. **Use TypeScript types** - Import types from `@/types/api`
5. **Cache config** - `fetchConfig()` already caches automatically
6. **Don't retry immediately** - Give users time to see error messages

---

## Support

For issues or questions:
- Check error messages (they're user-friendly)
- Review test files in `tests/api/*.test.ts` for examples
- See Phase 3 completion report: `PHASE_3_COMPLETE.md`
