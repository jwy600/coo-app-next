/**
 * Bridge between Node-side test code and browser-side mock state.
 *
 * The browser runs with window.__cooMock__, while Node tests need to read/write
 * that state. These helpers use page.evaluate to cross the realm boundary.
 */

import { Page } from '@playwright/test';
import type { MockCall, MockAction } from '../../lib/testing/mock-openai';

/**
 * Get all recorded mock calls from the browser.
 */
export async function getMockCalls(page: Page): Promise<MockCall[]> {
  return await page.evaluate(() => {
    return (window as any).__cooMock__?.calls ?? [];
  });
}

/**
 * Reset all mock state in the browser.
 */
export async function resetAllMocks(page: Page): Promise<void> {
  await page.evaluate(() => {
    if ((window as any).__cooMock__) {
      (window as any).__cooMock__.calls = [];
      (window as any).__cooMock__.failures = new Set();
      (window as any).__cooMock__.nextCallId = 1;
      (window as any).__cooMock__.responses = new Map();
      (window as any).__cooMock__.delays = new Map();
    }
  });
}

/**
 * Set a custom mock response for a specific (action, passage).
 */
export async function setMockResponse(
  page: Page,
  action: MockAction,
  passage: string,
  response: string,
): Promise<void> {
  await page.evaluate(
    ({ action, passage, response }) => {
      if (!(window as any).__cooMock__) {
        (window as any).__cooMock__ = {
          calls: [],
          failures: new Set(),
          nextCallId: 1,
          responses: new Map(),
        };
      }
      const fnv1a = (text: string): string => {
        let hash = 2166136261;
        for (let i = 0; i < text.length; i++) {
          hash ^= text.charCodeAt(i);
          hash = (hash * 16777619) >>> 0;
        }
        return hash.toString(16).padStart(8, '0');
      };
      const key = `${action}:${fnv1a(passage)}`;
      (window as any).__cooMock__.responses.set(key, response);
    },
    { action, passage, response },
  );
}

/**
 * Mark the next call of a specific action as failed.
 */
export async function mockFail(page: Page, action: MockAction): Promise<void> {
  await page.evaluate((action) => {
    if (!(window as any).__cooMock__) {
      (window as any).__cooMock__ = {
        calls: [],
        failures: new Set(),
        nextCallId: 1,
        responses: new Map(),
        delays: new Map(),
      };
    }
    (window as any).__cooMock__.failures.add(action);
  }, action);
}

/**
 * Set a delay (in ms) for a specific action's response.
 * Useful for testing race conditions (user closes/reopens editor while request is in flight).
 */
export async function setMockDelay(page: Page, action: MockAction, ms: number): Promise<void> {
  await page.evaluate(
    ({ action, ms }) => {
      if (!(window as any).__cooMock__) {
        (window as any).__cooMock__ = {
          calls: [],
          failures: new Set(),
          nextCallId: 1,
          responses: new Map(),
          delays: new Map(),
        };
      }
      if (!(window as any).__cooMock__.delays) {
        (window as any).__cooMock__.delays = new Map();
      }
      (window as any).__cooMock__.delays.set(action, ms);
    },
    { action, ms },
  );
}
