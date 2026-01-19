# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev              # Next.js development server (http://localhost:3000)
npm run build            # Production build
npm start                # Start production server
npm run lint             # ESLint
npx tsc --noEmit         # TypeScript type checking (no compilation)
```

### Testing
```bash
npm test                 # Run all unit tests once (Vitest)
npm run test:watch       # Run tests in watch mode (auto-rerun on changes)
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate coverage report

npm run test:e2e         # Run E2E tests (Playwright)
npm run test:e2e:ui      # Run E2E with UI
npm run test:e2e:debug   # Debug E2E tests
npm run test:e2e:report  # View E2E test report
```

Tests automatically run on every push and pull request via GitHub Actions.

## Architecture

### Migration Context
This is a **Next.js 16 (App Router) + React 19 + TypeScript** rewrite from vanilla JS. The migration maintained:
- 100% feature parity with the original vanilla JS app
- All 44 original pure state function tests (now 263 tests total)
- Database schema compatibility
- API endpoint interfaces

### State Management Philosophy
The application uses **functional, immutable state management** with pure functions wrapped by Zustand for React integration:

```typescript
// Pure function in lib/state/ (testable, no side effects)
export const addUserMessage = (state: AppState, text: string, idFactory, nowFactory) => {
  // Returns new state object - NEVER mutates input
  return { state: newState, message, blocks };
};

// Zustand action in lib/store/slices/ (wraps pure function)
addUserMessage: (text) => {
  const result = stateFns.addUserMessage(get(), text, idFactory, nowFactory);
  set({ threads: result.state.threads, blocks: result.state.blocks });
}
```

**Critical**: Never mutate state directly. All state functions in `lib/state/` are pure and must remain pure.

### Data Flow
1. User action → Event handler in React component
2. State transformation → Zustand action calls pure function in `lib/state/`
3. Persistence → Supabase (async, non-blocking via `lib/supabase/`)
4. UI update → React re-render (automatic via Zustand subscription)

### Block-Based Content Model
AI responses are split into **blocks** (paragraphs, lists, code blocks). Each block is:
- Independently editable
- Selectable for transformations
- Persisted separately in the database
- Parsed from markdown using `splitIntoBlocks()` in `lib/state/parser.ts`

Blocks support:
- **Rewrite with undo**: Blocks store `prevText` and `isRewritten` to allow toggling between original and rewritten versions
- **Text selections**: Users can highlight phrases within blocks (stored in `selections` array)
- **Block transformations**: translate, expand, ELI5, example, ask, rewrite

### Project Structure
```
coo-app-next/
├── app/                          # Next.js App Router (React Server Components)
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Landing page (/)
│   ├── t/[threadId]/page.tsx    # Thread detail page (dynamic route)
│   └── api/                     # Next.js API route handlers
│       ├── chat/route.ts        # POST /api/chat - main chat endpoint
│       ├── block-action/route.ts # POST /api/block-action - block transformations
│       └── config/route.ts      # GET /api/config - Supabase config
│
├── components/                  # React components (mostly client components)
│   ├── chat/                   # Chat UI (MessageList, AssistantMessage, etc.)
│   ├── composer/               # Message input composer
│   ├── landing/                # Landing page components
│   ├── layout/                 # Header, Logo
│   └── ui/                     # Reusable UI (Button, Spinner, etc.)
│
├── hooks/                      # Custom React hooks
│   ├── useComposer.ts         # Message submission logic
│   ├── useBlockSelection.ts   # Block selection state
│   ├── useTextSelection.ts    # Text highlighting within blocks
│   ├── useThreadSync.ts       # Supabase real-time sync
│   └── useKeyboardShortcuts.ts # Global keyboard shortcuts
│
├── lib/                        # Core business logic (CRITICAL - most important folder)
│   ├── state/                 # Pure state transformation functions (NO side effects)
│   │   ├── index.ts          # Main state orchestration, createInitialState
│   │   ├── thread.ts         # Thread operations (create, update, delete)
│   │   ├── message.ts        # Message operations (add, update)
│   │   ├── block.ts          # Block operations (edit, rewrite, toggle undo)
│   │   └── parser.ts         # Markdown parsing into blocks
│   │
│   ├── store/                 # Zustand store (wraps pure functions)
│   │   ├── useStore.ts       # Main store hook + selectors
│   │   └── slices/           # State slices (threadSlice, blockSlice, uiSlice)
│   │
│   ├── api/                   # API client functions
│   │   ├── chat.ts           # Call /api/chat
│   │   ├── blockAction.ts    # Call /api/block-action
│   │   └── openAiClient.ts   # OpenAI SDK wrapper
│   │
│   ├── supabase/              # Supabase client & database operations
│   │   ├── client.ts         # Client initialization + withSupabaseClient helper
│   │   ├── threads.ts        # Thread CRUD operations
│   │   ├── messages.ts       # Message CRUD operations
│   │   └── blocks.ts         # Block CRUD operations
│   │
│   ├── rendering/             # Content rendering
│   │   ├── markdown.ts       # Markdown → React elements
│   │   └── katex.ts          # LaTeX math rendering
│   │
│   └── utils/                 # Utility functions
│
├── types/                     # TypeScript type definitions
│   ├── state.ts              # AppState, AppMode
│   ├── thread.ts             # Thread
│   ├── message.ts            # Message
│   ├── block.ts              # Block, BlockType
│   └── api.ts                # API request/response types
│
└── tests/                     # Test suites (263 tests, 82.6% coverage)
    ├── lib/state/            # Pure function tests (MOST IMPORTANT)
    ├── lib/store/            # Zustand integration tests
    ├── hooks/                # Custom hook tests
    ├── components/           # Component tests
    ├── api/                  # API route tests
    └── integration/          # End-to-end user flow tests
```

### API Endpoints (Next.js Route Handlers)
All API routes in `app/api/` follow the same pattern:
- Accept POST requests only (except `/api/config` which is GET)
- Validate input using `lib/utils/validation.ts`
- Call OpenAI API with `gpt-4o-mini`
- Return `NextResponse.json({ text })` or `NextResponse.json({ error }, { status })`

### Database Schema (Supabase / PostgreSQL)
```sql
threads (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT REFERENCES threads(id),
  role TEXT,  -- 'user' | 'assistant'
  created_at TIMESTAMP,
  meta JSONB
)

blocks (
  id TEXT PRIMARY KEY,
  thread_id TEXT REFERENCES threads(id),
  message_id TEXT REFERENCES messages(id),
  position INTEGER,  -- determines display order (NOT stored in message)
  type TEXT,         -- 'paragraph' | 'list' | 'code' | etc.
  text TEXT,
  edited BOOLEAN,
  selections JSONB,  -- text highlighting data
  prev_text TEXT,    -- for undo functionality
  is_rewritten BOOLEAN
)
```

**Note**: Message content order is determined by block `position` field, not by storing block IDs in the message record.

### Key Architectural Principles
1. **Pure functions in `lib/state/`**: All state transformations must be pure functions with no side effects
2. **Immutability**: Never mutate state - always return new objects
3. **Separation of concerns**:
   - `lib/state/` = pure logic (testable, framework-agnostic)
   - `lib/store/` = Zustand integration (thin wrappers)
   - `components/` = UI only (no business logic)
4. **Dependency injection**: Pass `idFactory` and `nowFactory` to state functions for testability
5. **Block-level granularity**: Content is managed at the block level, not message level
6. **Client boundaries**: Use `'use client'` directive only when necessary (Server Components by default)

### Testing Strategy
- **263 passing tests** across all modules
- **82.6% coverage** on `lib/state/` (pure functions)
- **70%+ coverage** target for critical paths
- Test files mirror source structure: `tests/lib/state/index.test.ts` ↔ `lib/state/index.ts`
- Use `npm run test:watch` during development
- E2E tests with Playwright in `e2e/tests/`

### Configuration

#### Environment Variables
Create `.env.local`:
```bash
OPENAI_API_KEY=sk-...                           # Required for AI
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

Note: `NEXT_PUBLIC_` prefix makes variables available in the browser.

#### Database Setup
1. Create a Supabase project at https://supabase.com
2. No schema file exists in repo - you must manually create tables using the schema above
3. Tables: `threads`, `messages`, `blocks` (see Database Schema section)

### TypeScript Path Aliases
Configured in `tsconfig.json`:
```typescript
import { useStore } from '@/lib/store/useStore';     // @ = project root
import { Button } from '@/components/ui/Button';
import type { Block } from '@/types/block';
```

### Common Patterns

#### Adding a New State Function
1. Write pure function in `lib/state/`:
```typescript
export const myNewFeature = (state: AppState, arg: string): AppState => {
  // Never mutate state - return new object
  return { ...state, someField: arg };
};
```

2. Add tests in `tests/lib/state/`:
```typescript
import { myNewFeature } from '@/lib/state';

test('myNewFeature should...', () => {
  const state = createInitialState(idFactory, nowFactory);
  const result = myNewFeature(state, 'value');
  expect(result.someField).toBe('value');
});
```

3. Wrap in Zustand action in `lib/store/slices/`:
```typescript
myNewFeature: (arg: string) => {
  const result = stateFns.myNewFeature(get(), arg);
  set({ someField: result.someField });
}
```

#### Using Supabase Operations
Always use the `withSupabaseClient` helper for error handling:
```typescript
import { withSupabaseClient } from '@/lib/supabase/client';

const data = await withSupabaseClient(
  async (client) => {
    const { data, error } = await client.from('threads').select('*');
    if (error) throw error;
    return data;
  },
  [],  // fallback value if client unavailable
  'loading threads'  // error context for logging
);
```
