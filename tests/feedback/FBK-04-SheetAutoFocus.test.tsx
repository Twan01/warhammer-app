/**
 * FBK-04: 6 Sheet forms have autoFocus on first text input.
 *
 * Tests that the autoFocus attribute is present on the correct input in each form.
 * This is a static source analysis test since autoFocus in jsdom doesn't trigger
 * document.activeElement the same way as real browsers within Sheet (portal).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../src");

function readSrc(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), "utf-8");
}

describe("FBK-04: Sheet autoFocus on first text input", () => {
  it("FactionSheet has autoFocus on the name field Input", () => {
    const src = readSrc("features/factions/FactionSheet.tsx");
    // The name field render function should contain autoFocus before or on the Input
    const nameFieldMatch = src.match(/name="name"[\s\S]*?<Input\s+autoFocus/);
    expect(nameFieldMatch).not.toBeNull();
  });

  it("GoalSheet has autoFocus on the name field Input", () => {
    const src = readSrc("features/goals/GoalSheet.tsx");
    const nameFieldMatch = src.match(/name="name"[\s\S]*?<Input\s+autoFocus/);
    expect(nameFieldMatch).not.toBeNull();
  });

  it("PaintSheet has autoFocus on the brand field Input (first text input)", () => {
    const src = readSrc("features/paints/PaintSheet.tsx");
    const brandFieldMatch = src.match(/name="brand"[\s\S]*?<Input\s+autoFocus/);
    expect(brandFieldMatch).not.toBeNull();
  });

  it("UnitFormRequired has autoFocus on the name field Input", () => {
    const src = readSrc("features/units/UnitFormRequired.tsx");
    const nameFieldMatch = src.match(/name="name"[\s\S]*?<Input\s+autoFocus/);
    expect(nameFieldMatch).not.toBeNull();
  });

  it("BattleLogSheet has autoFocus on opponent_faction (NOT battle_date)", () => {
    const src = readSrc("features/battle-log/BattleLogSheet.tsx");
    // opponent_faction field should have autoFocus
    const opponentFieldMatch = src.match(/name="opponent_faction"[\s\S]*?<Input[\s\S]*?autoFocus/);
    expect(opponentFieldMatch).not.toBeNull();

    // battle_date field should NOT have autoFocus
    const battleDateSection = src.match(/name="battle_date"[\s\S]*?<\/FormItem>/);
    expect(battleDateSection).not.toBeNull();
    expect(battleDateSection![0]).not.toContain("autoFocus");
  });

  it("RecipeFormSheet has autoFocus on the name field Input", () => {
    const src = readSrc("features/recipes/RecipeFormSheet.tsx");
    const nameFieldMatch = src.match(/name="name"[\s\S]*?<Input\s+autoFocus/);
    expect(nameFieldMatch).not.toBeNull();
  });
});
