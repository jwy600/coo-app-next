# Coo

A block-based AI chat application built with Next.js. Coo reimagines how you interact with AI by treating responses as editable blocks rather than static text.

## What is Coo?

Coo is your personalized wiki - a chatbot where you can **edit AI responses in context**. Instead of copying responses elsewhere to modify them, Coo parses AI output into semantic blocks (paragraphs, lists, code blocks, headings) that you can:

- **Transform** - Expand content, translate to different languages, simplify with ELI5, or generate examples
- **Select & Rewrite** - Highlight specific text portions and request targeted rewrites
- **Collect** - Gather blocks into "cards" for organization and export
- **Undo/Redo** - Track changes with full history support

## Features

- **Block-Based Chat**: AI responses are parsed into editable semantic blocks
- **Block Transformations**:
  - ELI5 (Explain Like I'm 5)
  - Translate (English, Chinese, Spanish, French)
  - Expand
  - Generate Examples
  - Ask (custom questions about content)
- **Text Selection & Rewriting**: Highlight text and request focused rewrites
- **Card Collection System**: Collect blocks into cards for grouping and export
- **Thread-Based Conversations**: Organize chats into separate threads with persistence
- **Real-Time Streaming**: Watch AI responses appear in real-time
- **Keyboard Shortcuts**: Cmd+Enter for text capture, Escape for deselection
- **Dark Mode**: Full dark/light theme support
- **Offline Detection**: Banner notification when offline

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript (strict mode)
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS + Radix UI components
- **AI Provider**: OpenAI API (GPT-5.2, GPT-5-mini)
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest (unit/integration) + Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/jwy600/coo-app.git
cd coo-app-next

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required
OPENAI_API_KEY=your_openai_api_key

# Optional - for data persistence
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### Supabase Setup (Optional)

By default, Coo works without a database (data is stored in memory and lost on refresh). For persistent storage, set up Supabase:

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database schema**:
   - Go to your Supabase dashboard
   - Navigate to **SQL Editor**
   - Copy the contents of `supabase/schema.sql`
   - Paste and click **Run** to create the required tables

3. **Get your credentials**:
   - Go to **Project Settings** → **API**
   - Copy the **Project URL** → use as `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the **anon/public key** → use as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

4. **Add to your `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

The app will automatically detect Supabase configuration and enable persistence.

### Running the App

```bash
# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build
npm run start
```

## Usage

### Basic Chat

1. Open the app at `http://localhost:3000`
2. Click "New Thread" or select an existing thread
3. Type your message in the composer and press Enter or click Send
4. Watch as the AI response streams in and is parsed into blocks

### Block Actions

Hover over any block to reveal the action toolbar:

- **Expand**: Make the content more detailed
- **ELI5**: Simplify the explanation
- **Translate**: Convert to another language
- **Examples**: Generate relevant examples
- **Ask**: Ask a custom question about the block

### Text Selection

1. Highlight any text within a block
2. Press Cmd+Enter (or the capture button) to create a selection
3. Selection chips appear for quick rewrite requests
4. Click a chip or type a custom rewrite prompt

### Cards & Export

1. Select blocks you want to collect
2. Click "Add to Card" to group them
3. Use the Export button to download your curated content

## Project Structure

```
coo-app-next/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (chat, block-action)
│   └── t/[threadId]/      # Thread detail pages
├── components/            # React components
│   ├── chat/             # Chat UI (messages, blocks, controls)
│   ├── composer/         # Message input
│   ├── settings/         # Settings dialog
│   └── ui/               # Radix UI wrappers
├── hooks/                 # Custom React hooks
├── lib/
│   ├── store/            # Zustand state management
│   ├── state/            # Pure state transformations
│   ├── api/              # API utilities
│   ├── supabase/         # Database operations
│   └── config/           # Configuration
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

## Configuration

### Application Settings

Access settings via the gear icon in the sidebar:

| Setting | Options | Default |
|---------|---------|---------|
| Model | gpt-5.2, gpt-5-mini | gpt-5-mini |
| Reasoning Effort | none, low, medium, high | none |
| Web Search | on/off | off |
| Translate Language | English, Chinese, Spanish, French | Chinese |

## License

ISC
