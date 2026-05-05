/** Wave 0 stubs for WKSP-02 — recipe swatch data + strip UI. Plan 29-01 fills query/hook stubs. Plan 29-02 fills UI stubs. */
import { describe, it } from "vitest";

describe.skip("getRecipeSwatchColors (WKSP-02)", () => {
  it.skip("returns flat array with recipe_id, paint_id, hex_color ordered by recipe_id, order_index");
  // TODO Plan 29-01: mock getDb, call getRecipeSwatchColors(),
  // assert db.select called with correct JOIN SQL

  it.skip("returns empty array when no recipe_paints exist");
  // TODO Plan 29-01: mock getDb returning [], assert empty result
});

describe.skip("useRecipeSwatchData hook (WKSP-02)", () => {
  it.skip("maps flat rows into Map<recipe_id, SwatchEntry[]>");
  // TODO Plan 29-01: mock getRecipeSwatchColors, call hook,
  // assert Map has correct grouping

  it.skip("returns empty Map when no data");
  // TODO Plan 29-01: mock empty return, assert Map.size === 0
});

describe.skip("Recipe swatch strip rendering (WKSP-02)", () => {
  it.skip("renders up to 8 swatch circles for a recipe's paints");
  // TODO Plan 29-02: render RecipeTable with swatchColorsByRecipe Map,
  // assert 8 swatch spans

  it.skip("renders +N overflow indicator when recipe has more than 8 paints");
  // TODO Plan 29-02: pass 10 paints, assert "+2" text visible

  it.skip("renders bg-muted fallback circle for paints without hex_color");
  // TODO Plan 29-02: pass paint with null hex_color, assert bg-muted class

  it.skip("applies negative margin (-ml-1) on second and subsequent swatches");
  // TODO Plan 29-02: render strip with 3 paints, assert second span has "-ml-1" class
});
