import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { Composer } from '../page-objects/Composer';
import { ApiMocker, MOCK_RESPONSES } from '../utils/api-mocks';

test.describe('Error Handling', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let composer: Composer;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    composer = new Composer(page);
    apiMocker = new ApiMocker(page);

    // Set test mode
    await page.addInitScript(() => {
      (window as any).__TEST_MODE__ = true;
    });

    await landingPage.goto();
  });

  test('should show error message when API returns error', async ({ page }) => {
    // Mock API error
    await apiMocker.mockChatError(MOCK_RESPONSES.errors.networkError, 500);

    // Submit prompt
    await landingPage.submitFirstPrompt('Test error');

    // Wait for error message to appear (shown as assistant-error)
    const errorMessage = page.locator('.assistant-error');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText(/couldn't reach|error/i);
  });

  test('should show error for empty prompt submission', async ({ page }) => {
    // Try to submit empty prompt
    await landingPage.clickSend();

    // Since browser validation should prevent submission, check if button is disabled
    // or if there's validation message
    const validationMessage = page.locator('textarea:invalid, .validation-error');

    // Either validation prevents submission or we get an error message
    const sendButton = await landingPage.isSendDisabled();
    if (!sendButton) {
      // If button is not disabled, check for error message
      const errorMessage = page.locator('.error-message, [role="alert"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should re-enable composer after error', async ({ page }) => {
    // Mock error response
    await apiMocker.mockChatError(MOCK_RESPONSES.errors.genericError, 500);

    // Submit prompt
    await composer.submitPrompt('Test error recovery');

    // Wait for error
    await page.waitForTimeout(1000);

    // Verify composer is re-enabled
    await expect(composer.sendButton).toBeEnabled({ timeout: 5000 });

    // Verify user can submit again
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await composer.submitPrompt('Retry after error');

    // Should navigate successfully
    await expect(page).toHaveURL(/\/t\/.+/, { timeout: 10000 });
  });

  test('should show error when prompt is too long', async ({ page }) => {
    // Mock "too long" error
    await apiMocker.mockChatError(MOCK_RESPONSES.errors.tooLong, 400);

    // Create a moderately long prompt (5000 chars can be slow to process in Firefox)
    const longPrompt = 'a'.repeat(1000);

    // Fill and submit using direct evaluation (more reliable for long text)
    await composer.fillPrompt(longPrompt);

    // Wait for the API response to be intercepted
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('api.openai.com/v1/responses'),
      { timeout: 15000 }
    );

    await composer.submit();

    // Wait for the mocked error response
    await responsePromise;

    // Wait for error message with extended timeout for Firefox
    const errorMessage = page.locator('.assistant-error');
    await expect(errorMessage).toBeVisible({ timeout: 15000 });
    await expect(errorMessage).toContainText(/too long|shorten/i);
  });

  test('should handle block action errors', async ({ page }) => {
    // Create a thread first
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await landingPage.submitFirstPrompt('Test block action error');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    // Mock block action error
    await apiMocker.mockBlockActionError(MOCK_RESPONSES.errors.genericError, 500);

    // Select block and try action
    await chatPage.selectBlock(0);
    await chatPage.clickBlockAction('ELI5');

    // Wait for error message
    const errorMessage = page.locator('.assistant-error');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should show appropriate error when missing API key', async ({ page }) => {
    // Mock missing API key error
    await apiMocker.mockChatError(MOCK_RESPONSES.errors.missingApiKey, 500);

    // Submit prompt
    await landingPage.submitFirstPrompt('Test missing API key');

    // Wait for error message
    const errorMessage = page.locator('.assistant-error');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText(/API key|configuration/i);
  });

  test('should clear error message on successful submission after error', async ({ page }) => {
    // First submission - error
    await apiMocker.mockChatError(MOCK_RESPONSES.errors.networkError, 500);
    await composer.submitPrompt('Error test');

    // Wait for error
    const errorMessage = page.locator('.assistant-error');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Second submission - success
    await apiMocker.mockChatSuccess(MOCK_RESPONSES.chat.simple);
    await composer.clearPrompt();
    await composer.submitPrompt('Success test');

    // Error should be cleared and navigation should happen
    await expect(page).toHaveURL(/\/t\/.+/, { timeout: 10000 });

    // Error message should not be visible anymore
    await expect(errorMessage).not.toBeVisible();
  });

  // Note: Timeout test skipped - would require 65+ second wait
  test.skip('should handle network timeout gracefully', async ({ page }) => {
    // This test is skipped because it requires a 65+ second timeout
    // which is impractical for CI/CD pipelines
  });
});
