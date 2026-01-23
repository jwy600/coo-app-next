# CLAUDE.md

## Commands
```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check
```

## Critical: State Management Pattern

This app uses **pure functions + Zustand**. This is the most important pattern to understand.

```
lib/state/    → Pure functions (NO side effects, returns new state)
lib/store/    → Zustand actions (thin wrappers that call pure functions)
components/   → UI only (no business logic)
```

**Rule: NEVER mutate state.** All functions in `lib/state/` must be pure:
```typescript
// ✅ Correct - returns new object
export const addItem = (state: AppState, item: Item): AppState => {
  return { ...state, items: [...state.items, item] };
};

// ❌ Wrong - mutates state
export const addItem = (state: AppState, item: Item): AppState => {
  state.items.push(item);  // NEVER DO THIS
  return state;
};
```

Zustand actions wrap pure functions:
```typescript
addItem: (item) => {
  const result = stateFns.addItem(get(), item);
  set(result);
}
```

## Data Flow
1. User action → React event handler
2. Handler calls → Zustand action
3. Zustand action calls → Pure function in `lib/state/`
4. Zustand calls `set()` → React re-renders
5. Side effects (Supabase sync) → Async, non-blocking via `lib/supabase/`

## Block-Based Content Model
AI responses are split into **blocks** (paragraphs, lists, code). Each block:
- Has its own ID and `position` field (determines order)
- Is independently editable and selectable
- Supports rewrite with undo (`prevText`, `isRewritten`)
- Is persisted separately in database

Parser: `lib/state/parser.ts` → `splitIntoBlocks()`

## Key Folders
| Folder | Purpose |
|--------|---------|
| `lib/state/` | Pure state functions (MOST IMPORTANT) |
| `lib/store/` | Zustand store + slices |
| `lib/api/` | API client functions |
| `lib/supabase/` | Database operations |
| `app/api/` | Next.js route handlers |
| `components/ui/` | shadcn/ui components |
| `types/` | TypeScript definitions |

## Documentation

**Codemaps** (quick context for AI):
- `codemaps/architecture.md` — Structure and data flow
- `codemaps/frontend.md` — Components, state, slices
- `codemaps/backend.md` — API routes, integrations
- `codemaps/data.md` — Types and schema

**Detailed guides** (for implementation):
- `docs/architecture.md` — Patterns and how-to guides
- `docs/database.md` — Schema and Supabase patterns
- `docs/testing.md` — Test commands and strategy

## Workflow Reminders
- Use **conventional commits** (`feat:`, `fix:`, `docs:`, etc.)
- For big changes: create branch + PR
- **Update `/docs/` and `/codemaps/`** when adding/removing files or changing architecture:
  - Use **doc-updater** agent for `/docs/` updates
  - Use `/update-codemaps` skill for `/codemaps/` updates
