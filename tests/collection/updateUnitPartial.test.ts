/**
 * Regression: active-unit-loses-category.
 *
 * updateUnit must honour the partial-update contract of UpdateUnitInput.
 * Previously the SQL assigned `category = $4` (and many other columns) directly
 * with `input.category ?? null`, so a partial update — e.g. the active-project
 * toggle that sends only { id, is_active_project } — overwrote category (and
 * unit_type, points, priority, notes, etc.) with NULL.
 *
 * The fix builds the SET clause dynamically: only columns explicitly present in
 * the input are written. Omitted keys are preserved; explicit nulls still clear.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";
import { updateUnit } from "@/db/queries/units";

const mockDb = {
  select: vi.fn(),
  execute: vi.fn(),
};

function lastExecute(): [string, unknown[]] {
  const calls = mockDb.execute.mock.calls;
  return calls[calls.length - 1] as [string, unknown[]];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDb).mockResolvedValue(mockDb as never);
  mockDb.execute.mockResolvedValue({ rowsAffected: 1 });
});

describe("updateUnit — partial update", () => {
  it("does NOT touch category when toggling is_active_project only", async () => {
    await updateUnit({ id: 7, is_active_project: 1 });

    const [sql, params] = lastExecute();
    expect(sql).not.toMatch(/\bcategory\b/);
    expect(sql).toMatch(/is_active_project = \$2/);
    expect(sql).toMatch(/WHERE id = \$1/);
    expect(params).toEqual([7, 1]);
  });

  it("does NOT touch category/points when changing only painting status", async () => {
    await updateUnit({ id: 9, status_painting: "Built" });

    const [sql, params] = lastExecute();
    expect(sql).not.toMatch(/\bcategory\b/);
    expect(sql).not.toMatch(/\bpoints\b/);
    expect(sql).toMatch(/status_painting = \$2/);
    expect(params).toEqual([9, "Built"]);
  });

  it("coerces boolean columns to 0/1", async () => {
    await updateUnit({ id: 3, status_assembly: 0, is_active_project: 1 });

    const [, params] = lastExecute();
    expect(params).toEqual([3, 0, 1]);
  });

  it("still clears category when an explicit null is passed (edit form clear)", async () => {
    await updateUnit({ id: 4, category: null });

    const [sql, params] = lastExecute();
    expect(sql).toMatch(/category = \$2/);
    expect(params).toEqual([4, null]);
  });

  it("writes every provided field, omits the rest", async () => {
    await updateUnit({ id: 5, points: 120, model_count: 10 });

    const [sql, params] = lastExecute();
    // Columns are emitted in fixed schema order (model_count before points),
    // independent of input key order.
    expect(sql).toMatch(/model_count = \$2/);
    expect(sql).toMatch(/points = \$3/);
    expect(sql).not.toMatch(/\bcategory\b/);
    expect(sql).not.toMatch(/\bunit_type\b/);
    expect(params).toEqual([5, 10, 120]);
  });

  it("always sets updated_at", async () => {
    await updateUnit({ id: 6, name: "Renamed" });
    const [sql] = lastExecute();
    expect(sql).toMatch(/updated_at = datetime\('now'\)/);
  });

  it("skips the write entirely when only id is provided", async () => {
    await updateUnit({ id: 8 });
    expect(mockDb.execute).not.toHaveBeenCalled();
  });
});
