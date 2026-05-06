import { describe, it } from "vitest";

describe("ActiveProjectsPanel", () => {
  describe("PANEL-03: project rows", () => {
    it.todo("renders up to 5 project rows");
    it.todo("renders UnitThumbnail with size sm for each row");
    it.todo("displays unit name in each row");
    it.todo("displays painting progress percentage in each row");
    it.todo("displays relative last-updated date in each row");
    it.todo("renders Open button for each row");
    it.todo("renders Log button for each row");
    it.todo("calls onOpen with unitId when Open is clicked");
    it.todo("calls onLog with unitId when Log is clicked");
  });

  describe("empty state", () => {
    it.todo("shows empty state when no projects provided");
    it.todo("displays Target icon in empty state");
  });
});
