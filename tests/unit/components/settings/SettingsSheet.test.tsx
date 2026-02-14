import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import React from "react";

// Hoist mock data
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    user: null as unknown,
    isLoading: false,
    isAuthenticated: true,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => mockAuth),
}));

// Stub sidebar components
vi.mock("@/components/ui/sidebar", () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) =>
    React.createElement("ul", null, children),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) =>
    React.createElement("li", null, children),
  SidebarMenuButton: ({
    children,
    disabled,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
  }) =>
    React.createElement(
      "button",
      { disabled, "data-testid": "settings-btn" },
      children,
    ),
}));

// Stub sheet components
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "sheet" }, children),
  SheetContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "sheet-content" }, children),
  SheetHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  SheetTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement("h2", null, children),
  SheetDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", null, children),
  SheetTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) =>
    React.createElement("div", { "data-testid": "sheet-trigger" }, children),
}));

// Stub scroll area
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

// Stub SettingsForm
vi.mock("@/components/settings/SettingsForm", () => ({
  SettingsForm: () =>
    React.createElement("div", { "data-testid": "settings-form" }, "Form"),
}));

describe("SettingsSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading = false;
  });

  it("renders Settings button", () => {
    render(<SettingsSheet />);
    // "Settings" appears in both button text and SheetTitle
    expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("settings-btn")).toBeTruthy();
  });

  it("renders sheet content with SettingsForm", () => {
    render(<SettingsSheet />);
    expect(screen.getByTestId("settings-form")).toBeTruthy();
  });

  it("renders description text", () => {
    render(<SettingsSheet />);
    expect(screen.getByText(/Configure model/)).toBeTruthy();
  });

  it("disables button when not authenticated", () => {
    mockAuth.isAuthenticated = false;
    render(<SettingsSheet />);
    const btn = screen.getByTestId("settings-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("disables button while loading", () => {
    mockAuth.isLoading = true;
    render(<SettingsSheet />);
    const btn = screen.getByTestId("settings-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("enables button when authenticated", () => {
    render(<SettingsSheet />);
    const btn = screen.getByTestId("settings-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
