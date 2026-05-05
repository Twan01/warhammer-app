import { describe, it } from "vitest";

/**
 * PROJ-01 — batch enrichment query functions for kanban cards.
 *
 * TODO Wave 1: uncomment when production code exists
 * import { getRecipeNamesByUnitIds } from "@/db/queries/recipes";
 * import { getPhotoCountsByUnitIds } from "@/db/queries/unitPhotos";
 */

describe("getRecipeNamesByUnitIds", () => {
  it.skip("returns { unit_id, name } for each unit with a linked recipe", () => {});
  it.skip("excludes faction-wide recipes where unit_id IS NULL", () => {});
  it.skip("returns empty array when unitIds is empty (guard clause)", () => {});
  it.skip("uses positional $1, $2 params for IN clause — Pitfall 3", () => {});
});

describe("getPhotoCountsByUnitIds (kanban)", () => {
  it.skip("returns { entity_id, photo_count } grouped by entity_id", () => {});
  it.skip("returns empty array when unitIds is empty", () => {});
});
