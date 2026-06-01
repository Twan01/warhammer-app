/**
 * Phase 111 — FR-04: LocaleToggle component tests.
 *
 * Tests EN/FR pill toggle component behavior:
 * - Expanded mode renders both EN and FR buttons
 * - Active locale button has secondary variant
 * - Clicking inactive locale calls setLocale and invalidateQueries
 * - Collapsed mode renders single button with tooltip
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mock useLocaleStore
// ---------------------------------------------------------------------------

const mockSetLocale = vi.fn();
let mockLocale = "en";

vi.mock("@/stores/localeStore", () => ({
  useLocaleStore: () => ({
    locale: mockLocale,
    setLocale: mockSetLocale,
  }),
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
  mockSetLocale.mockReset();
  mockInvalidateQueries.mockReset();
  mockLocale = "en";
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

  it("calls setLocale and invalidateQueries when clicking inactive locale", () => {
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );
    fireEvent.click(getByText("FR"));
    expect(mockSetLocale).toHaveBeenCalledWith("fr");
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
  });

  it("does not call setLocale when clicking already-active locale", () => {
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );
    fireEvent.click(getByText("EN"));
    expect(mockSetLocale).not.toHaveBeenCalled();
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

  it("toggles locale when clicking collapsed button", () => {
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: true }),
    );
    fireEvent.click(getByText("EN"));
    expect(mockSetLocale).toHaveBeenCalledWith("fr");
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
  });
});
