/**
 * Phase 17 — JournalTab UTC fix content assertions (ENRCH-04 prerequisite).
 *
 * Reads JournalTab.tsx as a raw string and asserts the UTC bug is fully fixed:
 * - todayISO is imported from @/lib/dates (not defined locally)
 * - No `new Date().toISOString().split("T")` call sites remain
 * - No local `function todayISO(` definition remains
 *
 * Pattern mirrors tests/enrichment/migration008.test.ts (readFileSync + regex).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const journalTabPath = resolve(repoRoot, "src/features/units/JournalTab.tsx");

describe("JournalTab UTC fix — ENRCH-04 prerequisite", () => {
  const source = readFileSync(journalTabPath, "utf-8");

  it("JournalTab.tsx imports todayISO from @/lib/dates (not from a local definition)", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*todayISO[^}]*\}\s*from\s*['"]@\/lib\/dates['"]/
    );
  });

  it("JournalTab.tsx contains zero occurrences of new Date().toISOString().split(\"T\")", () => {
    expect(source).not.toMatch(/new Date\(\)\.toISOString\(\)\.split/);
  });

  it("JournalTab.tsx has no local todayISO function definition", () => {
    expect(source).not.toMatch(/function\s+todayISO\s*\(/);
  });
});
