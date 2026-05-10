/**
 * Phase 44 — useRulesSync unit tests for cache invalidation (SYNC-05)
 * and error logging (SYNC-04 integration).
 *
 * Tests the hook's onSuccess and onError callbacks by mocking the mutation
 * internals. Does NOT test the full mutationFn (which requires Tauri IPC).
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock all external dependencies
// NOTE: vi.mock factories are hoisted to the top of the file by Vitest.
// Variables used inside factory functions must be declared with vi.hoisted()
// to ensure they are initialized before the factory runs.
const { invalidateQueriesMock, insertSyncErrorMock, capturePreSyncSnapshotMock, getRulesSyncMetaMock, getLatestSnapshotMock, getRulesDbSelectMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
  insertSyncErrorMock: vi.fn(),
  capturePreSyncSnapshotMock: vi.fn(),
  getRulesSyncMetaMock: vi.fn(),
  getLatestSnapshotMock: vi.fn(),
  getRulesDbSelectMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn((opts: Record<string, unknown>) => opts),
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock("@tauri-apps/plugin-http", () => ({
  fetch: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@/lib/parseWahapediaCsv", () => ({
  parseWahapediaCsv: vi.fn(() => []),
}));

vi.mock("@/lib/stripHtml", () => ({
  stripHtml: vi.fn((s: string) => s),
}));

vi.mock("@/lib/validateCsvHeaders", () => ({
  validateCsvHeaders: vi.fn(),
}));

vi.mock("@/db/queries/syncErrors", () => ({
  insertSyncError: insertSyncErrorMock,
}));

vi.mock("@/hooks/useDatasheet", () => ({
  RULES_SYNC_META_KEY: ["rules-sync-meta"],
}));

vi.mock("@/db/queries/rulesSnapshot", () => ({
  capturePreSyncSnapshot: capturePreSyncSnapshotMock,
  getLatestSnapshot: getLatestSnapshotMock,
}));

vi.mock("@/db/rules-client", () => ({
  getRulesDb: vi.fn(async () => ({
    select: getRulesDbSelectMock,
  })),
}));

vi.mock("@/db/queries/datasheets", () => ({
  getRulesSyncMeta: getRulesSyncMetaMock,
}));

vi.mock("@/hooks/useSyncErrors", () => ({
  SYNC_ERRORS_KEY: ["sync-errors"],
}));

import { useRulesSync } from "@/hooks/useRulesSync";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";

beforeEach(() => {
  invalidateQueriesMock.mockReset();
  insertSyncErrorMock.mockReset();
  vi.mocked(tauriFetch).mockReset();
  vi.mocked(invoke).mockReset();
  getLatestSnapshotMock.mockReset();
  getRulesDbSelectMock.mockReset();
});

describe("useRulesSync", () => {
  it("SYNC-05: onSuccess invalidates all 10 query keys (8 original + 2 Phase 52)", () => {
    const opts = useRulesSync() as unknown as {
      onSuccess: () => void;
    };
    opts.onSuccess();

    expect(invalidateQueriesMock).toHaveBeenCalledTimes(10);

    const calls = invalidateQueriesMock.mock.calls.map(
      (c: { queryKey: string[] }[]) => c[0].queryKey[0],
    );
    expect(calls).toContain("rules-sync-meta");
    expect(calls).toContain("datasheets-by-faction");
    expect(calls).toContain("datasheet");
    expect(calls).toContain("stratagems-by-faction");
    expect(calls).toContain("detachments-by-faction");
    expect(calls).toContain("detachment-abilities");
    expect(calls).toContain("shared-abilities-by-faction");
    expect(calls).toContain("sync-errors");
    // Phase 52 — new rules.db query keys
    expect(calls).toContain("detachment-by-id");
    expect(calls).toContain("stratagems-by-detachment");
  });

  it("SYNC-05: Phase 43 invalidation calls use exact: false", () => {
    const opts = useRulesSync() as unknown as {
      onSuccess: () => void;
    };
    opts.onSuccess();

    const phase43Calls = invalidateQueriesMock.mock.calls.filter(
      (c: { queryKey: string[]; exact?: boolean }[]) =>
        ["stratagems-by-faction", "detachments-by-faction", "detachment-abilities", "shared-abilities-by-faction"]
          .includes(c[0].queryKey[0]),
    );
    expect(phase43Calls).toHaveLength(4);
    for (const call of phase43Calls) {
      expect((call[0] as { queryKey: string[]; exact?: boolean }).exact).toBe(false);
    }
  });

  it("SYNC-04: onError calls insertSyncError with validation_error type for CSV errors", async () => {
    insertSyncErrorMock.mockResolvedValue(undefined);
    const opts = useRulesSync() as unknown as {
      onError: (err: Error) => Promise<void>;
    };
    await opts.onError(new Error("Factions.csv: missing required columns: name"));

    expect(insertSyncErrorMock).toHaveBeenCalledOnce();
    const input = insertSyncErrorMock.mock.calls[0][0];
    expect(input.error_type).toBe("validation_error");
    expect(input.message).toBe("Factions.csv: missing required columns: name");
    expect(input.csv_file).toBe("Factions.csv");
  });

  it("SYNC-04: onError classifies fetch errors as fetch_failed", async () => {
    insertSyncErrorMock.mockResolvedValue(undefined);
    const opts = useRulesSync() as unknown as {
      onError: (err: Error) => Promise<void>;
    };
    await opts.onError(new Error("Failed to fetch Datasheets.csv: HTTP 500"));

    const input = insertSyncErrorMock.mock.calls[0][0];
    expect(input.error_type).toBe("fetch_failed");
  });

  it("SYNC-04: onError defaults to sync_error for unknown error types", async () => {
    insertSyncErrorMock.mockResolvedValue(undefined);
    const opts = useRulesSync() as unknown as {
      onError: (err: Error) => Promise<void>;
    };
    await opts.onError(new Error("commit: database is locked"));

    const input = insertSyncErrorMock.mock.calls[0][0];
    expect(input.error_type).toBe("sync_error");
    expect(input.csv_file).toBeNull();
  });

  it("SYNC-02: mutationFn rowCounts are sourced from Rust invoke result, not TypeScript array lengths", async () => {
    // Arrange: mock fetch to return empty CSV text for all 12 files
    // parseWahapediaCsv is already mocked to return [] (empty array, zero .length)
    // validateCsvHeaders is already mocked as no-op
    const fakeCsvResponse = { ok: true, text: async () => "" };
    vi.mocked(tauriFetch).mockResolvedValue(fakeCsvResponse as ReturnType<typeof tauriFetch> extends Promise<infer R> ? R : never);

    // Mock invoke to return a RustSyncResult with distinct non-zero counts.
    // If rowCounts were built from array .length instead of rustResult fields,
    // the values would all be 0 (because parseWahapediaCsv returns []).
    const mockRustResult = {
      factions: 10,
      sources: 20,
      datasheets: 300,
      models: 1200,
      abilities: 450,
      keywords: 600,
      wargear: 250,
      shared_abilities: 90,
      stratagems: 80,
      detachments: 30,
      detachment_abilities: 70,
    };
    vi.mocked(invoke).mockResolvedValue(mockRustResult);

    // Act: call mutationFn directly via the captured useMutation options
    const opts = useRulesSync() as unknown as {
      mutationFn: () => Promise<{ wahapediaVersion: string; rowCounts: Record<string, number> }>;
    };
    const result = await opts.mutationFn();

    // Assert: rowCounts match Rust struct fields, not TypeScript .length values
    // (parseWahapediaCsv returns [] so .length would be 0 for every field)
    expect(result.rowCounts.factions).toBe(10);
    expect(result.rowCounts.datasheets).toBe(300);
    expect(result.rowCounts.models).toBe(1200);
    expect(result.rowCounts.abilities).toBe(450);
    expect(result.rowCounts.keywords).toBe(600);
    expect(result.rowCounts.wargear).toBe(250);
    expect(result.rowCounts.shared_abilities).toBe(90);
    expect(result.rowCounts.stratagems).toBe(80);
    expect(result.rowCounts.detachments).toBe(30);
    expect(result.rowCounts.detachment_abilities).toBe(70);

    // Also assert invoke was called with the Tauri command name
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("bulk_sync_rules", expect.any(Object));
  });

  it("META-06: mutationFn calls capturePreSyncSnapshot before invoke(bulk_sync_rules)", async () => {
    // Arrange: mock fetch to return empty CSV text for all 12 files
    const fakeCsvResponse = { ok: true, text: async () => "" };
    vi.mocked(tauriFetch).mockResolvedValue(fakeCsvResponse as ReturnType<typeof tauriFetch> extends Promise<infer R> ? R : never);

    const mockRustResult = {
      factions: 1, sources: 1, datasheets: 1, models: 1, abilities: 1,
      keywords: 1, wargear: 1, shared_abilities: 1, stratagems: 1,
      detachments: 1, detachment_abilities: 1,
    };
    vi.mocked(invoke).mockResolvedValue(mockRustResult);

    // Track call order
    const callOrder: string[] = [];
    capturePreSyncSnapshotMock.mockImplementation(async () => {
      callOrder.push("capturePreSyncSnapshot");
    });
    getRulesSyncMetaMock.mockResolvedValue(null);
    vi.mocked(invoke).mockImplementation(async () => {
      callOrder.push("invoke");
      return mockRustResult;
    });

    const opts = useRulesSync() as unknown as {
      mutationFn: () => Promise<unknown>;
    };
    await opts.mutationFn();

    // capturePreSyncSnapshot must appear before invoke in the call order
    const snapshotIdx = callOrder.indexOf("capturePreSyncSnapshot");
    const invokeIdx = callOrder.indexOf("invoke");
    expect(snapshotIdx).toBeGreaterThanOrEqual(0);
    expect(invokeIdx).toBeGreaterThanOrEqual(0);
    expect(snapshotIdx).toBeLessThan(invokeIdx);
  });

  it("META-06: mutationFn proceeds with sync when capturePreSyncSnapshot throws", async () => {
    // Arrange: mock fetch to return empty CSV text for all 12 files
    const fakeCsvResponse = { ok: true, text: async () => "" };
    vi.mocked(tauriFetch).mockResolvedValue(fakeCsvResponse as ReturnType<typeof tauriFetch> extends Promise<infer R> ? R : never);

    const mockRustResult = {
      factions: 5, sources: 2, datasheets: 100, models: 400, abilities: 150,
      keywords: 200, wargear: 80, shared_abilities: 30, stratagems: 25,
      detachments: 10, detachment_abilities: 20,
    };
    vi.mocked(invoke).mockResolvedValue(mockRustResult);

    // Snapshot throws — sync must still proceed
    capturePreSyncSnapshotMock.mockRejectedValue(new Error("rules.db not available"));
    getRulesSyncMetaMock.mockResolvedValue(null);

    const opts = useRulesSync() as unknown as {
      mutationFn: () => Promise<{ wahapediaVersion: string; rowCounts: Record<string, number> }>;
    };

    // Should not throw despite snapshot failure
    const result = await opts.mutationFn();

    // invoke was still called
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("bulk_sync_rules", expect.any(Object));
    // Result is populated from Rust
    expect(result.rowCounts.datasheets).toBe(100);
  });

  it("META-06: onSuccess invalidates SYNC_ERRORS_KEY", () => {
    const hookResult = useRulesSync() as unknown as Record<string, (...args: unknown[]) => void>;
    hookResult.onSuccess({ wahapediaVersion: "v1", rowCounts: {} });
    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["sync-errors"] })
    );
  });

  it("META-04: onError invalidates SYNC_ERRORS_KEY after logging error", async () => {
    insertSyncErrorMock.mockResolvedValue(undefined);
    const hookResult = useRulesSync() as unknown as Record<string, (...args: unknown[]) => Promise<void>>;
    await hookResult.onError(new Error("test error"));
    expect(invalidateQueriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["sync-errors"] })
    );
  });
});

// ── Phase 47 — Extended snapshot wiring in mutationFn (OVRD-06) ───────────────

describe("useRulesSync — extended snapshot data wiring (Phase 47)", () => {
  it("OVRD-06: mutationFn passes extended snapshot data to computeSyncDiff and returns diff.modified with T field change", async () => {
    // Arrange: mock fetch to return empty CSV text for all 12 files
    const fakeCsvResponse = { ok: true, text: async () => "" };
    vi.mocked(tauriFetch).mockResolvedValue(
      fakeCsvResponse as ReturnType<typeof tauriFetch> extends Promise<infer R> ? R : never,
    );

    const mockRustResult = {
      factions: 1, sources: 1, datasheets: 1, models: 1, abilities: 1,
      keywords: 1, wargear: 1, shared_abilities: 1, stratagems: 1,
      detachments: 1, detachment_abilities: 1,
    };
    vi.mocked(invoke).mockResolvedValue(mockRustResult);

    getRulesSyncMetaMock.mockResolvedValue(null);
    capturePreSyncSnapshotMock.mockResolvedValue(undefined);

    // Pre-sync snapshot: ds1 exists with T=5 in models snapshot
    const preSyncDsSnapshot = JSON.stringify([{ id: "ds1", name: "Alpha" }]);
    const preSyncModelsSnapshot = JSON.stringify([
      { datasheet_id: "ds1", line: 1, name: null, M: "6\"", T: 5, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 1 },
    ]);
    const preSyncKeywordsSnapshot = JSON.stringify([
      { datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 },
    ]);
    const preSyncAbilitiesSnapshot = JSON.stringify([
      { datasheet_id: "ds1", line: 1, ability_id: "ab1", name: "Rapid Fire", description: null, type: null },
    ]);

    getLatestSnapshotMock.mockResolvedValue([
      { id: 1, captured_at: "2026-01-01T00:00:00Z", wahapedia_version: "v1", table_name: "rw_datasheets",          row_count: 1, snapshot_data: preSyncDsSnapshot },
      { id: 2, captured_at: "2026-01-01T00:00:00Z", wahapedia_version: "v1", table_name: "rw_datasheet_models",   row_count: 1, snapshot_data: preSyncModelsSnapshot },
      { id: 3, captured_at: "2026-01-01T00:00:00Z", wahapedia_version: "v1", table_name: "rw_datasheet_keywords", row_count: 1, snapshot_data: preSyncKeywordsSnapshot },
      { id: 4, captured_at: "2026-01-01T00:00:00Z", wahapedia_version: "v1", table_name: "rw_datasheet_abilities", row_count: 1, snapshot_data: preSyncAbilitiesSnapshot },
    ]);

    // Post-sync state: ds1 still exists, but T changed from 5 to 6
    getRulesDbSelectMock.mockImplementation(async (query: string) => {
      if (query.startsWith("SELECT id, name FROM rw_datasheets")) {
        return [{ id: "ds1", name: "Alpha" }];
      }
      if (query.startsWith("SELECT datasheet_id, line, name, M, T, Sv")) {
        // rw_datasheet_models — T is now 6
        return [
          { datasheet_id: "ds1", line: 1, name: null, M: "6\"", T: 6, Sv: "3+", inv_sv: null, W: 2, Ld: "6+", OC: 1 },
        ];
      }
      if (query.startsWith("SELECT datasheet_id, keyword")) {
        // rw_datasheet_keywords — unchanged
        return [{ datasheet_id: "ds1", keyword: "INFANTRY", is_faction_keyword: 0 }];
      }
      if (query.startsWith("SELECT datasheet_id, line, ability_id")) {
        // rw_datasheet_abilities — unchanged
        return [{ datasheet_id: "ds1", line: 1, ability_id: "ab1", name: "Rapid Fire", description: null, type: null }];
      }
      return [];
    });

    // Act
    const opts = useRulesSync() as unknown as {
      mutationFn: () => Promise<{ wahapediaVersion: string; rowCounts: Record<string, number>; diff: { modified: Array<{ id: string; name: string; changes: Array<{ field: string; oldValue: string; newValue: string }> }>; total_changed: number; added: unknown[]; removed: unknown[]; renamed: unknown[] } }>;
    };
    const result = await opts.mutationFn();

    // Assert: diff.modified has at least one entry for ds1 with T field change
    expect(result.diff.modified).toHaveLength(1);
    expect(result.diff.modified[0].id).toBe("ds1");
    expect(result.diff.modified[0].name).toBe("Alpha");

    const tChange = result.diff.modified[0].changes.find((c) => c.field === "T");
    expect(tChange).toBeDefined();
    expect(tChange?.oldValue).toBe("5");
    expect(tChange?.newValue).toBe("6");

    // total_changed must reflect the modified entry
    expect(result.diff.total_changed).toBeGreaterThanOrEqual(1);
  });
});
