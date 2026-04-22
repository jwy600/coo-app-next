import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { ApiMocker } from '../utils/api-mocks';

/**
 * Auto-populated filename in the Export Card dialog.
 * Feature: lib/export/defaultCardTitle.ts — the dialog's default title is
 *   - heading card  → `{heading} - {threadTitle}`
 *   - non-heading   → `{threadTitle}`
 * and user edits must not be clobbered if the active thread title updates
 * while the dialog is open.
 */

const CARD_RESPONSE = {
  text: `## Introduction

This is the first paragraph under the introduction.

This is the second paragraph under the introduction.

## Details

This is the first paragraph under details.`,
};

const PROMPT = 'Explain React';

test.describe('Export Card Dialog - auto-populated filename', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    apiMocker = new ApiMocker(page);

    await landingPage.goto();
    await apiMocker.mockChatSuccess(CARD_RESPONSE);
    await landingPage.submitFirstPrompt(PROMPT);
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  });

  test('defaults to thread title when card is anchored on a paragraph', async () => {
    // Block 1 = first paragraph under "Introduction" (not a heading)
    await chatPage.cards.createCard(1);
    await chatPage.cards.clickExport(0);

    expect(await chatPage.exportDialog.isOpen()).toBe(true);
    expect(await chatPage.exportDialog.getTitleValue()).toBe(PROMPT);
  });

  test('prefixes heading text when card is anchored on a heading', async () => {
    // Block 0 = "## Introduction"
    await chatPage.cards.createCard(0);
    await chatPage.cards.clickExport(0);

    expect(await chatPage.exportDialog.isOpen()).toBe(true);
    expect(await chatPage.exportDialog.getTitleValue()).toBe(
      `Introduction - ${PROMPT}`,
    );
  });

  test('uses the matching heading when a different heading card is exported', async () => {
    // Create two heading-anchored cards and export the second one (Details).
    // The dialog opens per-card, so the default reflects that card's anchor.
    await chatPage.cards.createCard(0); // Introduction
    await chatPage.cards.createCard(3); // Details
    expect(await chatPage.cards.getCardCount()).toBe(2);

    // Export the Details card (second one in document order → cardIndex 1)
    await chatPage.cards.clickExport(1);

    expect(await chatPage.exportDialog.isOpen()).toBe(true);
    expect(await chatPage.exportDialog.getTitleValue()).toBe(
      `Details - ${PROMPT}`,
    );
  });

  test('user edits to the filename are preserved after export', async ({
    page,
  }) => {
    await chatPage.cards.createCard(0);
    await chatPage.cards.clickExport(0);

    const customTitle = 'My Custom Name';
    const downloadPromise = page.waitForEvent('download');
    await chatPage.exportDialog.confirm(customTitle);

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${customTitle}.md`);
    await expect(chatPage.exportDialog.dialog).not.toBeVisible();
  });

  test('cancelling the dialog discards the auto-populated default', async () => {
    await chatPage.cards.createCard(0);
    await chatPage.cards.clickExport(0);

    const initial = await chatPage.exportDialog.getTitleValue();
    expect(initial).toBe(`Introduction - ${PROMPT}`);

    await chatPage.exportDialog.cancel();
    await expect(chatPage.exportDialog.dialog).not.toBeVisible();

    // Card still exists — cancelling doesn't remove it.
    expect(await chatPage.cards.getCardCount()).toBe(1);
  });

  test('truncates heading text longer than 80 characters', async ({
    page,
  }) => {
    const longHeading =
      'This is a very long heading that exceeds the eighty character limit set in defaultCardTitle';
    expect(longHeading.length).toBeGreaterThan(80);

    // Re-create the thread with a long-heading response.
    await page.goto('/');
    await apiMocker.mockChatSuccess({
      text: `## ${longHeading}\n\nA paragraph under the long heading.`,
    });
    await landingPage.submitFirstPrompt('long heading thread');
    await page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();

    await chatPage.cards.createCard(0);
    await chatPage.cards.clickExport(0);

    const title = await chatPage.exportDialog.getTitleValue();
    const [headingPart] = title.split(' - ');
    expect(headingPart.length).toBeLessThanOrEqual(80);
    expect(longHeading.startsWith(headingPart)).toBe(true);
    expect(title.endsWith(' - long heading thread')).toBe(true);
  });

  test('re-opening the dialog re-reads the default from current state', async () => {
    await chatPage.cards.createCard(0);

    // First open: see the default.
    await chatPage.cards.clickExport(0);
    expect(await chatPage.exportDialog.getTitleValue()).toBe(
      `Introduction - ${PROMPT}`,
    );

    // Tweak the input, then cancel.
    await chatPage.exportDialog.setTitle('Temporary');
    await chatPage.exportDialog.cancel();

    // Re-open: the useEffect([open]) hook resets title to the default again.
    await chatPage.cards.clickExport(0);
    expect(await chatPage.exportDialog.getTitleValue()).toBe(
      `Introduction - ${PROMPT}`,
    );
  });
});
