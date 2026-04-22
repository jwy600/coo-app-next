import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import React from "react";

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

// Stub SettingsForm and SettingsFooter
vi.mock("@/components/settings/SettingsForm", () => ({
  SettingsForm: () =>
    React.createElement("div", { "data-testid": "settings-form" }, "Form"),
  SettingsFooter: () =>
    React.createElement("div", { "data-testid": "settings-footer" }, "Footer"),
}));

describe("SettingsSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Settings button", () => {
    render(<SettingsSheet />);
    expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("settings-btn")).toBeTruthy();
  });

  it("renders sheet content with SettingsForm", () => {
    render(<SettingsSheet />);
    expect(screen.getByTestId("settings-form")).toBeTruthy();
  });

  it("renders description text mentioning API key", () => {
    render(<SettingsSheet />);
    expect(screen.getByText(/API key/i)).toBeTruthy();
  });
});
