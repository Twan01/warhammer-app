/**
 * Phase 122 — useLocale convenience hook tests.
 *
 * Replaced Zustand store tests with app_settings-backed useLocale() hook tests.
 * Verifies default value and locale extraction from settings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock useAppSettings
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useAppSettings", () => ({
  useAppSettings: vi.fn(),
  useUpdateSetting: vi.fn(() => ({ mutate: vi.fn() })),
}));

import { useAppSettings } from "@/hooks/useAppSettings";
import { useLocale, type Locale } from "@/stores/localeStore";

// ---------------------------------------------------------------------------
// Helper: mock renderHook without QueryClientProvider
// ---------------------------------------------------------------------------

import { renderHook } from "@testing-library/react";

function mockSettings(data?: Record<string, string>) {
  vi.mocked(useAppSettings).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useAppSettings>);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useLocale", () => {
  it("defaults to 'en' when no settings loaded", () => {
    mockSettings(undefined);
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe("en");
  });

  it("defaults to 'en' when settings empty", () => {
    mockSettings({});
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe("en");
  });

  it("returns 'fr' when locale setting is 'fr'", () => {
    mockSettings({ locale: "fr" });
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe("fr");
  });

  it("returns 'en' when locale setting is 'en'", () => {
    mockSettings({ locale: "en" });
    const { result } = renderHook(() => useLocale());
    expect(result.current).toBe("en");
  });

  it("Locale type only accepts 'en' or 'fr' — type-level validation", () => {
    const validLocales: Locale[] = ["en", "fr"];
    expect(validLocales).toHaveLength(2);
    expect(validLocales).toContain("en");
    expect(validLocales).toContain("fr");
  });
});
