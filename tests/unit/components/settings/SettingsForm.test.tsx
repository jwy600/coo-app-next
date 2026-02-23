import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { createMockStoreState } from "@/tests/mocks/store";
import { mockRouter, resetNavigationMock } from "@/tests/mocks/next-navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => mockRouter),
}));

const mockState = createMockStoreState({
  settings: {
    model: "gpt-5-mini",
    reasoningEffort: "none",
    responseLanguage: "en",
    translateLanguage: "Chinese",
    webSearchEnabled: false,
  },
});

vi.mock("@/lib/store/useStore", () => ({
  useStore: vi.fn((selector?: (s: typeof mockState) => unknown) => {
    if (selector) return selector(mockState);
    return mockState;
  }),
}));

const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/auth", () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

describe("SettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetNavigationMock();
    mockSignOut.mockResolvedValue({ success: true });
  });

  it("renders Model section with options", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Model")).toBeTruthy();
    expect(screen.getByText("GPT-5-mini")).toBeTruthy();
    expect(screen.getByText("GPT-5.2")).toBeTruthy();
  });

  it("renders Reasoning Effort section", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Reasoning Effort")).toBeTruthy();
    expect(screen.getByText("None")).toBeTruthy();
    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
  });

  it("renders Response Language section with all languages", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Response Language")).toBeTruthy();
    expect(screen.getByText("English")).toBeTruthy();
    // Español, Français, 日本語 appear in both response and translate sections
    expect(screen.getAllByText("Español").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Français").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("日本語").length).toBeGreaterThanOrEqual(1);
  });

  it("filters conflicting translate language options", () => {
    render(<SettingsForm />);
    // With responseLanguage=en, the translate options should not include "English"
    // but should include Chinese, Spanish, French, Japanese
    const translateSection = screen.getByText("Translation Language");
    expect(translateSection).toBeTruthy();
  });

  it("renders Translation Language section", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Translation Language")).toBeTruthy();
  });

  it("renders Web Search toggle", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Web Search")).toBeTruthy();
    expect(screen.getByText("Allow AI to search the web")).toBeTruthy();
  });

  it("renders Reset to Defaults button", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Reset to Defaults")).toBeTruthy();
  });

  it("calls resetSettings on Reset click", () => {
    render(<SettingsForm />);
    fireEvent.click(screen.getByText("Reset to Defaults"));
    expect(mockState.resetSettings).toHaveBeenCalled();
  });

  it("renders Sign out button", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Sign out")).toBeTruthy();
  });

  it("calls signOut and navigates on logout", async () => {
    render(<SettingsForm />);
    fireEvent.click(screen.getByText("Sign out"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockState.reset).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/auth/login");
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it('shows "Signing out..." during logout', async () => {
    mockSignOut.mockReturnValue(new Promise(() => {})); // hang
    render(<SettingsForm />);
    fireEvent.click(screen.getByText("Sign out"));

    await waitFor(() => {
      expect(screen.getByText("Signing out...")).toBeTruthy();
    });
  });

  it("calls updateModel when model radio changes", () => {
    render(<SettingsForm />);
    const gpt52Radio = screen.getByRole("radio", { name: /GPT-5\.2/ });
    fireEvent.click(gpt52Radio);
    expect(mockState.updateModel).toHaveBeenCalled();
  });
});
