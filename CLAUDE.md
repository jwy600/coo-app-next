# Coo - Project Context for Claude Code

A focus-mode chat wiki: drag-select any passage in an assistant message and an in-place editor opens for raw-markdown editing, AI-assisted rewrites, and freeform notes. The block / card model has been removed — every message is a single markdown string.

## Quick Reference

| What | Where |
|------|-------|
| Architecture overview | `docs/architecture.md` |
| Test patterns | `docs/testing.md` |
| Focus-mode original spec (historical) | `docs/focus-mode-spec.md` |
| Focus-mode original plan (historical) | `docs/focus-mode-plan.md` |
| Unified-editor design rationale | `docs/ideas/focus-mode-unified-editor.md` |
| Unified-editor implementation plan | `docs/focus-mode-unified-editor-plan.md` |
| TypeScript types | `types/` |

## Tech Stack
Next.js 16 + React 19 + TypeScript + Zustand (localStorage persist) + Tailwind + Radix UI + react-markdown + remark/rehype + OpenAI API (browser-direct).

No backend. No database. No auth. The user's OpenAI API key is entered via Settings and stored in localStorage alongside threads and messages.

## Directory Map

### State Management (CRITICAL)
```
lib/state/           # Pure functions (business logic lives here)
├── index.ts         # createInitialState, setMode
├── thread.ts        # Thread CRUD
├── message.ts       # text-based message ops (append, replaceRange, …)
├── focus.ts         # Focus editor lifecycle (open/close/note/rewrite)
└── settings.ts      # User preferences

lib/store/           # Zustand store (thin wrappers calling lib/state/)
├── useStore.ts      # Hook export + selectors
├── migration.ts     # Persist v2 → v3 (joins blocks into message.text)
└── slices/
    ├── threadSlice.ts
    ├── messageSlice.ts   # appendMessageText / replaceMessageRange / …
    ├── focusSlice.ts     # openEditor / updateBuffer / closeEditor / …
    ├── streamingSlice.ts # streamingMessageId only
    ├── uiSlice.ts        # mode / error / composerPrompt
    └── settingsSlice.ts
```

### Components
```
components/
├── chat/            # Core chat UI
│   ├── ChatContainer.tsx
│   ├── MessageList.tsx
│   ├── AssistantMessage.tsx   # MarkdownContent + selection wiring
│   ├── UserMessage.tsx
│   ├── ExportButton.tsx
│   ├── DeleteThreadButton.tsx
│   ├── PendingMessage.tsx
│   └── ErrorMessage.tsx
├── editor/          # Focus mode
│   ├── FocusEditor.tsx        # In-place textarea bound to focus.buffer
│   ├── EditorControls.tsx     # Unified action row: shortcuts + ask input + Revert + Rewrite
│   └── EditorActions.tsx      # Translate / ELI5 / Summarize badges
├── composer/        # Bottom chat composer (chat mode only)
│   ├── Composer.tsx           # Top-level form: prompt + Send + hint
│   ├── ComposerHint.tsx
│   └── PromptInput.tsx
├── content/
│   └── MarkdownContent.tsx    # react-markdown + remarkSourcePositions + rehypeWrapText + rehype-katex
├── sidebar/, settings/, layout/, empty-state/, ui/   # unchanged from before
```

### OpenAI Integration (browser-direct)
```
lib/api/
├── openAiClient.ts  # Thin wrapper around `openai` SDK (dangerouslyAllowBrowser: true)
├── chat.ts          # fetchChatCompletionStream — streams assistant replies
├── blockAction.ts   # fetchBlockAction — one-shot transforms
                     #   (translate / eli5 / summarize / ask, plus legacy expand / example)
├── rewrite.ts       # fetchRewrite — atomic Markdown rewrite for the focus editor
├── generateThreadTitle.ts
└── index.ts
```

### Selection layer (focus mode core)
```
lib/selection/
├── remarkSourcePositions.ts  # Tags every rendered element with data-md-start / data-md-end
├── rehypeWrapText.ts         # Wraps text nodes in spans + math elements in atomic spans
├── domToSource.ts            # DOM Range → { messageId, start, end } character offsets
└── index.ts
```

### Hooks
```
hooks/
├── useComposer.ts        # Chat-mode submit handler (always streams; bottom composer is chat-only)
├── useStreaming.ts       # Creates an empty assistant message + appends tokens to its text
├── useFocusSelection.ts  # mouseup/touchend → domToSource → openEditor
├── useKeyboardShortcuts.ts
└── use-mobile.tsx
```

### Other key locations
```
lib/export/          # Whole-thread markdown export
lib/config/          # OpenAI settings + prompt loader (incl. REWRITE_PROMPT)
types/state/         # CoreState, UIState (incl. FocusActive)
tests/               # Vitest unit tests
e2e/                 # Playwright tests (currently broken; rewrite in a later phase)
```

## Key Patterns

**State changes**: Always modify via pure functions in `lib/state/`, never mutate directly.

**Message model**: each `Message` carries a single `text: string` (markdown). No blocks, no per-block ids.

**Focus editor**: `focus: FocusActive | null` in UIState. `FocusActive` = `{ messageId, range, buffer, notes[], prevBuffer, lastResponseId?, referenceQuestion? }`. Drag-selecting an assistant message opens an in-place textarea seeded from `message.text.slice(start, end)`. Click-outside auto-saves the buffer + notes back into the message via `replaceMessageRange`.

**Source-position attributes**: every rendered HTML element carries `data-md-start` / `data-md-end` (character offsets into `message.text`). Text nodes are wrapped in `<span data-md-text="true">`; math elements get an outer `<span data-md-atomic="true">` so KaTeX-rendered output keeps its source range.

**Composer behavior**: the bottom composer is **always in chat mode**. Submit always appends a user message and streams an assistant reply, regardless of whether an editor is open. There is no longer any state-driven mode flip.

**Editor action row** (inside `FocusEditor`, replaces the old composer-side shortcuts): a single horizontal row that owns every focus-mode action.
- **Shortcuts** (Translate / ELI5 / Summarize) call `fetchBlockAction(action, buffer, ...)` and mutate the buffer in place via `setShortcutResult` (preserves notes; Revert undoes).
- **Ask input** (text input on the same row): Enter submits a question about the buffer; the answer auto-appends to notes; the input clears.
- **Revert** undoes the most recent buffer mutation (shortcut or rewrite). Single-step.
- **Rewrite** bundles buffer + notes into `fetchRewrite` and replaces the buffer atomically.

Mode is **spatial, not temporal** — the bottom composer never changes meaning under the cursor; focus-mode ask happens inside the editor's input.

**Rewrite**: atomic — `fetchRewrite(buffer, notes)` returns the revised passage; `setRewriteResult` swaps it in and stashes the prior buffer for one-step Revert.

**Persistence**: Zustand `persist` middleware → localStorage. Persist version is `3`. The v2→v3 migration in `lib/store/migration.ts` joins per-message blocks into `message.text` and drops the `blocks` / `cards` arrays. The OpenAI API key lives in `settings.apiKey`.

## Commands
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest
npm run test:e2e     # Playwright (broken; will be rewritten)
```

## Environment
No environment variables are required. Users enter their OpenAI API key in the Settings UI; it is persisted to localStorage and read from `settings.apiKey` on every request.
