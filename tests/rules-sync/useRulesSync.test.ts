/**
 * Phase 82 -- useRulesSync pre-sync safety backup tests (SAF-02).
 *
 * Verifies that create_safety_backup is called before CSV fetching,
 * and that sync aborts when the safety backup fails.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import React from "react";

// Track call order across invoke and fetch
const callOrder: string[] = [];

const mockInvoke = vi.fn();
const mockFetch = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => {
    callOrder.push(`invoke:${args[0]}`);
    return mockInvoke(...args);
  },
}));

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: (...args: unknown[]) => {
    callOrder.push(`fetch:${args[0]}`);
    return mockFetch(...args);
  },
}));

// Mock all DB-related imports used by useRulesSync
vi.mock("@/lib/parseWahapediaCsv", () => ({
  parseWahapediaCsv: () => [],
}));

vi.mock("@/lib/stripHtml", () => ({
  stripHtml: (s: string) => s,
}));

vi.mock("@/lib/validateCsvHeaders", () => ({
  validateCsvHeaders: () => undefined,
}));

vi.mock("@/db/queries/syncErrors", () => ({
  insertSyncError: vi.fn(),
}));

vi.mock("@/db/queries/rulesSnapshot", () => ({
  capturePreSyncSnapshot: vi.fn().mockResolvedValue(undefined),
  getLatestSnapshot: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/db/queries/datasheets", () => ({
  getRulesSyncMeta: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/computeSyncDiff", () => ({
  computeSyncDiff: () => ({ added: [], removed: [], renamed: [], modified: [], total_changed: 0 }),
}));

vi.mock("@/db/rules-client", () => ({
  getRulesDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("@/lib/computePointsDelta", () => ({
  computePointsDelta: () => ({ added: 0, removed: 0, changed: 0, details: [] }),
}));

vi.mock("@/db/queries/syncedUnitPoints", () => ({
  replaceSyncedUnitPoints: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/queries/pointsImportHistory", () => ({
  insertPointsImportHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/useDatasheet", () => ({
  RULES_SYNC_META_KEY: ["rules-sync-meta"],
}));

vi.mock("@/hooks/useSyncErrors", () => ({
  SYNC_ERRORS_KEY: ["sync-errors"],
}));

import { useRulesSync } from "@/hooks/useRulesSync";

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

beforeEach(() => {
  callOrder.length = 0;
  mockInvoke.mockReset();
  mockFetch.mockReset();
});

describe("useRulesSync safety backup", () => {
  it("calls create_safety_backup before fetching CSVs", async () => {
    // create_safety_backup succeeds
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "create_safety_backup") return Promise.resolve();
      if (cmd === "bulk_sync_rules") {
        return Promise.resolve({
          factions: 0, sources: 0, datasheets: 0, models: 0,
          abilities: 0, keywords: 0, wargear: 0, shared_abilities: 0,
          stratagems: 0, detachments: 0, detachment_abilities: 0, points: 0,
        });
      }
      return Promise.resolve();
    });

    // CSV fetch returns minimal valid response
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("col1\nval1"),
    });

    const { result } = renderHook(() => useRulesSync(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    });

    // create_safety_backup must be the first call
    expect(callOrder[0]).toBe("invoke:create_safety_backup");

    // Fetch calls come after the safety backup
    const firstFetchIdx = callOrder.findIndex((c) => c.startsWith("fetch:"));
    const backupIdx = callOrder.indexOf("invoke:create_safety_backup");
    expect(backupIdx).toBeLessThan(firstFetchIdx);
  });

  it("aborts sync when create_safety_backup fails", async () => {
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === "create_safety_backup") {
        return Promise.reject(new Error("disk full"));
      }
      return Promise.resolve();
    });

    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("col1\nval1"),
    });

    const { result } = renderHook(() => useRulesSync(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // bulk_sync_rules must never have been called
    const bulkSyncCalls = callOrder.filter(
      (c) => c === "invoke:bulk_sync_rules"
    );
    expect(bulkSyncCalls).toHaveLength(0);
  });
});
