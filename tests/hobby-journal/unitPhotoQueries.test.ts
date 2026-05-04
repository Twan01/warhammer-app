/**
 * Phase 13 — unitPhotos queries tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 13-02 will:
 *   1. Create src/db/queries/unitPhotos.ts with createUnitPhoto, getPhotosByUnit, deleteUnitPhoto.
 *   2. Create src/types/unitPhoto.ts exporting UnitPhoto + CreateUnitPhotoInput.
 *   3. Replace each `it.skip` below with `it`.
 *   4. Add real assertions matching 13-VALIDATION.md rows JOUR-04, JOUR-06.
 *
 * The stub exists in Wave 0 so Plan 13-02 has a concrete failing-or-skipped vitest target.
 */
import { describe, it } from "vitest";

describe("unitPhotos queries — Wave 0 stubs", () => {
  it.skip("JOUR-04: createUnitPhoto runs INSERT INTO image_assets with (entity_type='unit', entity_id, file_path, caption, stage_label, taken_at) and 6 positional params", () => {
    // Plan 13-02 will:
    //   - selectMock + executeMock setup
    //   - import { createUnitPhoto } from "@/db/queries/unitPhotos"
    //   - call createUnitPhoto({ unit_id: 7, file_path: "abc-123.jpg", caption: "Looking sharp", stage_label: "Finished", taken_at: "2026-05-03" })
    //   - assert executeMock SQL matches /INSERT INTO image_assets \(entity_type, entity_id, file_path, caption, stage_label, taken_at\)/
    //   - assert SQL matches /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6\)/
    //   - assert params equal ["unit", 7, "abc-123.jpg", "Looking sharp", "Finished", "2026-05-03"]
  });

  it.skip("JOUR-04 + JOUR-06: getPhotosByUnit runs SELECT * WHERE entity_type='unit' AND entity_id=$1 ORDER BY taken_at DESC, id DESC", () => {
    // Plan 13-02 will:
    //   - selectMock.mockResolvedValueOnce([{ id: 5, ... }, { id: 3, ... }])
    //   - import { getPhotosByUnit } from "@/db/queries/unitPhotos"
    //   - const rows = await getPhotosByUnit(7)
    //   - assert selectMock called with EXACTLY:
    //     "SELECT * FROM image_assets WHERE entity_type = 'unit' AND entity_id = $1 ORDER BY taken_at DESC, id DESC"
    //     and [7]
    //   - assert rows length === 2
  });

  it.skip("JOUR-06: deleteUnitPhoto runs DELETE FROM image_assets WHERE id=$1 with single param", () => {
    // Plan 13-02 will:
    //   - executeMock.mockResolvedValueOnce(undefined)
    //   - import { deleteUnitPhoto } from "@/db/queries/unitPhotos"
    //   - await deleteUnitPhoto(42)
    //   - assert executeMock called with "DELETE FROM image_assets WHERE id = $1" and [42]
  });
});
