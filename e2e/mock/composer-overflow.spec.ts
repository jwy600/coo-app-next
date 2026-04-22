import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Composer Overflow and Growth', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    // Set test mode environment variable
    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await landingPage.goto();
  });

  test('composer should constrain height to max 50vh and allow scrolling', async ({ page }) => {
    // Create a thread first
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Hello');
    await expect(page).toHaveURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Get viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const maxComposerHeight = viewportHeight * 0.5; // 50vh

    // Type a very long text (multiple lines to trigger overflow)
    const longText = Array(50)
      .fill('This is a very long line of text that will make the textarea grow. ')
      .join('\n');

    await chatPage.typePrompt(longText);

    // Wait for the textarea to update
    await page.waitForTimeout(100);

    // Get composer height
    const composerHeight = await chatPage.composer.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });

    // Verify composer height doesn't exceed 50vh
    expect(composerHeight).toBeLessThanOrEqual(maxComposerHeight);

    // Get prompt input height
    const promptInputHeight = await chatPage.promptInput.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });

    // Verify prompt input has a max-height constraint (should be 300px as per our fix)
    expect(promptInputHeight).toBeLessThanOrEqual(300);

    // Verify prompt input is scrollable
    const isScrollable = await chatPage.promptInput.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    expect(isScrollable).toBe(true);

    // Verify we can scroll within the prompt input
    const initialScrollTop = await chatPage.promptInput.evaluate((el) => el.scrollTop);

    // Scroll to bottom
    await chatPage.promptInput.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    const scrolledScrollTop = await chatPage.promptInput.evaluate((el) => el.scrollTop);

    // Verify scrollTop changed (meaning scroll happened)
    expect(scrolledScrollTop).toBeGreaterThan(initialScrollTop);
  });

  test('composer should grow with content but respect max-height', async ({ page }) => {
    // Create a thread first
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Hello');
    await expect(page).toHaveURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Start with short text
    await chatPage.typePrompt('Short text');
    await page.waitForTimeout(100);

    const initialHeight = await chatPage.promptInput.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });

    // Add more text (enough to trigger growth beyond min-height)
    const mediumText = Array(10)
      .fill('This is a line of text. ')
      .join('\n');

    await chatPage.typePrompt(mediumText);
    await page.waitForTimeout(100);

    const grownHeight = await chatPage.promptInput.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });

    // Verify height increased (should be greater than min-height of 48px)
    expect(grownHeight).toBeGreaterThan(48);

    // Add A LOT more text to exceed max-height
    const veryLongText = Array(50)
      .fill('This is a very long line of text. ')
      .join('\n');

    await chatPage.typePrompt(veryLongText);
    await page.waitForTimeout(100);

    const maxedHeight = await chatPage.promptInput.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });

    // Verify height is capped at max-height (300px)
    expect(maxedHeight).toBeLessThanOrEqual(300);
  });

  test('composer with block controls should not exceed 50vh', async ({ page }) => {
    // Create a thread first
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Hello');
    await expect(page).toHaveURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Select a block to show block controls
    await chatPage.selectBlock(0);

    // Verify block controls are visible
    const controlsVisible = await chatPage.areBlockControlsVisible();
    expect(controlsVisible).toBe(true);

    // Type a very long text
    const longText = Array(50)
      .fill('This is a very long line of text that will make the textarea grow. ')
      .join('\n');

    await chatPage.typePrompt(longText);
    await page.waitForTimeout(100);

    // Get viewport height
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const maxComposerHeight = viewportHeight * 0.5; // 50vh

    // Get composer height (including block controls)
    const composerHeight = await chatPage.composer.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });

    // Verify composer height doesn't exceed 50vh even with block controls
    expect(composerHeight).toBeLessThanOrEqual(maxComposerHeight);

    // Verify the prompt input (not the composer form) is scrollable
    const promptInputScrollable = await chatPage.promptInput.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });

    // The prompt input should be scrollable when it has lots of text
    expect(promptInputScrollable).toBe(true);

    // Verify the composer form itself does NOT have overflow-y-auto (no double scrollbar)
    const composerOverflowY = await chatPage.composer.evaluate((el) => {
      return window.getComputedStyle(el).overflowY;
    });

    // The composer should not have overflow-y: auto or scroll (no scrollbar)
    // It may have 'visible' (default) or 'hidden', but not 'auto' or 'scroll'
    expect(['visible', 'hidden']).toContain(composerOverflowY);
  });
});
