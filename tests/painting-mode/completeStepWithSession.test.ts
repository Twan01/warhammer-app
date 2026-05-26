import { vi, describe, it, expect, beforeEach } from "vitest";

const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import { completeStepWithSession } from "@/db/queries/recipeAssignments";

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
});

describe("completeStepWithSession", () => {
  it("executes both writes in auto-commit mode (no BEGIN/COMMIT)", async () => {
    await completeStepWithSession(5, 2, {
      unit_id: 1,
      session_date: "2026-05-19",
      duration_minutes: 30,
    });

    // 2 calls: step progress upsert + session INSERT (auto-commit, no BEGIN/COMMIT)
    expect(executeMock).toHaveBeenCalledTimes(2);
    expect(executeMock.mock.calls[0][0]).toContain(
      "ON CONFLICT(assignment_id, recipe_step_id)",
    );
    expect(executeMock.mock.calls[1][0]).toContain(
      "INSERT INTO painting_sessions",
    );
  });

  it("passes correct params for step progress upsert", async () => {
    await completeStepWithSession(5, 2, {
      unit_id: 1,
      session_date: "2026-05-19",
      duration_minutes: 30,
    });

    expect(executeMock.mock.calls[0][1]).toEqual([
      5,
      2,
      1,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    ]);
  });

  it("passes correct params for session INSERT", async () => {
    await completeStepWithSession(5, 2, {
      unit_id: 1,
      session_date: "2026-05-19",
      duration_minutes: 30,
      notes: "Base coat done",
      recipe_id: 10,
      section_name: "Armor",
      recipe_section_id: 3,
    });

    expect(executeMock.mock.calls[1][1]).toEqual([
      1,            // unit_id
      "2026-05-19", // session_date
      30,           // duration_minutes
      "Base coat done", // notes
      10,           // recipe_id
      2,            // recipeStepId (argument, not from session)
      "Armor",      // section_name
      3,            // recipe_section_id
    ]);
  });

  it("re-throws error if session INSERT throws (no ROLLBACK in auto-commit)", async () => {
    executeMock
      .mockResolvedValueOnce({ lastInsertId: 1 }) // upsert
      .mockRejectedValueOnce(new Error("FK violation")); // session INSERT

    await expect(
      completeStepWithSession(5, 2, {
        unit_id: 1,
        session_date: "2026-05-19",
        duration_minutes: 30,
      }),
    ).rejects.toThrow("FK violation");

    // No ROLLBACK call — auto-commit mode
    const sqlCalls = executeMock.mock.calls.map(([sql]) => sql);
    expect(sqlCalls).not.toContain("ROLLBACK");
  });

  it("re-throws error if step progress upsert throws", async () => {
    executeMock
      .mockRejectedValueOnce(new Error("upsert failed")); // upsert

    await expect(
      completeStepWithSession(5, 2, {
        unit_id: 1,
        session_date: "2026-05-19",
        duration_minutes: 30,
      }),
    ).rejects.toThrow("upsert failed");
  });
});
