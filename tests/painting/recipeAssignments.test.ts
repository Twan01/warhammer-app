/**
 * AR-01 — recipeAssignments query module and hook contract coverage.
 *
 * Tests SQL assertions for all 8 query functions and hook invalidation
 * contracts for all 4 mutation hooks. D-13 symmetry test verifies
 * useCreateAssignment and useDeleteAssignment invalidate identical keys.
 *
 * Mocks getDb() because tauri-plugin-sql IPC cannot run in jsdom.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const executeMock = vi.fn();
const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

// Import AFTER vi.mock so the mocked client is used
import {
  getAssignmentsByUnit,
  getAssignmentsByRecipe,
  getAssignment,
  createAssignment,
  deleteAssignment,
  getStepProgress,
  upsertStepProgress,
  bulkCreateAssignments,
} from "@/db/queries/recipeAssignments";

// Hook imports
import {
  ASSIGNMENTS_KEY,
  UNIT_ASSIGNMENTS_KEY,
  RECIPE_ASSIGNMENTS_KEY,
  STEP_PROGRESS_KEY,
  useCreateAssignment,
  useDeleteAssignment,
  useToggleStepProgress,
  useBulkCreateAssignments,
} from "@/hooks/useRecipeAssignments";

beforeEach(() => {
  executeMock.mockReset();
  selectMock.mockReset();
  executeMock.mockResolvedValue({ lastInsertId: 1 });
  selectMock.mockResolvedValue([]);
});

// Helper shared by hook invalidation groups
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { qc, spy, wrapper };
}

// ---------------------------------------------------------------------------
// Group 1 — getAssignmentsByUnit
// ---------------------------------------------------------------------------
describe("getAssignmentsByUnit — SQL assertions", () => {
  it("queries unit_recipe_assignments filtered by unit_id with correct order", async () => {
    await getAssignmentsByUnit(10);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("FROM unit_recipe_assignments WHERE unit_id = $1");
    expect(sql).toContain("ORDER BY created_at ASC");
    expect(params).toEqual([10]);
  });

  it("passes the caller's unitId as the $1 param", async () => {
    await getAssignmentsByUnit(42);
    const [, params] = selectMock.mock.calls[0];
    expect(params[0]).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Group 2 — getAssignmentsByRecipe
// ---------------------------------------------------------------------------
describe("getAssignmentsByRecipe — SQL assertions", () => {
  it("queries unit_recipe_assignments filtered by recipe_id with correct order", async () => {
    await getAssignmentsByRecipe(5);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("FROM unit_recipe_assignments WHERE recipe_id = $1");
    expect(sql).toContain("ORDER BY created_at ASC");
    expect(params).toEqual([5]);
  });
});

// ---------------------------------------------------------------------------
// Group 3 — getAssignment
// ---------------------------------------------------------------------------
describe("getAssignment — SQL assertions", () => {
  it("queries by id and returns first element", async () => {
    const mockRow = { id: 3, unit_id: 1, recipe_id: 2, created_at: "2026-01-01" };
    selectMock.mockResolvedValueOnce([mockRow]);
    const result = await getAssignment(3);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("FROM unit_recipe_assignments WHERE id = $1");
    expect(params).toEqual([3]);
    expect(result).toEqual(mockRow);
  });

  it("returns null when no rows found", async () => {
    selectMock.mockResolvedValueOnce([]);
    const result = await getAssignment(999);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Group 4 — createAssignment
// ---------------------------------------------------------------------------
describe("createAssignment — SQL assertions", () => {
  it("INSERT contains unit_id, recipe_id columns and $1, $2 placeholders", async () => {
    await createAssignment({ unit_id: 1, recipe_id: 2 });
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO unit_recipe_assignments");
    expect(sql).toContain("unit_id");
    expect(sql).toContain("recipe_id");
    expect(sql).toContain("$1");
    expect(sql).toContain("$2");
    expect(params).toEqual([1, 2]);
  });

  it("returns lastInsertId from db.execute result", async () => {
    executeMock.mockResolvedValueOnce({ lastInsertId: 77 });
    const id = await createAssignment({ unit_id: 1, recipe_id: 2 });
    expect(id).toBe(77);
  });

  it("returns 0 when lastInsertId is undefined", async () => {
    executeMock.mockResolvedValueOnce({});
    const id = await createAssignment({ unit_id: 1, recipe_id: 2 });
    expect(id).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Group 5 — deleteAssignment
// ---------------------------------------------------------------------------
describe("deleteAssignment — SQL assertions", () => {
  it("executes DELETE FROM unit_recipe_assignments WHERE id = $1", async () => {
    await deleteAssignment(9);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toContain("DELETE FROM unit_recipe_assignments WHERE id = $1");
    expect(params).toEqual([9]);
  });
});

// ---------------------------------------------------------------------------
// Group 6 — getStepProgress
// ---------------------------------------------------------------------------
describe("getStepProgress — SQL assertions", () => {
  it("queries unit_recipe_step_progress filtered by assignment_id with order", async () => {
    await getStepProgress(15);
    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toContain("FROM unit_recipe_step_progress WHERE assignment_id = $1");
    expect(sql).toContain("ORDER BY order_index ASC");
    expect(params).toEqual([15]);
  });
});

// ---------------------------------------------------------------------------
// Group 7 — upsertStepProgress
// ---------------------------------------------------------------------------
describe("upsertStepProgress — SQL assertions", () => {
  it("uses ON CONFLICT(assignment_id, order_index) DO UPDATE SET (not INSERT OR REPLACE)", async () => {
    await upsertStepProgress(1, 0, true);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("ON CONFLICT(assignment_id, order_index) DO UPDATE SET");
    expect(sql).not.toContain("INSERT OR REPLACE");
  });

  it("passes completed as 1 when true and includes completed_at ISO string", async () => {
    await upsertStepProgress(1, 0, true);
    const [, params] = executeMock.mock.calls[0];
    expect(params[0]).toBe(1);    // assignmentId
    expect(params[1]).toBe(0);    // orderIndex
    expect(params[2]).toBe(1);    // completed = true -> 1
    expect(typeof params[3]).toBe("string"); // completed_at ISO string
    expect(params[3]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
  });

  it("passes completed as 0 when false and completed_at as null", async () => {
    await upsertStepProgress(1, 0, false);
    const [, params] = executeMock.mock.calls[0];
    expect(params[2]).toBe(0);    // completed = false -> 0
    expect(params[3]).toBeNull(); // completed_at null
  });

  it("SQL contains all 4 positional params $1 through $4", async () => {
    await upsertStepProgress(1, 0, true);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("$1");
    expect(sql).toContain("$2");
    expect(sql).toContain("$3");
    expect(sql).toContain("$4");
  });
});

// ---------------------------------------------------------------------------
// Group 8 — bulkCreateAssignments
// ---------------------------------------------------------------------------
describe("bulkCreateAssignments — SQL assertions", () => {
  it("uses INSERT OR IGNORE to silently skip duplicates", async () => {
    await bulkCreateAssignments([1, 2], 5);
    const [sql] = executeMock.mock.calls[0];
    expect(sql).toContain("INSERT OR IGNORE INTO unit_recipe_assignments");
  });

  it("calls db.execute once per unitId with correct params", async () => {
    await bulkCreateAssignments([10, 20, 30], 7);
    expect(executeMock).toHaveBeenCalledTimes(3);
    expect(executeMock.mock.calls[0][1]).toEqual([10, 7]);
    expect(executeMock.mock.calls[1][1]).toEqual([20, 7]);
    expect(executeMock.mock.calls[2][1]).toEqual([30, 7]);
  });

  it("handles empty unitIds array without calling db.execute", async () => {
    await bulkCreateAssignments([], 5);
    expect(executeMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Group 9 — useCreateAssignment invalidation contract
// ---------------------------------------------------------------------------
describe("useCreateAssignment — cache invalidation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates UNIT_ASSIGNMENTS_KEY(unit_id) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ unit_id: 3, recipe_id: 7 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(UNIT_ASSIGNMENTS_KEY(3));
  });

  it("invalidates RECIPE_ASSIGNMENTS_KEY(recipe_id) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ unit_id: 3, recipe_id: 7 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_ASSIGNMENTS_KEY(7));
  });

  it("invalidates exactly 2 keys on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ unit_id: 3, recipe_id: 7 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Group 10 — useDeleteAssignment invalidation contract (D-13 symmetry)
// ---------------------------------------------------------------------------
describe("useDeleteAssignment — cache invalidation (D-13 symmetry)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates UNIT_ASSIGNMENTS_KEY(unitId) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, unitId: 3, recipeId: 7 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(UNIT_ASSIGNMENTS_KEY(3));
  });

  it("invalidates RECIPE_ASSIGNMENTS_KEY(recipeId) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, unitId: 3, recipeId: 7 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_ASSIGNMENTS_KEY(7));
  });

  it("invalidates exactly 2 keys — same count as useCreateAssignment (D-13)", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useDeleteAssignment(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, unitId: 3, recipeId: 7 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("D-13 symmetry: create and delete invalidate identical cache key shapes", async () => {
    // Create
    const create = makeWrapper();
    const { result: createResult } = renderHook(() => useCreateAssignment(), { wrapper: create.wrapper });
    await act(async () => {
      await createResult.current.mutateAsync({ unit_id: 3, recipe_id: 7 });
    });
    await waitFor(() => expect(create.spy).toHaveBeenCalled());
    const createKeys = create.spy.mock.calls.map((c) => c[0]?.queryKey);

    // Delete
    const del = makeWrapper();
    const { result: deleteResult } = renderHook(() => useDeleteAssignment(), { wrapper: del.wrapper });
    await act(async () => {
      await deleteResult.current.mutateAsync({ id: 1, unitId: 3, recipeId: 7 });
    });
    await waitFor(() => expect(del.spy).toHaveBeenCalled());
    const deleteKeys = del.spy.mock.calls.map((c) => c[0]?.queryKey);

    // Both should invalidate the same keys
    expect(createKeys).toEqual(deleteKeys);
  });
});

// ---------------------------------------------------------------------------
// Group 11 — useToggleStepProgress invalidation contract
// ---------------------------------------------------------------------------
describe("useToggleStepProgress — cache invalidation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates STEP_PROGRESS_KEY(assignmentId) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useToggleStepProgress(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ assignmentId: 5, orderIndex: 2, completed: true });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(STEP_PROGRESS_KEY(5));
  });

  it("invalidates exactly 1 key on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useToggleStepProgress(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ assignmentId: 5, orderIndex: 2, completed: true });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Group 12 — useBulkCreateAssignments invalidation contract (Pitfall 5)
// ---------------------------------------------------------------------------
describe("useBulkCreateAssignments — cache invalidation (Pitfall 5)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates ASSIGNMENTS_KEY (broad prefix) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useBulkCreateAssignments(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ unitIds: [1, 2], recipeId: 5 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(ASSIGNMENTS_KEY);
  });

  it("invalidates RECIPE_ASSIGNMENTS_KEY(recipeId) on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useBulkCreateAssignments(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ unitIds: [1, 2], recipeId: 5 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(RECIPE_ASSIGNMENTS_KEY(5));
  });

  it("invalidates exactly 2 keys on success", async () => {
    const { spy, wrapper } = makeWrapper();
    const { result } = renderHook(() => useBulkCreateAssignments(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ unitIds: [1, 2], recipeId: 5 });
    });
    await waitFor(() => expect(spy).toHaveBeenCalled());

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
