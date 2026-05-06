import { describe, it } from "vitest";

describe("RecipeDetailSheet — DATA-05 (unit link navigation)", () => {
  describe("linked unit display", () => {
    it.todo("renders a Button with variant='link' when recipe has a linked unit");
    it.todo("Button text matches the unit name");
    it.todo("clicking the Button calls onClose then navigates to /collection");
  });

  describe("no linked unit", () => {
    it.todo("renders a dash span when recipe has no linked unit");
    it.todo("does NOT render a Button when unit is null");
  });
});
