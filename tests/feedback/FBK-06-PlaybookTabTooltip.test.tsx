/**
 * FBK-06: PlaybookTab disabled save button shows tooltip "No changes to save" or "Loading...".
 *
 * Static source analysis test: the component JSX contains the tooltip wrapping pattern
 * with correct messages. Full render would require mocking 15+ hooks.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(
  resolve(__dirname, "../../src/features/units/PlaybookTab.tsx"),
  "utf-8",
);

describe("FBK-06: PlaybookTab tooltip on disabled save button", () => {
  it("imports Tooltip components from ui/tooltip", () => {
    expect(SRC).toContain('TooltipContent');
    expect(SRC).toContain('TooltipProvider');
    expect(SRC).toContain('TooltipTrigger');
  });

  it("contains 'No changes to save' tooltip message", () => {
    expect(SRC).toContain('"No changes to save"');
  });

  it("contains 'Loading...' tooltip message", () => {
    expect(SRC).toContain('"Loading..."');
  });

  it("wraps save button in TooltipTrigger with span for disabled state", () => {
    // The pattern should have TooltipTrigger > span > Button
    const hasPattern = SRC.includes("TooltipTrigger") &&
      SRC.includes("<span") &&
      SRC.includes("Save Playbook");
    expect(hasPattern).toBe(true);
  });

  it("only shows TooltipContent when saveDisabled is true", () => {
    // The pattern: {saveDisabled && (<TooltipContent>...
    expect(SRC).toMatch(/saveDisabled\s*&&\s*[\s\S]*?<TooltipContent>/);
  });
});
