import { describe, it } from "vitest";

/**
 * COLL-01 — batch photo query functions for gallery thumbnails.
 *
 * TODO Wave 1: uncomment when production code exists
 * import { getLatestPhotoByUnit, getPhotoCountsByUnitIds } from "@/db/queries/unitPhotos";
 */

describe("getLatestPhotoByUnit", () => {
  it.skip("returns one row per unit that has at least one photo", () => {});
  it.skip("uses MAX(id) subquery, not MAX(taken_at) — Pitfall 1", () => {});
  it.skip("returns empty array when no units have photos", () => {});
  it.skip("each row has entity_id, file_path, and id fields", () => {});
});

describe("getPhotoCountsByUnitIds", () => {
  it.skip("returns photo count grouped by entity_id", () => {});
  it.skip("returns empty array when unitIds is empty (guard clause)", () => {});
  it.skip("uses positional $1, $2 params for IN clause — Pitfall 3", () => {});
  it.skip("counts only entity_type = 'unit' rows", () => {});
});
