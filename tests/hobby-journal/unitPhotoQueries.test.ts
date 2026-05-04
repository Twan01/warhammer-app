/**
 * JOUR-04, JOUR-06 — unitPhotos query function tests.
 * Mocks getDb(); verifies SQL strings + parameter arrays for image_assets
 * polymorphic-table operations scoped to entity_type='unit'.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const selectMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: async () => ({ select: selectMock, execute: executeMock }),
}));

import {
  getPhotosByUnit,
  getPhotoFilenamesByUnit,
  createUnitPhoto,
  deleteUnitPhoto,
} from "@/db/queries/unitPhotos";

beforeEach(() => {
  selectMock.mockReset();
  executeMock.mockReset();
});

describe("unitPhotos queries", () => {
  it("JOUR-04: createUnitPhoto runs INSERT INTO image_assets with (entity_type, entity_id, file_path, caption, stage_label, taken_at) and 6 positional params", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await createUnitPhoto({
      unit_id: 7,
      file_path: "abc-123.jpg",
      caption: "Looking sharp",
      stage_label: "Finished",
      taken_at: "2026-05-03",
    });

    expect(executeMock).toHaveBeenCalledTimes(1);
    const [sql, params] = executeMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO image_assets \(entity_type, entity_id, file_path, caption, stage_label, taken_at\)/);
    expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, \$6\)/);
    expect(params).toEqual(["unit", 7, "abc-123.jpg", "Looking sharp", "Finished", "2026-05-03"]);
  });

  it("JOUR-04: createUnitPhoto coerces optional caption/stage_label/taken_at to null when omitted", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await createUnitPhoto({ unit_id: 7, file_path: "abc-123.jpg" });

    const params = executeMock.mock.calls[0][1] as unknown[];
    expect(params).toEqual(["unit", 7, "abc-123.jpg", null, null, null]);
  });

  it("JOUR-04 + JOUR-06: getPhotosByUnit runs SELECT * WHERE entity_type='unit' AND entity_id=$1 ORDER BY taken_at DESC, id DESC", async () => {
    selectMock.mockResolvedValueOnce([
      { id: 5, entity_type: "unit", entity_id: 7, file_path: "z.jpg", caption: null, stage_label: "Finished", taken_at: "2026-05-03", created_at: "2026-05-03" },
      { id: 3, entity_type: "unit", entity_id: 7, file_path: "a.jpg", caption: null, stage_label: "Primed", taken_at: "2026-05-02", created_at: "2026-05-02" },
    ]);

    const rows = await getPhotosByUnit(7);

    expect(selectMock).toHaveBeenCalledWith(
      "SELECT * FROM image_assets WHERE entity_type = 'unit' AND entity_id = $1 ORDER BY taken_at DESC, id DESC",
      [7]
    );
    expect(rows).toHaveLength(2);
  });

  it("JOUR-06: getPhotoFilenamesByUnit returns flat string[] of file_path values for disk cleanup", async () => {
    selectMock.mockResolvedValueOnce([
      { file_path: "abc-1.jpg" },
      { file_path: "def-2.png" },
    ]);

    const filenames = await getPhotoFilenamesByUnit(7);

    expect(selectMock).toHaveBeenCalledWith(
      "SELECT file_path FROM image_assets WHERE entity_type = 'unit' AND entity_id = $1",
      [7]
    );
    expect(filenames).toEqual(["abc-1.jpg", "def-2.png"]);
  });

  it("JOUR-06: deleteUnitPhoto runs DELETE FROM image_assets WHERE id=$1 with single param", async () => {
    executeMock.mockResolvedValueOnce(undefined);

    await deleteUnitPhoto(42);

    expect(executeMock).toHaveBeenCalledWith(
      "DELETE FROM image_assets WHERE id = $1",
      [42]
    );
  });
});
