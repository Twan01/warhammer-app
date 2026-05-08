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
const { invalidateQueriesMock, insertSyncErrorMock } = vi.hoisted(() => ({
  invalidateQueriesMock: vi.fn(),
  insertSyncErrorMock: vi.fn(),
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

import { useRulesSync } from "@/hooks/useRulesSync";

beforeEach(() => {
  invalidateQueriesMock.mockReset();
  insertSyncErrorMock.mockReset();
});

describe("useRulesSync", () => {
  it("SYNC-05: onSuccess invalidates all 7 query keys", () => {
    const opts = useRulesSync() as unknown as {
      onSuccess: () => void;
    };
    opts.onSuccess();

    expect(invalidateQueriesMock).toHaveBeenCalledTimes(7);

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
});
