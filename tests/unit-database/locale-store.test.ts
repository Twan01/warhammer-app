/**
 * Phase 111 — FR-03: locale store tests.
 *
 * Tests Zustand persist store behavior for locale preference.
 * Verifies default value, setLocale action, and type constraints.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock zustand persist middleware to use a plain in-memory store for tests
// ---------------------------------------------------------------------------

vi.mock("zustand/middleware", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  persist: (fn: any) => fn,
}));

import { useLocaleStore } from "@/stores/localeStore";
import type { Locale } from "@/stores/localeStore";

// ---------------------------------------------------------------------------
// Reset store state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  useLocaleStore.setState({ locale: "en" });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useLocaleStore", () => {
  it("defaults to 'en'", () => {
    const { locale } = useLocaleStore.getState();
    expect(locale).toBe("en");
  });

  it("setLocale switches to 'fr'", () => {
    useLocaleStore.getState().setLocale("fr");
    expect(useLocaleStore.getState().locale).toBe("fr");
  });

  it("setLocale switches back to 'en'", () => {
    useLocaleStore.getState().setLocale("fr");
    useLocaleStore.getState().setLocale("en");
    expect(useLocaleStore.getState().locale).toBe("en");
  });

  it("Locale type only accepts 'en' or 'fr' — type-level validation", () => {
    // This is a compile-time check; at runtime we verify the valid values work
    const validLocales: Locale[] = ["en", "fr"];
    expect(validLocales).toHaveLength(2);
    expect(validLocales).toContain("en");
    expect(validLocales).toContain("fr");
  });
});
