/**
 * Phase 10 — NavItem tooltip-when-collapsed tests (Wave 0 stubs).
 *
 * UI-03 is already shipped (10-RESEARCH.md §Phase Requirements); this file adds
 * explicit regression coverage that Plans 10-02 and 10-03 will fill in. NavItem
 * is also being lightly modified in Plan 10-02 to swap bg-accent → bg-faction-accent
 * for the active link state — this test file covers both the tooltip behavior
 * (UI-03 regression) and the active-class behavior (THEME-01 nav consumer).
 *
 * STATUS: skipped. Plans 10-02 + 10-03 will:
 *   1. Replace `describe.skip` below with `describe`.
 *   2. Add real render + tooltip assertions matching inline TODOs.
 */
import { describe, it } from "vitest";

describe.skip("NavItem — UI-03 (collapsed tooltip)", () => {
  it("when collapsed=true, the nav link is wrapped in a Radix Tooltip with TooltipContent label", () => {
    // Plan 10-03 will:
    //   - render <NavItem to="/collection" label="Collection" icon={Package} collapsed={true} />
    //     wrapped in <TooltipProvider> + MemoryRouter
    //   - hover the link or assert tooltip-trigger data attribute presence
    //   - assert getByRole("tooltip") or screen.getByText("Collection") inside a portal
  });

  it("when collapsed=false, the nav link is NOT wrapped in a Tooltip (label rendered inline)", () => {
    // Plan 10-03 will:
    //   - render <NavItem to="/collection" label="Collection" icon={Package} collapsed={false} />
    //   - assert screen.getByText("Collection") visible (not sr-only)
    //   - assert no [data-state] tooltip-trigger attribute on the link
  });
});

describe.skip("NavItem — THEME-01 (active link uses faction accent class)", () => {
  it("when the route is active, the link element has class \"bg-faction-accent\" and \"text-white\"", () => {
    // Plan 10-02 will:
    //   - render <NavItem to="/" label="Dashboard" icon={LayoutDashboard} collapsed={false} />
    //     inside MemoryRouter with initialEntries=["/"]
    //   - find the <a> element by role link
    //   - assert anchor.className contains "bg-faction-accent" AND "text-white"
    //   - assert anchor.className does NOT contain "bg-accent" (old class) for the active state
  });

  it("when the route is NOT active, the link does NOT have bg-faction-accent (uses muted-foreground)", () => {
    // Plan 10-02 will:
    //   - render <NavItem to="/collection" ...> inside MemoryRouter with initialEntries=["/"]
    //   - assert anchor.className does NOT contain "bg-faction-accent"
    //   - assert anchor.className contains "text-muted-foreground"
  });
});
