# Future Development & Cleanup Backlog

Items identified during dead code analysis (2026-02-06) that were deferred for later.

## Phase 3 - Console Logging & ESLint Fixes

### Remove dev console.log statements in openAiClient.ts
- `lib/api/openAiClient.ts` lines 63, 83 contain `console.log` for request/response logging
- These are gated behind `isDev` check, so low risk, but should use structured logging or be fully removed

### Fix ESLint error in useAuth.ts
- `hooks/useAuth.ts:34` has `react-hooks/set-state-in-effect` warning
- Calling `setUser` synchronously in `useEffect` for test mode triggers cascading renders
- Should be refactored to avoid synchronous state set in effect

### Review config exports used only by integration tests
- `lib/config/openai.ts` exports `DEVELOPER_PROMPT`, `MODEL_PRICING`, `calculateCost`
- Only used in `tests/integration/utils/api-helpers.ts`, not in main app
- Consider making non-exported or moving to test utils

## Phase 4 - Structural Improvements

### Move or gitignore `coo-video/` directory
- 553 MB separate Remotion project with its own `node_modules`
- Untracked in git but clutters workspace
- Should be its own repo or added to `.gitignore`

### Split `BlockContent.tsx` (351 lines)
- Handles many block types: code, list, heading, math, text
- Could extract per-block-type renderers into separate files

### Split `useComposer.ts` (299 lines)
- Contains chat/ask/edit mode logic in one file
- Could extract mode-specific handlers into separate files

### Shadcn/UI component cleanup (optional)
- `components/ui/sidebar.tsx` (784 lines) has 11+ unused sub-component exports
- These are tree-shaken by bundler, so no runtime impact
- Could trim unused exports for a leaner codebase

### USAGE.md references to removed selectors
- `lib/store/USAGE.md` still references `selectBlockById` and `selectBlocksByMessage`
- Update documentation examples to use current selectors
