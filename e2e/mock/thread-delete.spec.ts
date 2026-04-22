import { test, expect } from '../utils/test-fixtures';
import { LandingPage } from '../page-objects/LandingPage';
import { ChatPage } from '../page-objects/ChatPage';
import { SidebarPO } from '../page-objects/SidebarPO';
import { ApiMocker } from '../utils/api-mocks';

/**
 * Thread deletion — covers components/chat/DeleteThreadButton.tsx.
 *
 * Confirms the AlertDialog, sidebar removal, and the navigate-to-adjacent-
 * thread-or-home fallback.
 */

async function seedThreads(
  chatPage: ChatPage,
  landingPage: LandingPage,
  apiMocker: ApiMocker,
  prompts: string[],
): Promise<void> {
  for (let i = 0; i < prompts.length; i++) {
    await apiMocker.mockChatSuccess({
      text: `Response ${i + 1} to "${prompts[i]}".`,
    });
    if (i === 0) {
      await landingPage.submitFirstPrompt(prompts[i]);
    } else {
      await chatPage.goToLanding();
      await landingPage.submitFirstPrompt(prompts[i]);
    }
    await chatPage.page.waitForURL(/\/t\/.+/);
    await chatPage.waitForResponse();
  }
}

test.describe('Thread deletion', () => {
  let landingPage: LandingPage;
  let chatPage: ChatPage;
  let sidebar: SidebarPO;
  let apiMocker: ApiMocker;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    chatPage = new ChatPage(page);
    sidebar = new SidebarPO(page);
    apiMocker = new ApiMocker(page);

    await landingPage.goto();
  });

  test('cancelling the confirm dialog leaves the thread in place', async ({
    page,
  }) => {
    await seedThreads(chatPage, landingPage, apiMocker, ['First thread']);
    expect(await sidebar.getThreadCount()).toBe(1);

    await sidebar.cancelDeleteActiveThread();

    expect(await sidebar.getThreadCount()).toBe(1);
    await expect(page).toHaveURL(/\/t\/.+/);
  });

  test('deleting the only thread redirects to landing', async ({ page }) => {
    await seedThreads(chatPage, landingPage, apiMocker, ['Only thread']);
    expect(await sidebar.getThreadCount()).toBe(1);

    await sidebar.deleteActiveThread();

    await expect(page).toHaveURL(/\/$/);
    expect(await sidebar.getThreadCount()).toBe(0);
  });

  test('deleting one of many threads navigates to an adjacent thread', async ({
    page,
  }) => {
    await seedThreads(chatPage, landingPage, apiMocker, [
      'Thread A',
      'Thread B',
      'Thread C',
    ]);
    expect(await sidebar.getThreadCount()).toBe(3);

    // Active thread is the last one created (Thread C). Deletion should
    // leave us on one of the surviving threads, not the landing page.
    const activeUrlBefore = page.url();
    await sidebar.deleteActiveThread();

    const activeUrlAfter = page.url();
    expect(activeUrlAfter).toMatch(/\/t\/.+/);
    expect(activeUrlAfter).not.toBe(activeUrlBefore);
    expect(await sidebar.getThreadCount()).toBe(2);
  });
});
