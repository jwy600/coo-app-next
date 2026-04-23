# E2E Test Catalog

Per-spec, per-test inventory of the concrete actions exercised by the E2E
suite. A quick-reference for debugging failures and spotting gaps.

Totals: **17 mock + 2 live spec files, ~114 tests**. Chromium: 113 passing,
1 pre-existing skip (65s network-timeout test).

---

## `e2e/mock/chat-basic.spec.ts` — 6 tests

`beforeEach`: navigate to `/`.

1. **new thread from landing** — mock chat; type "Explain React" → submit;
   wait for `/t/:id`; wait for streaming; assert user message contains
   "Explain React"; 1 assistant message; 1 block contains "This is a test
   response".
2. **markdown into multiple blocks** — mock multiBlock response; submit;
   assert 3 blocks with expected substrings.
3. **markdown with code + lists** — submit; assert blocks > 2, `<h1>` =
   "Introduction", 2 `<li>` in assistant message, `<pre code>` visible.
4. **multi-message exchange** — 2 prompts sequentially; assert message
   count = 4 and ≥ 2 blocks.
5. **composer on chat page** — submit; assert `form.composer`, `div#prompt`,
   `button[type="submit"]` all visible.
6. **Unicode/emoji** — submit `"解释一下 React ⚛️ — 中文回答"`; assert
   user message renders CJK+emoji verbatim and response block contains CJK.

---

## `e2e/mock/block-actions.spec.ts` — 7 tests

`beforeEach`: mock multi-block chat; submit from landing; wait.

1. **show controls on select** — click gutter; assert ELI5 / Translate /
   Expand / Example controls visible.
2. **Escape deselects** — select; Escape; assert controls hidden.
3. **ELI5** — select; click ELI5; assert composer = mock ELI5 text.
4. **Translate** — assert composer = mock Chinese text.
5. **Expand** — assert composer = mock expand text.
6. **Example** — assert composer = mock example text.
7. **multiple actions in sequence** — ELI5 → Translate → Expand → Example
   on same block; assert composer updates each time.

---

## `e2e/mock/block-selection.spec.ts` — 8 tests

`beforeEach`: seed chat with heading + paragraphs; submit; wait.

1. **gutter click selects single block** — assert `.is-selected` and
   selected count = 1.
2. **click again toggles off** — assert not selected.
3. **Escape deselects all** — assert count = 0.
4. **composer enabled, no controls when nothing selected**.
5. **composer + controls when single block selected**.
6. **click outside deselects** — click page background; assert deselected.
7. **click inside composer does not deselect**.
8. **click inside doc-block does not deselect**.

---

## `e2e/mock/card-mode.spec.ts` — 21 tests

`beforeEach`: seed chat with two headings + paragraphs.

**Basic Operations (6):**
1. **double-click creates card** — `.block-card` visible.
2. **double-click same block toggles card off**.
3. **card visual border** wraps the correct block.
4. **card controls on hover** — `.card-controls` visible.
5. **separate cards for separate blocks** — count = 2.
6. **no nested cards**.

**Controls (5):**
7. **Clear button removes card**.
8. **Clear via CardControls button** (`button[aria-label="Remove card"]`).
9. **Export button opens dialog** with title input + Export/Cancel buttons.
10. **Cancel closes dialog**, card still present.
11. **Export downloads markdown** — assert `download` event, filename ends
    in `.md`.

**Persistence (2):**
12. **separate cards per thread**.
13. **cards persist across navigation in same thread**.

**Export integration (3):**
14. **heading card includes section** — markdown contains heading + all
    section paragraphs.
15. **frontmatter format** — YAML `title:`, `question:`, `created:`.
16. **question in frontmatter** — matches first user prompt.

**Card / Selection independence (5):**
17. **select block inside card** — both states correct.
18. **select block outside card** — both states correct.
19. **Escape clears selection, not cards**.
20. **block actions on carded block** update composer; card intact.
21. **multiple cards + selection together**.

---

## `e2e/mock/direct-edit.spec.ts` — 15 tests

Shared `beforeEach`: seed simple response; submit; wait.

**Toggle visibility (3):**
1. **toggle appears on block select**.
2. **toggle hides on deselect**.
3. **defaults to Ask mode**.

**Mode switching (4):**
4. **Edit populates composer with block text**.
5. **Ask clears composer**.
6. **Replace button label in Edit mode**.
7. **block controls hidden in Edit mode**.

**Block replacement (4):**
8. **Replace overwrites block text**.
9. **block stays selected after Replace**.
10. **Undo button appears after Replace**.
11. **Undo restores original text**.

**Strikethrough (2):**
12. **select-all + backspace wraps in strikethrough**.
13. **strikethrough renders after Replace** — `<del>` element in block.

**Edge cases (2):**
14. **switching blocks resets to Ask**.
15. **empty composer does not replace**.

---

## `e2e/mock/text-selection.spec.ts` — 8 tests

`beforeEach`: seed simple response; submit.

1. **selection creates chip** — ELI5 fills composer; drag-select text;
   assert 1 chip with that text.
2. **multiple selections** — Expand fills composer; drag-select 2 phrases;
   assert 2 chips in document order.
3. **Rewrite updates block** — chip → Rewrite; assert block text changed.
4. **Undo button after Rewrite**.
5. **Undo restores original**.
6. **chained rewrites after undo**.
7. **deselect clears selections**.
8. **manual typing in composer** — select block; type sentence; drag-select
   substring; assert chip.

---

## `e2e/mock/thread-nav.spec.ts` — 5 tests

`beforeEach`: mock chat; submit; wait.

1. **navigate back to landing** — URL = `/`.
2. **thread in sidebar after creation** — 1 thread link.
3. **load existing thread via direct URL** — messages present.
4. **maintain state across threads** — 2 threads; switch both ways; content
   preserved.
5. **direct URL navigation works**.

---

## `e2e/mock/composer-overflow.spec.ts` — 3 tests

1. **height capped at 50vh** — paste huge text; height ≤ 50vh, scrollable.
2. **grows within cap** — type progressively; height grows but ≤ 50vh.
3. **block controls don't break cap**.

---

## `e2e/mock/keyboard.spec.ts` — 6 tests

1. **Enter submits from landing**.
2. **Escape deselects block**.
3. **click anywhere focuses composer on landing**.
4. **Tab navigates between elements**.
5. **Shift+Enter multiline** — newline inserted.
6. **Shift+Enter does not submit**.

---

## `e2e/mock/errors.spec.ts` — 7 passing + 1 skipped

1. **API error shows message** — mock 500; `.assistant-error` visible.
2. **empty prompt rejected** — inline error.
3. **composer re-enables after error**.
4. **too-long prompt error** — mock 400; 5000-char prompt.
5. **block action error** — ELI5 with error mock; assert error.
6. **missing API key error** — seed empty apiKey; submit; assert "Missing
   OpenAI API key".
7. **error clears on successful retry**.
8. _(skipped)_ 65s network timeout.

---

## `e2e/mock/ask-chain.spec.ts` — 6 tests

`beforeEach`: seed chat with 2 paragraphs; install sequential-ID ask route
and request capture; submit; wait.

1. **first ask has preamble, no chain ID** — captured request `input` has
   "Answer the following question" and `previous_response_id` is null.
2. **follow-up chains ID, drops preamble** — 2nd request has
   `previous_response_id === issuedIds[0]` and input = raw question.
3. **block switch invalidates chain** — 2nd request no chain ID + preamble.
4. **deselect + reselect same block invalidates**.
5. **rewrite invalidates chain** — chip → Rewrite → next ask has no ID.
6. **direct edit invalidates chain** — Edit → Replace → switch to Ask →
   ask; next request has no chain ID.

---

## `e2e/mock/export-filename.spec.ts` — 7 tests

`beforeEach`: seed response with 2 headings + paragraphs; submit "Explain
React"; wait.

1. **paragraph card defaults to thread title** — input = "Explain React".
2. **heading card prefixes heading** — "Introduction - Explain React".
3. **matches the anchor's heading when multiple** — cards on blocks 0 and
   3; export #1 → "Details - Explain React".
4. **user edits flow through to download** — overwrite title; Export;
   assert `download.suggestedFilename()` = custom title.
5. **Cancel discards default** — card still present.
6. **80-char heading truncated** — 91-char heading → heading part ≤ 80 and
   suffix still appended.
7. **re-open re-reads default** — tweak → Cancel → re-open → default back.

---

## `e2e/mock/api-key-banner.spec.ts` — 3 tests

`beforeEach`: overwrite fixture seed so `apiKey = ''`; goto `/`.

1. **banner visible with empty key** — text includes "Add your OpenAI API
   key".
2. **banner hides after typing key** — open Settings; fill key; close.
3. **banner re-shows after clearing key**.

---

## `e2e/mock/settings.spec.ts` — 6 tests

`beforeEach`: goto `/`.

1. **open + close**.
2. **model persists across reload** — GPT-5.4 → reload → active class still
   on GPT-5.4 button.
3. **response language change** — pick 中文 → `responseLanguage === 'zh'`.
4. **vault flips export destination** — set vault → `"obsidian"`; clear →
   `"local"`.
5. **reset to defaults** — mutate + Reset → defaults restored.

---

## `e2e/mock/obsidian-export.spec.ts` — 2 tests

`beforeEach`: install anchor-click capture; seed settings with
`exportDestination: 'obsidian'`, `obsidianVaultName: 'MyVault'`; submit;
wait.

1. **heading card builds correct URI** — `obsidian:` protocol,
   `vault=MyVault`, `file=Coo/Test Card`, `overwrite=true`, content has
   heading + paragraph.
2. **paragraph card uses thread title** — `file=Coo/Explain React`.

---

## `e2e/mock/thread-delete.spec.ts` — 3 tests

`beforeEach`: goto `/`.

1. **Cancel leaves thread intact** — thread count still 1, URL `/t/:id`.
2. **only thread → landing** — URL `/`, thread count 0.
3. **one of many → adjacent thread** — URL still `/t/:id` but different;
   count 2.

---

## `e2e/live/chat-real.spec.ts` — 3 tests (real OpenAI)

1. **real thread creation**.
2. **real markdown parses correctly**.
3. **multi-turn real conversation** — 4 messages.

## `e2e/live/block-actions-real.spec.ts` — 2 tests (real OpenAI)

1. **real ELI5 transformation** — composer has non-empty result.
2. **real Translate to Chinese** — composer contains CJK characters.
