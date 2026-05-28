/**
 * COLL-12 / POLISH-02 / POLISH-05 — UnitTable rendering states.
 * Wave 1 plan 03-01 fills in test bodies after creating
 * src/features/units/UnitTable.tsx.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UnitTable } from "@/features/units/UnitTable";
import type { EnrichedUnit } from "@/types/unit";
import type { Faction } from "@/types/faction";

function renderTable(props: Partial<Parameters<typeof UnitTable>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const baseProps = {
    data: [] as EnrichedUnit[],
    factions: [] as Faction[],
    isLoading: false,
    hasActiveFilters: false,
    onRowClick: vi.fn(),
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onClearFilters: vi.fn(),
    onToggleActive: vi.fn(),
    ...props,
  };
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <UnitTable {...baseProps} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function makeFaction(over: Partial<Faction> = {}): Faction {
  return {
    id: 1,
    name: "Tau Empire",
    game_system: "Warhammer 40K",
    description: null,
    color_theme: "#33aaff",
    icon_path: null,
    lore_notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  };
}

function makeUnit(over: Partial<EnrichedUnit> = {}): EnrichedUnit {
  return {
    id: 1,
    faction_id: 1,
    name: "Fire Warriors",
    category: "Battleline",
    unit_type: null,
    model_count: 10,
    owned_count: 10,
    points: 100,
    effective_points: 100,
    synced_points: null,
    is_synced: false,
    status_assembly: 1,
    status_painting: "Built",
    painting_percentage: 25,
    status_basing: 0,
    status_varnished: 0,
    is_active_project: 0,
    priority: null,
    target_completion_date: null,
    purchase_date: null,
    purchase_price_pence: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    lore_notes: null,
    undercoat: null, status_assembly_override: 0 as 0 | 1, status_basing_override: 0 as 0 | 1, status_varnished_override: 0 as 0 | 1,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...over,
  };
}

describe("UnitTable", () => {
  describe("loading", () => {
    it("POLISH-02: renders 5 skeleton rows while units fetch", () => {
      renderTable({ isLoading: true });
      expect(screen.getAllByTestId("skeleton-row")).toHaveLength(5);
    });
  });
  describe("empty", () => {
    it("COLL-12: renders CollectionEmptyState when no units exist", () => {
      renderTable({ data: [], hasActiveFilters: false });
      expect(screen.getByText("No units yet")).toBeInTheDocument();
    });
    it("COLL-12: renders filtered empty state when filters yield zero units", () => {
      renderTable({ data: [], hasActiveFilters: true });
      expect(screen.getByText("No units match")).toBeInTheDocument();
    });
  });
  describe("faction badge", () => {
    it("POLISH-05: renders faction badge with backgroundColor from color_theme", () => {
      const faction = makeFaction({ id: 7, name: "Necrons", color_theme: "#00ff66" });
      const unit = makeUnit({ id: 99, faction_id: 7, name: "Warriors" });
      renderTable({ data: [unit], factions: [faction] });
      const badges = screen.getAllByTestId("faction-badge");
      expect(badges.length).toBeGreaterThan(0);
      const style = (badges[0] as HTMLElement).style.backgroundColor;
      // jsdom normalizes hex → rgb; both forms acceptable
      expect(style.toLowerCase()).toMatch(/(#00ff66|rgb\(0,\s*255,\s*102\))/);
    });
  });
});
