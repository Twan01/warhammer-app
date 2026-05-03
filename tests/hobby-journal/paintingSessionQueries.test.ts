/**
 * Phase 13 — paintingSessions queries tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 13-02 will:
 *   1. Create src/db/queries/paintingSessions.ts with createSession, getSessionsByUnit, deleteSession.
 *   2. Create src/types/paintingSession.ts exporting PaintingSession + CreateSessionInput.
 *   3. Replace each `it.skip` below with `it`.
 *   4. Add real assertions matching 13-VALIDATION.md §Per-Task Verification Map rows for JOUR-01, JOUR-02, JOUR-03.
 *
 * The stub exists in Wave 0 so Plan 13-02 has a concrete failing-or-skipped vitest target.
 */
import { describe, it } from "vitest";

describe("paintingSessions queries — Wave 0 stubs", () => {
  it.skip("JOUR-01: createSession runs INSERT INTO painting_sessions with (unit_id, session_date, duration_minutes, notes) and 4 positional params", () => {
    // Plan 13-02 will:
    //   - selectMock + executeMock setup like tests/foundation/strategyNoteQueries.test.ts
    //   - import { createSession } from "@/db/queries/paintingSessions"
    //   - call createSession({ unit_id: 7, session_date: "2026-05-03", duration_minutes: 45, notes: "Layered shoulder pads" })
    //   - assert executeMock called with SQL matching /INSERT INTO painting_sessions \(unit_id, session_date, duration_minutes, notes\)/
    //   - assert SQL matches /VALUES \(\$1, \$2, \$3, \$4\)/
    //   - assert params equal [7, "2026-05-03", 45, "Layered shoulder pads"]
  });

  it.skip("JOUR-01: createSession passes null when notes field omitted (input.notes ?? null)", () => {
    // Plan 13-02 will:
    //   - call createSession({ unit_id: 7, session_date: "2026-05-03", duration_minutes: 30 })
    //   - assert params[3] === null (not undefined)
  });

  it.skip("JOUR-02: getSessionsByUnit issues SELECT * WHERE unit_id=$1 ORDER BY session_date DESC, id DESC", () => {
    // Plan 13-02 will:
    //   - selectMock.mockResolvedValueOnce([{ id: 2, session_date: "2026-05-03", ... }, { id: 1, ... }])
    //   - import { getSessionsByUnit } from "@/db/queries/paintingSessions"
    //   - const rows = await getSessionsByUnit(7)
    //   - assert selectMock called with EXACTLY:
    //     "SELECT * FROM painting_sessions WHERE unit_id = $1 ORDER BY session_date DESC, id DESC"
    //     and [7]
    //   - assert rows length === 2 (returned in order from mock — query module does not re-sort)
  });

  it.skip("JOUR-03: deleteSession issues DELETE FROM painting_sessions WHERE id=$1 with single param", () => {
    // Plan 13-02 will:
    //   - executeMock.mockResolvedValueOnce(undefined)
    //   - import { deleteSession } from "@/db/queries/paintingSessions"
    //   - await deleteSession(42)
    //   - assert executeMock called with "DELETE FROM painting_sessions WHERE id = $1" and [42]
  });
});
