# E2E Testing with Playwright

This directory contains end-to-end tests for the Coo block-based AI chat application using Playwright.

## 🎯 Current Status

**✅ Core Functionality: 100% Passing (19/19 tests)**
- All chat-basic tests passing (5/5)
- All block-actions tests passing (8/8)
- All keyboard tests passing (6/6)

**✅ Text Selection & Rewrite: 100% Passing (8/8 tests)**

**✅ Error Handling: 87.5% Passing (7/8 tests)**

**✅ Thread Navigation: 100% Passing (5/5 tests)**

**📊 Overall: 97.5% Passing (39/40 verified tests)**

See [TEST-RESULTS-SUMMARY.md](./TEST-RESULTS-SUMMARY.md) for detailed results.

## Overview

The E2E test suite automates critical user flows to ensure the application works correctly in real browsers. Tests use API mocking for fast, deterministic execution without requiring OpenAI API calls.

**Test Coverage:** 6 test files with 40 tests covering:
- ✅ Basic chat functionality (100% passing)
- ✅ Block selection and transformations (100% passing)
- ✅ Keyboard shortcuts (100% passing)
- ✅ Text selection and rewrite (100% passing)
- ✅ Error handling (87.5% passing)
- ✅ Thread navigation and persistence (100% passing)

## Quick Start

### Run All Tests
```bash
npm run test:e2e
```

**Note:** For best reliability, run tests sequentially to avoid resource contention:
```bash
npx playwright test --project=chromium --workers=1
```

### Run Tests in UI Mode (Recommended for Development)
```bash
npm run test:e2e:ui
```

### Run Tests in Debug Mode
```bash
npm run test:e2e:debug
```

### Run Specific Test File
```bash
npx playwright test chat-basic.spec.ts
```

### Run Tests in a Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Directory Structure

```
e2e/
├── README.md                     # This file
├── page-objects/                 # Page Object Models (POMs)
│   ├── LandingPage.ts           # Landing page interactions
│   ├── ChatPage.ts              # Chat/thread page interactions
│   └── Composer.ts              # Composer component interactions
├── utils/                        # Test utilities
│   └── api-mocks.ts             # API mocking utilities
├── fixtures/                     # Test data (optional)
└── tests/                        # Test specs
    ├── chat-basic.spec.ts       # P0: Basic chat functionality
    ├── block-actions.spec.ts    # P0: Block transformations
    ├── text-selection.spec.ts   # P1: Text selection & rewrite
    ├── thread-nav.spec.ts       # P1: Thread navigation
    ├── errors.spec.ts           # P2: Error handling
    └── keyboard.spec.ts         # P2: Keyboard shortcuts
```

## Key Features

### API Mocking

All tests use API mocking to avoid hitting the real OpenAI API. This provides:
- **Fast execution** (no network latency)
- **Deterministic results** (no AI variability)
- **No API costs** (no OpenAI charges)
- **Offline testing** (no internet required)

Example:
```typescript
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

const apiMocker = new ApiMocker(page);
await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
```

### Page Object Model (POM)

Tests use the Page Object Model pattern for maintainable, reusable code:

```typescript
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';

const landingPage = new LandingPage(page);
const chatPage = new ChatPage(page);

await landingPage.submitFirstPrompt('Explain React');
await chatPage.selectBlock(0);
```

### Test Mode

Tests run with `NEXT_PUBLIC_TEST_MODE=true`, which:
- Uses in-memory Zustand store instead of Supabase
- Skips external API calls
- Provides fast, isolated test execution

## Test Files

### chat-basic.spec.ts (P0)
Tests fundamental chat functionality:
- Creating new threads
- Sending messages
- Parsing markdown responses
- Multiple message exchanges

### block-actions.spec.ts (P0)
Tests block transformation features:
- Block selection
- ELI5, Translate, Expand, Example actions
- Deselection with Escape key

### text-selection.spec.ts (P1)
Tests text selection and rewrite:
- Highlighting text within blocks
- Creating selection chips
- Rewriting blocks with selections
- Undo/redo functionality

### thread-nav.spec.ts (P1)
Tests navigation and persistence:
- Navigating between threads
- Thread list updates
- State preservation across navigation

### errors.spec.ts (P2)
Tests error handling:
- API errors
- Validation errors
- Error recovery
- Missing API key scenarios

### keyboard.spec.ts (P2)
Tests keyboard shortcuts:
- Enter to submit
- Escape to deselect
- Ctrl/Cmd+Enter for text capture
- Shift+Enter for multiline input

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Feature Name', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    // Set test mode
    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await landingPage.goto();
  });

  test('should do something', async ({ page }) => {
    // Mock API response
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);

    // Perform actions
    await landingPage.submitFirstPrompt('Test prompt');

    // Verify results
    await expect(page).toHaveURL(/\/t\/.+/);
  });
});
```

### Best Practices

1. **Use Page Objects**: Don't access page elements directly in tests
2. **Mock All APIs**: Use `ApiMocker` for all API calls
3. **Wait for State**: Use `waitForResponse()`, `waitForURL()`, etc.
4. **Descriptive Names**: Test names should clearly describe what they test
5. **Independent Tests**: Each test should be able to run in isolation
6. **Clean Data**: Don't rely on data from previous tests

## Debugging Failed Tests

### View Test Report
```bash
npm run test:e2e:report
```

### Check Screenshots
Failed tests automatically capture screenshots in `test-results/`

### Watch Videos
Failed tests record videos in `test-results/`

### Use UI Mode
```bash
npm run test:e2e:ui
```
UI mode provides:
- Time-travel debugging
- Step-by-step execution
- DOM inspector
- Network activity viewer

### Debug Mode
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for step-by-step debugging

## CI/CD Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request

See `.github/workflows/e2e-tests.yml` for configuration.

### CI Environment Variables
- `NEXT_PUBLIC_TEST_MODE=true`
- `OPENAI_API_KEY=test_mock_key`
- `CI=true` (enables retries and single-worker mode)

## Configuration

See `playwright.config.ts` in the project root for:
- Test directory location
- Browsers to test (Chromium, Firefox, WebKit)
- Retry strategy (2 retries on CI, 0 locally)
- Timeout settings
- Dev server configuration

## Known Issues & Limitations

### Contenteditable Input
The prompt input uses a contenteditable div (not a textarea) to support text selection. Page objects use `evaluate()` to set text content rather than `fill()`.

### Test Mode Limitations
In test mode (with Zustand store), some features may behave differently than in production:
- No persistent storage (reloading page clears data)
- No Supabase real-time updates
- Thread list may not update without refresh

### Browser Differences
Some tests may behave differently across browsers:
- Text selection behavior varies
- Keyboard shortcuts (Cmd vs Ctrl)
- CSS rendering differences

## Troubleshooting

### Tests Timeout
- Increase timeout in playwright.config.ts
- Check if dev server is running properly
- Verify API mocks are set up correctly

### Selector Not Found
- Check if element exists in DOM
- Verify selector matches actual HTML
- Use UI mode to inspect page state

### Flaky Tests
- Add explicit waits (`waitForSelector()`)
- Increase timeout for specific assertions
- Check for race conditions in test logic

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
