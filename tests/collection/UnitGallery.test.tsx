/**
 * Phase 12 — UnitGallery + CollectionPage integration tests (Plan 12-02 fills in stubs).
 *
 * Coverage:
 *   - 3 tests for UI-04 (toggle render, toggle click flips active state, localStorage
 *     persistence read synchronously) via CollectionPage.
 *   - 2 tests for UI-05 (card content + click delegation) via UnitGallery direct render.
 *   - 1 test for UI-06 (Zustand filter store unchanged across toggle) via CollectionPage.
 *
 * Pitfall 6 (12-RESEARCH.md): No matchMedia polyfill — gallery has no animation.
 *
 * Mock strategy mirrors tests/collection/UnitTable.test.tsx — vi.mock the data hooks so
 * CollectionPage renders synchronously with deterministic mock data.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnitGallery } from "@/features/units/UnitGallery";
import { CollectionPage } from "@/features/units/CollectionPage";
import { useCollectionFilters } from "@/features/units/collectionFilters";
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

const mockFaction: Faction = {
  id: 1,
  name: "Space Marines",
  game_system: "Warhammer 40K",
  description: null,
  color_theme: "#1e40af",
  icon_path: null,
  created_at: "2026-05-03T00:00:00Z",
  updated_at: "2026-05-03T00:00:00Z",
};

const mockUnit: Unit = {
  id: 10,
  faction_id: 1,
  name: "Tactical Squad",
  category: "Troops",
  unit_type: null,
  model_count: 10,
  owned_count: 10,
  points: 90,
  status_assembly: 1,
  status_painting: "Layered",
  painting_percentage: 72,
  status_basing: 0,
  status_varnished: 0,
  is_active_project: 1,
  priority: null,
  target_completion_date: null,
  purchase_date: null,
  purchase_price_pence: null,
  storage_location: null,
  main_image_path: null,
  notes: null,
  created_at: "2026-05-03T00:00:00Z",
  updated_at: "2026-05-03T00:00:00Z",
};

// vi.mock the data hooks so CollectionPage renders synchronously with deterministic data.
vi.mock("@/hooks/useUnits", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useUnits")>(
    "@/hooks/useUnits",
  );
  return {
    ...actual,
    useUnits: () => ({ data: [mockUnit], isLoading: false, isError: false }),
    useUpdateUnit: () => ({ mutate: vi.fn() }),
  };
});

vi.mock("@/hooks/useFactions", () => ({
  useFactions: () => ({ data: [mockFaction], isLoading: false, isError: false }),
}));

function renderCollectionPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <CollectionPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // Reset localStorage and Zustand filter store between tests.
  window.localStorage.clear();
  useCollectionFilters.getState().clearAll();
});

describe("UnitGallery — UI-04/UI-05/UI-06 (gallery view + toggle + filter preservation)", () => {
  it("[UI-04] header row renders Table and Gallery icon buttons with correct aria-labels", () => {
    renderCollectionPage();
    expect(screen.getByLabelText("Table view")).toBeInTheDocument();
    expect(screen.getByLabelText("Gallery view")).toBeInTheDocument();
  });

  it("[UI-04] clicking the Gallery toggle button switches view to gallery (active button gets bg-muted)", async () => {
    const user = userEvent.setup();
    renderCollectionPage();

    // Default view is 'table' — Table button has bg-muted, Gallery button does not.
    expect(screen.getByLabelText("Table view").className).toContain("bg-muted");
    expect(screen.getByLabelText("Gallery view").className).not.toContain("bg-muted");

    await user.click(screen.getByLabelText("Gallery view"));

    expect(screen.getByLabelText("Gallery view").className).toContain("bg-muted");
    expect(screen.getByLabelText("Table view").className).not.toContain("bg-muted");
  });

  it("[UI-04] localStorage persistence — pre-set 'gallery' renders gallery active on first paint", () => {
    window.localStorage.setItem("collection-view-mode", "gallery");

    renderCollectionPage();

    // Gallery button reads from localStorage synchronously via useState initializer in
    // useCollectionViewMode — bg-muted is applied on first paint (no flash).
    expect(screen.getByLabelText("Gallery view").className).toContain("bg-muted");
    expect(screen.getByLabelText("Table view").className).not.toContain("bg-muted");
  });

  it("[UI-05] gallery card renders unit name, faction badge with color_theme, and PaintingRing with percentage", () => {
    render(
      <UnitGallery
        data={[mockUnit]}
        factions={[mockFaction]}
        isLoading={false}
        hasActiveFilters={false}
        onRowClick={vi.fn()}
        onAdd={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(screen.getByText("Tactical Squad")).toBeInTheDocument();

    const badge = screen.getByTestId("faction-badge");
    expect(badge).toHaveStyle({ backgroundColor: "#1e40af" });
    expect(badge.textContent).toBe("Space Marines");

    const ring = screen.getByRole("img", { name: "72% painted" });
    expect(ring.querySelector("text")?.textContent).toBe("72%");
  });

  it("[UI-05] clicking a gallery card calls onRowClick with the unit (matches table click behavior)", async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();

    render(
      <UnitGallery
        data={[mockUnit]}
        factions={[mockFaction]}
        isLoading={false}
        hasActiveFilters={false}
        onRowClick={onRowClick}
        onAdd={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Tactical Squad"));

    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(mockUnit);
  });

  it("[UI-06] switching view mode does not reset the collectionFilters Zustand store", async () => {
    const user = userEvent.setup();

    // Seed filter state BEFORE render — proves toggle does not call clearAll on mount.
    useCollectionFilters.setState({
      search: "Marines",
      factions: [1],
      statuses: [],
      categories: [],
      activeOnly: false,
    });

    renderCollectionPage();

    await user.click(screen.getByLabelText("Gallery view"));
    expect(useCollectionFilters.getState().search).toBe("Marines");
    expect(useCollectionFilters.getState().factions).toEqual([1]);

    await user.click(screen.getByLabelText("Table view"));
    expect(useCollectionFilters.getState().search).toBe("Marines");
    expect(useCollectionFilters.getState().factions).toEqual([1]);
  });
});
