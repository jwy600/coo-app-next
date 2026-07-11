# E2E Testing with Playwright

End-to-end tests for Coo. Two suites:

- **`e2e/mock/`** — default. Intercepts OpenAI Responses API calls at the HTTP
  boundary; no network, no API key, runs in parallel across Chromium, Firefox,
  WebKit.
- **`e2e/live/`** — opt-in smoke tests that hit real OpenAI. Runs only when
  `TEST_MODE=live` is set; sequential, single browser, higher timeouts.

## Quick start

```bash
npm run test:e2e              # mock suite
npm run test:e2e:ui           # mock suite in UI mode
npm run test:e2e:debug        # mock suite in debug mode
npm run test:e2e:report       # view last HTML report
TEST_MODE=live npm run test:e2e   # real OpenAI API
```

Run a single file:
```bash
npx playwright test chat-basic --project=chromium
```

## Directory layout

```
e2e/
├── README.md
├── mock/                       # Mocked API specs (default)
│   ├── chat-basic.spec.ts
│   ├── block-actions.spec.ts
│   ├── block-selection.spec.ts
│   ├── card-mode.spec.ts
│   ├── direct-edit.spec.ts
│   ├── text-selection.spec.ts
│   ├── thread-nav.spec.ts
│   ├── composer-overflow.spec.ts
│   ├── keyboard.spec.ts
│   └── errors.spec.ts
├── live/                       # Real-API smoke specs (opt-in)
│   ├── chat-real.spec.ts
│   └── block-actions-real.spec.ts
├── page-objects/               # Page Object Models
│   ├── LandingPage.ts
│   ├── ChatPage.ts             # Façade — composes the POMs below
│   ├── BlockActionsPO.ts       # ELI5/Translate/Expand/Example/Ask
│   ├── SelectionPO.ts          # Composer text selection + rewrite/undo
│   ├── CardModePO.ts           # Double-click gutter → card
│   ├── EditModePO.ts           # Ask/Edit toggle, Replace
│   ├── ExportDialogPO.ts       # Export Card dialog
│   ├── SettingsSheetPO.ts      # Settings sheet (API key, model, prompt)
│   ├── ApiKeyBannerPO.ts       # Sticky "add API key" banner
│   ├── SidebarPO.ts            # Thread list + delete
│   └── Composer.ts             # Standalone composer helper
└── utils/
    ├── test-fixtures.ts        # Playwright fixture: seeds API key + test mode
    └── api-mocks.ts            # ApiMocker + MOCK_RESPONSES
```

## Test fixture

`e2e/utils/test-fixtures.ts` extends `@playwright/test` with a `page` fixture
that, on every test, does one `page.addInitScript` to:

1. Flip the app into test mode (`window.__TEST_MODE__ = true`), so the store
   persists to `coo-test-storage` instead of `coo-storage`.
2. Pre-seed `settings.apiKey` into that storage so the composer enables
   without any Settings interaction.

**Do not** duplicate this init in individual specs — the fixture handles it.

In live mode (`TEST_MODE=live`) the fixture seeds the real `coo-storage` key
with `process.env.OPENAI_API_KEY`.

## Page Object Model

Tests talk to the app through POMs. Prefer the focused sub-POMs on
`ChatPage` over generic method names:

```ts
await chatPage.selection.selectInComposer('component-based');
await chatPage.cards.createCard(0);
await chatPage.editMode.clickEdit();
await chatPage.exportDialog.confirm('My Note');
```

`ChatPage` also exposes legacy façade methods (`selectTextInComposer`,
`createCard`, `clickEditMode`, `confirmExport`, …) that delegate to the
sub-POM, so older specs continue to work.

## Mocking OpenAI

All mock-suite tests intercept `https://api.openai.com/v1/responses`:

```ts
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

const apiMocker = new ApiMocker(page);
await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
await apiMocker.mockAllBlockActions();
```

Additional helpers for features added after the initial suite:

- `mockTitleGeneration(title)` — background thread-title gen (`gpt-5.6-luna`).
- `captureResponseRequests()` — records every Responses API request body so
  you can assert ask-chain `previous_response_id` threading.
- `captureObsidianUri()` + `readCapturedObsidianUris()` — patches
  `HTMLAnchorElement.prototype.click` so `obsidian://new?…` navigations land
  in `window.__OBSIDIAN_URIS__` instead of the browser's protocol handler.

## Writing a new spec

```ts
import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Feature X', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);
    await landingPage.goto();
  });

  test('does the thing', async ({ page }) => {
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Explain React');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
    // ...
  });
});
```

### Conventions

- Use POMs — don't reach into DOM selectors from tests.
- Use semantic waits (`waitForResponse`, `waitForURL`, `expect.poll`) over
  `waitForTimeout`.
- One thing per test. Independent tests.

## Known quirks

- **Contenteditable composer.** `div#prompt` is contenteditable, not a
  `<textarea>`. POMs use `pressSequentially` for short text and direct
  `textContent` assignment for long text.
- **Gutter click delay.** Gutter single-click has a 200ms delay to
  disambiguate from the card-creating double-click — `selectBlock` accounts
  for this.
- **WebKit pointer interception.** `clickCardClear` / `clickCardExport` use
  `dispatchEvent('click')` because WebKit intermittently reports the button
  as overlapped.
- **Auto title generation is skipped in test mode.** `lib/api/generateThreadTitle.ts`
  returns `null` when `window.__TEST_MODE__` is set. Specs that exercise the
  title flow must opt out explicitly.

## CI

The GitHub Actions workflow is currently disabled (see commit
`chore: disable E2E workflow on GitHub CI`). Re-enable once Phase 4
stability work lands.

## References

- [Playwright docs](https://playwright.dev/docs/intro)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
