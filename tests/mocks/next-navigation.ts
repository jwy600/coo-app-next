/**
 * Mock for next/navigation hooks
 * Use: vi.mock('next/navigation', () => createNavigationMock())
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

export let mockParams: Record<string, string> = {};

export function setParams(params: Record<string, string>) {
  mockParams = params;
}

export function resetNavigationMock() {
  mockRouter.push.mockReset();
  mockRouter.replace.mockReset();
  mockRouter.refresh.mockReset();
  mockRouter.back.mockReset();
  mockRouter.forward.mockReset();
  mockRouter.prefetch.mockReset();
  mockSearchParams.get.mockReset().mockReturnValue(null);
  mockParams = {};
}

export const createNavigationMock = () => ({
  useRouter: vi.fn(() => mockRouter),
  useSearchParams: vi.fn(() => mockSearchParams),
  useParams: vi.fn(() => mockParams),
  usePathname: vi.fn(() => '/'),
});
