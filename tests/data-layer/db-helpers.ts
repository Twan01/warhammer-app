// @vitest-environment node

import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = resolve(repoRoot, "src-tauri/migrations");

// Authoritative migration order, derived from disk so it can never drift from
// lib.rs / the .sql files. Sorted by 3-digit numeric prefix to match lib.rs
// get_migrations() ordering (001..NNN). Adding a new migration .sql file
// auto-updates this list and HOBBYFORGE_MIGRATION_COUNT — no manual edit needed.
// Parse the leading numeric prefix; throw loudly rather than returning NaN so a
// misnamed migration file fails the suite at startup instead of silently
// sorting into an arbitrary (schema-corrupting) position.
function migrationPrefix(file: string): number {
  const n = Number.parseInt(file.slice(0, 3), 10);
  if (Number.isNaN(n)) {
    throw new Error(
      `Migration file "${file}" does not start with a 3-digit numeric prefix`,
    );
  }
  return n;
}

export const HOBBYFORGE_MIGRATIONS: readonly string[] = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => migrationPrefix(a) - migrationPrefix(b));

// Phase 107: rules.db eliminated — rules migrations removed
export const RULES_MIGRATIONS = [] as const;

export const HOBBYFORGE_MIGRATION_COUNT = HOBBYFORGE_MIGRATIONS.length; // disk-derived
export const RULES_MIGRATION_COUNT = RULES_MIGRATIONS.length; // 0

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

// Phase 107: rules.db eliminated — createRulesDb removed

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
