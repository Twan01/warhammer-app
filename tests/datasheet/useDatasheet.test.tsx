/**
 * Phase 15 — useDatasheet hook tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 15-03 will:
 *   1. Create src/hooks/useDatasheet.ts exporting useDatasheet (calls getFullDatasheet via the
 *      datasheet_id stored on unit_strategy_notes), DATASHEET_KEY factory, and useRulesSyncMeta.
 *   2. Replace each `it.skip` below with `it`.
 *   3. Add real assertions matching 15-VALIDATION.md row 15-02-02.
 *
 * Mirrors src/hooks/useStrategyNote.ts pattern (per-unit query key factory, staleTime: Infinity).
 */
import { describe, it } from "vitest";

describe("useDatasheet — Wave 0 stubs", () => {
  it.skip("DS-04 + DS-06: useDatasheet returns { data: null } when unitId is undefined (sheet not yet open)", () => {
    // Plan 15-03 will:
    //   - vi.mock("@/db/queries/datasheets") with getFullDatasheet returning null
    //   - render <QueryClientProvider><Consumer unitId={undefined} /></QueryClientProvider>
    //   - assert hook result.current.data === null && enabled === false (no fetch fired)
    //   - assert getFullDatasheet was NOT called
  });

  it.skip("DS-07: useDatasheet returns FullDatasheet (ds + models + abilities + keywords + source) when the unit has a datasheet_id link", () => {
    // Plan 15-03 will:
    //   - vi.mock("@/db/queries/datasheets") returning full payload from getFullDatasheet
    //   - prime QueryClient with no cached data
    //   - render <QueryClientProvider><Consumer unitId={7} /></QueryClientProvider>
    //   - waitFor(() => expect(result.current.data).not.toBeNull())
    //   - assert result.current.data.ds.name === "Intercessors"
    //   - assert result.current.data.abilities.length > 0
    //   - assert getFullDatasheet was called once with the unit's stored datasheet_id
  });
});
