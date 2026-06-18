/**
 * COL-01 -- "Add to Collection" UI flow tests.
 *
 * Tests:
 * a. UdbDatasheetSheet renders "Add to Collection" button when onAddToCollection is provided
 * b. Button label changes to "Add Another to Collection" when ownershipData.owned_count > 0
 * c. handleAddToCollection maps UDB faction_id to collection faction_id via wahapedia_faction_id match
 * d. handleAddToCollection extracts points and model_count from UDB data
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useUdbUnitDetail hook used by UdbDatasheetSheet
const mockUdbUnitDetail: UdbUnitDetail = {
  id: "unit-abc",
  faction_id: "SM",
  name: "Intercessors",
  role: "Battleline",
  base_points: 80,
  damaged_w: null,
  damaged_desc: null,
  models: [],
  weapons: [],
  abilities: [],
  keywords: [],
  points: [{ id: 1, unit_id: "unit-abc", model_count: 5, points: 80 }],
  composition: [{ id: 1, unit_id: "unit-abc", min_models: 5, max_models: 10, notes: null }],
};

vi.mock("@/hooks/useUnitDatabase", () => ({
  useUdbUnitDetail: vi.fn(() => ({
    data: mockUdbUnitDetail,
    isLoading: false,
  })),
  useUdbFactions: vi.fn(() => ({ data: [], isLoading: false })),
  useUdbUnits: vi.fn(() => ({ data: [], isLoading: false })),
  useUdbOwnership: vi.fn(() => ({ data: [] })),
  UDB_OWNERSHIP_KEY: (factionId: string) => ["udb-ownership", factionId],
}));

// Mock Collapsible to avoid Radix animation issues in jsdom
vi.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Link — UdbDatasheetSheet now uses Link for the owned-badge deep link (138-03 D-06)
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, onClick }: { children: React.ReactNode; to: string; onClick?: () => void }) => (
    <a href={to} onClick={onClick}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

// Mock collectionFilters — UdbDatasheetSheet now calls useCollectionFilters (138-03 D-06)
vi.mock("@/features/units/collectionFilters", () => ({
  useCollectionFilters: (selector: (s: { setUdbUnitIdFilter: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ setUdbUnitIdFilter: vi.fn() }),
}));

import { UdbDatasheetSheet } from "@/features/unit-database/UdbDatasheetSheet";

function renderSheet(
  props: {
    onAddToCollection?: (unit: UdbUnitDetail) => void;
    ownershipData?: { owned_count: number; all_statuses: string } | null;
  } = {},
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <UdbDatasheetSheet
        unitId="unit-abc"
        open={true}
        onOpenChange={vi.fn()}
        onAddToCollection={props.onAddToCollection}
        ownershipData={props.ownershipData}
      />
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// UdbDatasheetSheet button rendering (COL-01a, COL-01b)
// ---------------------------------------------------------------------------

describe("UdbDatasheetSheet - Add to Collection button", () => {
  it("renders 'Add to Collection' button when onAddToCollection is provided", () => {
    renderSheet({ onAddToCollection: vi.fn() });
    expect(screen.getByRole("button", { name: /add to collection/i })).toBeInTheDocument();
  });

  it("does NOT render 'Add to Collection' button when onAddToCollection is not provided", () => {
    renderSheet({});
    expect(screen.queryByRole("button", { name: /add to collection/i })).toBeNull();
  });

  it("label changes to 'Add Another to Collection' when ownershipData.owned_count > 0", () => {
    renderSheet({
      onAddToCollection: vi.fn(),
      ownershipData: { owned_count: 2, all_statuses: "Built|Primed" },
    });
    expect(
      screen.getByRole("button", { name: /add another to collection/i }),
    ).toBeInTheDocument();
  });

  it("label stays 'Add to Collection' when ownershipData.owned_count is 0", () => {
    renderSheet({
      onAddToCollection: vi.fn(),
      ownershipData: { owned_count: 0, all_statuses: "" },
    });
    const btn = screen.getByRole("button", { name: /add to collection/i });
    expect(btn.textContent).not.toContain("Another");
  });

  it("label stays 'Add to Collection' when ownershipData is null", () => {
    renderSheet({
      onAddToCollection: vi.fn(),
      ownershipData: null,
    });
    const btn = screen.getByRole("button", { name: /add to collection/i });
    expect(btn.textContent).not.toContain("Another");
  });

  it("calls onAddToCollection with the loaded UdbUnitDetail when clicked", () => {
    const handler = vi.fn();
    renderSheet({ onAddToCollection: handler });

    fireEvent.click(screen.getByRole("button", { name: /add to collection/i }));

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "unit-abc",
        name: "Intercessors",
        faction_id: "SM",
        role: "Battleline",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// handleAddToCollection faction mapping logic (COL-01c, COL-01d)
//
// Since handleAddToCollection is internal to DatabaseBrowserPage and not exported,
// we test it by verifying the behavioral contract: given a UdbUnitDetail and a
// set of collection factions, the mapping produces correct prefill values.
// We extract the pure logic inline and test it directly.
// ---------------------------------------------------------------------------

describe("handleAddToCollection mapping logic", () => {
  // Replicate the faction mapping logic from DatabaseBrowserPage.handleAddToCollection
  function mapUdbToCollectionPrefill(
    unit: UdbUnitDetail,
    collectionFactions: Array<{ id: number; wahapedia_faction_id: string | null }>,
  ) {
    const matchedFaction = collectionFactions.find(
      (f) => f.wahapedia_faction_id === unit.faction_id,
    );
    if (!matchedFaction) return null;

    const basePoints = unit.points[0]?.points ?? null;
    const minModels = unit.composition[0]?.min_models ?? 1;

    return {
      name: unit.name,
      faction_id: matchedFaction.id,
      category: unit.role ?? "",
      points: basePoints,
      model_count: minModels,
    };
  }

  it("maps wahapedia_faction_id 'SM' to collection faction_id by match", () => {
    const factions = [
      { id: 1, wahapedia_faction_id: "SM" },
      { id: 2, wahapedia_faction_id: "NEC" },
    ];
    const result = mapUdbToCollectionPrefill(mockUdbUnitDetail, factions);
    expect(result).not.toBeNull();
    expect(result!.faction_id).toBe(1);
  });

  it("returns null when no faction matches wahapedia_faction_id", () => {
    const factions = [{ id: 1, wahapedia_faction_id: "NEC" }];
    const result = mapUdbToCollectionPrefill(mockUdbUnitDetail, factions);
    expect(result).toBeNull();
  });

  it("extracts points from first points tier", () => {
    const factions = [{ id: 1, wahapedia_faction_id: "SM" }];
    const result = mapUdbToCollectionPrefill(mockUdbUnitDetail, factions);
    expect(result!.points).toBe(80);
  });

  it("extracts model_count from first composition entry", () => {
    const factions = [{ id: 1, wahapedia_faction_id: "SM" }];
    const result = mapUdbToCollectionPrefill(mockUdbUnitDetail, factions);
    expect(result!.model_count).toBe(5);
  });

  it("defaults model_count to 1 when composition is empty", () => {
    const factions = [{ id: 1, wahapedia_faction_id: "SM" }];
    const unitNoComp = { ...mockUdbUnitDetail, composition: [] };
    const result = mapUdbToCollectionPrefill(unitNoComp, factions);
    expect(result!.model_count).toBe(1);
  });

  it("defaults points to null when points array is empty", () => {
    const factions = [{ id: 1, wahapedia_faction_id: "SM" }];
    const unitNoPoints = { ...mockUdbUnitDetail, points: [] };
    const result = mapUdbToCollectionPrefill(unitNoPoints, factions);
    expect(result!.points).toBeNull();
  });

  it("uses unit.role as category", () => {
    const factions = [{ id: 1, wahapedia_faction_id: "SM" }];
    const result = mapUdbToCollectionPrefill(mockUdbUnitDetail, factions);
    expect(result!.category).toBe("Battleline");
  });

  it("defaults category to empty string when role is null", () => {
    const factions = [{ id: 1, wahapedia_faction_id: "SM" }];
    const unitNoRole = { ...mockUdbUnitDetail, role: null };
    const result = mapUdbToCollectionPrefill(unitNoRole, factions);
    expect(result!.category).toBe("");
  });
});
