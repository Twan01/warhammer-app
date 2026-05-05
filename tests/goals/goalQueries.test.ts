/**
 * Phase 22 — Hobby Goals query module SQL contract tests.
 *
 * Plan 22-01: Wave 0 stubs activated with real test bodies.
 * Mocks getDb() and computeGoalPeriod because tauri-plugin-sql IPC cannot run in jsdom.
 *
 * Covers ANLY-01 (createGoal + getGoals + updateGoal + deleteGoal SQL),
 *         ANLY-02 (getGoalProgress COUNT(DISTINCT unit_id) filtered by period).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { getGoals, createGoal, updateGoal, deleteGoal, getGoalProgress } from "@/db/queries/goals";

const selectMock = vi.fn();
const executeMock = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

vi.mock("@/features/goals/computeGoalPeriod", () => ({
  computeGoalPeriod: vi.fn(() => ({ startDate: "2026-05-01", endDate: "2026-05-31" })),
}));

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("goals queries — getGoals (ANLY-01)", () => {
  it("calls db.select with SELECT * FROM hobby_goals ORDER BY created_at DESC", async () => {
    selectMock.mockResolvedValue([]);
    await getGoals();
    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM hobby_goals ORDER BY created_at DESC"
    );
  });
});

describe("goals queries — createGoal (ANLY-01)", () => {
  it("INSERTs name, target_count, timeframe, period columns and returns lastInsertId", async () => {
    executeMock.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
    const id = await createGoal({ name: "Paint 5", target_count: 5, timeframe: "month", period: "2026-05" });
    expect(executeMock).toHaveBeenCalledWith(
      "INSERT INTO hobby_goals (name, target_count, timeframe, period) VALUES ($1, $2, $3, $4)",
      ["Paint 5", 5, "month", "2026-05"]
    );
    expect(id).toBe(1);
  });
});

describe("goals queries — updateGoal (ANLY-01)", () => {
  it("UPDATEs name, target_count, timeframe, period WHERE id = $5", async () => {
    executeMock.mockResolvedValue({ lastInsertId: 0, rowsAffected: 1 });
    await updateGoal({ id: 1, name: "Paint 10", target_count: 10, timeframe: "quarter", period: "2026-Q2" });
    expect(executeMock).toHaveBeenCalledWith(
      "UPDATE hobby_goals SET name = $1, target_count = $2, timeframe = $3, period = $4 WHERE id = $5",
      ["Paint 10", 10, "quarter", "2026-Q2", 1]
    );
  });
});

describe("goals queries — deleteGoal (ANLY-01)", () => {
  it("DELETEs by id", async () => {
    executeMock.mockResolvedValue({ lastInsertId: 0, rowsAffected: 1 });
    await deleteGoal(1);
    expect(executeMock).toHaveBeenCalledWith(
      "DELETE FROM hobby_goals WHERE id = $1",
      [1]
    );
  });
});

describe("goals queries — getGoalProgress (ANLY-02)", () => {
  it("returns empty Map for empty goals array", async () => {
    const result = await getGoalProgress([]);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("calls db.select with COUNT(DISTINCT unit_id) filtered by startDate/endDate per goal", async () => {
    selectMock.mockResolvedValue([{ progress_count: 3 }]);
    const goal = { id: 42, name: "Paint 5", target_count: 5, timeframe: "month" as const, period: "2026-05", created_at: "2026-05-01T00:00:00" };
    const result = await getGoalProgress([goal]);
    expect(selectMock).toHaveBeenCalledWith(
      "SELECT COUNT(DISTINCT unit_id) AS progress_count FROM painting_sessions WHERE session_date >= $1 AND session_date <= $2",
      ["2026-05-01", "2026-05-31"]
    );
    expect(result.get(42)).toBe(3);
  });
});
