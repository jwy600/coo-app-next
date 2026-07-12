# Coo - Project Context for Claude Code

A focus-mode chat wiki: drag-select any passage in an assistant message and an in-place editor opens for raw-markdown editing, AI-assisted rewrites, and freeform notes. The block / card model has been removed — every message is a single markdown string.

## Related repo

A subset of this app's focus-mode + document-registration features is ported into an Obsidian plugin at `~/obsidian-coo`. The file-by-file concept map lives in `~/obsidian-coo/CLAUDE.md` ("Reference app" table); the live porting log is `~/obsidian-coo/SYNC.md`. Run `/coo-sync` here after a merge to record what changed and whether the plugin should mirror it.

**Session-start sync check (do this early each session):** compare the newest date under `SYNC.md` → "Recent changes" against the newest commit in `git log`. If commits exist newer than the last logged entry — meaning a merge landed but `/coo-sync` hasn't been run — surface it to the user first: _"Heads up: there are unlogged commits in this repo. Run `/coo-sync` to update SYNC.md?"_ Then proceed with their request.

## Quick Reference

| What | Where |
|------|-------|
| Architecture overview | `docs/architecture.md` |
| Test patterns | `docs/testing.md` |
| Focus-mode original spec (historical) | `docs/focus-mode-spec.md` |
| Unified-editor design rationale | `docs/ideas/focus-mode-unified-editor.md` |
| Unified-editor implementation plan (historical) | `docs/focus-mode-unified-editor-plan.md` |
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

**Focus editor**: `focus: FocusActive | null` in UIState. `FocusActive` = `{ messageId, range, buffer, notes[], prevBuffer, lastResponseId?, referenceQuestion? }`. Drag-selecting an assistant message opens an in-place textarea seeded from `message.text.slice(start, end)`. Click-outside auto-saves via `closeEditor`: the passage writes back at the selection range, and any trailing notes relocate to the end of the containing block (the next `\n\n` boundary, or EOF) so a note never lands mid-paragraph/mid-list.

**Source-position attributes**: every rendered HTML element carries `data-md-start` / `data-md-end` (character offsets into `message.text`). Text nodes are wrapped in `<span data-md-text="true">`; math elements get an outer `<span data-md-atomic="true">` so KaTeX-rendered output keeps its source range.

**Composer behavior**: the bottom composer is **always in chat mode**. Submit always appends a user message and streams an assistant reply, regardless of whether an editor is open. There is no longer any state-driven mode flip.

**Editor action row** (inside `FocusEditor`, replaces the old composer-side shortcuts): ask input on top with a `↵` submit indicator, chip strip below it.

**Notes live as raw markdown in the buffer** — there is no separate `focus.notes` state. Ask answers append directly to `focus.buffer` as `\n\n> **Note:** <answer>`. While the editor is open the buffer holds passage + notes inline; `closeEditor` writes the passage back at the selection range and relocates the trailing notes to the end of the containing block (next `\n\n` boundary, or EOF) — never mid-paragraph/mid-list. `openEditor` slices the selection back as-is. A `splitNotes(buffer)` parser in `lib/state/focus.ts` is the only place that knows the note pattern.

| Action | API input | Buffer after |
|---|---|---|
| Shortcuts (Translate / ELI5 / Summarize) | whole buffer (notes included) | `result` |
| Ask input | `splitNotes(buffer).passage` only | unchanged + appended `> **Note:** answer` |
| Rewrite | `splitNotes(buffer)` → `(passage, notes[])` envelope | `result` (notes consumed) |
| Revert | — | `prevBuffer` (single-step undo) |

**Asymmetry — shortcuts intentionally do NOT split.** Translating a passage and leaving its annotations in the original language is confusing; same for ELI5 / Summarize. Ask is different (prior Q&A would pollute new question context); Rewrite is different (notes are user instructions, not content to revise). Don't unify these without reading why.

**Reserved pattern: `> **Note:** ...` at the trailing position of a buffer.** `splitNotes` treats it as an ask-flow annotation, so Ask sends only the passage portion to the model and Rewrite consumes those lines as guidance (they don't survive the rewrite). If a user-authored passage happens to end with `> **Note:** ...`, Rewrite will treat it as an instruction and the line will be gone after rewrite. We accepted this trade-off in exchange for simpler markdown (no UUID disambiguator polluting the persisted text). It does not affect Ask or Shortcuts: Ask just appends below the existing content; Shortcuts don't split. Notes anywhere other than the trailing run (e.g. mid-passage) are not touched.

`MarkdownContent` flags blockquotes whose first paragraph starts with `<strong>Note:</strong>` and gives them a muted `.doc-blockquote--note` class — visually distinguishing notes from user-authored blockquotes in the rendered (post-close) message. A skippable-concept Ask answer (the `<ask>` prompt has the model judge load-bearing-ness and lead with `**Minor** —`) is parsed by `parseMinorTag` in `lib/state/focus.ts`, written as `> **Note:** [Minor] <body>`, and gets an even-more-muted `.doc-blockquote--minor` class.

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
