/**
 * Composer overflow behavior.
 *
 * Verifies that the composer input respects max-height constraints:
 * - Long input scrolls inside the composer (overflow-y-auto)
 * - Height capped at max-h-[300px]
 * - Send button remains visible and usable
 */

import { test, expect } from '../utils/test-fixtures';
import { resetAllMocks } from '../utils/mock-bridge';

test('Long content scrolls inside the composer; does not break layout', async ({ page }) => {
  await resetAllMocks(page);
  await page.goto('/');

  const composerInput = page.locator('[aria-label="Prompt"]');
  await composerInput.waitFor({ state: 'visible', timeout: 5000 });

  // Type ~30 lines of text via pressSequentially with newlines
  // This ensures text input and newline events fire naturally
  const longText = Array(30)
    .fill('Line of text in the composer input ')
    .map((line, i) => `${i + 1}. ${line}`)
    .join('\n');

  // Focus and set content
  await composerInput.focus();
  await page.evaluate(
    ({ text }) => {
      const el = document.querySelector('[aria-label="Prompt"]') as HTMLElement;
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
    },
    { text: longText }
  );

  // Get the composer's bounding box
  const box = await composerInput.boundingBox();
  expect(box).toBeTruthy();
  if (!box) throw new Error('Composer bounding box not found');

  // Assert: composer height is constrained
  // max-h-[300px] = 300px max-height in Tailwind. offsetHeight includes padding/borders.
  const composerHeight = await composerInput.evaluate((el) => {
    const htmlEl = el as HTMLElement;
    return htmlEl.offsetHeight;
  });
  expect(composerHeight).toBeLessThanOrEqual(320); // ~300px + small margin for borders/padding

  // Assert: composer is scrollable (scrollHeight > offsetHeight means overflow exists)
  const isScrollable = await composerInput.evaluate((el) => {
    const htmlEl = el as HTMLElement;
    return htmlEl.scrollHeight > htmlEl.offsetHeight;
  });
  expect(isScrollable).toBe(true);

  // Assert: Send button is visible and not pushed off-screen
  const sendButton = page.locator('button:has-text("Send")');
  const sendBox = await sendButton.boundingBox();
  expect(sendBox).toBeTruthy();
  if (!sendBox) throw new Error('Send button not found');
  const viewportHeight = page.viewportSize()?.height || 800;
  expect(sendBox.y).toBeGreaterThan(0); // Button is not above viewport
  expect(sendBox.y).toBeLessThan(viewportHeight); // Button is within viewport
});
