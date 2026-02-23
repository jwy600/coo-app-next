/**
 * Mock for next/navigation hooks
 */

import { vi } from 'vitest';

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export const mockSearchParams = {
  get: vi.fn().mockReturnValue(null),
  getAll: vi.fn().mockReturnValue([]),
  has: vi.fn().mockReturnValue(false),
  toString: vi.fn().mockReturnValue(''),
};

export function resetNavigationMock() {
  mockRouter.push.mockReset();
  mockRouter.replace.mockReset();
  mockRouter.refresh.mockReset();
  mockRouter.back.mockReset();
  mockRouter.forward.mockReset();
  mockRouter.prefetch.mockReset();
  mockSearchParams.get.mockReset().mockReturnValue(null);
}
