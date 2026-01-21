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

**Unit & E2E Tests (Mocked - Fast & Free)**
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

**Integration Tests (Real OpenAI API - Local Only)**
```bash
# Vitest integration tests (requires OPENAI_API_KEY)
npm run test:integration              # Run integration tests with real API
npm run test:integration:watch        # Watch mode
npm run test:integration:ui           # UI mode

# Playwright E2E integration tests (requires OPENAI_API_KEY)
npm run test:e2e:integration          # Run E2E integration tests
npm run test:e2e:integration:ui       # UI mode
npm run test:e2e:integration:debug    # Debug mode

# Optional: specify model (default: gpt-5-mini)
OPENAI_MODEL=gpt-5-mini npm run test:integration
```

See `tests-integration/README.md` for detailed integration test documentation.

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
├── app/                          # Next.js App Router (Server & Client Components)
│   ├── layout.tsx               # Root layout with error boundary
│   ├── globals.css              # All Tailwind + shadcn/ui styles
│   ├── page.tsx                 # Landing page (server component)
│   ├── landing-content.tsx      # Landing content (client component)
│   ├── t/[threadId]/            # Thread detail pages
│   │   ├── page.tsx             # Dynamic thread page (server)
│   │   ├── thread-content.tsx   # Thread client content
│   │   └── page-client.tsx      # Client state management
│   └── api/                     # Next.js API route handlers
│       ├── chat/route.ts        # POST /api/chat (streaming & non-streaming)
│       ├── block-action/route.ts # POST /api/block-action - block transformations
│       └── config/route.ts      # GET /api/config - Supabase config
│
├── components/                   # React components (mostly client components)
│   ├── ui/                      # shadcn/ui components (see UI Components section)
│   ├── chat/                    # Chat message UI
│   │   ├── AssistantMessage.tsx
│   │   ├── BlockStack.tsx
│   │   ├── BlockControls.tsx
│   │   ├── ChatContainer.tsx
│   │   └── UserMessage.tsx
│   ├── composer/                # Message input composer
│   ├── sidebar/                 # Sidebar navigation
│   │   ├── AppSidebar.tsx       # Main sidebar wrapper
│   │   ├── SidebarLogo.tsx
│   │   ├── SidebarThreadList.tsx
│   │   └── NewChatButton.tsx
│   ├── landing/                 # Landing page components
│   │   ├── Hero.tsx
│   │   ├── ThreadList.tsx
│   │   └── ThreadPill.tsx
│   ├── layout/                  # Layout components
│   │   └── AppLayout.tsx        # Sidebar + content layout wrapper
│   ├── content/                 # Content rendering components
│   ├── error/                   # Error boundary
│   └── empty-state/             # Empty state UI
│
├── hooks/                       # Custom React hooks
│   ├── useComposer.ts          # Message submission & streaming logic
│   ├── useBlockSelection.ts    # Block selection state
│   ├── useTextSelection.ts     # Text highlighting within blocks
│   ├── useThreadSync.ts        # Supabase real-time sync
│   ├── useKeyboardShortcuts.ts # Global keyboard shortcuts
│   ├── useAutoScroll.ts        # Auto-scroll on new messages
│   └── index.ts                # Barrel export
│
├── lib/                         # Core business logic (CRITICAL - most important folder)
│   ├── state/                  # Pure state transformation functions (NO side effects)
│   │   ├── index.ts           # Main state orchestration, createInitialState
│   │   ├── thread.ts          # Thread operations (create, update, delete)
│   │   ├── message.ts         # Message operations (add, update)
│   │   ├── block.ts           # Block operations (edit, rewrite, toggle undo)
│   │   └── parser.ts          # Markdown parsing into blocks
│   │
│   ├── store/                  # Zustand store (wraps pure functions)
│   │   ├── useStore.ts        # Main store hook + selectors
│   │   └── slices/            # State slices
│   │       ├── threadSlice.ts
│   │       ├── blockSlice.ts
│   │       ├── uiSlice.ts
│   │       └── streamingSlice.ts  # Streaming state management
│   │
│   ├── api/                    # API client functions
│   │   ├── chat.ts            # Call /api/chat
│   │   ├── blockAction.ts     # Call /api/block-action
│   │   ├── openAiClient.ts    # OpenAI SDK wrapper
│   │   └── streaming.ts       # Server-sent events handling
│   │
│   ├── supabase/               # Supabase client & database operations
│   │   ├── client.ts          # Client initialization + withSupabaseClient helper
│   │   ├── threads.ts         # Thread CRUD operations
│   │   ├── messages.ts        # Message CRUD operations
│   │   ├── blocks.ts          # Block CRUD operations
│   │   └── types.ts           # Supabase types
│   │
│   ├── rendering/              # Content rendering
│   │   ├── markdown.ts        # Markdown → React elements
│   │   ├── katex.ts           # LaTeX math rendering
│   │   └── blocks.ts          # Block rendering logic
│   │
│   ├── config/                 # Configuration
│   │   └── openai.ts          # OpenAI model settings
│   │
│   └── utils/                  # Utility functions
│       ├── cn.ts              # Tailwind class merger (shadcn pattern)
│       ├── validation.ts
│       ├── errorHandling.ts
│       ├── idFactory.ts       # UUID generation
│       ├── nowFactory.ts      # Timestamp generation
│       └── routing.ts
│
├── types/                      # TypeScript type definitions
│   ├── state.ts               # AppState, AppMode, ComposerMode
│   ├── thread.ts              # Thread
│   ├── message.ts             # Message, MessageRole
│   ├── block.ts               # Block, BlockType
│   └── api.ts                 # API request/response types
│
├── tests/                      # Test suites (263 tests, 82.6% coverage)
│   ├── lib/state/             # Pure function tests (MOST IMPORTANT)
│   ├── lib/store/             # Zustand integration tests
│   ├── lib/supabase/          # Database tests
│   ├── lib/rendering/         # Markdown/math tests
│   ├── hooks/                 # Custom hook tests
│   ├── components/            # Component tests
│   ├── api/                   # API route tests
│   └── integration/           # End-to-end user flow tests
│
├── e2e/                        # Playwright E2E tests
│   ├── tests/                 # Mocked E2E tests
│   ├── tests-integration/     # Real API E2E tests
│   ├── fixtures/              # Test data
│   └── page-objects/          # Page object models
│
├── constants/                  # Application constants
├── docs/                       # Documentation
│
├── components.json            # shadcn/ui configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── vitest.config.ts           # Vitest configuration
└── playwright.config.ts       # Playwright configuration
```

## UI Components (shadcn/ui)

This project uses **shadcn/ui** as the component library. Components are installed into `components/ui/` and can be customized directly.

### Configuration
The shadcn/ui configuration is in `components.json`:
- **Style**: "new-york"
- **Base color**: "neutral"
- **CSS Variables**: enabled
- **Icon library**: lucide-react

### Installed Components
```
components/ui/
├── button.tsx          # CVA variants: default, destructive, outline, secondary, ghost, link
├── badge.tsx           # CVA variants: default, secondary, destructive, outline
├── card.tsx            # Compound: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
├── sidebar.tsx         # Full sidebar system with collapsible state, mobile support
├── sheet.tsx           # Dialog-based sheet (top, bottom, left, right)
├── input.tsx           # Styled input with file support
├── textarea.tsx        # Styled textarea
├── scroll-area.tsx     # Radix UI scroll area
├── separator.tsx       # Radix UI separator
├── tooltip.tsx         # Radix UI tooltip with Provider
├── alert-dialog.tsx    # Radix UI alert dialog
├── skeleton.tsx        # Loading placeholder
├── sonner.tsx          # Toast notifications
├── spinner.tsx         # Loading spinner
└── index.ts            # Barrel export
```

### Component Patterns
All shadcn/ui components follow these patterns:
```typescript
// Use forwardRef for DOM access
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

// Use cn() for class merging (combines clsx + tailwind-merge)
import { cn } from '@/lib/utils';
<div className={cn('base-class', isActive && 'active-class', className)} />

// Use CVA for variant management
import { cva, type VariantProps } from 'class-variance-authority';
const buttonVariants = cva('base-styles', {
  variants: {
    variant: { default: '...', destructive: '...' },
    size: { default: '...', sm: '...', lg: '...' }
  },
  defaultVariants: { variant: 'default', size: 'default' }
});
```

### Adding New shadcn/ui Components
Use the shadcn CLI to add components:
```bash
npx shadcn@latest add [component-name]
```

Components are installed to `components/ui/` and can be customized. The CLI will also install required Radix UI dependencies.

## Styling

### Tailwind CSS + CSS Variables
The project uses Tailwind CSS with CSS variables for theming. All color values use the `hsl(var(--name))` pattern.

**Key files:**
- `tailwind.config.ts` - Tailwind configuration with custom colors, fonts, animations
- `app/globals.css` - CSS variables and component styles

### CSS Variables (defined in globals.css)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --secondary: 240 4.8% 95.9%;
  --muted: 240 4.8% 95.9%;
  --accent: 240 4.8% 95.9%;
  --destructive: 0 84.2% 60.2%;
  /* ... sidebar variables, chart colors, etc. */
}

.dark {
  /* Dark mode overrides */
}
```

### Dark Mode
Dark mode uses the class-based strategy (`darkMode: ['class']` in Tailwind config). Toggle with `next-themes`:
```typescript
import { useTheme } from 'next-themes';
const { theme, setTheme } = useTheme();
```

### Custom CSS Classes (in globals.css)
The project defines custom component styles in `@layer components`:
- `.app`, `.chat`, `.thread` - Layout grids
- `.user-message`, `.assistant-message` - Message styling
- `.block-stack` - Message content container
- `.doc-block`, `.doc-paragraph`, `.doc-heading`, `.doc-list`, `.doc-code` - Block types
- `.is-edited`, `.is-selected` - Block states

### API Endpoints (Next.js Route Handlers)
All API routes in `app/api/` follow the same pattern:
- Accept POST requests only (except `/api/config` which is GET)
- Validate input using `lib/utils/validation.ts`
- Call OpenAI API with `gpt-4o-mini`
- Return `NextResponse.json({ text })` or `NextResponse.json({ error }, { status })`

**Streaming Support**: `/api/chat` supports streaming via Server-Sent Events (SSE):
```typescript
// Request with stream: true
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ prompt, stream: true })
});
// Response is an event stream with: tokens, response_id, done, error events
```

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
7. **shadcn/ui patterns**: Use `cn()` for class merging, CVA for variants, forwardRef for all components

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
Configured in `tsconfig.json` and `components.json`:
```typescript
import { useStore } from '@/lib/store/useStore';     // @ = project root
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

#### Creating a New UI Component
1. Check if shadcn/ui has the component: `npx shadcn@latest add [name]`
2. If custom, follow shadcn patterns:
```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary';
}

const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'base-styles',
          variant === 'secondary' && 'secondary-styles',
          className
        )}
        {...props}
      />
    );
  }
);
MyComponent.displayName = 'MyComponent';
export { MyComponent };
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

## Key Dependencies

**UI & Styling:**
- `tailwindcss` - Utility CSS
- `class-variance-authority` - Component variants
- `clsx` + `tailwind-merge` - Class merging (via cn())
- `lucide-react` - Icons
- `next-themes` - Theme switching
- `sonner` - Toast notifications

**Radix UI Primitives** (for shadcn/ui):
- `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`
- `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`
- `@radix-ui/react-slot`, `@radix-ui/react-tooltip`

**State & Data:**
- `zustand` - State management
- `@supabase/supabase-js` - Database client

**AI & Content:**
- `openai` - OpenAI SDK
- `katex` + `react-katex` - Math rendering
