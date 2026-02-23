# Coo - Project Context for Claude Code

Block-based chat wiki where LLM responses are interactive semantic blocks (expand, translate, ELI5, export as cards).

## Quick Reference

| What | Where |
|------|-------|
| Architecture overview | `docs/architecture.md` |
| Database schema | `docs/database.md` |
| Test patterns | `docs/testing.md` |
| TypeScript types | `types/` |

## Tech Stack
Next.js 16 + React 19 + TypeScript + Zustand + Tailwind + Radix UI + Supabase + OpenAI API

## Directory Map

### State Management (CRITICAL)
```
lib/state/           # Pure functions (business logic lives here)
├── index.ts         # UI state (selectBlock, setMode, createInitialState)
├── thread.ts        # Thread CRUD
├── message.ts       # Message operations
├── block.ts         # Block operations (rewrite, undo)
├── card.ts          # Card operations (create, remove, scope)
├── heading.ts       # Section/heading range logic
├── parser.ts        # Markdown → blocks
└── settings.ts      # User preferences

lib/store/           # Zustand store (thin wrappers calling lib/state/)
├── useStore.ts      # Hook export + selectors
└── slices/          # Store slices
    ├── blockSlice.ts
    ├── cardSlice.ts
    ├── settingsSlice.ts
    ├── streamingSlice.ts
    ├── threadSlice.ts
    └── uiSlice.ts
```

### Components
```
components/
├── auth/            # Authentication
│   └── LoginForm.tsx        # Email/password login form
├── chat/            # Core chat UI
│   ├── MessageList.tsx      # Message rendering loop
│   ├── AssistantMessage.tsx # AI response container
│   ├── BlockStack.tsx       # Block rendering
│   ├── DocBlock.tsx         # Individual block + textarea
│   ├── BlockControls.tsx    # Block action buttons
│   ├── CardControls.tsx     # Card UI controls
│   ├── ChatContainer.tsx    # Main chat wrapper
│   ├── DeleteThreadButton.tsx   # Thread deletion with confirmation
│   ├── ExportButton.tsx     # Export thread/cards button
│   ├── ExportCardDialog.tsx # Export modal
│   ├── SelectionChips.tsx   # Text selection chips
│   └── UserMessage.tsx      # User message display
├── composer/        # Input area
│   ├── Composer.tsx         # Main input component
│   ├── BlockModeToggle.tsx  # Ask/Edit mode toggle
│   ├── ComposerHint.tsx     # Composer hint text
│   └── PromptInput.tsx      # Text input with edit mode
├── content/         # Content rendering
│   ├── BlockContent.tsx     # Markdown/strikethrough renderer
│   └── Math.tsx             # KaTeX math rendering
├── sidebar/         # Navigation
│   ├── AppSidebar.tsx       # Thread list sidebar
│   ├── NewChatButton.tsx    # New thread button
│   ├── SidebarLogo.tsx      # Logo component
│   └── SidebarThreadList.tsx # Thread list
├── settings/        # Settings UI
│   ├── SettingsForm.tsx     # Settings form (model, language, etc.)
│   └── SettingsSheet.tsx    # Settings modal
├── layout/          # Layout wrappers
│   └── AppLayout.tsx        # Main app layout
└── ui/              # shadcn/ui primitives
```

### API Routes
```
app/api/
├── chat/route.ts         # POST: Chat completion (streaming SSE)
├── block-action/route.ts # POST: Block transformations (ELI5, translate, expand)
└── config/route.ts       # GET: Supabase config
```

### Database
```
lib/supabase/
├── client.ts    # withSupabaseClient helper (browser)
├── server.ts    # Server-side client (cookie-based auth)
├── auth.ts      # Auth helpers (signIn, signOut)
├── threads.ts   # Thread CRUD
├── messages.ts  # Message CRUD
├── blocks.ts    # Block CRUD
├── cards.ts         # Card CRUD
├── usersettings.ts  # User settings CRUD
└── types.ts         # Supabase types (all include user_id)
```

### Other Key Locations
```
hooks/               # Custom React hooks
├── useAuth.ts       # Supabase auth state hook
├── useComposer.ts   # Composer logic (chat/ask/edit modes)
├── useStreaming.ts   # SSE streaming hook
├── useBlockSelection.ts  # Block click handling
├── useTextSelection.ts   # Text selection for rewrite
├── useKeyboardShortcuts.ts
└── useThreadSync.ts # Thread ↔ Supabase sync
lib/api/             # Frontend API client functions
lib/export/          # Markdown export utilities
lib/rendering/       # Markdown + KaTeX + strikethrough rendering
lib/config/          # OpenAI model settings + prompt loader
prompts/             # System prompt .md files (language-neutral, injected at runtime)
types/state/         # State type definitions (CoreState, UIState)
proxy.ts             # Next.js middleware (auth session refresh)
tests/               # Vitest unit tests
e2e/                 # Playwright E2E tests
```

## Key Patterns

**State changes**: Always modify via pure functions in `lib/state/`, never mutate directly.

**Block model**: AI responses → parsed into blocks → each block has `id`, `type`, `text`, `selections[]`.

**Composer modes**: `ComposerMode = 'chat' | 'ask' | 'edit'`. Ask mode sends to AI; Edit mode allows direct text replacement.

**Card model**: Double-click block gutter → creates card. Headings expand to include section content.

**Auth**: Supabase Auth with RLS. All tables have `user_id`. `proxy.ts` handles session refresh.

## Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest
npm run test:e2e     # Playwright
```

## Environment
```bash
OPENAI_API_KEY=...                           # Required
NEXT_PUBLIC_SUPABASE_URL=...                 # Optional (persistence)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...     # Optional (persistence)
```
