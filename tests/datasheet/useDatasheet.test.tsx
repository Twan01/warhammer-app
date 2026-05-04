/**
 * Phase 15 — useDatasheet hook tests.
 *
 * Mocks src/db/queries/datasheets and renders useDatasheet inside a fresh
 * QueryClientProvider per test. Mirrors tests/spending/useSpendingStats.test.tsx
 * setup.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const getDatasheetIdForUnitMock = vi.fn();
const getFullDatasheetMock = vi.fn();
const getDatasheetsByFactionMock = vi.fn();
const getRulesSyncMetaMock = vi.fn();

vi.mock("@/db/queries/datasheets", () => ({
  getDatasheetIdForUnit: (...args: unknown[]) => getDatasheetIdForUnitMock(...args),
  getFullDatasheet: (...args: unknown[]) => getFullDatasheetMock(...args),
  getDatasheetsByFaction: (...args: unknown[]) => getDatasheetsByFactionMock(...args),
  getRulesSyncMeta: (...args: unknown[]) => getRulesSyncMetaMock(...args),
}));

import { useDatasheet } from "@/hooks/useDatasheet";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  getDatasheetIdForUnitMock.mockReset();
  getFullDatasheetMock.mockReset();
  getDatasheetsByFactionMock.mockReset();
  getRulesSyncMetaMock.mockReset();
});

describe("useDatasheet", () => {
  it("DS-04 + DS-06: returns { data: undefined, enabled: false } and never calls getDatasheetIdForUnit when unitId is undefined", async () => {
    const { result } = renderHook(() => useDatasheet(undefined), { wrapper: makeWrapper() });
    // enabled: false → query never fires
    expect(result.current.fetchStatus).toBe("idle");
    expect(getDatasheetIdForUnitMock).not.toHaveBeenCalled();
    expect(getFullDatasheetMock).not.toHaveBeenCalled();
  });

  it("DS-07: returns FullDatasheet (ds + models + abilities + keywords + source) when the unit has a datasheet_id link", async () => {
    getDatasheetIdForUnitMock.mockResolvedValueOnce("000000882");
    const fakePayload = {
      ds: { id: "000000882", name: "Intercessors", faction_id: "SM", source_id: "src1", role: "Battleline", damaged_w: null, damaged_description: null },
      models: [{ datasheet_id: "000000882", line: 1, name: "Intercessor", M: "6\"", T: 4, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 2 }],
      abilities: [{ datasheet_id: "000000882", line: 1, ability_id: "a1", name: "Bolter Discipline", description: "Sustained Hits 1", type: "Datasheet", parameter: null }],
      keywords: [{ datasheet_id: "000000882", keyword: "Infantry", is_faction_keyword: 0 }],
      source: { id: "src1", name: "Codex: Space Marines", type: "Codex", edition: 10, version: "1.0", errata_date: null },
    };
    getFullDatasheetMock.mockResolvedValueOnce(fakePayload);

    const { result } = renderHook(() => useDatasheet(7), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).not.toBeNull();
    expect(result.current.data!.ds.name).toBe("Intercessors");
    expect(result.current.data!.abilities.length).toBe(1);
    expect(result.current.data!.source?.name).toBe("Codex: Space Marines");

    expect(getDatasheetIdForUnitMock).toHaveBeenCalledWith(7);
    expect(getFullDatasheetMock).toHaveBeenCalledWith("000000882");
  });

  it("DS-04 + DS-06: returns null when the unit has no datasheet_id link (getDatasheetIdForUnit returns null)", async () => {
    getDatasheetIdForUnitMock.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useDatasheet(7), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toBeNull();
    expect(getFullDatasheetMock).not.toHaveBeenCalled();
  });
});
