import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * COLL-01 — batch photo query functions for gallery thumbnails.
 */

const selectMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock }),
}));

import { getLatestPhotoByUnit, getPhotoCountsByUnitIds } from "@/db/queries/unitPhotos";

beforeEach(() => {
  selectMock.mockReset();
});

describe("getLatestPhotoByUnit", () => {
  it("returns one row per unit that has at least one photo", async () => {
    const fakeRows = [
      { id: 5, entity_type: "unit", entity_id: 1, file_path: "a.jpg", caption: null, taken_at: null, stage_label: null, created_at: "2026-05-01" },
      { id: 9, entity_type: "unit", entity_id: 2, file_path: "b.jpg", caption: null, taken_at: null, stage_label: null, created_at: "2026-05-01" },
    ];
    selectMock.mockResolvedValueOnce(fakeRows);

    const result = await getLatestPhotoByUnit();

    expect(result).toHaveLength(2);
    expect(result[0].entity_id).toBe(1);
    expect(result[1].entity_id).toBe(2);
  });

  it("uses MAX(id) subquery, not MAX(taken_at) — Pitfall 1", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getLatestPhotoByUnit();

    const [sql] = selectMock.mock.calls[0];
    expect(sql).toMatch(/MAX\(id\)/);
    expect(sql).not.toMatch(/MAX\(taken_at\)/);
  });

  it("returns empty array when no units have photos", async () => {
    selectMock.mockResolvedValueOnce([]);

    const result = await getLatestPhotoByUnit();

    expect(result).toEqual([]);
  });

  it("each row has entity_id, file_path, and id fields", async () => {
    const fakeRow = { id: 7, entity_type: "unit", entity_id: 3, file_path: "c.jpg", caption: null, taken_at: null, stage_label: null, created_at: "2026-05-01" };
    selectMock.mockResolvedValueOnce([fakeRow]);

    const result = await getLatestPhotoByUnit();

    expect(result[0]).toHaveProperty("entity_id");
    expect(result[0]).toHaveProperty("file_path");
    expect(result[0]).toHaveProperty("id");
  });
});

describe("getPhotoCountsByUnitIds", () => {
  it("returns photo count grouped by entity_id", async () => {
    selectMock.mockResolvedValueOnce([
      { entity_id: 1, photo_count: 3 },
      { entity_id: 2, photo_count: 1 },
    ]);

    const result = await getPhotoCountsByUnitIds([1, 2]);

    expect(result).toEqual([
      { entity_id: 1, photo_count: 3 },
      { entity_id: 2, photo_count: 1 },
    ]);
  });

  it("returns empty array when unitIds is empty (guard clause)", async () => {
    const result = await getPhotoCountsByUnitIds([]);

    expect(result).toEqual([]);
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("uses positional $1, $2 params for IN clause — Pitfall 3", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getPhotoCountsByUnitIds([10, 20]);

    const [sql, params] = selectMock.mock.calls[0];
    expect(sql).toMatch(/\$1, \$2/);
    expect(params).toEqual([10, 20]);
  });

  it("counts only entity_type = 'unit' rows", async () => {
    selectMock.mockResolvedValueOnce([]);

    await getPhotoCountsByUnitIds([1]);

    const [sql] = selectMock.mock.calls[0];
    expect(sql).toMatch(/entity_type = 'unit'/);
  });
});
