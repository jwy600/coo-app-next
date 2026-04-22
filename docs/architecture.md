# Architecture

## Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Zustand** for state management (localStorage persistence via `persist` middleware)
- **shadcn/ui** + **Tailwind CSS** for UI
- **OpenAI API** for AI features — called directly from the browser using the user's API key

There is no backend server and no database. All data (threads, messages, blocks, cards, settings) lives in the user's browser localStorage. The user's OpenAI API key is entered in the Settings UI and stored in localStorage alongside everything else.

## Project Structure
```
app/                    # Next.js App Router
├── layout.tsx          # Root layout
├── page.tsx            # Landing page
├── globals.css         # Tailwind + CSS variables
└── t/[threadId]/       # Thread detail pages

prompts/                        # System prompt templates (language-neutral .md files)
├── developer.md                # Knowledge Assistant chat prompt (thorough explanations)
├── chatgpt.md                  # ChatGPT-style chat prompt (warm, conversational)
├── block-action.md             # Block action system prompt (ELI5, expand, etc.)
└── block-action-translate.md   # Translate action system prompt (separate template)

components/
├── ui/                 # shadcn/ui components
├── chat/               # Message UI (AssistantMessage, BlockStack, DeleteThreadButton, etc.)
├── composer/           # Message input (Composer, BlockModeToggle, PromptInput)
├── content/            # Content rendering (BlockContent, Math)
├── sidebar/            # Navigation (AppSidebar, NewChatButton, ThreadList)
├── settings/           # Settings UI (including OpenAI API key input)
├── landing/            # Landing page components
└── layout/             # Layout wrappers

lib/
├── state/              # Pure state functions (CRITICAL)
├── store/              # Zustand store + slices (localStorage persist)
├── api/                # Browser-side OpenAI client (openAiClient.ts) + chat/block-action pipelines
├── rendering/          # Markdown, KaTeX rendering
├── config/             # OpenAI settings + prompt loader (prompts.ts)
├── export/             # Markdown export utilities
└── utils/              # Helpers (cn, validation, etc.)

hooks/                  # Custom React hooks (useComposer, useStreaming, etc.)
types/                  # TypeScript definitions
tests/                  # Vitest tests
e2e/                    # Playwright tests
```

## State Management

### State Categories (types/state/)

State is organized into semantic categories:
- **CoreState** (`types/state/core.ts`) — Persistent data (threads, blocks, cards, activeThreadId)
- **UIState** (`types/state/ui.ts`) — Ephemeral UI (mode, selectedBlockId, isAwaitingResponse, error)
- **StreamingState** — Temporary streaming data (already isolated)
- **SettingsState** — Persisted user preferences (already isolated)

Combined as: `AppState = CoreState & UIState`

### Pure Functions (lib/state/)
All state logic lives here as pure functions with **narrow signatures**:

```typescript
// UI state functions accept only the fields they need
export const selectBlock = (
  mode: AppMode,                   // Only need mode
  selectedBlockId: string | null,  // Only need current selection
  blockId: string
): SelectBlockResult => {
  if (mode !== 'thread') {
    return { selectedBlockId: null };
  }
  // Toggle: if same block, deselect; otherwise select the new block
  if (selectedBlockId === blockId) {
    return { selectedBlockId: null };
  }
  return { selectedBlockId: blockId };
};

// Slices orchestrate pure function calls
selectBlock: (blockId) => {
  const { mode, selectedBlockId } = get();
  const result = stateFns.selectBlock(mode, selectedBlockId, blockId);
  set(result);
}
```

Key files:
- `lib/state/index.ts` — Main orchestration, `createInitialState`, UI state functions
- `lib/state/thread.ts` — Thread CRUD
- `lib/state/message.ts` — Message operations
- `lib/state/block.ts` — Block operations
- `lib/state/parser.ts` — Markdown → blocks
- `lib/state/heading.ts` — Section/heading card range logic
- `lib/state/card.ts` — Card operations (create, remove, scope calculation)

### Block-Based Content Model
AI responses are split into **blocks** (paragraphs, lists, code). Each block:
- Has its own ID and is independently editable/selectable
- Supports rewrite with undo (`prevText`, `isRewritten`)

```typescript
interface Block {
  id: string;
  messageId: string;
  type: 'paragraph' | 'list' | 'code' | 'heading';
  text: string;
  edited: boolean;
  selections: string[];     // Text selections for rewrite
  prevText: string | null;  // For undo after rewrite
  isRewritten: boolean;
}
```

#### Block Rewrite Operations
Block rewrites use separate functions for better UX:
- `rewriteBlock(state, blockId, newText)` — Applies a rewrite (can be chained)
- `undoRewrite(state, blockId)` — Reverts to previous text if available

This allows users to create new highlights and rewrite multiple times without needing to exit block mode. The "Rewrite" and "Undo" buttons are decoupled in the UI.

Selection state:
- `selectedBlockId` — Currently selected block (single selection)
- When a block is selected, it enters "block mode" for transformations
- Clicking outside or pressing Escape exits block mode

### Zustand Store (lib/store/)
Thin wrappers that call pure functions:
```typescript
// lib/store/slices/messageSlice.ts
addUserMessage: (text) => {
  const { state, message } = stateFns.addUserMessage(
    get(), text, idFactory, nowFactory
  );
  set({ messages: state.messages });
  return message;
}
```

### Why This Pattern?
- **Testability**: Pure functions are easy to unit test
- **Predictability**: No hidden side effects
- **Debugging**: State changes are traceable
- **Framework-agnostic**: Core logic works without React

## Adding New Features

### Adding a State Function
1. Write pure function in `lib/state/` with **narrow signature** (accept only needed fields):
```typescript
// Result type - only fields that change
export interface MyFeatureResult {
  field: string;
}

// Pure function with narrow signature
export const myFeature = (
  currentValue: string,  // Only what's needed
  newValue: string
): MyFeatureResult => {
  return { field: newValue };
};
```

2. Add tests in `tests/lib/state/`:
```typescript
test('myFeature updates field', () => {
  const result = myFeature('old', 'new');
  expect(result.field).toBe('new');
});
```

3. Wrap in Zustand action in `lib/store/slices/`:
```typescript
myFeature: (newValue) => {
  const { currentValue } = get();  // Extract only needed fields
  const result = stateFns.myFeature(currentValue, newValue);
  set(result);  // Merge result into state
}
```

### Adding a UI Component
1. Check shadcn/ui first: `npx shadcn@latest add [name]`
2. If custom, follow patterns in `components/ui/`:
```typescript
import { cn } from '@/lib/utils';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary';
}

const MyComponent = React.forwardRef<HTMLDivElement, Props>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('base-styles', variant === 'secondary' && 'alt', className)}
      {...props}
    />
  )
);
```

### Adding an API Route
Create in `app/api/[name]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Validate, process, return
  return NextResponse.json({ data });
}
```

## UI Patterns

### shadcn/ui
- Config: `components.json` (style: "new-york", base: "neutral")
- Components live in `components/ui/`
- Use `cn()` for class merging
- Use CVA for variants

### Styling
- Tailwind CSS with CSS variables
- Dark mode: class-based via `next-themes`
- Custom classes in `globals.css` under `@layer components`

### Path Aliases
```typescript
import { useStore } from '@/lib/store/useStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

## OpenAI Integration

The app has no backend route handlers for chat. Instead, the browser calls OpenAI directly using the user-supplied API key stored in `settings.apiKey`.

| Module | Purpose |
|--------|---------|
| `lib/api/openAiClient.ts` | Thin wrapper around `openai` SDK (`dangerouslyAllowBrowser: true`), exposes `createResponse` and `createResponseStream` |
| `lib/api/chat.ts` | `fetchChatCompletionStream(prompt, callbacks, threadId, previousResponseId, settings)` — streams assistant replies via callbacks |
| `lib/api/blockAction.ts` | `fetchBlockAction(action, blockText, prompt, translateLanguage, settings, previousResponseId)` — one-shot transformations (ELI5, translate, expand, etc.); returns `{ text, responseId }` |

Streaming is handled by the OpenAI SDK's async iterator; the client dispatches `onToken`, `onResponseId`, `onComplete`, and `onError` callbacks to the store.

### Ask-mode Q&A chain

When a block is selected, the composer is in `ask` mode. Each `'ask'` call stores the returned `responseId` in `useComposer`'s `askResponseIdRef`. The next ask on the same block passes that ID as `previousResponseId`, chaining the Q&A server-side via OpenAI's `previous_response_id` so follow-up questions include prior answers as context. The chain resets whenever `selectedBlockId` changes (entering, switching, or leaving block mode). Other block actions (`translate`, `eli5`, `expand`, `example`, `rewrite`) remain one-shot and do not participate in the chain.

## Export Feature

### Export Button Behavior

The export button adapts based on card state:

- **No cards**: Simple "Export Thread" button that downloads the entire thread as markdown
- **Has cards**: Split button with dropdown
  - Main button: "Export Cards" opens a dialog to export all card blocks
  - Chevron dropdown: "Export Thread" option to download the full thread

This allows users to always access both export options when cards exist.

### Markdown Export (`lib/export/`)

Threads can be exported as markdown files with YAML frontmatter:

```markdown
---
title: "Thread Title"
exported: 2026-01-25T10:30:00.000Z
---

## User

Message content here...

## Assistant

Response with **markdown** preserved.
```

Key files:
- `lib/export/markdownExport.ts` — Pure function `threadToMarkdown(thread, messages, blocks)`
- `lib/export/download.ts` — Browser download utility `downloadMarkdown(content, filename)`
- `lib/export/exportMarkdown.ts` — Unified export dispatcher (local download or Obsidian vault)
- `lib/export/saveToVault.ts` — Server action to save markdown to an Obsidian vault
- `lib/export/index.ts` — Re-exports

### Export Destination Setting

Users can choose where exports are saved via Settings:

- **Local** (default) — Browser file download
- **Obsidian** — Saves markdown directly to `{vaultPath}/Coo/{filename}` on disk

When Obsidian is selected, a text input appears for the vault path. The `Coo/` subfolder is auto-created if missing. Toast notifications (via `sonner`) report success or errors for vault exports.

Key files:
- `types/settings.ts` — `ExportDestination` type, `exportDestination` and `obsidianVaultPath` in `Settings`
- `lib/state/settings.ts` — `updateExportDestination()`, `updateObsidianVaultPath()` pure functions
- `lib/store/slices/settingsSlice.ts` — Zustand actions
- `components/settings/SettingsForm.tsx` — Export destination radio + vault path input

## Thread Management

### Delete Thread Flow

Users can delete threads via the trash icon button in the chat toolbar (left of Export button):

```
DeleteThreadButton (UI)
  → AlertDialog (confirmation with title + message count)
  → store.deleteThread (Zustand action)
  → stateFns.deleteThread (pure function) — removes thread + cascading messages/blocks/cards
  → Zustand persist middleware flushes to localStorage
  → Navigation (router.push to adjacent thread or home)
```

Edge cases:
- **Delete last thread**: Navigates to landing page (`/`)
- **Delete active thread**: Navigates to adjacent thread (previous > next)

Key files:
- `lib/state/thread.ts` — `deleteThread()` pure function
- `lib/store/slices/threadSlice.ts` — `deleteThread` action
- `components/chat/DeleteThreadButton.tsx` — UI component

## Direct Block Editing

Users can directly edit block content without AI transformation via the Ask/Edit toggle.

### Composer Modes (`types/state/ui.ts`)

```typescript
type ComposerMode = 'chat' | 'ask' | 'edit';
// chat: No block selected, normal chat input
// ask:  Block selected, ask questions about it (default when block selected)
// edit: Block selected, directly edit block text
```

### Edit Mode Flow

```
BlockModeToggle (Ask ↔ Edit switch)
  → Edit mode: Composer fills with block text
  → User edits text freely
  → "Replace" button updates block directly (no API call)
  → Block remains selected for continued editing
  → Standalone Undo button available (when no selections)
```

### Strikethrough Support

In edit mode, select-all + backspace wraps text in `~~strikethrough~~` instead of deleting. The markdown parser recognizes `~~text~~` and renders it with `<del>` tags.

Key files:
- `components/composer/BlockModeToggle.tsx` — Ask/Edit toggle UI
- `hooks/useComposer.ts` — Edit mode logic and `handleDirectEdit`
- `components/composer/PromptInput.tsx` — Strikethrough on select-all+backspace
- `lib/rendering/markdown.ts` — Strikethrough parsing
- `components/content/BlockContent.tsx` — `<del>` tag rendering

## System Prompt Switching

Users can switch between different system prompts that control the AI's response style:

- **Knowledge Assistant** (`developer.md`) — Deep, thorough explanations with examples and context (default)
- **ChatGPT** (`chatgpt.md`) — Warm, conversational style matching original ChatGPT

The selected prompt file is stored in `settings.systemPromptFile` and sent with each chat request. Block-action prompts (`block-action.md`) are unaffected by this setting.

**Adding a new system prompt** requires only 2 steps:
1. Create `prompts/{name}.md` (include `<language></language>` tag for i18n)
2. Add an entry to `SYSTEM_PROMPT_OPTIONS` in `types/settings.ts`

The type, UI, and prompt loader all derive from `SYSTEM_PROMPT_OPTIONS` automatically.

Key files:
- `types/settings.ts` — `SYSTEM_PROMPT_OPTIONS` (single source of truth), `SystemPromptFile` type derived from it
- `lib/config/prompts.ts` — `getChatPrompt(promptFile, lang)` loads the selected template
- `components/settings/SettingsForm.tsx` — Auto-generates radio options from `SYSTEM_PROMPT_OPTIONS`

## Response Language (i18n)

Users can set their preferred response language in settings. Language is injected into prompt templates at runtime via XML tags — templates remain language-neutral on disk.

### How it works

- **Chat & block-action prompts** use a `<language></language>` tag. For English, the tag is removed entirely. For other languages, it's filled with e.g. `<language>Always respond in Simplified Chinese.</language>`.
- **Translate prompt** uses a separate `<translationlanguage></translationlanguage>` tag in its own template (`block-action-translate.md`). This injects the target language directly from the `TranslateLanguage` setting (e.g. "Chinese", "Japanese") without any mapping.

This separation means the translate action uses the user's chosen *translation target* language, while all other actions use the *response language* setting.

### Key files

- `types/settings.ts` — `ResponseLanguage` (`'en' | 'es' | 'fr' | 'zh' | 'ja'`), `TranslateLanguage`, `LANGUAGE_MAP`
- `lib/config/prompts.ts` — `replaceLanguageTag()`, `replaceTranslationLanguageTag()`, prompt loaders with caching
- `lib/state/settings.ts` — Default settings with `responseLanguage` and `translateLanguage`
- `components/settings/SettingsForm.tsx` — Language selector UI
- `lib/api/chat.ts` and `lib/api/blockAction.ts` — Pass language settings to prompt loaders

## Card System

Cards are user annotations marking important content for display and export.

### Card Model

```typescript
interface Card {
  id: string;
  messageId: string;      // Cards are per-message
  anchorBlockId: string;  // Block that "anchors" the card
  blockIds: string[];     // All blocks in the card
  createdAt: number;
}
```

### Card Creation

- **Double-click gutter** to create/toggle a card at that block
- **Heading blocks** expand to include all content until the next same/higher-level heading
- **Non-heading blocks** create single-block cards
- Cards are **mutually exclusive** — blocks can only belong to one card

### Card Range Logic (`lib/state/heading.ts`)

For headings, cards are hierarchy-aware:
```
## Section A (H2)        ← Card starts here
Paragraph 1              ← Included
### Subsection (H3)      ← Included (lower level)
Paragraph 2              ← Included
## Section B (H2)        ← Card ends before this (same level)
```

### Card Export

Cards can be exported as standalone markdown files:
```yaml
---
title: "User-defined title"
original question: "Thread title"
exported: 2026-01-28T10:00:00.000Z
type: card
---

Block content here...
```

Key files:
- `lib/state/card.ts` — Pure card functions
- `lib/store/slices/cardSlice.ts` — Zustand slice with persistence
- `components/chat/CardControls.tsx` — Card UI controls
- `lib/export/markdownExport.ts` — `blocksToCardMarkdown()` function

## Persistence

All user data is persisted to **localStorage** via Zustand's `persist` middleware. There is no server, no database, and no authentication layer.

```
Zustand store
  ├── threads, messages, blocks, cards  ← persisted to localStorage
  ├── settings (including apiKey)       ← persisted to localStorage
  └── ephemeral UI state                ← not persisted (re-derived on load)
```

Notes:
- The user's OpenAI API key lives in the same localStorage payload. Users enter it once via Settings; the browser reads it and hands it to the `openai` SDK on every request (`dangerouslyAllowBrowser: true`).
- To clear all data, users can reset the browser's site data or use the "Reset to Defaults" button in Settings (which only clears settings, not threads).
- There is no cross-device sync. Export threads/cards as markdown for long-term storage.

## Related Docs

- [docs/testing.md](./testing.md) — Test structure and patterns
