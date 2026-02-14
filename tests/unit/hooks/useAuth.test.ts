import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Hoist mocks
const { mockGetSupabaseClient, mockGetUser, mockOnAuthStateChange } =
  vi.hoisted(() => ({
    mockGetSupabaseClient: vi.fn(),
    mockGetUser: vi.fn(),
    mockOnAuthStateChange: vi.fn(),
  }));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: mockGetSupabaseClient,
}));

describe("useAuth", () => {
  const originalEnv = process.env.NEXT_PUBLIC_TEST_MODE;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_TEST_MODE;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_TEST_MODE = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_TEST_MODE;
    }
  });

  it("returns test user in test mode", async () => {
    process.env.NEXT_PUBLIC_TEST_MODE = "true";

    const { useAuth } = await import("@/hooks/useAuth");
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(
      expect.objectContaining({
        id: "test-user-id",
        email: "test@example.com",
      }),
    );
    expect(result.current.isAuthenticated).toBe(true);
    // Should not call Supabase
    expect(mockGetSupabaseClient).not.toHaveBeenCalled();
  });

  it("returns not authenticated when no Supabase client", async () => {
    mockGetSupabaseClient.mockReturnValue(null);

    const { useAuth } = await import("@/hooks/useAuth");
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("loads user from Supabase on mount", async () => {
    const mockUser = { id: "user-1", email: "user@test.com" };
    const unsubscribe = vi.fn();

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
      },
    });

    const { useAuth } = await import("@/hooks/useAuth");
    const { result } = renderHook(() => useAuth());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("subscribes to auth state changes", async () => {
    const unsubscribe = vi.fn();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
      },
    });

    const { useAuth } = await import("@/hooks/useAuth");
    renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
  });

  it("unsubscribes on unmount", async () => {
    const unsubscribe = vi.fn();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
      },
    });

    const { useAuth } = await import("@/hooks/useAuth");
    const { unmount } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("updates user when auth state changes", async () => {
    const unsubscribe = vi.fn();
    let authCallback: (event: string, session: unknown) => void = () => {};

    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
      },
    });

    const { useAuth } = await import("@/hooks/useAuth");
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();

    // Simulate sign-in
    const newUser = { id: "user-2", email: "new@test.com" };
    await waitFor(() => {
      authCallback("SIGNED_IN", { user: newUser });
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(newUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it("sets user to null when session is null (sign out)", async () => {
    const mockUser = { id: "user-1", email: "user@test.com" };
    const unsubscribe = vi.fn();
    let authCallback: (event: string, session: unknown) => void = () => {};

    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockOnAuthStateChange.mockImplementation((cb) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    mockGetSupabaseClient.mockReturnValue({
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
      },
    });

    const { useAuth } = await import("@/hooks/useAuth");
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Simulate sign-out (null session)
    await waitFor(() => {
      authCallback("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });

    expect(result.current.isAuthenticated).toBe(false);
  });
});
