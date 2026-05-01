/**
 * COLL-07 — Zustand collection filters store (ephemeral).
 * Wave 1 plan 03-01 fills in test bodies after creating
 * src/features/units/collectionFilters.ts.
 */
import { useCollectionFilters } from "@/features/units/collectionFilters";

const initial = {
  search: "",
  factions: [] as number[],
  statuses: [] as (
    | "Not Started"
    | "Built"
    | "Primed"
    | "Basecoated"
    | "Shaded"
    | "Layered"
    | "Highlighted"
    | "Details Done"
    | "Based"
    | "Varnished"
    | "Completed"
  )[],
  categories: [] as string[],
  activeOnly: false,
};

describe("collectionFilters store", () => {
  beforeEach(() => useCollectionFilters.setState(initial));

  it("starts with empty filters", () => {
    const s = useCollectionFilters.getState();
    expect(s.search).toBe("");
    expect(s.factions).toEqual([]);
    expect(s.statuses).toEqual([]);
    expect(s.categories).toEqual([]);
    expect(s.activeOnly).toBe(false);
  });

  it("setSearch updates the search string", () => {
    useCollectionFilters.getState().setSearch("tau");
    expect(useCollectionFilters.getState().search).toBe("tau");
  });

  it("toggleFaction adds and removes ids", () => {
    const { toggleFaction } = useCollectionFilters.getState();
    toggleFaction(1);
    toggleFaction(2);
    expect(useCollectionFilters.getState().factions).toEqual([1, 2]);
    toggleFaction(1);
    expect(useCollectionFilters.getState().factions).toEqual([2]);
  });

  it("toggleStatus adds and removes statuses", () => {
    const { toggleStatus } = useCollectionFilters.getState();
    toggleStatus("Built");
    toggleStatus("Primed");
    expect(useCollectionFilters.getState().statuses).toEqual(["Built", "Primed"]);
    toggleStatus("Built");
    expect(useCollectionFilters.getState().statuses).toEqual(["Primed"]);
  });

  it("toggleCategory adds and removes categories", () => {
    const { toggleCategory } = useCollectionFilters.getState();
    toggleCategory("Infantry");
    toggleCategory("Vehicle");
    expect(useCollectionFilters.getState().categories).toEqual(["Infantry", "Vehicle"]);
    toggleCategory("Infantry");
    expect(useCollectionFilters.getState().categories).toEqual(["Vehicle"]);
  });

  it("toggleActiveOnly flips the boolean", () => {
    useCollectionFilters.getState().toggleActiveOnly();
    expect(useCollectionFilters.getState().activeOnly).toBe(true);
    useCollectionFilters.getState().toggleActiveOnly();
    expect(useCollectionFilters.getState().activeOnly).toBe(false);
  });

  it("clearAll resets every field", () => {
    const s = useCollectionFilters.getState();
    s.setSearch("x");
    s.toggleFaction(1);
    s.toggleStatus("Built");
    s.toggleCategory("Infantry");
    s.toggleActiveOnly();
    s.clearAll();
    const after = useCollectionFilters.getState();
    expect(after).toMatchObject(initial);
  });
});
