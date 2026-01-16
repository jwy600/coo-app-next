# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Testing
```bash
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode (auto-rerun on file changes)
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate coverage report
```

### Development
```bash
vercel dev              # Run locally with Vercel CLI (required for serverless functions)
vercel                  # Deploy to Vercel
```

Tests automatically run on every push and pull request via GitHub Actions.

## Architecture

### State Management Philosophy
The application uses **functional, immutable state management** with pure functions. All state transformations happen in `core/state.js` using pure functions that return new state objects:

```javascript
const result = addUserMessage(state, text, idFactory, nowFactory)
// Returns: { state: newState, message, blocks }
```

**Critical**: Never mutate state directly. All state functions in `core/state.js` are pure and must remain pure - they take state as input and return a new state object.

### Data Flow
1. User action → Event handler in `app.js`
2. State transformation → Pure function in `core/state.js` returns new state
3. Persistence → Supabase (async, non-blocking)
4. DOM update → Targeted re-render

### Block-Based Content Model
AI responses are split into **blocks** (paragraphs, lists, code blocks). Each block is:
- Independently editable
- Selectable for transformations
- Persisted separately in the database
- Parsed from markdown using `splitIntoBlocks()` in `core/state.js`

Blocks support:
- **Rewrite with undo**: Blocks store `prevText` and `isRewritten` to allow toggling between original and rewritten versions
- **Text selections**: Users can highlight phrases within blocks (stored in `selections` array)
- **Block transformations**: translate, expand, ELI5, example, ask, rewrite

### Project Structure
```
core/                   # Pure business logic
├── state.js           # Pure state transformation functions (NO side effects)
├── api.js             # API factory (currently wraps openAiApi)
├── openAiApi.js       # OpenAI client
└── supabaseClient.js  # Supabase initialization

api/                   # Vercel serverless functions
├── chat.js            # Main chat endpoint (POST /api/chat)
└── block-action.js    # Block transformations (POST /api/block-action)

app.js                 # UI orchestration, DOM manipulation, event handling
index.html             # Entry point with inline copy data
styles.css             # Complete styling
```

### API Endpoints
Both serverless functions in `api/` follow the same pattern:
- Accept POST requests only
- Validate input (prompt length, required fields)
- Call OpenAI API with `gpt-4o-mini`
- Return `{ text }` or `{ error }`

### Database Schema (Supabase)
```sql
threads (id, title, created_at, updated_at)
messages (id, thread_id, role, created_at, meta)
blocks (id, thread_id, message_id, position, type, text, edited, selections, prev_text, is_rewritten)
```

**Note**: Message content order is determined by block `position` field, not by storing block IDs in the message record.

### Key Architectural Principles
1. **Pure functions in `core/state.js`**: All state transformations must be pure functions with no side effects
2. **Immutability**: Never mutate state - always return new objects
3. **UI in `app.js`**: All DOM manipulation and event handling belongs in `app.js`, not in `core/`
4. **Dependency injection**: Pass `idFactory` and `nowFactory` to state functions for testability
5. **Block-level granularity**: Content is managed at the block level, not message level

### Testing Strategy
- Unit tests for `core/state.js` (currently 82.6% coverage, 44 passing tests)
- Test files mirror source structure: `tests/core/state.test.js`
- Target coverage: 70%+ for critical paths
- Use `npm run test:watch` during development

### Configuration
Environment variables (`.env.local`):
- `OPENAI_API_KEY`: Required for AI functionality

Supabase config (`data/supabaseConfig.js`):
```javascript
export const supabaseConfig = {
  url: 'your_supabase_url',
  anonKey: 'your_supabase_anon_key'
}
```

Database schema must be applied from `supabase/schema.sql` before first use.
