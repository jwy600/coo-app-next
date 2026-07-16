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
├── editor/                     # Focus mode: FocusEditor, EditorControls (unified action row), EditorActions
├── composer/                   # Bottom chat composer (chat mode only): Composer, ComposerHint, PromptInput
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
- **UIState** (`ui.ts`) — Ephemeral UI (`mode`, `isAwaitingResponse`, `error`, `focus`, `composerPrompt`, `composerAttachment`, `landingComposerMode`)
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
- `lib/state/focus.ts` — Focus editor lifecycle: `openEditor`, `closeEditor`, `updateBuffer`, `appendNote`, `setRewriteResult`, `setShortcutResult`, `revertRewrite`, `setFocusLastResponseId`
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
  meta: Record<string, unknown>;  // e.g. { openaiResponseId }; imports: { source: 'import', fileName, registerState }
}
```

There is **no block model**. Markdown is rendered straight into HTML by `MarkdownContent`. Streaming appends tokens directly to `message.text` via `appendMessageText`; the live message renders through the same pipeline as completed ones.

Imported documents (uploaded `.md` files) are stored as assistant-role messages tagged with `meta: { source: 'import', fileName, registerState }`. They are registered with the API once to obtain a `responseId`, after which chat and ask chain from them exactly like a streamed reply. See [Document import](./document-import.md).

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
  range: [number, number];     // character offsets into message.text
  buffer: string;              // editable markdown — initialized from message.text.slice(...)
                               // ask answers append to this as `> **Note:** ...` lines;
                               // there is no separate notes state
  prevBuffer: string | null;   // single-step Rewrite / shortcut undo
  lastResponseId?: string;     // OpenAI chain head for the next focus call
  referenceQuestion?: string;  // fallback context (only when lastResponseId is missing)
}
```

Persisted shape on disk: nothing. Focus is purely in-memory.

### Context chaining for focus calls
Every focus-mode call (Translate / ELI5 / Summarize / Example / Expand / Ask — *not* Rewrite) sends a `previous_response_id` so the model inherits the conversation that produced the assistant message. The chain head is captured at editor open from `message.meta.openaiResponseId` and updated after each successful focus call. Closing the editor discards it; reopening starts fresh from the new message's responseId.

The fenced input format is `<passage>...</passage>`. The system prompt explicitly scopes the action to the passage and labels prior turns as reference-only (otherwise Translate/Summarize would happily consume the entire chained context).

For legacy persisted messages that lack a captured responseId, `openEditor` falls back to capturing the immediately-prior user message text as `referenceQuestion`. The first focus call injects it as a `<reference-question>...</reference-question>` block (with no chain). Subsequent calls in the same session use the chain returned by that first response and stop injecting.

See `docs/ideas/focus-mode-context-chaining.md` for the full scenario matrix.

### Editor lifecycle
1. **Open** — `useFocusSelection` (mounted on each `AssistantMessage`) listens for `mouseup` / `touchend` and calls `domToSource(getSelection().getRangeAt(0))`. If the result anchors inside this message and meets the minimum-length rule, it dispatches `openEditor(messageId, [start, end])`. The hook is disabled while the message is streaming or already in focus mode.
2. **Render split** — when `focus.messageId === message.id`, `AssistantMessage` renders three parts: `<MarkdownContent text={text.slice(0, start)} />` + `<FocusEditor />` + `<MarkdownContent text={text.slice(end)} />`. The editor is a regular block element; surrounding text reflows around it.
3. **Edit / notes** — typing flows through `updateBuffer`. `appendNote(text)` is called by the editor's ask flow (an answer arrives, gets appended). There is no drag-select-to-note: notes accumulate from ask answers and the buffer's existing markdown.
4. **Close** — `closeEditor` serializes notes as `> **Note:** <text>` blockquotes after a blank line, splices the result into `message.text` via `replaceMessageRange`, and clears `focus`. Triggered by:
   - Click outside the editor (the `.composer` selector is excluded for legacy reasons; bottom composer is now structurally separate from focus mode anyway)
   - Opening another editor (auto-save then re-open)

### Rewrite
Atomic — `fetchRewrite(buffer, notes)` posts a `<passage>` / `<notes>` envelope with `REWRITE_PROMPT` instructions. While in flight, `EditorControls` shows "Rewriting…" and disables the row. On success `setRewriteResult(text)` stashes the prior buffer in `prevBuffer`, replaces the live buffer, and clears notes (they were folded into the prompt that produced the result). Revert restores the prior buffer (single-step).

## Composer behavior

The bottom composer is **always in chat mode**. There is no state-driven mode flip — opening an editor does not change what the bottom composer does.

### Submit (`useComposer.handleSubmit`)
Always: `addUserMessage(prompt)` → `streamChat(...)`, which creates an empty assistant message and appends tokens into its `text`. Whether or not a focus editor is open is irrelevant.

## Editor action row (`EditorControls`)

The action row at the foot of `FocusEditor` owns every focus-mode action. Layout (top to bottom): ask input on its own line with a `↵` glyph indicating Enter submits, then a chip strip beneath it. The ask input's placeholder is a **localized default question** (`DEFAULT_ASK_QUESTION` in `types/settings.ts`, keyed by `settings.responseLanguage` — "What does this mean?" for `en`); submitting with the field empty falls back to it, so `↵` alone asks the pre-filled question and typing replaces it. The `aria-label` stays the literal `"Ask about this passage"` (the accessible name); only the visual placeholder is localized.

```
[ ask input ............................................. ↵ ]
[Translate] [ELI5] [Summarize]  [Revert]  [Rewrite]
```

### Notes live as raw markdown in the buffer

There is **no separate notes state**. Ask answers are appended directly to `focus.buffer` as `\n\n> **Note:** <answer>`. A multi-paragraph answer is quoted line-by-line (the first line gets `> **Note:** `, every continuation line gets its own `>`) so the whole answer stays inside one blockquote — otherwise the later paragraphs fall out and lose the left-border styling. Closing the editor splices the buffer into `message.text` unchanged; reopening slices it back out. The single source of truth is `focus.buffer`.

`MarkdownContent` detects `> **Note:**` blockquotes (when re-rendered post-close) via the first-child-`<strong>` check in `isNoteBlockquote()` and gives them a muted `.doc-blockquote--note` class so they render visually distinct from user-authored blockquotes.

A `splitNotes(buffer)` parser in `lib/state/focus.ts` separates trailing `> **Note:** ...` blocks (each of which may span multiple paragraphs) from the passage they annotate. It is the **only** place in the codebase that knows the note pattern.

### Action contracts

| Action | API input | Buffer after |
|---|---|---|
| Shortcuts (Translate / ELI5 / Summarize) | **whole buffer** (notes included) | `result` (notes are transformed alongside the passage) |
| Ask input | `splitNotes(buffer).passage` only — prior Q&A doesn't pollute new question context | unchanged passage; answer appended as `> **Note:** ...` |
| Rewrite | `splitNotes(buffer)` → `(passage, notes[])` envelope; notes are guidance, not content | `result` (notes consumed — they were folded into the prompt) |
| Revert | — | `prevBuffer` (single-step undo of shortcut or rewrite) |

**Why shortcuts skip the split:** translating a passage and leaving its annotations in the original language is just confusing. Same for ELI5 and Summarize — the user expects "transform what's in the editor," whole-cloth. Ask and Rewrite are different: ask context shouldn't include prior Q&A noise (skews answers), and rewrite explicitly treats notes as instructions, not content to revise. This asymmetry is intentional.

Only one action runs at a time; whichever is in flight disables the rest. Errors surface via `setError`. Each focus-mode call sends `previousResponseId` (the focus chain head — see "Context chaining for focus calls" above) and updates it on success.

Only one action runs at a time; whichever is in flight disables the rest. Errors surface via `setError`. Each focus-mode call sends `previousResponseId` (the focus chain head — see "Context chaining for focus calls" above) and updates it on success.

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
| `lib/api/blockAction.ts` | `fetchBlockAction(action, blockText, prompt?, translateLanguage?, settings, previousResponseId?, referenceQuestion?)` — one-shot transforms (`translate`, `eli5`, `summarize`, `ask`, plus legacy `expand` / `example`). Wraps `blockText` in `<passage>...</passage>`. Injects `<reference-question>...</reference-question>` only when `previousResponseId` is absent. |
| `lib/api/rewrite.ts` | `fetchRewrite(buffer, notes, settings)` — atomic Markdown rewrite for the focus editor; uses `REWRITE_PROMPT` |
| `lib/api/generateThreadTitle.ts` | One-off title generation for new threads |
| `lib/api/registerDocument.ts` | `registerDocument(docText, settings)` — one-shot call that "registers" an uploaded `.md` with the API (`store: true`) and returns a `responseId`, so an imported doc becomes a chat/ask chain root. See [Document import](./document-import.md). |

### Prompts (`lib/config/`)
- `promptTemplates.ts` — Inline string templates: `CHATGPT_PROMPT`, `BLOCK_ACTION_PROMPT`, `BLOCK_ACTION_TRANSLATE_PROMPT`, `THREAD_TITLE_PROMPT`, `REWRITE_PROMPT`, `REGISTER_DOC_PROMPT`.
- `prompts.ts` — `getChatPrompt`, `getBlockActionPrompt`, `getTranslatePrompt`, `getRewritePrompt`, `getRegisterDocumentPrompt` — apply language-tag substitution at runtime.

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
- [docs/focus-mode-spec.md](./focus-mode-spec.md) — Original focus-mode spec (historical)
- [docs/focus-mode-unified-editor-plan.md](./focus-mode-unified-editor-plan.md) — Unified-editor implementation plan (historical)
