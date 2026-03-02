# Coo

Coo brings locality to AI. It is a chatbot where you can **interact with LLM responses in context**.

![](https://wenyi.blog/files/coo_ask.mp4)

Instead of treating AI output as immutable chat bubbles, Coo breaks once-indivisible response into semantic blocks you can work with directly: expand, translate, simplify (ELI5), rewrite, and export as cards.

![Books are scattered around Shuji Terayama](https://blog.yitianshijie.net/wp-content/uploads/2017/07/fullsizeoutput_33bf.jpeg?w=550&h=862)

*Source: Li Ruyi (Yi Tian Shi Jie); from Kawade Shobo Shinsha: Terayama Shuji (Shin bungei-dokuhon, 1993)*

## Why Coo?

Research and learning aren’t linear — questions *emerge (湧現)* while you’re still reading. But most LLM products inherit the **messaging app** model: responses arrive as frozen bubbles optimized for provenance, not for thinking.

That creates a “glass wall.” You can see the answer, but you can’t really **work on it where it lives**.

We’ve all felt the broken workflow: you hit a confusing sentence → you scroll down → ask in the composer → the app jumps to the bottom and appends more text, pulling you away from the exact context that triggered the question. Coo is built so the discussion happens *at the point of friction*, not at the end of the thread.

If you want a longer write-up, check out my blog post: [ChatGPT, the Slot Machine](https://wenyi.blog/posts/chatgpt-the-slot-machine/)

## Features

- **Block-based output**: LLM responses are parsed into semantic blocks
- **In-context actions** on any block:
  - ELI5 (Explain Like I’m 5)
  - Translate (English, Chinese, Spanish, French)
  - Expand
  - Generate examples
  - Ask custom questions about the selected content
- **Direct block editing**: toggle between Ask and Edit modes — Ask sends to AI, Edit lets you rewrite text directly
- **Text selection → focused rewriting**: highlight parts of follow-ups and request rewrites with that emphasis
- **Cards**: collect blocks into cards as visual anchors, then export to your PKM system
- **Obsidian export**: save exports directly to an Obsidian vault folder on disk (or use browser download)
- **Response language**: set preferred response language (English or Chinese) for AI outputs
- **Multi-user auth**: Supabase Auth with Row Level Security for data isolation
- **Local-first or database-backed**: works with localStorage, or with Supabase for persistence

## Try Coo

### Hosted Version

Sign-up is currently invite-only. If you'd like access, contact **jwy600@gmail.com**.

Visit **[coo-app-next.vercel.app](https://coo-app-next.vercel.app)** to try Coo.

### Self-Hosted

Prefer to run it yourself? Clone the repo and configure your own API keys — see [Getting Started](#getting-started) below.

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Language**: TypeScript (strict)
- **State**: Zustand (with persistence)
- **UI**: Tailwind CSS + Radix UI
- **AI**: OpenAI API (GPT-5.2, GPT-5-mini)
- **DB**: Supabase (PostgreSQL)
- **Tests**: Vitest + Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

### Install

```bash
git clone https://github.com/jwy600/coo-app.git
cd coo-app-next
npm install
```

### Configure

Create a `.env.local` in the project root:

```env
# Required
OPENAI_API_KEY=your_openai_api_key
# Optional (persistence)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

Coo works with or without Supabase:
- **With Supabase**: threads, messages, cards, and blocks are persisted (notes are ephemeral for now)
- **Without Supabase**: data is stored in localStorage — export periodically if you want to keep long-term notes

#### Supabase Setup (Optional)
By default, Coo works without a database (data is stored in memory and lost on refresh). For persistent storage, set up Supabase:

Create a Supabase project at supabase.com

##### Run the database schema

Go to your Supabase dashboard

Navigate to SQL Editor

Copy the contents of supabase/schema.sql

Paste and click Run to create the required tables

##### Get your credentials

Go to Project Settings → API

Copy the Project URL → use as NEXT_PUBLIC_SUPABASE_URL

Copy the anon/public key → use as NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Add to your .env.local:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

The app will automatically detect Supabase configuration and enable persistence.

### Run

```bash
# Dev (http://localhost:3000)
npm run dev

# Production
npm run build
npm run start
```

### Application Settings

Access settings via the gear icon in the sidebar:

| Setting              | Options                           | Default  |
|----------------------|-----------------------------------|----------|
| Model                | gpt-5.2, gpt-5-mini              | gpt-5.2  |
| Reasoning Effort     | none, low, medium, high           | none     |
| Web Search           | on/off                            | off      |
| Response Language    | English, Chinese                  | English  |
| Translate Language   | English, Chinese, Spanish, French | Chinese  |
| Export Destination   | Local (browser), Obsidian (vault) | Local    |


## Usage

### Basic chat

1. Open `http://localhost:3000`
2. Type in the composer and send
3. The response streams in and is parsed into blocks

### Block mode

When nothing is selected, the composer behaves like a normal chat input: each new prompt appends a new response at the bottom.

To work in context, enter **block mode** by single-clicking the gutter to the left of a block. 

When a block is selected, use the **Ask/Edit toggle** above the composer:

In Ask mode (default):
- your questions are scoped to the selected block
- the answer appears in the same textarea (input + output share the space)
- you can use shortcuts for **Expand / ELI5 / Translate / Examples**

Because the block-mode textarea is used for both input and output, its content is intentionally ephemeral. When you find something worth keeping, you can select text in the textarea and save it as a piece of **Note** attached to the selected block. Hover a chip to preview the full text.

In Edit mode:
- the composer fills with the block's text, and you can edit it directly.
- press **Replace** to update the block without an API call.
- an **Undo** button appears after replacement.
- pressing select-all + backspace wraps the text in ~~strikethrough~~ instead of deleting it.

### AI Rewrite

Once a block has **Notes**, you can ask the LLM to rewrite the block *with emphasis on those notes*. If the Note language differs from the original block, Coo tries to align it to the corresponding content automatically.

Notes are ephemeral: they disappear when you exit block mode.

### Cards

Create a card by double-clicking the gutter:
- Double-click a **heading** → card includes that heading + all blocks until the next same-level heading
- Double-click a **non-heading block** → card contains just that block

A block can belong to only one card (mutual exclusivity). A message can contain multiple cards.

Each card has its own **export** and **clear** actions.

### Export

- If there are **no cards**, export defaults to the whole thread (all messages between user and LLM).
- If there **are cards**, export defaults to merging all cards into a single `.md`.
- **Export destination**: choose between browser download (Local) or saving directly to an Obsidian vault. When Obsidian is selected, files are written to a `Coo/` subfolder inside your vault path.

## Project Structure

```
coo-app-next/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (chat, block-action, config)
│   ├── auth/login/        # Login page
│   └── t/[threadId]/      # Thread detail pages
├── components/            # React components
│   ├── auth/             # Login form
│   ├── chat/             # Chat UI (messages, blocks, controls)
│   ├── composer/         # Message input + Ask/Edit toggle
│   ├── content/          # Block content rendering (markdown, math)
│   ├── sidebar/          # Thread list navigation
│   ├── settings/         # Settings dialog
│   ├── landing/          # Landing page
│   └── ui/               # Radix UI wrappers
├── hooks/                 # Custom React hooks (auth, composer, streaming)
├── lib/
│   ├── state/            # Pure state transformations (CRITICAL)
│   ├── store/            # Zustand store + slices
│   ├── api/              # API utilities
│   ├── supabase/         # Database operations + auth
│   ├── rendering/        # Markdown + KaTeX rendering
│   ├── export/           # Markdown export
│   └── config/           # OpenAI settings + i18n prompts
├── proxy.ts               # Auth middleware (session refresh)
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

