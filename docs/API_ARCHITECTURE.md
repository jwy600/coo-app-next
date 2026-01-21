# API Architecture

Visual reference for the complete API architecture after Phase 3 migration.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                  Client Components                        │ │
│  │                     (React UI)                            │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│                           │ imports                             │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              API Client Library                           │ │
│  │                  (@/lib/api)                              │ │
│  │                                                           │ │
│  │  - fetchChatCompletion(prompt, threadId?)                │ │
│  │  - fetchBlockAction(action, blockText, prompt?)          │ │
│  │  - fetchConfig()                                         │ │
│  │  - ApiClientError                                        │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│                           │ fetch()                             │
│                           ▼                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               Next.js API Routes                          │ │
│  │              (App Router Handlers)                        │ │
│  │                                                           │ │
│  │  POST /api/chat              - Chat completions          │ │
│  │  POST /api/block-action      - Text transformations      │ │
│  │  GET  /api/config            - Supabase config           │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
        ┌───────────────────────────────────────┐
        │         OpenAI API                    │
        │      (gpt-5-mini model)               │
        │                                       │
        │  - Chat Completions                   │
        └───────────────────────────────────────┘
```

---

## API Routes Detail

### POST /api/chat

```
Request Flow:
─────────────

Client Component
     │
     │ fetchChatCompletion(prompt, threadId?)
     ▼
API Client (/lib/api/chat.ts)
     │
     │ Validates:
     │   - prompt not empty
     │   - prompt < 4000 chars
     │
     │ POST /api/chat
     │ { prompt, threadId, mode: 'thread' }
     ▼
Route Handler (/app/api/chat/route.ts)
     │
     │ Validates:
     │   - prompt required
     │   - prompt < 4000 chars
     │   - OPENAI_API_KEY exists
     │
     │ OpenAI API call
     ▼
OpenAI SDK
     │
     │ model: gpt-5-mini
     │ messages: [
     │   { role: 'developer', content: DEVELOPER_PROMPT },
     │   { role: 'user', content: prompt }
     │ ]
     ▼
Response
     │
     │ { text: "AI response" }
     └─────> Client Component
```

---

### POST /api/block-action

```
Request Flow:
─────────────

Client Component
     │
     │ fetchBlockAction(action, blockText, prompt?)
     ▼
API Client (/lib/api/blockAction.ts)
     │
     │ Validates:
     │   - blockText not empty
     │   - prompt required for 'ask'/'rewrite'
     │
     │ POST /api/block-action
     │ { action, blockText, prompt, mode: 'block' }
     ▼
Route Handler (/app/api/block-action/route.ts)
     │
     │ Validates:
     │   - action + blockText required
     │   - prompt for 'ask'/'rewrite'
     │   - action is supported
     │   - combined length < 4000
     │   - OPENAI_API_KEY exists
     │
     │ Builds action-specific prompt:
     │   - translate → "Translate to Chinese..."
     │   - example → "Provide example..."
     │   - expand → "Expand with detail..."
     │   - eli5 → "Explain like I'm 5..."
     │   - rewrite → "Rewrite emphasizing..."
     │   - ask → "Answer question..."
     │
     │ OpenAI API call
     ▼
OpenAI SDK
     │
     │ model: gpt-5-mini
     │ messages: [{ role: 'user', content: actionPrompt }]
     ▼
Response
     │
     │ { text: "Transformed text" }
     └─────> Client Component
```

---

### GET /api/config

```
Request Flow:
─────────────

Client Component
     │
     │ fetchConfig()
     ▼
API Client (/lib/api/config.ts)
     │
     │ Check cache:
     │   - If cached → return immediately
     │   - If not → fetch and cache
     │
     │ GET /api/config
     ▼
Route Handler (/app/api/config/route.ts)
     │
     │ Reads env vars:
     │   - NEXT_PUBLIC_SUPABASE_URL
     │   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
     ▼
Response
     │
     │ { supabaseUrl, supabaseAnonKey }
     │
     │ Cache result
     └─────> Client Component
```

---

## File Structure

```
coo-app-next/
│
├── app/
│   └── api/                          # API Route Handlers
│       ├── chat/
│       │   └── route.ts              # POST /api/chat
│       ├── block-action/
│       │   └── route.ts              # POST /api/block-action
│       └── config/
│           └── route.ts              # GET /api/config
│
├── lib/
│   └── api/                          # Client Library
│       ├── client.ts                 # Base fetch wrapper
│       ├── chat.ts                   # Chat API client
│       ├── blockAction.ts            # Block action client
│       ├── config.ts                 # Config client (cached)
│       └── index.ts                  # Public exports
│
├── types/
│   └── api.ts                        # TypeScript types
│
└── tests/
    └── api/                          # API tests
        ├── setup.ts                  # Test utilities
        ├── chat.test.ts              # Chat API tests
        ├── block-action.test.ts      # Block action tests
        ├── client.test.ts            # Client function tests
        └── config.test.ts            # Config API tests
```

---

## Data Flow Patterns

### Pattern 1: Simple Chat

```
User Input
    │
    ▼
[Chat Component]
    │
    │ const response = await fetchChatCompletion(input)
    ▼
[API Client] validates locally
    │
    │ POST /api/chat { prompt: input }
    ▼
[Route Handler] validates + calls OpenAI
    │
    │ OpenAI API request
    ▼
[OpenAI] gpt-5-mini
    │
    │ AI response
    ▼
[Route Handler] formats response
    │
    │ { text: "AI response" }
    ▼
[API Client] returns typed result
    │
    │ ChatResponse
    ▼
[Chat Component] displays result
    │
    ▼
User sees AI response
```

---

### Pattern 2: Block Transformation

```
Selected Text Block
    │
    ▼
[Block Actions Menu]
    │
    │ User clicks "ELI5"
    ▼
[Block Component]
    │
    │ const result = await fetchBlockAction('eli5', blockText)
    ▼
[API Client] validates locally
    │
    │ POST /api/block-action { action: 'eli5', blockText }
    ▼
[Route Handler] builds ELI5 prompt
    │
    │ "Explain the following text like I'm five:\n\n{blockText}"
    ▼
[OpenAI] gpt-5-mini
    │
    │ Simplified explanation
    ▼
[Route Handler] formats response
    │
    │ { text: "Simplified text" }
    ▼
[API Client] returns typed result
    │
    │ BlockActionResponse
    ▼
[Block Component] shows in composer
    │
    ▼
User edits/accepts result
```

---

### Pattern 3: Ask Question

```
Selected Paragraph + User Question
    │
    ▼
[Ask Question Component]
    │
    │ const answer = await fetchBlockAction('ask', paragraph, question)
    ▼
[API Client] validates (prompt required)
    │
    │ POST /api/block-action { action: 'ask', blockText, prompt }
    ▼
[Route Handler] builds ask prompt
    │
    │ "You are given: '{blockText}'\n\nQuestion: '{prompt}'"
    ▼
[OpenAI] gpt-5-mini
    │
    │ Answer based on paragraph
    ▼
[Route Handler] formats response
    │
    │ { text: "Answer..." }
    ▼
[API Client] returns typed result
    │
    ▼
[Ask Component] displays answer
    │
    ▼
User sees contextual answer
```

---

## Error Handling Flow

```
Error Occurs
    │
    ├─── Network Error
    │       │
    │       ▼
    │   [API Client] catches TypeError
    │       │
    │       │ throw new ApiClientError(
    │       │   "Network error. Check connection.",
    │       │   status: 0
    │       │ )
    │       ▼
    │   [Component] shows: "Network error"
    │
    ├─── Validation Error (400)
    │       │
    │       ▼
    │   [Route Handler] returns 400
    │       │
    │       │ { error: "Prompt is too long" }
    │       ▼
    │   [API Client] throws ApiClientError
    │       │
    │       │ status: 400
    │       │ message: "Prompt is too long"
    │       ▼
    │   [Component] shows validation error
    │
    └─── OpenAI Error (500)
            │
            ▼
        [OpenAI] returns error
            │
            ▼
        [Route Handler] catches + returns 500
            │
            │ { error: "Couldn't reach assistant", details: ... }
            ▼
        [API Client] throws ApiClientError
            │
            │ status: 500
            │ message: "Couldn't reach assistant"
            ▼
        [Component] shows retry message
```

---

## Type Safety Flow

```
Developer writes code:
    const result = await fetchChatCompletion(prompt)
                                             ▲
                                             │
TypeScript validates:                       │
    - prompt: string ✓                      │
    - result: ChatResponse ✓                │
    - result.text: string ✓                 │
                                             │
IntelliSense shows:                         │
    - ChatResponse: { text: string }        │
    - Available methods                     │
    - Error types                           │
                                             │
Compile-time checks:                        │
    - No missing parameters                 │
    - No type mismatches                    │
    - No undefined properties               │
                                             │
Runtime behavior:                           │
    - Proper error handling                 │
    - Type guards work                      │
    - No surprises                          │
```

---

## Security Layers

```
┌────────────────────────────────────────────────────────────┐
│                    Security Boundary                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Client Side (Browser)                                     │
│  ─────────────────────                                     │
│    - No API keys exposed                                   │
│    - Local input validation                                │
│    - Type-safe API calls                                   │
│    - Error messages sanitized                              │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Server Side (Next.js)                                     │
│  ──────────────────────                                    │
│    - API key in environment only                           │
│    - Double validation (client + server)                   │
│    - Rate limiting ready (future)                          │
│    - Error details not leaked                              │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  External API (OpenAI)                                     │
│  ──────────────────────                                    │
│    - HTTPS only                                            │
│    - API key authentication                                │
│    - No user data stored by OpenAI                         │
│    - Responses sanitized                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Performance Optimizations

### 1. Config Caching
```typescript
// First call: fetches from API
const config1 = await fetchConfig(); // ~10ms

// Subsequent calls: returns cached
const config2 = await fetchConfig(); // ~0ms
const config3 = await fetchConfig(); // ~0ms
```

### 2. Connection Pooling
```typescript
// OpenAI client reuses HTTP connections
const openai = new OpenAI({ apiKey }); // Created once per route

// Multiple requests use same connection pool
await openai.chat.completions.create(...); // Reuses connection
await openai.chat.completions.create(...); // Reuses connection
```

### 3. Parallel Requests
```typescript
// Multiple independent API calls can run in parallel
const [chatResult, eli5Result] = await Promise.all([
  fetchChatCompletion('What is React?'),
  fetchBlockAction('eli5', 'Quantum computing...')
]);
```

---

## Testing Strategy

```
Test Pyramid:
─────────────

                    ▲
                   ╱ ╲
                  ╱   ╲
                 ╱     ╲           Manual Testing
                ╱  E2E  ╲          (test-api.sh)
               ╱─────────╲         - Real API calls
              ╱           ╲        - Production-like
             ╱             ╲
            ╱───────────────╲      Integration Tests
           ╱                 ╲     (route tests)
          ╱   Integration     ╲    - Mock OpenAI
         ╱─────────────────────╲   - Full request/response
        ╱                       ╲
       ╱                         ╲ Unit Tests
      ╱          Unit            ╲(client tests)
     ╱───────────────────────────╲- Mock fetch
    ╱_____________________________╲- Fast execution
```

**Test Coverage:**
- Unit Tests: 16 tests (client functions)
- Integration Tests: 29 tests (routes + validation)
- Manual Tests: 8 scenarios (curl scripts)

---

## Deployment Checklist

- [x] Environment variables configured
- [x] TypeScript compilation passing
- [x] All tests passing (117/117)
- [x] API routes accessible
- [x] Error handling tested
- [x] OpenAI integration working
- [x] Config endpoint secure
- [ ] Rate limiting added (TODO)
- [ ] Logging configured (TODO)
- [ ] Monitoring setup (TODO)

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth | Rate |
|----------|--------|---------|------|------|
| `/api/chat` | POST | Chat completions | None* | None* |
| `/api/block-action` | POST | Text transformations | None* | None* |
| `/api/config` | GET | Supabase config | None | None |

_*Server-side API key required in environment_

---

## Migration Status

```
Legacy Vercel Functions → Next.js App Router
────────────────────────────────────────────

✅ /api/chat.js          → /app/api/chat/route.ts
✅ /api/block-action.js  → /app/api/block-action/route.ts
✅ /api/config.js        → /app/api/config/route.ts

All endpoints migrated with:
- 100% feature parity
- Enhanced type safety
- Better error handling
- Comprehensive tests
```

---

## Future Enhancements

1. **Streaming Responses** - Use OpenAI streaming for real-time output
2. **Rate Limiting** - Implement per-user rate limits
3. **Caching** - Cache common AI responses
4. **Analytics** - Track API usage metrics
5. **Logging** - Structured logging with timestamps
6. **Monitoring** - Error tracking and alerting
7. **A/B Testing** - Test different prompts/models
8. **Batch Processing** - Process multiple blocks at once

---

## Quick Reference

### Import API Functions
```typescript
import {
  fetchChatCompletion,
  fetchBlockAction,
  fetchConfig,
  ApiClientError
} from '@/lib/api';
```

### Import Types
```typescript
import type {
  ChatResponse,
  BlockAction,
  BlockActionResponse,
  ConfigResponse
} from '@/types/api';
```

### Error Handling
```typescript
try {
  const result = await fetchChatCompletion(prompt);
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error(`${error.status}: ${error.message}`);
  }
}
```

---

**Last Updated:** January 17, 2026
**Phase:** 3 - API Routes Migration
**Status:** Complete ✅
