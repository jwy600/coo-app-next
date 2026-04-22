# Coo - Project Context for Claude Code

Block-based chat wiki where LLM responses are interactive semantic blocks (expand, translate, ELI5, export as cards).

## Quick Reference

| What | Where |
|------|-------|
| Architecture overview | `docs/architecture.md` |
| Test patterns | `docs/testing.md` |
| TypeScript types | `types/` |

## Tech Stack
Next.js 16 + React 19 + TypeScript + Zustand (localStorage persist) + Tailwind + Radix UI + OpenAI API (browser-direct).

No backend. No database. No auth. The user's OpenAI API key is entered via Settings and stored in localStorage alongside threads, messages, blocks, and cards.

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

### OpenAI Integration (browser-direct)
```
lib/api/
├── openAiClient.ts  # Thin wrapper around `openai` SDK (dangerouslyAllowBrowser: true)
├── chat.ts          # fetchChatCompletionStream — streams assistant replies
├── blockAction.ts   # fetchBlockAction — one-shot block transforms
└── index.ts         # Re-exports
```

### Other Key Locations
```
hooks/               # Custom React hooks
├── useComposer.ts   # Composer logic (chat/ask/edit modes)
├── useStreaming.ts  # Streaming hook (dispatches SDK callbacks into store)
├── useBlockSelection.ts  # Block click handling
├── useTextSelection.ts   # Text selection for rewrite
└── useKeyboardShortcuts.ts
lib/export/          # Markdown export utilities
lib/rendering/       # Markdown + KaTeX + strikethrough rendering
lib/config/          # OpenAI model settings + prompt loader
prompts/             # System prompt .md files (language-neutral, injected at runtime)
types/state/         # State type definitions (CoreState, UIState)
tests/               # Vitest unit tests
e2e/                 # Playwright E2E tests
```

## Key Patterns

**State changes**: Always modify via pure functions in `lib/state/`, never mutate directly.

**Block model**: AI responses → parsed into blocks → each block has `id`, `type`, `text`, `selections[]`.

**Composer modes**: `ComposerMode = 'chat' | 'ask' | 'edit'`. Ask mode sends to AI; Edit mode allows direct text replacement.

**Card model**: Double-click block gutter → creates card. Headings expand to include section content.

**Persistence**: Zustand `persist` middleware → localStorage. No backend, no auth. The OpenAI API key lives in `settings.apiKey` (also persisted) and is passed to the `openai` SDK directly from the browser.

## Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest
npm run test:e2e     # Playwright
```

## Environment
No environment variables are required. Users enter their OpenAI API key in the Settings UI; it is persisted to localStorage and read from `settings.apiKey` on every request.
