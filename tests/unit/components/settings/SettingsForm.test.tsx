import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsForm, SettingsFooter } from "@/components/settings/SettingsForm";
import { createMockStoreState } from "@/tests/mocks/store";

const mockState = createMockStoreState({
  settings: {
    apiKey: "",
    model: "gpt-5.6-luna",
    reasoningEffort: "none",
    responseLanguage: "en",
    translateLanguage: "Chinese",
    webSearchEnabled: false,
    exportDestination: "local",
    obsidianVaultName: "",
  },
});

vi.mock("@/lib/store/useStore", () => ({
  useStore: vi.fn((selector?: (s: typeof mockState) => unknown) => {
    if (selector) return selector(mockState);
    return mockState;
  }),
}));

describe("SettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders OpenAI API Key input", () => {
    render(<SettingsForm />);
    expect(screen.getByLabelText(/OpenAI API Key/i)).toBeTruthy();
  });

  it("calls updateApiKey when API key input changes", () => {
    render(<SettingsForm />);
    const input = screen.getByLabelText(/OpenAI API Key/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "sk-test-123" } });
    expect(mockState.updateApiKey).toHaveBeenCalledWith("sk-test-123");
  });

  it("renders Model section with options", () => {
    render(<SettingsForm />);
    expect(screen.getAllByText("Model").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("GPT-5.6 Luna")).toBeTruthy();
    expect(screen.getByText("GPT-5.6 Terra")).toBeTruthy();
  });

  it("renders Reasoning section", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Reasoning")).toBeTruthy();
    expect(screen.getByText("None")).toBeTruthy();
    expect(screen.getByText("Low")).toBeTruthy();
    expect(screen.getByText("Medium")).toBeTruthy();
    expect(screen.getByText("High")).toBeTruthy();
  });

  it("renders Response Language section", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Response Language")).toBeTruthy();
  });

  it("renders Translation Language section", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Translation Language")).toBeTruthy();
  });

  it("renders Web Search buttons", () => {
    render(<SettingsForm />);
    expect(screen.getByText("Web Search")).toBeTruthy();
    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.getByText("On")).toBeTruthy();
  });

  it("calls updateModel when model button is clicked", () => {
    render(<SettingsForm />);
    fireEvent.click(screen.getByText("GPT-5.6 Terra"));
    expect(mockState.updateModel).toHaveBeenCalled();
  });
});

describe("SettingsFooter", () => {
  const onSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.settings.apiKey = "";
  });

  it("renders Reset to Defaults button", () => {
    render(<SettingsFooter onSave={onSave} />);
    expect(screen.getByText("Reset to Defaults")).toBeTruthy();
  });

  it("calls resetSettings on Reset click", () => {
    render(<SettingsFooter onSave={onSave} />);
    fireEvent.click(screen.getByText("Reset to Defaults"));
    expect(mockState.resetSettings).toHaveBeenCalled();
  });

  it("disables Save while the API key is empty", () => {
    render(<SettingsFooter onSave={onSave} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("enables Save and calls onSave once the API key is filled", () => {
    mockState.settings.apiKey = "sk-test-123";
    render(<SettingsFooter onSave={onSave} />);
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
