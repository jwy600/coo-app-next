# Architecture

## Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Zustand** for state management (localStorage persistence via `persist` middleware)
- **shadcn/ui** + **Tailwind CSS** for UI
- **react-markdown** + **remark-gfm** + **remark-math** + **rehype-katex** for rendering
- **OpenAI API** for AI features — called directly from the browser using the user's API key

There is no backend server and no database. All data (threads, messages, settings) lives in the user's browser localStorage. The user's OpenAI API key is entered in the Settings UI and stored in localStorage alongside everything else.

## Project Structure
```
app/                            # Next.js App Router
├── layout.tsx                  # Root layout
├── page.tsx                    # Landing page
├── globals.css                 # Tailwind + CSS variables
└── t/[threadId]/               # Thread detail pages

components/
├── ui/                         # shadcn/ui components
├── chat/                       # ChatContainer, MessageList, AssistantMessage, UserMessage,
│                               # ExportButton, DeleteThreadButton, PendingMessage, ErrorMessage
├── editor/                     # Focus mode: FocusEditor, EditorControls
├── composer/                   # Composer, EditorActions, ComposerHint, PromptInput
├── content/                    # MarkdownContent (the only renderer)
├── sidebar/                    # AppSidebar, NewChatButton, etc.
├── settings/                   # Settings UI (incl. OpenAI API key input)
├── empty-state/                # Landing page hero
└── layout/                     # Layout wrappers

lib/
├── state/                      # Pure state functions (CRITICAL — see below)
├── store/                      # Zustand store + slices + persist migration
├── selection/                  # DOM ↔ source mapping (focus mode core)
├── api/                        # Browser-side OpenAI client + chat / block-action / rewrite pipelines
├── config/                     # OpenAI settings, prompt templates and loader
├── export/                     # Markdown export utilities
└── utils/                      # Helpers (cn, validation, idFactory, etc.)

hooks/                          # Custom React hooks
types/                          # TypeScript definitions
tests/                          # Vitest tests
e2e/                            # Playwright tests
```

## State Management

### State Categories (`types/state/`)
- **CoreState** (`core.ts`) — Persistent data (`threads`, `activeThreadId`)
- **UIState** (`ui.ts`) — Ephemeral UI (`mode`, `isAwaitingResponse`, `error`, `focus`, `composerPrompt`)
- **StreamingState** — `streamingMessageId: string | null`
- **SettingsState** — Persisted user preferences

Combined as `AppState = CoreState & UIState`.

### Pure Functions (`lib/state/`)
All state logic lives here as pure functions with **narrow signatures**:

```typescript
export const replaceMessageRange = (
  state: AppState,
  messageId: string,
  range: [number, number],
  replacement: string,
): AppState => { … };

export const openEditor = (
  state: AppState,
  messageId: string,
  range: [number, number],
): AppState => { … };  // auto-saves any active editor first
```

The Zustand slices in `lib/store/slices/` are thin wrappers that call these pure functions and write the result into the store.

Key files:
- `lib/state/index.ts` — `createInitialState`, `setMode`
- `lib/state/thread.ts` — Thread CRUD, `getLastAssistantResponseId`
- `lib/state/message.ts` — Message ops on `text: string`: `addUserMessage`, `addAssistantMessage`, `appendMessageText`, `replaceMessageRange`, `setMessageResponseId`, `removeMessage`, `findMessage`
- `lib/state/focus.ts` — Focus editor lifecycle: `openEditor`, `closeEditor`, `updateBuffer`, `appendNote`, `setRewriteResult`, `revertRewrite`
- `lib/state/settings.ts` — User settings reducer

### Why this pattern?
- **Testability** — pure functions are easy to unit test
- **Predictability** — no hidden side effects
- **Debugging** — state changes are traceable

## Message model

Each message is a single markdown string:

```typescript
interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: number;
  meta: Record<string, unknown>;  // e.g. { openaiResponseId }
}
```

There is **no block model**. Markdown is rendered straight into HTML by `MarkdownContent`. Streaming appends tokens directly to `message.text` via `appendMessageText`; the live message renders through the same pipeline as completed ones.

## Focus mode (the core UX)

### Selection layer (`lib/selection/`)
The trick that makes drag-select-to-edit work is mapping DOM selections back to source markdown character offsets:

1. **`remarkSourcePositions`** — a remark plugin that visits every mdast node carrying a `position` and writes `data-md-start` / `data-md-end` onto its rendered HTML element via `data.hProperties`.
2. **`rehypeWrapText`** — a rehype plugin that:
   - Wraps each hast text node in `<span data-md-text="true" data-md-start data-md-end>` so DOM ranges anchored inside text get character-precise mapping.
   - Wraps `math-inline` / `math-display` elements in an outer `<span data-md-atomic="true">` whose source offsets survive `rehype-katex`'s element replacement.

   Must run **before** `rehype-katex`.
3. **`domToSource(range)`** — given a DOM `Range`, walks up to the closest `[data-message-id]` ancestor, reads source offsets from the wrapping spans, and returns `{ messageId, start, end }` (or `null` if the range is invalid / sub-word / cross-message).

### Focus state (`UIState.focus`)
```typescript
interface FocusActive {
  messageId: string;
  range: [number, number];   // character offsets into message.text
  buffer: string;            // editable markdown — initialized from message.text.slice(...)
  notes: string[];           // accumulated via appendNote
  prevBuffer: string | null; // single-step Rewrite undo
}
```

Persisted shape on disk: nothing. Focus is purely in-memory.

### Editor lifecycle
1. **Open** — `useFocusSelection` (mounted on each `AssistantMessage`) listens for `mouseup` / `touchend` and calls `domToSource(getSelection().getRangeAt(0))`. If the result anchors inside this message and meets the minimum-length rule, it dispatches `openEditor(messageId, [start, end])`. The hook is disabled while the message is streaming or already in focus mode.
2. **Render split** — when `focus.messageId === message.id`, `AssistantMessage` renders three parts: `<MarkdownContent text={text.slice(0, start)} />` + `<FocusEditor />` + `<MarkdownContent text={text.slice(end)} />`. The editor is a regular block element; surrounding text reflows around it.
3. **Edit / notes** — typing flows through `updateBuffer`. `appendNote(text)` is called from two places: composer's drag-select handler, and the EditorActions buttons (currently lands in the composer prompt instead — see "Composer behavior" below).
4. **Close** — `closeEditor` serializes notes as `> **Note:** <text>` blockquotes after a blank line, splices the result into `message.text` via `replaceMessageRange`, and clears `focus`. Triggered by:
   - Click outside the editor (excluding `.composer`, which is part of the working surface)
   - Opening another editor (auto-save then re-open)

### Rewrite
Atomic — `fetchRewrite(buffer, notes)` posts a `<passage>` / `<notes>` envelope with `REWRITE_PROMPT` instructions. While in flight, `EditorControls` shows "Rewriting…" and disables the buttons. On success `setRewriteResult(text)` stashes the prior buffer in `prevBuffer` and replaces the live buffer; Revert restores it (single-step). Notes are consumed (cleared) by Rewrite — they were folded into the prompt that produced the result.

## Composer behavior

### Submit (`useComposer.handleSubmit`)
Behavior is derived from `focus`:

- **No editor active** → chat. `addUserMessage(prompt)` then `streamChat(...)` which creates an empty assistant message and appends tokens into its `text`.
- **Editor active** → ask. `fetchBlockAction('ask', focus.buffer, prompt)`. The answer **replaces the composer prompt in place**. No thread messages are added; no streaming. On error the prompt is preserved so the user can retry.

(This deviates from the original spec, which routed the answer into the thread. See the project memory for rationale.)

### Drag-select inside the composer
When focus is active and the user drag-selects text inside the composer's form, the selected text is passed to `appendNote`. The selection is then cleared so subsequent drags trigger again.

### Shortcut buttons (`EditorActions`)
Translate / ELI5 / Summarize render as Badge buttons above the prompt input when focus is active. Each calls `fetchBlockAction(action, focus.buffer, ...)` and writes the result into the composer prompt. Co-locating button + result removes the eye-jump that an editor-side variant created.

## Streaming

`useStreaming.streamChat`:
1. `addAssistantMessage('')` — creates an empty placeholder message.
2. `startStreaming(messageId)` — records the in-flight id (used to disable focus mode for this message until completion).
3. SDK callbacks:
   - `onToken` → `appendMessageText(messageId, token)`
   - `onResponseId` → `setMessageResponseId(messageId, id)`
   - `onComplete` → `clearStream()`. If the message ended up empty (zero tokens), the placeholder is removed.
   - `onError` → `clearStream()` + `removeMessage(messageId)` + caller's `onError`.

There is **no separate streaming-render path**: the live message renders through the same `MarkdownContent` pipeline as completed ones.

## Persistence

All user data is persisted to **localStorage** via Zustand's `persist` middleware. Persist `version: 3`.

```
Zustand store
  ├── threads (each with messages[]) ← persisted
  ├── activeThreadId                 ← persisted
  ├── settings (incl. apiKey)        ← persisted
  └── ephemeral UI state (mode, focus, error, composerPrompt, streamingMessageId) ← not persisted
```

### Migration (`lib/store/migration.ts`)

| From | To | Behavior |
|---|---|---|
| v<2 | v2 | Settings rename: `obsidianVaultPath` → `obsidianVaultName`; ensure `apiKey` exists |
| <3 | v3 | Joins each message's `blocks[].text` into a single `message.text` field; deletes top-level `blocks` and `cards` arrays; deletes legacy `selectedBlockId` |

The migration is idempotent — running it on already-migrated state is a no-op. Tests in `tests/unit/lib/store/migration.test.ts` exercise both paths plus an already-migrated payload.

Notes:
- The user's OpenAI API key lives in the same localStorage payload. Users enter it once via Settings; the browser hands it to the `openai` SDK on every request (`dangerouslyAllowBrowser: true`).
- There is no cross-device sync. Export threads as markdown for long-term storage.

## OpenAI integration

| Module | Purpose |
|--------|---------|
| `lib/api/openAiClient.ts` | Thin wrapper around the `openai` SDK; exposes `createResponse` and `createResponseStream` |
| `lib/api/chat.ts` | `fetchChatCompletionStream(prompt, callbacks, threadId, previousResponseId, settings)` — streams assistant replies via SDK callbacks |
| `lib/api/blockAction.ts` | `fetchBlockAction(action, blockText, prompt?, translateLanguage?, settings, previousResponseId?)` — one-shot transforms (`translate`, `eli5`, `summarize`, `ask`, plus legacy `expand` / `example`) |
| `lib/api/rewrite.ts` | `fetchRewrite(buffer, notes, settings)` — atomic Markdown rewrite for the focus editor; uses `REWRITE_PROMPT` |
| `lib/api/generateThreadTitle.ts` | One-off title generation for new threads |

### Prompts (`lib/config/`)
- `promptTemplates.ts` — Inline string templates: `CHATGPT_PROMPT`, `BLOCK_ACTION_PROMPT`, `BLOCK_ACTION_TRANSLATE_PROMPT`, `THREAD_TITLE_PROMPT`, `REWRITE_PROMPT`.
- `prompts.ts` — `getChatPrompt`, `getBlockActionPrompt`, `getTranslatePrompt`, `getRewritePrompt` — apply language-tag substitution at runtime.

## Export

Whole-thread markdown export. `threadToMarkdown(thread, messages)` produces YAML frontmatter (title, derived first-question, date) followed by alternating `## User` / `## Assistant` sections. The Export Button is a single "Export Thread" action — there is no per-card or per-block export.

```
---
title: "Thread Title"
question: "First user message…"
created: 2026-04-28
---

## User

Q…

## Assistant

A…
```

Key files:
- `lib/export/markdownExport.ts` — `threadToMarkdown`, `sanitizeFilename`, `generateExportFilename`
- `lib/export/exportMarkdown.ts` — Dispatches local download or Obsidian-vault save
- `lib/export/download.ts`, `openInObsidian.ts` — Destination implementations

## Thread management

```
DeleteThreadButton (UI)
  → AlertDialog (confirmation with title + message count)
  → store.deleteThread (Zustand action)
  → stateFns.deleteThread (pure function) — removes thread + cascading messages
  → Zustand persist middleware flushes to localStorage
  → Navigation (router.push to adjacent thread or home)
```

Edge cases:
- **Delete last thread**: Navigates to landing.
- **Delete active thread**: Navigates to adjacent (previous > next).

## Response language (i18n)

Users can set their preferred response language in Settings. Language is injected into prompt templates at runtime via XML tags — templates remain language-neutral on disk.

- Chat / block-action / rewrite prompts use a `<language></language>` tag. For English, the tag is removed entirely. For other languages, it's filled with e.g. `<language>Always respond in Simplified Chinese.</language>`.
- The Translate prompt uses a separate `<translationlanguage></translationlanguage>` tag, fed by the user's `translateLanguage` setting.

## Related Docs
- [docs/testing.md](./testing.md) — Test structure and patterns
- [docs/focus-mode-spec.md](./focus-mode-spec.md) — Original focus-mode spec
- [docs/focus-mode-plan.md](./focus-mode-plan.md) — Phase-by-phase implementation plan
