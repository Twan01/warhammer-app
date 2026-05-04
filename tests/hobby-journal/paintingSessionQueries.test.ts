/**
 * JOUR-01..03 — paintingSessions query function tests.
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Verifies SQL strings + parameter arrays.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import {
  getSessionsByUnit,
  createSession,
  deleteSession,
} from "@/db/queries/paintingSessions";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("paintingSessions queries", () => {
  it("JOUR-01: createSession runs INSERT INTO painting_sessions with (unit_id, session_date, duration_minutes, notes) and 4 positional params", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await createSession({
      unit_id: 7,
      session_date: "2026-05-03",
      duration_minutes: 45,
      notes: "Layered shoulder pads",
    });

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO painting_sessions \(unit_id, session_date, duration_minutes, notes\)/);
    expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4\)/);
    expect(params).toEqual([7, "2026-05-03", 45, "Layered shoulder pads"]);
  });

  it("JOUR-01: createSession passes null when notes field omitted (input.notes ?? null)", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await createSession({
      unit_id: 7,
      session_date: "2026-05-03",
      duration_minutes: 30,
    });

    const params = executeMock.mock.calls[0][1] as unknown[];
    expect(params[3]).toBeNull();
  });

  it("JOUR-02: getSessionsByUnit issues SELECT * WHERE unit_id=$1 ORDER BY session_date DESC, id DESC", async () => {
    selectMock.mockResolvedValueOnce([
      { id: 2, unit_id: 7, session_date: "2026-05-03", duration_minutes: 45, notes: null, created_at: "2026-05-03" },
      { id: 1, unit_id: 7, session_date: "2026-05-02", duration_minutes: 30, notes: null, created_at: "2026-05-02" },
    ]);

    const rows = await getSessionsByUnit(7);

    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM painting_sessions WHERE unit_id = $1 ORDER BY session_date DESC, id DESC",
      [7]
    );
    expect(rows).toHaveLength(2);
  });

  it("JOUR-03: deleteSession issues DELETE FROM painting_sessions WHERE id=$1 with single param", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await deleteSession(42);

    expect(executeMock).toHaveBeenCalledWith(
      "DELETE FROM painting_sessions WHERE id = $1",
      [42]
    );
  });
});
