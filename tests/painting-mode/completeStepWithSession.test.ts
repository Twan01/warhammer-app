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
  it("wraps both writes in BEGIN/COMMIT", async () => {
    await completeStepWithSession(5, 2, {
      unit_id: 1,
      session_date: "2026-05-19",
      duration_minutes: 30,
    });

    expect(executeMock).toHaveBeenCalledTimes(4);
    expect(executeMock.mock.calls[0][0]).toBe("BEGIN TRANSACTION");
    expect(executeMock.mock.calls[1][0]).toContain(
      "ON CONFLICT(assignment_id, recipe_step_id)",
    );
    expect(executeMock.mock.calls[2][0]).toContain(
      "INSERT INTO painting_sessions",
    );
    expect(executeMock.mock.calls[3][0]).toBe("COMMIT");
  });

  it("passes correct params for step progress upsert", async () => {
    await completeStepWithSession(5, 2, {
      unit_id: 1,
      session_date: "2026-05-19",
      duration_minutes: 30,
    });

    expect(executeMock.mock.calls[1][1]).toEqual([
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

    expect(executeMock.mock.calls[2][1]).toEqual([
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

  it("ROLLBACKs if session INSERT throws", async () => {
    executeMock
      .mockResolvedValueOnce({ lastInsertId: 0 }) // BEGIN
      .mockResolvedValueOnce({ lastInsertId: 1 }) // upsert
      .mockRejectedValueOnce(new Error("FK violation")) // session INSERT
      .mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(
      completeStepWithSession(5, 2, {
        unit_id: 1,
        session_date: "2026-05-19",
        duration_minutes: 30,
      }),
    ).rejects.toThrow("FK violation");

    expect(executeMock.mock.calls[3][0]).toBe("ROLLBACK");
  });

  it("ROLLBACKs if step progress upsert throws", async () => {
    executeMock
      .mockResolvedValueOnce({ lastInsertId: 0 }) // BEGIN
      .mockRejectedValueOnce(new Error("upsert failed")) // upsert
      .mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(
      completeStepWithSession(5, 2, {
        unit_id: 1,
        session_date: "2026-05-19",
        duration_minutes: 30,
      }),
    ).rejects.toThrow("upsert failed");

    expect(executeMock.mock.calls[2][0]).toBe("ROLLBACK");
  });
});
