import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  mockRouter,
  mockSearchParams,
  resetNavigationMock,
} from "@/tests/mocks/next-navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => mockRouter),
  useSearchParams: vi.fn(() => mockSearchParams),
}));

const mockSignIn = vi.fn();
vi.mock("@/lib/supabase/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNavigationMock();
    mockSignIn.mockResolvedValue({ success: true });
  });

  it("renders email and password inputs", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("renders sign in button", () => {
    render(<LoginForm />);
    const submitBtn = screen.getByRole("button", { name: "Sign in" });
    expect(submitBtn).toBeTruthy();
    expect(submitBtn.getAttribute("type")).toBe("submit");
  });

  it("renders card title and description", () => {
    render(<LoginForm />);
    expect(screen.getAllByText("Sign in").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Enter your email and password/)).toBeTruthy();
  });

  describe("form submission", () => {
    it("calls signIn with email and password on submit", async () => {
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "password123" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith(
          "test@example.com",
          "password123",
        );
      });
    });

    it('shows "Signing in..." during submission', async () => {
      // Make signIn hang
      mockSignIn.mockReturnValue(new Promise(() => {}));
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "pass" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(screen.getByText("Signing in...")).toBeTruthy();
      });
    });

    it("navigates to redirect path on success", async () => {
      mockSearchParams.get.mockReturnValue("/t/thread-123");
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "pass" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith("/t/thread-123");
      });
    });

    it("calls router.refresh() before push on success", async () => {
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "pass" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(mockRouter.refresh).toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith("/");
      });
    });

    it("shows error message on failed sign in", async () => {
      mockSignIn.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "wrong" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(screen.getByText("Invalid credentials")).toBeTruthy();
      });
    });
  });

  describe("redirect validation", () => {
    it("accepts valid relative path: /t/abc-123", async () => {
      mockSearchParams.get.mockReturnValue("/t/abc-123");
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "a@b.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "p" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith("/t/abc-123");
      });
    });

    it("rejects absolute URL: https://evil.com", async () => {
      mockSearchParams.get.mockReturnValue("https://evil.com");
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "a@b.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "p" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith("/");
      });
    });

    it("rejects protocol-relative URL: //evil.com", async () => {
      mockSearchParams.get.mockReturnValue("//evil.com");
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "a@b.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "p" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith("/");
      });
    });

    it('defaults to "/" when no redirect param', async () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<LoginForm />);
      fireEvent.change(screen.getByLabelText("Email"), {
        target: { value: "a@b.com" },
      });
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "p" },
      });
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign in" }).closest("form")!,
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith("/");
      });
    });
  });
});
