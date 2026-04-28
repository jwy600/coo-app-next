# Plan — Focus-Mode Context Chaining

**Source spec:** `docs/ideas/focus-mode-context-chaining.md`
**Goal:** every focus-mode API call inherits the conversation context of the assistant message the editor was opened on, while the model is constrained to act only on the selected passage.

## Codebase facts (verified before planning)

- `Message.responseId` lives at `message.meta.openaiResponseId` (not a top-level field). The thread-level helper `getLastAssistantResponseId(state, threadId)` already reads it. There is no per-message getter; we'll inline `findMessage(...).meta?.openaiResponseId as string | undefined`.
- `FocusActive` is declared in **two** places — `types/state/ui.ts` (canonical) and re-exported from `lib/state/focus.ts`. Both must be updated.
- `focus` is UI-only state — not persisted. Adding fields requires no migration.
- `lib/state/focus.ts:openEditor` already calls `findMessage`, so capturing per-message `responseId` and the prior user message text at open time is a one-line lookup.
- Pre-v3 messages migrated up by `lib/store/migration.ts` may have no `meta.openaiResponseId` — the row-7 fallback is necessary in practice.
- The dead branch in `lib/api/blockAction.ts:68–71` (`ask + previousResponseId → drops block text`) is currently unreachable because no caller passes `previousResponseId` to focus-mode `ask`. Once we wire chaining, that branch would silently strip the passage. Must be removed before wiring.
- Rewrite (`lib/api/rewrite.ts`) does not pass `previousResponseId` and does not need to. Verify-only — no change.

## Dependency graph

```
T0 (verbose request/response logging — no deps; unblocks every smoke check)
T1 (state foundation: FocusActive + openEditor + slice action)
   ├── T2 (prompts + <passage> wrapper in buildInput)
   │      └── T3 (remove dead ask+chain branch)
   │             ├── T4 (wire Composer.tsx shortcuts)
   │             ├── T5 (wire useComposer.ts focus-ask)
   │             └── T6 (legacy fallback: referenceQuestion injection)
   │                    └── T7 (manual smoke + chain verification)
   └── (parallel) T2 also unblocks T3
```

T0 is independent and lands first so every subsequent manual check has full visibility. T2 and T3 can be done back-to-back in one PR slice — T3 is two lines. T4 and T5 are siblings (no shared state edits) and could be parallel commits. T6 depends on T4/T5 because the fallback path goes through the same call sites. T7 is the verification gate.

## Vertical slices

Each task is shippable on its own — code + tests + manual check. We don't merge horizontal layers (e.g., "all types first, all prompts second, all wiring third"); each task moves one user-visible behavior end-to-end.

---

### T0 — Verbose request/response logging in dev

**Why first:** every later smoke check (T2, T4, T5, T6, T7) wants to see the actual `input`, `instructions`, and `previous_response_id` going to OpenAI. The existing dev logger truncates `input` to 100 chars, omits `instructions`, and elides `previousResponseId` to the last 8 — not enough to verify passage wrapping, scope-rule wording, chain integrity, or fallback injection. Independent of T1; lands first.

**Changes**
- `lib/api/openAiClient.ts`:
  - Drop the 100-char `inputPreview` truncation in dev; log full `input`.
  - Add full `instructions` to the request log.
  - Log the full `previousResponseId` (no last-8 elision) for easy chain correlation.
  - Add optional `label?: string` to `CreateResponseParams`; print in `[OpenAI Request <label>]` header.
  - Drop the 200-char output truncation in dev; log full response text.
- Tag every call site with a label:
  - `lib/api/chat.ts` → `label: 'chat:send'`.
  - `lib/api/blockAction.ts` → ``label: `focus:${action}` `` (e.g. `focus:translate`, `focus:ask`).
  - `lib/api/rewrite.ts` → `label: 'rewrite'`.
  - `lib/api/generateThreadTitle.ts` → `label: 'thread-title'`.
- Production behavior unchanged — `isDev` gate retained; no logs in prod.

**Acceptance criteria**
- In dev, every call prints `[OpenAI Request <label>]` with: full `input`, full `instructions`, full `previousResponseId` (or `null`), model, streaming flag, reasoning, web-search flag.
- Every response prints `[OpenAI Response <label>]` with: full output text, full `responseId`.
- Production build emits no logs.
- Labels distinguish all four call sites at a glance.

**Verification**
- `npm run dev`; run one chat send, one focus-mode shortcut, one focus-mode ask → three distinct labeled logs.
- `npm run test`, `npm run lint` green.

---

### T1 — State foundation: capture chain head and reference question on open

**Why first:** every downstream task reads `focus.lastResponseId` or `focus.referenceQuestion`. Without this, the call sites have nothing to thread through.

**Changes**
- `types/state/ui.ts`: extend `FocusActive` with `lastResponseId?: string` and `referenceQuestion?: string`.
- `lib/state/focus.ts`:
  - Re-export the updated `FocusActive` (keep the duplicate in sync).
  - In `openEditor`: after `findMessage`, read `message.meta?.openaiResponseId as string | undefined` → `lastResponseId`. If absent, find the message immediately preceding M in the same thread; if it's a user message, capture its `text` as `referenceQuestion`. Otherwise leave undefined.
  - Add a pure function `setFocusLastResponseId(state, responseId): AppState` that writes `focus.lastResponseId = responseId` (no-op if `state.focus` is null).
- `lib/store/slices/focusSlice.ts`:
  - Add `setFocusLastResponseId(responseId: string): void` action wrapping the pure fn.
  - `closeEditor` already returns `focus: null`, which discards both new fields automatically — no change.

**Acceptance criteria**
- Opening editor on a message with `meta.openaiResponseId` populates `focus.lastResponseId`.
- Opening editor on a message **without** `meta.openaiResponseId` whose prior message is a user message populates `focus.referenceQuestion` with that user message's text.
- Opening editor on a message without `meta.openaiResponseId` and no prior user message leaves both fields undefined.
- `setFocusLastResponseId` updates `focus.lastResponseId` and is a no-op when `focus` is null.
- `closeEditor` clears both fields (because `focus` becomes null).

**Verification**
- New unit tests in `tests/unit/lib/state/focus.test.ts` covering all three open scenarios + `setFocusLastResponseId`.
- New unit test in `tests/unit/lib/store/slices/focusSlice.test.ts` for the slice action.
- `npm run test` green.
- `npm run lint` clean.

---

### T2 — Prompt scoping + `<passage>` wrapping in input builder

**Why before wiring:** without scoped prompts, chained calls will summarize/translate the entire prior thread. T2 is the safety harness for T4/T5/T6.

**Changes**
- `lib/config/promptTemplates.ts`:
  - `BLOCK_ACTION_PROMPT`: add a rule "Act only on the text inside `<passage>`. Treat any prior conversation turns as reference context only — do not translate, summarize, or transform them."
  - `BLOCK_ACTION_TRANSLATE_PROMPT`: same scoping line, adapted to translation.
  - Leave `REWRITE_PROMPT`, `THREAD_TITLE_PROMPT`, `CHATGPT_PROMPT` alone.
- `lib/api/blockAction.ts`:
  - In `buildInput`, wrap `blockText` in `<passage>...</passage>`. Update each preamble in `ACTION_PREAMBLES` so it works above a fenced passage (most are already fine; `ask` becomes `Question: ...` then `<passage>...</passage>`; `rewrite` is unchanged for its non-focus callers, but we'll verify the only focus rewrite path goes through `lib/api/rewrite.ts` and `blockAction`'s `rewrite` branch is dead — leave the latter as-is for now, or note it for cleanup).

**Acceptance criteria**
- All focus-mode actions (translate, eli5, summarize, example, expand, ask) send input that contains exactly one `<passage>...</passage>` block with the buffer.
- System prompts for those actions explicitly forbid acting on prior context.
- Manual eyeball: in an unchained call, output is identical in spirit to before (passage is fenced but the model still sees the same text).

**Verification**
- Update `tests/unit/lib/api/blockAction.test.ts` snapshot/assertions for `buildInput` output across all actions.
- Run `npm run test`.
- Manual one-shot: with no prior thread context, run translate on a paragraph in dev — confirm output is still a clean translation.

---

### T3 — Remove dead `ask + previousResponseId → drops block text` branch

**Why third:** this branch is currently unreachable but becomes a footgun the moment T5 lands. Removing it before wiring prevents a silent regression.

**Changes**
- `lib/api/blockAction.ts:68–71`: delete the conditional. `input` is always `buildInput(action, trimmedBlockText, trimmedPrompt)`.
- Update `tests/unit/lib/api/blockAction.test.ts` if any case asserted the old behavior (the chain-then-strip case).

**Acceptance criteria**
- For every action, `input` is the wrapped passage form regardless of `previousResponseId`.
- No test broken by the removal.

**Verification**
- `npm run test` green.
- Grep confirms no remaining caller depends on the stripped-input behavior.

---

### T4 — Wire chain through composer shortcuts (Translate / ELI5 / Summarize / Example / Expand)

**Why parallel with T5:** independent call site, no shared state mutation pattern beyond `setFocusLastResponseId`.

**Changes**
- `components/composer/Composer.tsx`:
  - In `handleDraftAction`, before the call, compute `previousResponseId = focus.lastResponseId` (intentionally NOT falling back to `referenceQuestion`-injection here — that path lives in `buildInput` once T6 lands; for T4 we only chain when `lastResponseId` is set).
  - Pass `previousResponseId` to `fetchBlockAction(action, focus.buffer, undefined, language, settings, previousResponseId)`.
  - After success, call `setFocusLastResponseId(result.responseId)` (new slice action from T1).

**Acceptance criteria**
- First shortcut click after opening editor on a message with responseId: API call carries `previous_response_id = M.responseId`.
- Second shortcut click in the same session: API call carries `previous_response_id = <previous focus response id>`.
- After every shortcut, `focus.lastResponseId` reflects the latest server response id.
- Closing the editor and reopening produces a fresh chain head from the new M.

**Verification**
- Update `tests/unit/components/composer/Composer.test.tsx` to assert the `previousResponseId` argument across two consecutive shortcut calls.
- Add a focused test for `setFocusLastResponseId` capture after success.
- Manual: in dev, start a conversation that establishes context; select a passage; click Translate — confirm output respects the prior conversation. Click ELI5 — confirm chain continues.

---

### T5 — Wire chain through focus-ask (composer in focus mode)

**Why parallel with T4:** different call site, same pattern.

**Changes**
- `hooks/useComposer.ts`:
  - In the `focus` branch (line 60ff), compute `previousResponseId = focus.lastResponseId`.
  - Pass it to `fetchBlockAction('ask', focus.buffer, trimmed, undefined, settings, previousResponseId)`.
  - After success, call `setFocusLastResponseId(result.responseId)`.
  - Existing behavior (replacing prompt with answer, no thread message append) is preserved.

**Acceptance criteria**
- First Ask after open chains off `M.responseId`.
- Translate-then-Ask scenario: Ask chains off the Translate response (because T4 wrote it into `focus.lastResponseId`).
- Ask-then-Ask scenario: second Ask chains off the first Ask's response.
- Errors leave `focus.lastResponseId` unchanged (no partial corruption).

**Verification**
- Update `tests/unit/hooks/useComposer.test.ts` for the three scenarios above.
- Manual: replicate the user's Ableton example — ask a contextual question, select a passage, ask a follow-up that's only answerable with prior context. Confirm answer is contextually correct.

---

### T6 — Legacy fallback: `<reference-question>` injection when responseId missing

**Why after T4/T5:** the fallback flows through the same call sites; we want them already wired before adding the alternative path.

**Changes**
- `lib/api/blockAction.ts`:
  - Extend `fetchBlockAction` signature with an optional `referenceQuestion?: string` argument.
  - In `buildInput`: if `referenceQuestion` is provided AND `previousResponseId` is absent, prepend `<reference-question>${referenceQuestion}</reference-question>\n\n` to the existing wrapped output. Otherwise unchanged.
- `components/composer/Composer.tsx` and `hooks/useComposer.ts`:
  - When computing the API args, pass `referenceQuestion = focus.lastResponseId ? undefined : focus.referenceQuestion`.

**Acceptance criteria**
- Opening editor on a legacy message (no `meta.openaiResponseId`) whose prior message is a user message: every focus-mode call carries the user question in a `<reference-question>` block AND no `previous_response_id`.
- After the first call, the returned `responseId` is captured into `focus.lastResponseId`. Subsequent calls in the same session switch to chained mode and stop injecting the reference question.
- Opening on a current-shape message: no `<reference-question>` block ever appears.

**Verification**
- Add unit tests in `tests/unit/lib/api/blockAction.test.ts` for `referenceQuestion` injection rules.
- Add tests in Composer / useComposer test suites for the legacy-message scenario.
- Manual: clear localStorage, replay a v2-migrated thread (or hand-craft a message with empty `meta`), confirm the fallback fires.

---

### T7 — Verification gate: manual smoke + lint/test/build

**Why last:** the only place we actually validate against live OpenAI behavior. The earlier task verifications use mocks.

**Smoke checklist (live OpenAI)**
- [ ] User's Ableton-style scenario: ask a domain question → select a passage → ask "what does X mean" via Composer focus-ask. Answer respects prior context.
- [ ] Translate a selected passage. Confirm only the passage is translated; prior thread is not echoed.
- [ ] ELI5 a selected passage that uses jargon defined earlier in the thread. Confirm the explanation uses the prior context to disambiguate.
- [ ] Summarize a selected passage. Confirm output is bounded to the passage.
- [ ] Translate → Ask: Ask references the translation result, not just the passage.
- [ ] Close editor mid-session, reopen on the same paragraph. Confirm next call is a fresh chain (look at network log for `previous_response_id` matching M, not the stale focus-session head).
- [ ] Rewrite still works and does not chain (network log: no `previous_response_id`).

**Verification**
- `npm run lint`, `npm run test`, `npm run build` all green.
- Smoke checklist all green.
- Update `docs/architecture.md` if the focus-mode section needs amending (mention the `<passage>` fence + chain inheritance).
- Update `docs/focus-mode-spec.md` and `docs/focus-mode-todo.md` to reflect chaining behavior.

---

## Checkpoints (human review gates)

- **After T0** — confirm logs surface the right info without overwhelming the console; adjust verbosity before relying on them in T2+.
- **After T1** — review state shape and openEditor logic before any wiring depends on it. Cheap to revise; expensive once 4 call sites read it.
- **After T3** — confirm the dead-branch removal didn't break a thread-mode behavior we forgot. (Quick: `grep "ask" lib/api blockAction.ts callers`.)
- **After T6** — full self-review pass before T7 smoke.
- **After T7** — final review for merge.

## Risks & open considerations

- **Prompt instruction strength.** "Act only on `<passage>`" may not fully prevent strong models from translating chained context. T7's translate smoke is the trip-wire. If it fails, escalate the instruction (`<rules>` upgrade or move to a stricter "you will be penalized" framing) and re-run.
- **Legacy migration coverage.** If many users have v2-migrated threads with empty `meta`, the fallback path will be hot. The fallback only carries one prior turn — accepted limitation in the spec.
- **`example` and `expand` actions** are flagged as legacy in `CLAUDE.md`. They go through the same `fetchBlockAction` plumbing; T2's prompt change applies. No special handling unless we want to deprecate them — out of scope for this plan.
- **OpenAI's 30-day response retention.** A user could open a thread weeks later and find the chain expired. The model returns an error; we should let it surface naturally for now (the next call after a failure will use no chain, since `focus.lastResponseId` won't have been overwritten — but `M.responseId` is also stale). Accept and revisit if reports appear.
- **Test fixtures for focus state.** Existing tests don't cover `lastResponseId`; T1 adds these foundational fixtures so T4/T5/T6 tests are concise.
