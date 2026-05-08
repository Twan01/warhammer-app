/**
 * Phase 43 — useRulesExtended hook tests.
 *
 * Mocks @/db/queries/rulesExtended with 4 mock functions.
 * Follows the exact pattern from tests/datasheet/useDatasheet.test.tsx.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const getStratagemsByFactionMock = vi.fn();
const getDetachmentsByFactionMock = vi.fn();
const getDetachmentAbilitiesByDetachmentMock = vi.fn();
const getSharedAbilitiesByFactionMock = vi.fn();

vi.mock("@/db/queries/rulesExtended", () => ({
  getStratagemsByFaction: (...args: unknown[]) => getStratagemsByFactionMock(...args),
  getDetachmentsByFaction: (...args: unknown[]) => getDetachmentsByFactionMock(...args),
  getDetachmentAbilitiesByDetachment: (...args: unknown[]) => getDetachmentAbilitiesByDetachmentMock(...args),
  getSharedAbilitiesByFaction: (...args: unknown[]) => getSharedAbilitiesByFactionMock(...args),
}));

// Import AFTER vi.mock so the mocked query functions are used.
import {
  useStratagemsByFaction,
  useDetachmentsByFaction,
  useDetachmentAbilitiesByDetachment,
  useSharedAbilitiesByFaction,
} from "@/hooks/useRulesExtended";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  getStratagemsByFactionMock.mockReset();
  getDetachmentsByFactionMock.mockReset();
  getDetachmentAbilitiesByDetachmentMock.mockReset();
  getSharedAbilitiesByFactionMock.mockReset();
});

describe("useStratagemsByFaction", () => {
  it("stays idle and never calls getStratagemsByFaction when factionId is undefined", async () => {
    const { result } = renderHook(() => useStratagemsByFaction(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getStratagemsByFactionMock).not.toHaveBeenCalled();
  });

  it("calls getStratagemsByFaction('SM') and returns the data when factionId is 'SM'", async () => {
    const sample = [{ id: "s1", faction_id: "SM", name: "Armour of Contempt", type: null, cp_cost: "1", legend: null, turn: null, phase: null, detachment: null, detachment_id: null, description: null }];
    getStratagemsByFactionMock.mockResolvedValueOnce(sample);

    const { result } = renderHook(() => useStratagemsByFaction("SM"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(getStratagemsByFactionMock).toHaveBeenCalledWith("SM");
    expect(result.current.data).toEqual(sample);
  });
});

describe("useDetachmentsByFaction", () => {
  it("stays idle and never calls getDetachmentsByFaction when factionId is undefined", async () => {
    const { result } = renderHook(() => useDetachmentsByFaction(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getDetachmentsByFactionMock).not.toHaveBeenCalled();
  });

  it("calls getDetachmentsByFaction('SM') and returns the data when factionId is 'SM'", async () => {
    const sample = [{ id: "det1", faction_id: "SM", name: "Gladius Task Force", legend: null, type: null }];
    getDetachmentsByFactionMock.mockResolvedValueOnce(sample);

    const { result } = renderHook(() => useDetachmentsByFaction("SM"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(getDetachmentsByFactionMock).toHaveBeenCalledWith("SM");
    expect(result.current.data).toEqual(sample);
  });
});

describe("useDetachmentAbilitiesByDetachment", () => {
  it("stays idle and never calls getDetachmentAbilitiesByDetachment when detachmentId is undefined", async () => {
    const { result } = renderHook(() => useDetachmentAbilitiesByDetachment(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getDetachmentAbilitiesByDetachmentMock).not.toHaveBeenCalled();
  });

  it("calls getDetachmentAbilitiesByDetachment('det1') and returns the data when detachmentId is 'det1'", async () => {
    const sample = [{ id: "da1", faction_id: "SM", name: "Adeptus Astartes", legend: null, description: null, detachment: "Gladius Task Force", detachment_id: "det1" }];
    getDetachmentAbilitiesByDetachmentMock.mockResolvedValueOnce(sample);

    const { result } = renderHook(() => useDetachmentAbilitiesByDetachment("det1"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(getDetachmentAbilitiesByDetachmentMock).toHaveBeenCalledWith("det1");
    expect(result.current.data).toEqual(sample);
  });
});

describe("useSharedAbilitiesByFaction", () => {
  it("stays idle and never calls getSharedAbilitiesByFaction when factionId is undefined", async () => {
    const { result } = renderHook(() => useSharedAbilitiesByFaction(undefined), { wrapper: makeWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(getSharedAbilitiesByFactionMock).not.toHaveBeenCalled();
  });

  it("calls getSharedAbilitiesByFaction('SM') and returns the data when factionId is 'SM'", async () => {
    const sample = [{ id: "ab1", name: "Oath of Moment", legend: null, faction_id: "SM", description: "At the start of your Command phase." }];
    getSharedAbilitiesByFactionMock.mockResolvedValueOnce(sample);

    const { result } = renderHook(() => useSharedAbilitiesByFaction("SM"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(getSharedAbilitiesByFactionMock).toHaveBeenCalledWith("SM");
    expect(result.current.data).toEqual(sample);
  });
});
