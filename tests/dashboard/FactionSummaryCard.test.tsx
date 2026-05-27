/**
 * VIS-01 â€” FactionSummaryCard visual polish test stubs.
 *
 * These tests are INTENTIONALLY FAILING until Plan 01 implements the component
 * changes. They serve as automated verification targets for the VIS-01 requirements:
 *   - Top accent band div (replaces left border)
 *   - Wider card min-w-[220px]
 *   - Star icon removed, replaced with Circle
 *   - Active state: bg-faction-accent/10 + shadow-md glow
 *   - Inactive state: hover:shadow-md
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { FactionSummaryCard } from "@/features/dashboard/FactionSummaryCard";
import type { FactionStat } from "@/features/dashboard/computeStats";

// Mock collectionFilters â€” FactionSummaryCard calls setState on click
vi.mock("@/features/units/collectionFilters", () => ({
  useCollectionFilters: Object.assign(vi.fn(), {
    setState: vi.fn(),
    getState: vi.fn().mockReturnValue({
      search: "",
      factions: [],
      statuses: [],
      categories: [],
      activeOnly: false,
      battleReady: false,
    }),
  }),
}));

const mockStat: FactionStat = {
  faction: {
    id: 1,
    name: "Tau Empire",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#3a4f96",
    icon_path: null,
    lore_notes: null,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  },
  modelCount: 12,
  paintedPct: 75,
  pointsPainted: 360,
  pointsOwned: 1500,
};

function renderWithRouter(ui: React.ReactNode) {
  const root = createRootRoute({ component: () => <Outlet /> });
  const testR = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <>{ui}</>,
  });
  const collectionR = createRoute({
    getParentRoute: () => root,
    path: "/collection",
    component: () => null,
  });
  const router = createRouter({
    routeTree: root.addChildren([testR, collectionR]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("FactionSummaryCard", () => {
  it("renders top accent band div with aria-hidden (VIS-01)", async () => {
    // VIS-01: Card top band uses an inner div with the faction color as backgroundColor,
    // replacing the current left border approach. The band must be aria-hidden.
    // FAILS until Plan 01 adds the top band div.
    renderWithRouter(<FactionSummaryCard stat={mockStat} />);

    // Wait for router to hydrate and card to render
    await screen.findByText("Tau Empire");

    const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
    const bandDiv = Array.from(hiddenElements).find((el) => {
      const style = (el as HTMLElement).style;
      return style.backgroundColor === mockStat.faction.color_theme ||
        style.backgroundColor === "rgb(58, 79, 150)"; // #3a4f96 parsed
    });
    expect(bandDiv).not.toBeUndefined();
  });

  it("has min-w-[220px] class on card (VIS-01)", async () => {
    // VIS-01: Card min-width increased from min-w-[180px] to min-w-[220px].
    // FAILS until Plan 01 updates the className.
    renderWithRouter(<FactionSummaryCard stat={mockStat} />);

    const card = await screen.findByRole("button", { name: "Tau Empire" });
    expect(card.className).toContain("min-w-[220px]");
  });

  it("does not render Star icon (VIS-01)", async () => {
    // VIS-01: Star icon removed from activate button.
    // FAILS until Plan 01 replaces Star with Circle.
    renderWithRouter(<FactionSummaryCard stat={mockStat} />);

    // Wait for card to render
    await screen.findByText("Tau Empire");

    const starSvg = document.querySelector("svg.lucide-star");
    expect(starSvg).toBeNull();
  });

  it("active state has bg-faction-accent/10 and shadow-md (VIS-01)", async () => {
    // VIS-01: Active card gets bg-faction-accent/10 background and shadow-md glow.
    // Current active state only adds ring-2 ring-faction-accent.
    // FAILS until Plan 01 updates the isActive className branch.
    renderWithRouter(<FactionSummaryCard stat={mockStat} isActive={true} />);

    const card = await screen.findByRole("button", { name: "Tau Empire" });
    expect(card.className).toContain("bg-faction-accent/10");
    expect(card.className).toContain("shadow-md");
  });

  it("inactive state has hover:shadow-md (VIS-01/VIS-03)", async () => {
    // VIS-01/VIS-03: Inactive card hover effect uses hover:shadow-md for depth.
    // Current inactive uses hover:bg-muted/50.
    // FAILS until Plan 01 updates the hover classes.
    renderWithRouter(<FactionSummaryCard stat={mockStat} isActive={false} />);

    const card = await screen.findByRole("button", { name: "Tau Empire" });
    expect(card.className).toContain("hover:shadow-md");
  });

  it("activate button has Circle icon and proper aria-label (VIS-01)", async () => {
    // VIS-01: Star icon replaced by Circle icon in the activate button.
    // Button aria-label stays "Set as active faction theme".
    // FAILS until Plan 01 swaps Star â†’ Circle.
    renderWithRouter(<FactionSummaryCard stat={mockStat} />);

    // Wait for card to render
    await screen.findByText("Tau Empire");

    expect(screen.getByLabelText("Set as active faction theme")).toBeInTheDocument();

    // No Star SVG should be present in the entire card (not just the button)
    const starSvg = document.querySelector("svg.lucide-star");
    expect(starSvg).toBeNull();
  });
});
