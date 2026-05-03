/**
 * Phase 10 — useActiveFaction hook tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 10-01 will:
 *   1. Create src/context/ActiveFactionContext.tsx exporting ActiveFactionProvider
 *      and useActiveFaction (per 10-RESEARCH.md §Pattern 2).
 *   2. Replace `describe.skip` below with `describe`.
 *   3. Add real assertions matching 10-VALIDATION.md §Per-Task Verification Map
 *      rows 10-01-01 (THEME-01) and 10-01-02 (THEME-02).
 *
 * The stub exists in Wave 0 so Plan 10-01 has a concrete failing target to
 * flip green (Nyquist sampling rate per 10-VALIDATION.md).
 */
import { describe, it } from "vitest";

describe.skip("useActiveFaction — THEME-01 (runtime DOM mutation)", () => {
  it("returns activeFactionHex = '#71717a' (zinc-500 default) when localStorage has no key", () => {
    // Plan 10-01 will:
    //   - window.localStorage.removeItem("active-faction-id")
    //   - render TestConsumer wrapped in <ActiveFactionProvider>
    //   - assert TestConsumer reads activeFactionHex === "#71717a"
    //   - assert document.documentElement.style.getPropertyValue("--faction-accent") === "#71717a"
  });

  it("calls document.documentElement.style.setProperty('--faction-accent', hex) when setActiveFaction(faction) runs", () => {
    // Plan 10-01 will:
    //   - mock useFactions to return [{ id: 1, color_theme: "#a855f7", ... }]
    //   - render TestConsumer; click button that calls setActiveFaction(faction)
    //   - spy on document.documentElement.style.setProperty
    //   - assert called with ("--faction-accent", "#a855f7")
  });

  it("restores '#71717a' default when setActiveFaction(null) is called", () => {
    // Plan 10-01 will:
    //   - render with active faction set
    //   - call setActiveFaction(null)
    //   - assert activeFactionHex === "#71717a" and DOM var also reset
  });
});

describe.skip("useActiveFaction — THEME-02 (localStorage persistence)", () => {
  it("synchronously initializes activeFactionId from localStorage on mount (no flash)", () => {
    // Plan 10-01 will:
    //   - window.localStorage.setItem("active-faction-id", "5")
    //   - mock useFactions to return [{ id: 5, color_theme: "#3a4f96", ... }]
    //   - render TestConsumer wrapped in <ActiveFactionProvider>
    //   - on FIRST render (no useEffect), assert activeFactionId === 5
    //     (synchronous useState initializer pattern, mirrors useSidebarCollapsed)
  });

  it("writes 'active-faction-id' = String(id) to localStorage when setActiveFaction(faction) runs", async () => {
    // Plan 10-01 will:
    //   - render TestConsumer; click button that calls setActiveFaction({ id: 7, ... })
    //   - await microtask (useEffect)
    //   - assert window.localStorage.getItem("active-faction-id") === "7"
  });

  it("removes 'active-faction-id' from localStorage when setActiveFaction(null) runs", async () => {
    // Plan 10-01 will:
    //   - window.localStorage.setItem("active-faction-id", "3")
    //   - render TestConsumer; click button that calls setActiveFaction(null)
    //   - await microtask
    //   - assert window.localStorage.getItem("active-faction-id") === null
  });
});
