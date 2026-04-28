# Todo — Focus-Mode Context Chaining

Source plan: `tasks/plan.md`. Source spec: `docs/ideas/focus-mode-context-chaining.md`.

Each task is one shippable slice with code + tests + manual check. Dependency order is top-down. T0 is independent and lands first. T4 and T5 are siblings.

---

## T0 — Verbose request/response logging in dev
- [ ] In `lib/api/openAiClient.ts`, drop the 100-char `inputPreview` truncation; log full `input`
- [ ] Add full `instructions` to the request log
- [ ] Log full `previousResponseId` (remove last-8 elision)
- [ ] Add optional `label?: string` to `CreateResponseParams` and print it in the request/response header
- [ ] Drop the 200-char output truncation in dev; log full response text
- [ ] Tag `lib/api/chat.ts` with `label: 'chat:send'`
- [ ] Tag `lib/api/blockAction.ts` with ``label: `focus:${action}` ``
- [ ] Tag `lib/api/rewrite.ts` with `label: 'rewrite'`
- [ ] Tag `lib/api/generateThreadTitle.ts` with `label: 'thread-title'`
- [ ] Confirm production build emits no logs (no change to `isDev` gate)
- [ ] Manual: run `npm run dev`; one chat send + one focus shortcut + one focus ask → three distinct labeled logs
- [ ] `npm run test`, `npm run lint` green
- [ ] **Checkpoint:** review log volume / shape before relying on them in T2+

## T1 — State foundation
- [ ] Extend `FocusActive` in `types/state/ui.ts` with `lastResponseId?: string` and `referenceQuestion?: string`
- [ ] Mirror the shape in `lib/state/focus.ts` (re-export stays in sync)
- [ ] Update `openEditor` in `lib/state/focus.ts` to populate `lastResponseId` from `message.meta.openaiResponseId` and `referenceQuestion` from the immediately preceding user message's text (only when `lastResponseId` is missing)
- [ ] Add pure fn `setFocusLastResponseId(state, responseId): AppState` in `lib/state/focus.ts`
- [ ] Add slice action `setFocusLastResponseId(responseId)` in `lib/store/slices/focusSlice.ts`
- [ ] Tests: `tests/unit/lib/state/focus.test.ts` — open with responseId / open without responseId but prior user msg / open without either / setFocusLastResponseId
- [ ] Tests: `tests/unit/lib/store/slices/focusSlice.test.ts` — slice action
- [ ] `npm run test` green; `npm run lint` clean
- [ ] **Checkpoint:** human review of state shape before T2

## T2 — Prompt scoping + `<passage>` wrapping
- [ ] Update `BLOCK_ACTION_PROMPT` in `lib/config/promptTemplates.ts` with scope-to-`<passage>` rule
- [ ] Update `BLOCK_ACTION_TRANSLATE_PROMPT` with the same rule (translation-flavored)
- [ ] Update `buildInput` in `lib/api/blockAction.ts` to wrap `blockText` in `<passage>...</passage>`
- [ ] Adjust action preambles where needed so they read naturally above a fenced passage
- [ ] Tests: `tests/unit/lib/api/blockAction.test.ts` — `buildInput` output for every action carries one `<passage>` block
- [ ] Manual smoke: translate a paragraph in dev with no prior thread context; output is unchanged in spirit
- [ ] `npm run test` green

## T3 — Remove dead `ask + previousResponseId → drops block text` branch
- [ ] Delete the conditional in `lib/api/blockAction.ts:68–71`
- [ ] Update or remove any test asserting the stripped-input behavior
- [ ] Grep for callers that relied on it (expected: none)
- [ ] `npm run test` green
- [ ] **Checkpoint:** human review before wiring T4/T5

## T4 — Wire chain through composer shortcuts
- [ ] In `components/composer/Composer.tsx` `handleDraftAction`, read `previousResponseId = focus.lastResponseId`
- [ ] Pass `previousResponseId` to `fetchBlockAction(action, focus.buffer, undefined, language, settings, previousResponseId)`
- [ ] After success, call `setFocusLastResponseId(result.responseId)`
- [ ] Tests: `tests/unit/components/composer/Composer.test.tsx` — first-call chains off M, second-call chains off prior focus response
- [ ] Manual: select passage, run Translate then ELI5; confirm chain visible in network logs

## T5 — Wire chain through focus-ask
- [ ] In `hooks/useComposer.ts` focus branch, read `previousResponseId = focus.lastResponseId`
- [ ] Pass it to `fetchBlockAction('ask', focus.buffer, trimmed, undefined, settings, previousResponseId)`
- [ ] After success, call `setFocusLastResponseId(result.responseId)`
- [ ] Tests: `tests/unit/hooks/useComposer.test.ts` — first-Ask, Translate-then-Ask, Ask-then-Ask scenarios
- [ ] Manual: replay user's Ableton example; confirm follow-up is contextually correct

## T6 — Legacy fallback: `<reference-question>` injection
- [ ] Extend `fetchBlockAction` signature with `referenceQuestion?: string`
- [ ] In `buildInput`, prepend `<reference-question>...</reference-question>` when `referenceQuestion` is provided AND `previousResponseId` is absent
- [ ] In `Composer.tsx` and `useComposer.ts`, pass `referenceQuestion = focus.lastResponseId ? undefined : focus.referenceQuestion`
- [ ] Tests: `tests/unit/lib/api/blockAction.test.ts` — injection rules
- [ ] Tests: composer + useComposer suites — legacy-message path
- [ ] Manual: replay a v2-migrated thread or hand-craft a message with empty `meta`; confirm fallback fires once and the chain takes over after
- [ ] **Checkpoint:** human review before T7 smoke

## T7 — Verification gate
- [x] Live smoke: contextual Ask (Ableton-style scenario)
- [x] Live smoke: Translate stays scoped to passage
- [x] Live smoke: ELI5 uses prior context to disambiguate jargon
- [x] Live smoke: Summarize stays scoped to passage
- [x] Live smoke: Translate → Ask chain works
- [x] Live smoke: close-and-reopen produces a fresh chain head
- [x] Live smoke: Rewrite carries no `previous_response_id`
- [x] `npm run test` (476 passing) and `npm run build` green; `npm run lint` baseline unchanged from pre-T0
- [x] Update `docs/architecture.md` focus-mode section
- [x] Update `docs/focus-mode-todo.md`
- [ ] **Checkpoint:** final review for merge
