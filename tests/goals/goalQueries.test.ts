/**
 * Phase 22 — Hobby Goals query module SQL contract stubs.
 *
 * Wave 0: it.skip placeholders naming the exact behavior Plans 22-01 and 22-02 must satisfy.
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 * Mirrors tests/battle-log/battleLogQueries.test.ts pattern.
 *
 * Covers ANLY-01 (createGoal + getGoals + updateGoal + deleteGoal SQL),
 *         ANLY-02 (getGoalProgress COUNT(DISTINCT unit_id) filtered by period).
 */

// TODO Plan 22-01: import { getGoals, createGoal, updateGoal, deleteGoal, getGoalProgress } from "@/db/queries/goals"

import { describe, it, vi } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();
vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

describe("goals queries — getGoals (ANLY-01)", () => {
  it.skip("calls db.select with SELECT * FROM hobby_goals ORDER BY created_at DESC", () => {});
});

describe("goals queries — createGoal (ANLY-01)", () => {
  it.skip("INSERTs name, target_count, timeframe, period columns and returns lastInsertId", () => {});
});

describe("goals queries — updateGoal (ANLY-01)", () => {
  it.skip("UPDATEs name, target_count, timeframe, period WHERE id = $5", () => {});
});

describe("goals queries — deleteGoal (ANLY-01)", () => {
  it.skip("DELETEs by id", () => {});
});

describe("goals queries — getGoalProgress (ANLY-02)", () => {
  it.skip("returns empty Map for empty goals array", () => {});
  it.skip("calls db.select with COUNT(DISTINCT unit_id) filtered by startDate/endDate per goal", () => {});
});
