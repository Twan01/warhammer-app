/**
 * Phase 14 — Migration 005 file content tests (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 14-01 will:
 *   1. Create src-tauri/migrations/005_spend_pence.sql (per 14-RESEARCH.md §Pattern 1).
 *   2. Add Migration { version: 5, description: "spend_pence", ... } to lib.rs get_migrations().
 *   3. Replace `describe.skip` below with `describe`.
 *   4. Add real assertions matching tests/foundation/migration004.test.ts pattern verbatim
 *      but for the new file paths and column names.
 *
 * tauri-plugin-sql IPC cannot run in jsdom — this is a content-shape test, not a behavior
 * test (same approach as migration004.test.ts).
 */
import { describe, it } from "vitest";

describe.skip("migration 005 spend_pence — file content", () => {
  it("contains only ALTER TABLE ADD COLUMN and UPDATE statements (no DROP, no CREATE TABLE)", () => {
    // Plan 14-01 will:
    //   - import { readFileSync } from "node:fs";
    //   - import { resolve, dirname } from "node:path";
    //   - import { fileURLToPath } from "node:url";
    //   - const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
    //   - const sql = readFileSync(resolve(repoRoot, "src-tauri/migrations/005_spend_pence.sql"), "utf-8");
    //   - expect(sql).not.toMatch(/DROP\b/i);
    //   - expect(sql).not.toMatch(/CREATE\s+TABLE/i);
    //   - const alterCount = (sql.match(/ALTER\s+TABLE/gi) ?? []).length;
    //   - expect(alterCount).toBeGreaterThanOrEqual(2);  // units + paints
  });

  it("declares purchase_price_pence INTEGER on units table", () => {
    // Plan 14-01 will:
    //   - expect(sql).toMatch(/ALTER\s+TABLE\s+units\s+ADD\s+COLUMN\s+purchase_price_pence\s+INTEGER/i);
  });

  it("declares purchase_price_pence INTEGER on paints table", () => {
    // Plan 14-01 will:
    //   - expect(sql).toMatch(/ALTER\s+TABLE\s+paints\s+ADD\s+COLUMN\s+purchase_price_pence\s+INTEGER/i);
  });

  it("contains UPDATE statement migrating units.purchase_price (REAL) to purchase_price_pence (INTEGER) via *100 conversion", () => {
    // Plan 14-01 will:
    //   - expect(sql).toMatch(/UPDATE\s+units/i);
    //   - expect(sql).toMatch(/SET\s+purchase_price_pence\s*=/i);
    //   - // Multiplier of 100 must appear (CONTEXT.md: "multiply existing REAL values by 100")
    //   - expect(sql).toMatch(/purchase_price\s*\*\s*100/);
    //   - expect(sql).toMatch(/CAST.*AS\s+INTEGER/i);  // ROUND + CAST guard against float pence
  });
});

describe.skip("migration 005 — lib.rs registration", () => {
  it("src-tauri/src/lib.rs contains version: 5 entry referencing 005_spend_pence.sql", () => {
    // Plan 14-01 will:
    //   - const libRs = readFileSync(resolve(repoRoot, "src-tauri/src/lib.rs"), "utf-8");
    //   - expect(libRs).toMatch(/version:\s*5\s*,/);
    //   - expect(libRs).toMatch(/description:\s*"spend_pence"/);
    //   - expect(libRs).toMatch(/005_spend_pence\.sql/);
  });
});
