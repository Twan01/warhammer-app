/**
 * FBK-07: PlaybookTab error state includes "Retry" button calling refetchDatasheet.
 *
 * Static source analysis test: verifies the error block contains a Retry button
 * wired to refetchDatasheet.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(
  resolve(__dirname, "../../src/features/units/PlaybookTab.tsx"),
  "utf-8",
);

describe("FBK-07: PlaybookTab error retry button", () => {
  it("destructures refetchDatasheet from useDatasheet", () => {
    expect(SRC).toMatch(/refetch:\s*refetchDatasheet/);
  });

  it("error block contains a 'Retry' button", () => {
    // Look for a Button with "Retry" text within the datasheetError block
    const errorBlockMatch = SRC.match(/datasheetError\s*&&\s*\([\s\S]*?\n\s*\)/);
    expect(errorBlockMatch).not.toBeNull();
    expect(errorBlockMatch![0]).toContain("Retry");
  });

  it("Retry button calls refetchDatasheet", () => {
    // The error block should wire onClick to refetchDatasheet
    const errorBlockMatch = SRC.match(/datasheetError\s*&&\s*\([\s\S]*?\n\s*\)/);
    expect(errorBlockMatch).not.toBeNull();
    expect(errorBlockMatch![0]).toContain("refetchDatasheet");
  });

  it("error block has destructive styling", () => {
    expect(SRC).toContain("border-destructive/50");
    expect(SRC).toContain("bg-destructive/10");
  });
});
