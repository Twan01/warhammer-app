// @vitest-environment node

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = resolve(repoRoot, "src-tauri/migrations");

// Authoritative migration order — must match lib.rs get_migrations()
export const HOBBYFORGE_MIGRATIONS = [
  "001_core_schema.sql",
  "002_seed_factions.sql",
  "003_seed_data.sql",
  "004_unit_playbook_stats.sql",
  "005_hobby_journal.sql",
  "006_spend_pence.sql",
  "007_datasheet_link.sql",
  "008_enrichment.sql",
  "009_wishlist.sql",
  "010_hobby_goals.sql",
  "011_point_tiers_loadouts.sql",
  "012_recipe_steps.sql",
  "013_step_photos_alt_paint.sql",
  "014_session_recipe_link.sql",
  "015_sync_errors.sql",
  "016_rules_snapshot.sql",
  "017_unit_overrides.sql",
  "018_recipe_sections.sql",
  "019_rules_favorites_notes.sql",
  "020_workflow_metadata.sql",
  "021_applied_recipe_assignments.sql",
  "022_paintless_steps.sql",
  "023_session_section_fk.sql",
  "024_points_import_history.sql",
  "025_tactical_role.sql",
] as const;

// Authoritative rules migration order — must match lib.rs get_rules_migrations()
export const RULES_MIGRATIONS = [
  "rules_001_schema.sql",
  "rules_002_wargear_abilities.sql",
  "rules_003_sync_meta_counts.sql",
  "rules_004_datasheet_points.sql",
] as const;

export const HOBBYFORGE_MIGRATION_COUNT = HOBBYFORGE_MIGRATIONS.length; // 25
export const RULES_MIGRATION_COUNT = RULES_MIGRATIONS.length; // 4

/**
 * Creates an in-memory SQLite database with all hobbyforge migrations applied.
 * Sets PRAGMA foreign_keys = ON to match production behavior (src/db/client.ts).
 * Verifies FK pragma is still ON after the full chain (migration 022 toggles it).
 */
export function createHobbyforgeDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  for (const file of HOBBYFORGE_MIGRATIONS) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    db.exec(sql);
  }

  // Migration 022 toggles FK off/on — verify it's back ON
  const fkState = db.pragma("foreign_keys") as { foreign_keys: number }[];
  if (fkState[0]?.foreign_keys !== 1) {
    throw new Error("PRAGMA foreign_keys not ON after migration chain");
  }

  return db;
}

/**
 * Creates an in-memory SQLite database with all rules migrations applied.
 * No FK pragma needed — rules DB is a flat lookup store.
 */
export function createRulesDb(): Database.Database {
  const db = new Database(":memory:");

  for (const file of RULES_MIGRATIONS) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf-8");
    db.exec(sql);
  }

  return db;
}

// ── Factory helpers for test convenience ────────────────────────────────────

/**
 * Inserts a test faction and returns its id.
 */
export function createTestFaction(db: Database.Database): number {
  const result = db
    .prepare("INSERT INTO factions (name, game_system) VALUES (?, ?)")
    .run("Test Faction", "Warhammer 40K");
  return Number(result.lastInsertRowid);
}

/**
 * Inserts a test unit under the given faction and returns its id.
 * painting_sessions.unit_id is NOT NULL, so tests need real units.
 */
export function createTestUnit(
  db: Database.Database,
  factionId: number,
): number {
  const result = db
    .prepare(
      "INSERT INTO units (faction_id, name, status_painting) VALUES (?, ?, ?)",
    )
    .run(factionId, "Test Unit", "Not Started");
  return Number(result.lastInsertRowid);
}

/**
 * Inserts a test painting recipe and returns its id.
 */
export function createTestRecipe(db: Database.Database): number {
  const result = db
    .prepare("INSERT INTO painting_recipes (name) VALUES (?)")
    .run("Test Recipe");
  return Number(result.lastInsertRowid);
}

/**
 * Inserts a test recipe section and returns its id.
 */
export function createTestSection(
  db: Database.Database,
  recipeId: number,
  name: string = "Test Section",
): number {
  const result = db
    .prepare(
      "INSERT INTO recipe_sections (recipe_id, name, order_index) VALUES (?, ?, 0)",
    )
    .run(recipeId, name);
  return Number(result.lastInsertRowid);
}
