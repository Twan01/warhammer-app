/**
 * Phase 13 — useJournalSessions hook tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 13-02 will:
 *   1. Create src/hooks/useJournalSessions.ts exporting useJournalSessions + useDeletePaintingSession.
 *   2. Replace each `it.skip` below with `it`.
 *   3. Add real assertions matching 13-VALIDATION.md row JOUR-03 (optimistic delete).
 *
 * The stub exists in Wave 0 so Plan 13-02 has a concrete failing-or-skipped vitest target.
 */
import { describe, it } from "vitest";

describe("useJournalSessions — Wave 0 stubs", () => {
  it.skip("JOUR-03: useDeletePaintingSession optimistically removes the row from query cache on mutate", () => {
    // Plan 13-02 will:
    //   - vi.mock("@/db/queries/paintingSessions", () => ({ deleteSession: vi.fn().mockResolvedValue(undefined), ... }))
    //   - create QueryClient, prime PAINTING_SESSIONS_KEY(7) cache with [{ id: 1, ... }, { id: 2, ... }]
    //   - render <QueryClientProvider><TestConsumer unitId={7}/></QueryClientProvider>
    //   - call mutate(1) via testing-library button click or hook helper
    //   - immediately (before await) read qc.getQueryData(PAINTING_SESSIONS_KEY(7))
    //   - assert cache equals [{ id: 2, ... }] — row 1 removed before SQL fired
  });

  it.skip("JOUR-03: useDeletePaintingSession rolls back the cache to the previous snapshot when deleteSession rejects", () => {
    // Plan 13-02 will:
    //   - vi.mock deleteSession to reject with new Error("DB error")
    //   - prime cache with [{ id: 1, ... }, { id: 2, ... }]
    //   - call mutate(1); await flush
    //   - assert cache restored to [{ id: 1, ... }, { id: 2, ... }] (rollback occurred)
    //   - assert toast.error spy called with "Failed to delete session — changes were not saved."
  });
});
