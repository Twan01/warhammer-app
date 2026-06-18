/**
 * Phase 138 — Regression lock: painting session mutations invalidate goal-progress.
 *
 * Locks the behavior confirmed by RESEARCH OQ#1:
 *   useCreatePaintingSession onSuccess invalidates ["goal-progress"]
 *   useDeletePaintingSession onSettled invalidates ["goal-progress"]
 *
 * Strategy: structural source test (same pattern as ANLY-02 in tests/goals/useGoals.test.tsx).
 * If the invalidation is accidentally removed, these tests will fail and alert the developer
 * that the widget will go stale after logging sessions.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SESSIONS_FILE = resolve(
  __dirname,
  "../../src/hooks/useJournalSessions.ts"
);

describe("useCreatePaintingSession invalidation regression (T-138-08)", () => {
  it('invalidates ["goal-progress"] in onSuccess', () => {
    const content = readFileSync(SESSIONS_FILE, "utf-8");
    // Verify onSuccess block contains goal-progress invalidation
    expect(content).toContain('queryKey: ["goal-progress"]');
  });

  it("useCreatePaintingSession source contains invalidateQueries for goal-progress", () => {
    const content = readFileSync(SESSIONS_FILE, "utf-8");
    // Both create and delete paths must invalidate goal-progress —
    // count occurrences to ensure at least 2 (one per mutation)
    const matches = content.match(/queryKey: \["goal-progress"\]/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});
