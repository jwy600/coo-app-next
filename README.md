# Coo - Blockwise AI Chat

> Edit AI answers in place with block-level granularity.

Coo transforms long AI responses into clean, editable paragraph blocks. Translate, expand, simplify, and rewrite content right where it appears—no copy-pasting required.

## Features

- **Block-based editing** - AI responses split into independently editable paragraph blocks
- **In-place transformations** - Translate, expand, ELI5, provide examples, and more
- **Text highlighting** - Select phrases within blocks to emphasize in rewrites
- **Thread persistence** - All conversations automatically saved to Supabase
- **Math rendering** - Beautiful LaTeX equation rendering with KaTeX
- **Markdown support** - Headings, lists, code blocks, bold text, and more

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **State Management**: Zustand (wrapping pure functions)
- **Styling**: Tailwind CSS
- **AI**: OpenAI API (GPT-4o-mini)
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest (263 tests, 82.6% coverage)
- **Deployment**: Vercel

## Architecture Highlights

### Functional State Management
Pure, testable state functions in `lib/state/` wrapped by Zustand for React integration:

```typescript
// Pure function (testable, no side effects)
export const addUserMessage = (state, text, idFactory, nowFactory) => {
  // Returns new state object
  return { state: newState, message, blocks };
};

// Zustand action (wraps pure function)
addUserMessage: (text) => {
  const result = stateFns.addUserMessage(get(), text, idFactory, nowFactory);
  set({ threads: result.state.threads, blocks: result.state.blocks });
};
```

### Block-Based Content Model
AI responses are parsed into blocks (paragraphs, lists, code) that support:
- Independent editing and transformations
- Text selection highlighting
- Rewrite with undo capability
- Markdown and math rendering

### Project Structure
```
coo-app-next/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with metadata
│   ├── page.tsx             # Landing page (/)
│   ├── t/[threadId]/
│   │   └── page.tsx         # Thread detail page
│   └── api/                 # API route handlers
│       ├── chat/route.ts    # Chat completion endpoint
│       ├── block-action/route.ts  # Block transformations
│       └── config/route.ts  # Supabase config
├── components/
│   ├── chat/                # Chat UI components
│   ├── composer/            # Message composer
│   ├── landing/             # Landing page components
│   ├── layout/              # Header, Logo
│   ├── ui/                  # Reusable UI components
│   └── error/               # Error boundary
├── hooks/                   # Custom React hooks
│   ├── useComposer.ts       # Message submission logic
│   ├── useBlockSelection.ts # Block selection state
│   ├── useTextSelection.ts  # Text highlighting
│   ├── useThreadSync.ts     # Supabase sync
│   └── useKeyboardShortcuts.ts
├── lib/
│   ├── state/               # Pure state functions (CORE)
│   │   ├── index.ts         # Main state orchestration
│   │   ├── thread.ts        # Thread operations
│   │   ├── message.ts       # Message operations
│   │   ├── block.ts         # Block operations
│   │   └── parser.ts        # Markdown parsing
│   ├── store/               # Zustand store
│   │   ├── useStore.ts      # Combined store
│   │   └── slices/          # State slices
│   ├── api/                 # API client functions
│   ├── supabase/            # Supabase client & operations
│   ├── rendering/           # Markdown & math rendering
│   └── utils/               # Utility functions
├── types/                   # TypeScript definitions
└── tests/                   # Test suites (263 tests)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key
- Supabase project

### Installation

1. Clone the repository
```bash
git clone https://github.com/jwy600/coo-app-next.git
cd coo-app-next
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables

Create `.env.local`:
```bash
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
```

4. Set up database

Run the schema from `supabase/schema.sql` in your Supabase SQL editor:

```sql
-- Creates tables: threads, messages, blocks
-- See supabase/schema.sql for full schema
```

5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## Testing

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
tests/
├── lib/
│   ├── state/               # Pure function tests (43 tests)
│   ├── store/               # Zustand store tests
│   ├── supabase/            # Database operation tests
│   └── rendering/           # Markdown/math tests (88 tests)
├── hooks/                   # Custom hooks tests (22 tests)
├── components/              # Component tests (32 tests)
├── api/                     # API route tests (23 tests)
├── app/                     # Routing tests (4 tests)
└── integration/             # End-to-end flow tests (9 tests)
```

### Current Coverage

- **263 passing tests** across all modules
- **82.6% coverage** on critical state management functions
- **70%+ coverage** on most modules
- All 6 user flows tested end-to-end

## Block Actions

Available transformations for selected blocks:

- **Translate** - Convert between English and Chinese
- **Expand** - Add depth and detail to content
- **ELI5** - Simplify explanation (Explain Like I'm 5)
- **Example** - Generate illustrative examples
- **Ask** - Ask follow-up questions about the block
- **Rewrite** - Rewrite emphasizing highlighted text (with undo)

## Keyboard Shortcuts

- **Escape** - Clear block selection / deselect
- **Enter** (in composer) - Submit message
- **Ctrl/Cmd + Enter** - Add newline in composer

## Development

### Key Principles

1. **Pure functions** - All state logic in `lib/state/` must be pure (no side effects)
2. **Immutability** - Never mutate state, always return new objects
3. **Dependency injection** - Pass `idFactory` and `nowFactory` for testability
4. **Client boundaries** - Use `'use client'` only when necessary
5. **Test coverage** - Maintain 70%+ coverage on critical paths

### Adding New Features

1. Start with pure state function in `lib/state/`
2. Write tests for the pure function
3. Add Zustand action in `lib/store/slices/`
4. Create UI components if needed
5. Add integration tests for user flows

## Database Schema

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
  role TEXT,
  created_at TIMESTAMP,
  meta JSONB
)

blocks (
  id TEXT PRIMARY KEY,
  thread_id TEXT REFERENCES threads(id),
  message_id TEXT REFERENCES messages(id),
  position INTEGER,
  type TEXT,
  text TEXT,
  edited BOOLEAN,
  selections JSONB,
  prev_text TEXT,
  is_rewritten BOOLEAN
)
```

## Migration from Vanilla JS

This is a **complete rewrite** from vanilla JS to Next.js/React/TypeScript. The migration preserved:
- 100% feature parity
- All 44 original pure state function tests
- Database schema (fully compatible)
- API endpoints (same interface)

**Migration Stats:**
- **10 phases** over 23 days
- **263 tests** (from 44 original)
- **0 TypeScript errors**
- **100% backward compatible** database

See `MIGRATION_PLAN.md` and `MIGRATION_PHASES.md` for full details.

## Contributing

Contributions are welcome! Please ensure:

1. **Tests pass**: Run `npm test` before committing
2. **Add tests**: For new features and bug fixes
3. **Type safety**: Run `npx tsc --noEmit` to check types
4. **Follow patterns**: Match existing code structure
5. **Pure functions**: Keep state logic pure and testable

## Performance

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle size**: < 300KB gzipped
- **Lighthouse score**: 90+ (Performance, Accessibility, Best Practices)

## CI/CD

Tests run automatically via GitHub Actions on every push and pull request.

## License

ISC

## Acknowledgments

- Inspired by Notion's block-based editing model
- Powered by OpenAI's GPT-4o-mini
- Built with Next.js, React, Zustand, and Supabase
- Migration from vanilla JS completed in 10 phases

---

**Built with love by the Coo team** | [Report Bug](https://github.com/jwy600/coo-app-next/issues) | [Request Feature](https://github.com/jwy600/coo-app-next/issues)
