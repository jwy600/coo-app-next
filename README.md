# Coo

Coo brings locality to AI. It’s a chatbot that lets you discuss, edit, and reuse LLM output directly in place.

Instead of treating AI output as immutable chat bubbles, Coo lets you drag-select any passage in an assistant reply and open an in-place editor — right inside the conversation. From there you can rewrite the passage, ask follow-up questions about it, translate or simplify it, and the edits save back into the message itself.

![Books are scattered around Shuji Terayama](https://blog.yitianshijie.net/wp-content/uploads/2017/07/fullsizeoutput_33bf.jpeg?w=550&h=862)

*Source: Li Ruyi (Yi Tian Shi Jie); from Kawade Shobo Shinsha: Terayama Shuji (Shin bungei-dokuhon, 1993)*

## Why Coo?

Research and learning aren’t linear — questions *emerge (湧現)* while you’re still reading. But most LLM products inherit the **messaging app** model: responses arrive as frozen bubbles optimized for provenance, not for thinking.

That creates a “glass wall.” You can see the answer, but you can’t really **work on it where it lives**.

We’ve all felt the broken workflow: you hit a confusing sentence → you scroll down → ask in the composer → the app jumps to the bottom and appends more text, pulling you away from the exact context that triggered the question. Coo is built so the discussion happens *at the point of friction*, not at the end of the thread.

If you want a longer write-up, check out my blog post: [ChatGPT, the Slot Machine](https://wenyi.blog/posts/chatgpt-the-slot-machine/)

## Features

- **Drag-select to edit**: highlight any passage in an assistant message and an in-place editor opens, seeded with that slice of raw markdown. Click outside to auto-save it back into the message.
- **Read documents, then ask about any passage**: attach a Markdown file to the composer and Coo embeds it with OpenAI so the whole document becomes context. You can then drag-select any part and ask about it — the answer inherits the document, not just the snippet.
- **In-editor action row** with the AI tools you actually want at the point of friction:
  - **Translate** (English, Chinese, Spanish, French, Japanese, …)
  - **ELI5** — explain the passage like you're five
  - **Summarize** — condense the passage in place
  - **Ask** — type a question about the passage (or just press `↵` on the empty input to send the default *“What does this mean?”*); the answer appends as a `> **Note:**` blockquote inside the editor
  - **Rewrite** — bundle the passage + your accumulated notes for an atomic AI rewrite
  - **Revert** — single-step undo for the most recent shortcut or rewrite
- **Notes are just markdown**: ask answers and other annotations live as `> **Note:** ...` blockquotes inside the buffer. They survive close, reopen, and export — no hidden state.
- **Skippable answers get a `[Minor]` tag**: when you ask about something that isn’t load-bearing, the model flags the answer as minor and Coo renders it as an even-more-muted aside, so your reading flow isn’t interrupted by tangents.
- **Single markdown source of truth**: every message is one editable markdown string. Drag, edit, save; the thread is always exportable as a clean document.
- **Context-aware AI**: every focus-mode call chains off the assistant message's prior turns via OpenAI's `previousResponseId`, so follow-up questions inside a passage understand what came before.
- **Whole-thread Markdown export**: alternating User / Assistant sections with YAML frontmatter. Save locally or write directly into an Obsidian vault.
- **Configurable language + reasoning**: response language, translate target, reasoning effort, and web-search toggle are all in Settings.
- **Browser-only**: no server, no database, no account. Your OpenAI API key and all data stay in your browser's `localStorage`.

## Try Coo

### Hosted Version

Visit **[coo-app-next.vercel.app](https://coo-app-next.vercel.app)** to try Coo. No sign-up required — open Settings and paste your own OpenAI API key. Your key and data stay in your browser's localStorage.

### Self-Hosted

Prefer to run it yourself? Clone the repo and use your own API key — see [Getting Started](#getting-started) below.

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Language**: TypeScript (strict)
- **State**: Zustand (with localStorage persistence)
- **UI**: Tailwind CSS + Radix UI
- **AI**: OpenAI API (GPT-5.6 Luna / Terra / Sol) — called directly from the browser
- **Tests**: Vitest + Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (entered in the Settings UI, not via env vars)

### Install

```bash
git clone https://github.com/jwy600/coo-app-next.git
cd coo-app-next
npm install
```

### Configure

No environment variables are required to run the app. On first launch, open **Settings** (gear icon in the sidebar) and paste your OpenAI API key. The key is stored in your browser's localStorage and sent directly to OpenAI from the browser — it never touches a backend.

Threads and messages are also persisted to localStorage. Export periodically if you want long-term notes.

### Run

```bash
# Dev (http://localhost:3000)
npm run dev

# Production
npm run build
npm run start
```

### Application Settings

Access settings via the gear icon in the sidebar. Changes apply live; hit **Save** to persist and close the panel.

| Setting              | Options                                              | Default         |
|----------------------|------------------------------------------------------|-----------------|
| Model                | GPT-5.6 Luna, GPT-5.6 Terra, GPT-5.6 Sol            | GPT-5.6 Terra   |
| Reasoning Effort     | none, low, medium, high                              | low             |
| Web Search           | on/off                                               | on              |
| Response Language    | English, Español, Français, 中文, 日本語              | English         |
| Translate Language   | English, Chinese, Spanish, French, Japanese          | Chinese         |
| Export Destination   | Local (browser), Obsidian (vault)                    | Local           |


## Usage

### Basic chat

1. Open `http://localhost:3000` and add your OpenAI key in **Settings** (gear icon).
2. Type in the composer at the bottom and press **Send** (or `↵`).
3. The assistant reply streams into the thread.

The bottom composer is always in chat mode. Whatever else is happening on screen, submitting it adds a user message and streams an assistant reply.

### Reading a document

1. Click the paperclip in the composer and choose a `.md` / `.markdown` file.
2. Press **Send**. The document is added as an imported message and Coo embeds it with OpenAI (you’ll see a brief “Embedding…” indicator).
3. Once embedded, the whole document is part of the conversation context — drag-select any passage to ask about it, and the answer draws on the full document rather than just the snippet you selected.

If embedding fails, the imported message is removed and you’re prompted to reattach the file.

### Focus mode — drag-select to edit any passage

This is the core interaction.

1. **Drag-select** any passage inside an assistant message (including an imported document). The selection can span words, sentences, or multiple paragraphs.
2. An in-place **editor** opens right where the passage was, seeded with the raw markdown of your selection. The text is pre-selected, so you can immediately copy, delete, or replace it.
3. Edit the markdown directly, or use the action row at the foot of the editor.
4. **Click anywhere outside** the editor to auto-save your changes back into the message at the original character range. The editor closes; the rendered message reflects whatever you typed.

Reopening the same passage later restores the buffer exactly — including any `> **Note:** ...` blockquotes that ask answers added during a previous session.

### The editor action row

Inside the focus editor, the action row has two parts: an **ask input** on top with a `↵` glyph indicating Enter submits, and a chip strip below it.

| Chip / input | What it does |
|---|---|
| **Translate** | Translates the whole buffer (passage + any inline notes) into your configured Translate language. Notes are translated alongside the passage so they stay aligned. |
| **ELI5** | Explains the buffer like you're five. Whole-buffer transform. |
| **Summarize** | Replaces the buffer with a concise summary. Whole-buffer transform. |
| **Ask input** | Type a question about the passage and press Enter. Leave it blank and press Enter to send the localized default question (*“What does this mean?”*). The answer appends to the editor as `> **Note:** <answer>` and the input clears. The buffer's passage portion (everything before the trailing notes) is what's used as context, so prior Q&A doesn't pollute the new question. |
| **Revert** | Single-step undo for the most recent buffer-replacing action (any shortcut or Rewrite). Survives interleaved asks — asking a question doesn't consume your undo. |
| **Rewrite** | Bundles the passage *and* the inline notes into a single AI rewrite. The result replaces the buffer atomically; the notes are consumed (treated as the user's guidance, not content). Use this when you've accumulated notes via ask answers and want a clean, revised paragraph. |

Only one action runs at a time; whichever is in flight disables the others.

### Notes — just markdown in the buffer

Coo doesn't track notes as separate state. They're just `> **Note:** ...` blockquotes appended to your editor buffer, which means:

- You can edit them like any other text — fix a typo, delete one you don't want.
- They survive closing and reopening the editor.
- They render as muted italic blockquotes in the rendered message after you close the editor (distinct from regular blockquotes).
- They're included in markdown export verbatim.

Answers the model judges **minor** (a skippable aside, not load-bearing) are stored as `> **Note:** [Minor] ...` and rendered in an even-more-muted style so tangents don’t compete with the main text.

### Context chaining for follow-up questions

Each focus-mode call (Translate / ELI5 / Summarize / Ask) sends OpenAI's `previousResponseId` so the model inherits the conversation that produced the assistant message. The first call chains off the message itself (or the imported document it was embedded from); subsequent calls in the same editing session chain off the previous focus call. Closing the editor discards the chain head — reopening starts fresh.

This is what makes asks like "and why?" or "give me an example" work without re-supplying context every time.

### Export

Coo exports the **whole thread** as a single Markdown document with YAML frontmatter (title, derived first-question, date) followed by alternating `## User` / `## Assistant` sections. Any inline `> **Note:** ...` blockquotes are preserved in the export.

- **Local** — browser download.
- **Obsidian** — writes the file directly into a `Coo/` subfolder of the vault path you configure in Settings.

## Project Structure

```
coo-app-next/
├── app/                    # Next.js app directory
│   └── t/[threadId]/      # Thread detail pages
├── components/            # React components
│   ├── chat/             # Chat UI (message list, composer wiring, export)
│   ├── composer/         # Bottom chat input + Markdown attachment
│   ├── content/          # Markdown + math rendering (react-markdown, KaTeX)
│   ├── editor/           # Focus editor + action row (Translate/ELI5/Summarize/Ask/Rewrite/Revert)
│   ├── sidebar/          # Thread list navigation
│   ├── settings/         # Settings panel
│   ├── empty-state/      # First-run / no-thread state
│   ├── layout/           # App shell
│   └── ui/               # Radix UI wrappers
├── hooks/                 # Custom React hooks (composer, streaming, focus selection, doc registration)
├── lib/
│   ├── state/            # Pure state transformations (CRITICAL)
│   ├── store/            # Zustand store + slices (localStorage persist)
│   ├── api/              # Browser-side OpenAI client + prompt pipelines
│   ├── selection/        # DOM Range → markdown source offsets (focus-mode core)
│   ├── export/           # Markdown export
│   └── config/           # OpenAI settings + i18n prompts
├── types/                 # TypeScript definitions
├── tests/                 # Unit & integration tests
└── e2e/                   # Playwright E2E tests
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit/integration tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |
