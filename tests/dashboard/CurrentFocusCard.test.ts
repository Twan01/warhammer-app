import { describe, it } from "vitest";

describe("CurrentFocusCard", () => {
  describe("PANEL-01: photo and metadata", () => {
    it.todo("renders UnitThumbnail with size md when unit exists");
    it.todo("displays unit name");
    it.todo("displays faction name");
    it.todo("displays model count with null-safe fallback");
    it.todo("displays points with null-safe fallback");
    it.todo("displays painting progress percentage");
    it.todo("renders progress bar with correct width");
  });

  describe("PANEL-02: action buttons", () => {
    it.todo("renders Open button with ExternalLink icon");
    it.todo("renders Log button with Paintbrush icon");
    it.todo("calls onOpen when Open button is clicked");
    it.todo("calls onLog when Log button is clicked");
  });

  describe("empty state", () => {
    it.todo("shows empty state when unit is null");
    it.todo("does not render action buttons when unit is null");
  });
});

describe("CurrentFocusCard — DATA-06 (recipe name display)", () => {
  it.todo("renders recipe name with Palette icon when recipeName prop is provided");
  it.todo("renders nothing for recipe when recipeName is null");
  it.todo("renders nothing for recipe when recipeName is undefined (prop omitted)");
  it.todo("shows '+N more' suffix when extraRecipeCount > 0");
  it.todo("does not show '+N more' suffix when extraRecipeCount is 0");
});
