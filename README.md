# Coo - Blockwise AI Chat

> Edit AI answers in place.

Coo turns long AI responses into clean paragraphs you can translate, expand, and simplify—right where they appear.

## Features

- 🎯 **Block-based editing** - AI responses split into editable paragraph blocks
- ✏️ **In-place transformations** - Translate, expand, ELI5, and more
- 🎨 **Text highlighting** - Select phrases to emphasize in rewrites
- 💾 **Thread persistence** - All conversations saved to Supabase
- 🧮 **Math rendering** - LaTeX equations with KaTeX
- 📝 **Markdown support** - Headings, lists, code blocks, bold text

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules), HTML5, CSS
- **Backend**: Vercel Serverless Functions
- **AI**: OpenAI API (GPT-4o-mini)
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- OpenAI API key
- Supabase project

### Installation

1. Clone the repository
```bash
git clone https://github.com/jwy600/coo-app.git
cd coo-app
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables

Create `.env.local`:
```bash
OPENAI_API_KEY=your_openai_api_key
```

Create `data/supabaseConfig.js`:
```javascript
export const supabaseConfig = {
  url: 'your_supabase_url',
  anonKey: 'your_supabase_anon_key'
}
```

4. Setup database

Run the schema from `supabase/schema.sql` in your Supabase SQL editor.

5. Run locally

Since this is a static site with serverless functions, use Vercel CLI:
```bash
npm install -g vercel
vercel dev
```

Or deploy to Vercel:
```bash
vercel
```

## Testing

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Test Structure

```
tests/
├── core/
│   └── state.test.js       # Unit tests for state management
├── api/                     # API endpoint tests (coming soon)
└── e2e/                     # End-to-end tests (coming soon)
```

### Current Coverage

- ✅ **82.6%** coverage on [core/state.js](core/state.js)
- ✅ **44 passing tests** for critical functions:
  - State management (create, update, select)
  - Message and block operations
  - Selection handling
  - Rewrite with undo
  - Block splitting (markdown parsing)

### Adding Tests

When adding new features:

1. **Write tests first** (TDD approach recommended)
2. Test files should be colocated: `tests/[module]/[filename].test.js`
3. Run `npm run test:watch` during development
4. Ensure coverage stays above 70% for critical paths

Example test:
```javascript
import { describe, it, expect } from 'vitest'
import { yourFunction } from '../../core/module.js'

describe('Your Feature', () => {
  it('should do something', () => {
    const result = yourFunction('input')
    expect(result).toBe('expected output')
  })
})
```

## CI/CD

Tests run automatically on every push and pull request via GitHub Actions:

- ✅ Unit tests
- ✅ Coverage reporting
- ✅ Build verification

See [.github/workflows/test.yml](.github/workflows/test.yml) for the full CI configuration.

## Block Actions

Available transformations for selected blocks:

- **Translate** - Convert to/from Chinese
- **Expand** - Add depth and detail
- **ELI5** - Explain Like I'm 5 (simplification)
- **Example** - Generate illustrative examples
- **Ask** - Ask questions about the selected block
- **Rewrite** - Rewrite emphasizing highlighted phrases (with undo)

## Architecture

### State Management

Functional, immutable state updates using pure functions in [core/state.js](core/state.js):

```javascript
const result = addUserMessage(state, text, idFactory, nowFactory)
// Returns: { state: newState, message, blocks }
```

### Data Flow

1. User action → Event handler
2. State transformation → New state object
3. Persistence → Supabase (async)
4. DOM update → Targeted re-render

### File Structure

```
coo-app/
├── index.html              # Main entry point
├── app.js                  # UI orchestration
├── styles.css              # Complete styling
├── core/                   # Business logic
│   ├── state.js           # State management (PURE FUNCTIONS)
│   ├── api.js             # API factory
│   ├── openAiApi.js       # OpenAI client
│   └── supabaseClient.js  # Supabase init
├── api/                    # Serverless functions
│   ├── chat.js            # Main chat endpoint
│   └── block-action.js    # Block transformations
├── tests/                  # Test suites
│   ├── core/
│   ├── api/
│   └── e2e/
├── supabase/
│   └── schema.sql         # Database schema
└── .github/workflows/      # CI/CD
```

## Database Schema

```sql
threads (id, title, created_at, updated_at)
messages (id, thread_id, role, created_at, meta)
blocks (id, thread_id, message_id, position, type, text, edited, selections, prev_text, is_rewritten)
```

## Contributing

Contributions are welcome! Please ensure:

1. **Tests pass**: Run `npm test` before committing
2. **Add tests**: For new features or bug fixes
3. **Maintain coverage**: Keep critical paths above 70%
4. **Follow patterns**: Match existing code style

## Roadmap

See [iteration plan](/.claude/plans/clever-bubbling-wren.md) for detailed feature roadmap including:

- 🔒 E2E testing with Playwright
- ⌨️ Keyboard shortcuts
- 🌙 Dark mode
- 🔍 Search & organization
- 🤝 Collaborative features
- 📊 Analytics

## License

ISC

## Acknowledgments

- Inspired by Notion's block-based editing model
- Powered by OpenAI's GPT-4o-mini
- Built with Supabase for real-time data persistence
