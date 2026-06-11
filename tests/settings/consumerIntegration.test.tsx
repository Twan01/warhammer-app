/**
 * Phase 122 Plan 02 — Consumer integration tests.
 *
 * Tests the wiring between app_settings and downstream consumers:
 * - useArmyReadinessTarget reads from app_settings with session override
 * - LocaleToggle renders current locale from settings
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// ---------------------------------------------------------------------------
// Mock useAppSettings
// ---------------------------------------------------------------------------

const mockMutate = vi.fn();
let mockSettingsData: Record<string, string> = {};

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(() => ({
    data: mockSettingsData,
    isLoading: false,
    isError: false,
  })),
  useUpdateSetting: vi.fn(() => ({ mutate: mockMutate })),
}));

// Override the global LocaleToggle mock from setup.ts — we test the real component here
vi.unmock("@/components/common/LocaleToggle");

// ---------------------------------------------------------------------------
// Mock useQueryClient for LocaleToggle
// ---------------------------------------------------------------------------

const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
  })),
  useMutation: vi.fn(() => ({ mutate: mockMutate })),
}));

// ---------------------------------------------------------------------------
// Mock shadcn/ui primitives for LocaleToggle
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
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => React.createElement(React.Fragment, null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", { "data-tooltip": true }, children),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { useArmyReadinessTarget } from "@/hooks/useArmyReadiness";
import { LocaleToggle } from "@/components/common/LocaleToggle";

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSettingsData = {};
});

// ---------------------------------------------------------------------------
// useArmyReadinessTarget tests
// ---------------------------------------------------------------------------

describe("useArmyReadinessTarget", () => {
  it("reads target from app_settings", () => {
    mockSettingsData = { army_readiness_target: "1500" };
    const { result } = renderHook(() => useArmyReadinessTarget());
    expect(result.current[0]).toBe(1500);
  });

  it("defaults to 2000 when no setting exists", () => {
    mockSettingsData = {};
    const { result } = renderHook(() => useArmyReadinessTarget());
    expect(result.current[0]).toBe(2000);
  });

  it("defaults to 2000 for NaN values (T-122-05 mitigation)", () => {
    mockSettingsData = { army_readiness_target: "not-a-number" };
    const { result } = renderHook(() => useArmyReadinessTarget());
    expect(result.current[0]).toBe(2000);
  });

  it("defaults to 2000 for non-positive values", () => {
    mockSettingsData = { army_readiness_target: "0" };
    const { result } = renderHook(() => useArmyReadinessTarget());
    expect(result.current[0]).toBe(2000);
  });

  it("session override takes precedence over persisted value", () => {
    mockSettingsData = { army_readiness_target: "2000" };
    const { result } = renderHook(() => useArmyReadinessTarget());

    act(() => {
      result.current[1](500);
    });

    expect(result.current[0]).toBe(500);
  });

  it("setTarget does NOT call updateSetting.mutate (session-only per D-11)", () => {
    mockSettingsData = { army_readiness_target: "2000" };
    const { result } = renderHook(() => useArmyReadinessTarget());

    act(() => {
      result.current[1](500);
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// LocaleToggle integration tests
// ---------------------------------------------------------------------------

describe("LocaleToggle", () => {
  it("renders current locale from settings as active (FR)", () => {
    mockSettingsData = { locale: "fr" };
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );

    const frButton = getByText("FR").closest("button");
    const enButton = getByText("EN").closest("button");
    expect(frButton?.getAttribute("data-variant")).toBe("secondary");
    expect(enButton?.getAttribute("data-variant")).toBe("ghost");
  });

  it("renders EN as active when locale setting is 'en'", () => {
    mockSettingsData = { locale: "en" };
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );

    const enButton = getByText("EN").closest("button");
    expect(enButton?.getAttribute("data-variant")).toBe("secondary");
  });

  it("defaults to EN when no locale setting exists", () => {
    mockSettingsData = {};
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );

    const enButton = getByText("EN").closest("button");
    expect(enButton?.getAttribute("data-variant")).toBe("secondary");
  });

  it("calls updateSetting.mutate with locale key when switching", () => {
    mockSettingsData = { locale: "en" };
    const { getByText } = render(
      React.createElement(LocaleToggle, { collapsed: false }),
    );

    fireEvent.click(getByText("FR"));
    expect(mockMutate).toHaveBeenCalledWith(
      { key: "locale", value: "fr" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
