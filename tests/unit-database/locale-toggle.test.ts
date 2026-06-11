/**
 * Phase 122 — LocaleToggle component tests (migrated from Zustand to app_settings).
 *
 * Tests EN/FR pill toggle component behavior:
 * - Expanded mode renders both EN and FR buttons
 * - Active locale button has secondary variant
 * - Clicking inactive locale calls useUpdateSetting.mutate and invalidateQueries
 * - Collapsed mode renders single button with tooltip
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";

// Override the global LocaleToggle mock from setup.ts — this file tests the real component
vi.unmock("@/components/common/LocaleToggle");

// ---------------------------------------------------------------------------
// Mock useAppSettings + useUpdateSetting
// ---------------------------------------------------------------------------

const mockMutate = vi.fn();
let mockSettings: Record<string, string> = {};

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(() => ({
    data: mockSettings,
    isLoading: false,
    isError: false,
  })),
  useUpdateSetting: vi.fn(() => ({ mutate: mockMutate })),
}));

// ---------------------------------------------------------------------------
// Mock useQueryClient
// ---------------------------------------------------------------------------

const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

// ---------------------------------------------------------------------------
// Mock shadcn/ui primitives used in the component
// ---------------------------------------------------------------------------

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    ...rest
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    [key: string]: unknown;
  }) =>
    React.createElement(
      "button",
      { onClick, "data-variant": variant, ...rest },
      children,
    ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  TooltipTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => {
    void asChild;
    return React.createElement(React.Fragment, null, children);
  },
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", { "data-tooltip": true }, children),
}));

// ---------------------------------------------------------------------------
// Import component under test after mocks
// ---------------------------------------------------------------------------

import { LocaleToggle } from "@/components/common/LocaleToggle";

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockMutate.mockReset();
  mockInvalidateQueries.mockReset();
  mockSettings = { locale: "en" };
});

// ---------------------------------------------------------------------------
// Tests — expanded mode
// ---------------------------------------------------------------------------

describe("LocaleToggle (expanded)", () => {
  it("renders EN and FR buttons in expanded mode", () => {
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );
    expect(getByText("EN")).toBeTruthy();
    expect(getByText("FR")).toBeTruthy();
  });

  it("highlights active locale button with secondary variant", () => {
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );
    const enButton = getByText("EN").closest("button");
    const frButton = getByText("FR").closest("button");
    expect(enButton?.getAttribute("data-variant")).toBe("secondary");
    expect(frButton?.getAttribute("data-variant")).toBe("ghost");
  });

  it("calls useUpdateSetting.mutate when clicking inactive locale", () => {
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );
    fireEvent.click(getByText("FR"));
    expect(mockMutate).toHaveBeenCalledWith(
      { key: "locale", value: "fr" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("invalidates 7 query keys on successful locale change", () => {
    // Simulate onSuccess callback
    mockMutate.mockImplementation((_data: unknown, opts: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });

    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );
    fireEvent.click(getByText("FR"));
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(7);
  });

  it("does not call mutate when clicking already-active locale", () => {
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );
    fireEvent.click(getByText("EN"));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — collapsed mode
// ---------------------------------------------------------------------------

describe("LocaleToggle (collapsed)", () => {
  it("renders single button with tooltip in collapsed mode", () => {
    const { getByText, queryByText } = render(
      React.createElement(LocaleToggle, { collapsed: true }),
    );
    // Active locale code visible
    expect(getByText("EN")).toBeTruthy();
    // Tooltip content present (rendered by our mock)
    expect(getByText("Switch to French")).toBeTruthy();
    // FR button not present as a separate element
    expect(queryByText("FR")).toBeFalsy();
  });

  it("calls mutate when clicking collapsed button", () => {
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: true }),
    );
    fireEvent.click(getByText("EN"));
    expect(mockMutate).toHaveBeenCalledWith(
      { key: "locale", value: "fr" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
