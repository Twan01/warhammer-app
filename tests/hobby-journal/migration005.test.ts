/**
 * Phase 13 — Migration 005 file content assertions (Wave 0 stubs).
 *
 * STATUS: skipped. Plan 13-01 will:
 *   1. Create src-tauri/migrations/005_hobby_journal.sql with the literal SQL block from 13-RESEARCH.md §Code Examples.
 *   2. Register the migration as version 5 in src-tauri/src/lib.rs.
 *   3. Replace each `it.skip` below with `it`.
 *   4. Add real readFileSync assertions matching 13-VALIDATION.md migration row.
 *
 * The stub exists in Wave 0 so Plan 13-01 has a concrete failing-or-skipped vitest target.
 *
 * This is a content-shape test, not a behavior test. tauri-plugin-sql IPC cannot run in jsdom.
 * Mirrors tests/foundation/migration004.test.ts pattern.
 */
import { describe, it } from "vitest";

describe("migration 005 hobby_journal — Wave 0 stubs", () => {
  it.skip("005_hobby_journal.sql contains CREATE TABLE painting_sessions with the 5 expected columns + ON DELETE CASCADE on unit_id", () => {
    // Plan 13-01 will:
    //   - readFileSync("src-tauri/migrations/005_hobby_journal.sql", "utf-8")
    //   - assert sql matches /CREATE TABLE IF NOT EXISTS painting_sessions/
    //   - assert sql matches /unit_id\s+INTEGER\s+NOT NULL\s+REFERENCES units\(id\)\s+ON DELETE CASCADE/
    //   - assert sql matches /session_date\s+TEXT\s+NOT NULL/
    //   - assert sql matches /duration_minutes\s+INTEGER\s+NOT NULL/
    //   - assert sql matches /notes\s+TEXT/
    //   - assert sql matches /created_at\s+TEXT\s+NOT NULL\s+DEFAULT \(datetime\('now'\)\)/
    //   - assert sql matches /ALTER TABLE image_assets ADD COLUMN stage_label TEXT/
    //   - assert sql does NOT contain DROP or DELETE FROM (additive only)
    //   - readFileSync("src-tauri/src/lib.rs", "utf-8")
    //   - assert libRs matches /version:\s*5\s*,/
    //   - assert libRs matches /description:\s*"hobby_journal"/
    //   - assert libRs matches /005_hobby_journal\.sql/
  });
});
