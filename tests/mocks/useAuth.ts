/**
 * Mock for useAuth hook
 * Use in unit tests to control auth state
 */

import { vi } from 'vitest';

export const mockUseAuth = {
  user: null as { id: string; email: string } | null,
  isLoading: false,
  isAuthenticated: false,
};

/**
 * Set mock to authenticated state
 */
export const setAuthenticated = (email = 'test@example.com') => {
  mockUseAuth.user = { id: 'test-user-id', email };
  mockUseAuth.isLoading = false;
  mockUseAuth.isAuthenticated = true;
};

/**
 * Set mock to unauthenticated state
 */
export const setUnauthenticated = () => {
  mockUseAuth.user = null;
  mockUseAuth.isLoading = false;
  mockUseAuth.isAuthenticated = false;
};

/**
 * Set mock to loading state
 */
export const setLoading = () => {
  mockUseAuth.user = null;
  mockUseAuth.isLoading = true;
  mockUseAuth.isAuthenticated = false;
};

/**
 * Reset mock to default (unauthenticated)
 */
export const resetAuthMock = () => {
  setUnauthenticated();
};

/**
 * Create the mock implementation
 * Call this in your test setup: vi.mock('@/hooks/useAuth', () => createUseAuthMock())
 */
export const createUseAuthMock = () => ({
  useAuth: vi.fn(() => mockUseAuth),
});
