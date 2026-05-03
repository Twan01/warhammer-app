/**
 * Phase 10 — AppSidebar collapse-toggle tests (Wave 0 stubs).
 *
 * UI-01 + UI-02 are already shipped (10-RESEARCH.md §Phase Requirements); this
 * file adds explicit regression coverage that Plan 10-03 will fill in. The
 * sidebar component itself is NOT modified in Phase 10 — only the test exists
 * to guard against future regressions.
 *
 * STATUS: skipped. Plan 10-03 will:
 *   1. Replace `describe.skip` below with `describe`.
 *   2. Add real render + userEvent assertions matching inline TODOs.
 */
import { describe, it } from "vitest";

describe.skip("AppSidebar — UI-01 + UI-02 (collapse toggle and persistence)", () => {
  it("renders an aside element with data-collapsed=\"false\" by default", () => {
    // Plan 10-03 will:
    //   - window.localStorage.removeItem("sidebar:collapsed")
    //   - render <AppSidebar /> wrapped in MemoryRouter (mirror DashboardPage.test.tsx wrapper)
    //   - assert document.querySelector("aside[data-collapsed='false']") is truthy
  });

  it("clicking the collapse toggle button flips data-collapsed to \"true\"", async () => {
    // Plan 10-03 will:
    //   - render <AppSidebar />
    //   - const btn = screen.getByRole("button", { name: /Collapse sidebar|Expand sidebar/ })
    //   - await userEvent.click(btn)
    //   - assert document.querySelector("aside[data-collapsed='true']") is truthy
  });

  it("the collapsed state is written to localStorage key \"sidebar:collapsed\"", async () => {
    // Plan 10-03 will:
    //   - render <AppSidebar />
    //   - click toggle
    //   - await microtask (useEffect)
    //   - assert window.localStorage.getItem("sidebar:collapsed") === "true"
  });
});
