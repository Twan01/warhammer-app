/**
 * Phase 10 â€” useActiveFaction hook tests (Plan 10-01 fills in stubs).
 *
 * Mocks @/hooks/useFactions because the real hook calls tauri-plugin-sql
 * which cannot run in jsdom. Each test sets the mock factions list and
 * verifies the documented contract from 10-RESEARCH.md Â§Pattern 2.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Faction } from "@/types/faction";

// Mock useFactions â€” must be hoisted before SUT import so vi.mock applies
const useFactionsMock = vi.fn();
vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => useFactionsMock(),
  FACTIONS_KEY: ["factions"] as const,
  FACTION_KEY: (id: number) => ["factions", id] as const,
}));

import {
  ActiveFactionProvider,
  useActiveFaction,
} from "@/context/ActiveFactionContext";

function makeFaction(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Tau",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#3a4f96",
    icon_path: null,
    lore_notes: null,
    created_at: "2026-01-01 00:00:00",
    updated_at: "2026-01-01 00:00:00",
    ...over,
  };
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <ActiveFactionProvider>{children}</ActiveFactionProvider>
);

beforeEach(() => {
  // Reset DOM custom property between tests
  document.documentElement.style.removeProperty("--faction-accent");
  // Reset localStorage between tests
  window.localStorage.clear();
  // Default mock: empty factions list (each test overrides as needed)
  useFactionsMock.mockReturnValue({ data: [] });
});

afterEach(() => {
  useFactionsMock.mockReset();
});

describe("useActiveFaction â€” THEME-01 (runtime DOM mutation)", () => {
  it("returns activeFactionHex = '#71717a' (zinc-500 default) when localStorage has no key", () => {
    useFactionsMock.mockReturnValue({ data: [] });

    const { result } = renderHook(() => useActiveFaction(), { wrapper });

    expect(result.current.activeFactionId).toBe(null);
    expect(result.current.activeFactionHex).toBe("#71717a");
    // Provider's useEffect runs after render â€” assert DOM var was set
    expect(document.documentElement.style.getPropertyValue("--faction-accent")).toBe(
      "#71717a"
    );
  });

  it("calls document.documentElement.style.setProperty('--faction-accent', hex) when setActiveFaction(faction) runs", () => {
    const purple = makeFaction({ id: 2, color_theme: "#a855f7" });
    useFactionsMock.mockReturnValue({ data: [purple] });
    const setPropertySpy = vi.spyOn(document.documentElement.style, "setProperty");

    const { result } = renderHook(() => useActiveFaction(), { wrapper });

    act(() => {
      result.current.setActiveFaction(purple);
    });

    expect(result.current.activeFactionHex).toBe("#a855f7");
    expect(setPropertySpy).toHaveBeenCalledWith("--faction-accent", "#a855f7");

    setPropertySpy.mockRestore();
  });

  it("restores '#71717a' default when setActiveFaction(null) is called", () => {
    const purple = makeFaction({ id: 2, color_theme: "#a855f7" });
    useFactionsMock.mockReturnValue({ data: [purple] });
    window.localStorage.setItem("active-faction-id", "2");

    const { result } = renderHook(() => useActiveFaction(), { wrapper });
    expect(result.current.activeFactionHex).toBe("#a855f7");

    act(() => {
      result.current.setActiveFaction(null);
    });

    expect(result.current.activeFactionId).toBe(null);
    expect(result.current.activeFactionHex).toBe("#71717a");
    expect(document.documentElement.style.getPropertyValue("--faction-accent")).toBe(
      "#71717a"
    );
  });
});

describe("useActiveFaction â€” THEME-02 (localStorage persistence)", () => {
  it("synchronously initializes activeFactionId from localStorage on mount (no flash)", () => {
    window.localStorage.setItem("active-faction-id", "5");
    const blue = makeFaction({ id: 5, color_theme: "#3a4f96" });
    useFactionsMock.mockReturnValue({ data: [blue] });

    const { result } = renderHook(() => useActiveFaction(), { wrapper });

    // First render must already have the persisted id (synchronous useState initializer)
    expect(result.current.activeFactionId).toBe(5);
    expect(result.current.activeFactionHex).toBe("#3a4f96");
  });

  it("writes 'active-faction-id' = String(id) to localStorage when setActiveFaction(faction) runs", () => {
    const red = makeFaction({ id: 7, color_theme: "#dc2626" });
    useFactionsMock.mockReturnValue({ data: [red] });

    const { result } = renderHook(() => useActiveFaction(), { wrapper });

    act(() => {
      result.current.setActiveFaction(red);
    });

    expect(window.localStorage.getItem("active-faction-id")).toBe("7");
  });

  it("removes 'active-faction-id' from localStorage when setActiveFaction(null) runs", () => {
    window.localStorage.setItem("active-faction-id", "3");
    const green = makeFaction({ id: 3, color_theme: "#059669" });
    useFactionsMock.mockReturnValue({ data: [green] });

    const { result } = renderHook(() => useActiveFaction(), { wrapper });
    expect(result.current.activeFactionId).toBe(3);

    act(() => {
      result.current.setActiveFaction(null);
    });

    expect(window.localStorage.getItem("active-faction-id")).toBe(null);
  });
});
