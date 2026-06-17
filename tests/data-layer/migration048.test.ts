// @vitest-environment node

/**
 * Zero-data-loss proof for migration 048 — faction consolidation (HON-05).
 *
 * Strategy: create a DB with only migrations 001-047 applied, seed a duplicate
 * faction scenario across all four FK surfaces + default_faction_id, apply
 * migration 048 manually, and assert row-count invariants and FK re-point.
 *
 * Decision D-05: all five FK surfaces + cold-boot default_faction_id verified.
 * Decision D-03: map-not-delete safety contract verified (row counts unchanged).
 * Decision D-06: cold-boot theming check — default_faction_id resolves post-migration.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = resolve(repoRoot, "src-tauri/migrations");

/**
 * Creates an in-memory DB with only migrations 001..upToNum applied.
 * Used to test migration 048's data transformation by seeding a pre-migration
 * state, then applying 048 manually via db.exec().
 */
function createDbUpToMigration(upToNum: number): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(
      (a, b) =>
        Number.parseInt(a.slice(0, 3), 10) -
        Number.parseInt(b.slice(0, 3), 10),
    )
    .filter((f) => Number.parseInt(f.slice(0, 3), 10) <= upToNum);
  for (const file of files) {
    db.exec(readFileSync(resolve(migrationsDir, file), "utf-8"));
  }
  return db;
}

describe("migration 048 — faction consolidation (HON-05)", () => {
  it("merges duplicate factions with zero data loss across all 4 FK surfaces + default_faction_id", () => {
    // ── Step 1: Build pre-migration DB (migrations 001-047) ─────────────────
    const db = createDbUpToMigration(47);

    // ── Step 2: Seed canonical udb_factions entry ────────────────────────────
    db.prepare(
      `INSERT OR IGNORE INTO udb_factions (id, name, updated_at) VALUES ('SM', 'Space Marines', datetime('now'))`,
    ).run();

    // ── Step 3: Seed survivor faction (lowest id = survivor rule) ────────────
    const survivorResult = db
      .prepare(
        `INSERT INTO factions (name, game_system, color_theme, wahapedia_faction_id)
         VALUES ('Space Marines', 'Warhammer 40K', '#1B4FA8', 'SM')`,
      )
      .run();
    const survivorId = Number(survivorResult.lastInsertRowid);

    // ── Step 4: Seed duplicate faction (higher id, same wahapedia_faction_id) ─
    const duplicateResult = db
      .prepare(
        `INSERT INTO factions (name, game_system, color_theme, wahapedia_faction_id)
         VALUES ('SM Duplicate', 'Warhammer 40K', '#2255BB', 'SM')`,
      )
      .run();
    const duplicateId = Number(duplicateResult.lastInsertRowid);

    // ── Step 5: Seed dependents under the duplicate (FK surfaces) ────────────

    // FK surface 1: units.faction_id (ON DELETE RESTRICT)
    db.prepare(
      `INSERT INTO units (faction_id, name, status_painting)
       VALUES (?, 'Intercessors', 'Not Started')`,
    ).run(duplicateId);

    // FK surface 2: painting_recipes.faction_id (ON DELETE SET NULL)
    db.prepare(
      `INSERT INTO painting_recipes (name, faction_id)
       VALUES ('Blue Test Recipe', ?)`,
    ).run(duplicateId);

    // FK surface 3: army_lists.faction_id (ON DELETE SET NULL)
    db.prepare(
      `INSERT INTO army_lists (name, faction_id)
       VALUES ('Test Army List', ?)`,
    ).run(duplicateId);

    // FK surface 4: wishlist_items.faction_id (ON DELETE CASCADE)
    db.prepare(
      `INSERT INTO wishlist_items (name, faction_id, estimated_cost_pence)
       VALUES ('Land Raider', ?, 5000)`,
    ).run(duplicateId);

    // app_settings: default_faction_id pointing at the duplicate (TEXT value)
    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('default_faction_id', ?, datetime('now'))`,
    ).run(String(duplicateId));

    // ── Step 6: Record pre-migration row counts ──────────────────────────────
    const preUnits = (
      db.prepare(`SELECT COUNT(*) as c FROM units`).get() as { c: number }
    ).c;
    const preRecipes = (
      db
        .prepare(`SELECT COUNT(*) as c FROM painting_recipes`)
        .get() as { c: number }
    ).c;
    const preArmyLists = (
      db
        .prepare(`SELECT COUNT(*) as c FROM army_lists`)
        .get() as { c: number }
    ).c;
    const preWishlist = (
      db
        .prepare(`SELECT COUNT(*) as c FROM wishlist_items`)
        .get() as { c: number }
    ).c;

    // ── Step 7: Apply migration 048 ──────────────────────────────────────────
    const migration048 = readFileSync(
      resolve(migrationsDir, "048_consolidate_factions.sql"),
      "utf-8",
    );
    db.exec(migration048);

    // ── Step 8: Assert row-count invariants (map-not-delete) ─────────────────
    expect(
      (db.prepare(`SELECT COUNT(*) as c FROM units`).get() as { c: number }).c,
    ).toBe(preUnits);

    expect(
      (
        db
          .prepare(`SELECT COUNT(*) as c FROM painting_recipes`)
          .get() as { c: number }
      ).c,
    ).toBe(preRecipes);

    expect(
      (
        db
          .prepare(`SELECT COUNT(*) as c FROM army_lists`)
          .get() as { c: number }
      ).c,
    ).toBe(preArmyLists);

    expect(
      (
        db
          .prepare(`SELECT COUNT(*) as c FROM wishlist_items`)
          .get() as { c: number }
      ).c,
    ).toBe(preWishlist);

    // ── Step 9: Assert duplicate faction row is gone ──────────────────────────
    expect(
      db
        .prepare(`SELECT id FROM factions WHERE id = ?`)
        .get(duplicateId),
    ).toBeUndefined();

    // ── Step 10: Assert all dependents re-pointed to survivor ─────────────────

    // units: all faction_id values must be survivorId
    const units = db
      .prepare(`SELECT faction_id FROM units`)
      .all() as { faction_id: number }[];
    expect(units.every((u) => u.faction_id === survivorId)).toBe(true);

    // painting_recipes: named recipe must not be NULL (no SET NULL silent loss)
    const nullRecipe = db
      .prepare(
        `SELECT faction_id FROM painting_recipes WHERE name = 'Blue Test Recipe'`,
      )
      .get() as { faction_id: number | null } | undefined;
    expect(nullRecipe).toBeDefined();
    expect(nullRecipe!.faction_id).toBe(survivorId);

    // army_lists: named list must not be NULL
    const nullList = db
      .prepare(
        `SELECT faction_id FROM army_lists WHERE name = 'Test Army List'`,
      )
      .get() as { faction_id: number | null } | undefined;
    expect(nullList).toBeDefined();
    expect(nullList!.faction_id).toBe(survivorId);

    // wishlist_items: row must still exist and point to survivor (no CASCADE loss)
    const wishlistItem = db
      .prepare(
        `SELECT faction_id FROM wishlist_items WHERE name = 'Land Raider'`,
      )
      .get() as { faction_id: number } | undefined;
    expect(wishlistItem).toBeDefined();
    expect(wishlistItem!.faction_id).toBe(survivorId);

    // ── Step 11: Assert default_faction_id re-pointed to survivor (D-06) ─────
    const setting = db
      .prepare(`SELECT value FROM app_settings WHERE key = 'default_faction_id'`)
      .get() as { value: string };
    expect(setting.value).toBe(String(survivorId));

    // Cold-boot resolution: the value must resolve to a live factions.id
    const resolvedFaction = db
      .prepare(`SELECT id FROM factions WHERE id = ?`)
      .get(Number(setting.value)) as { id: number } | undefined;
    expect(resolvedFaction).toBeDefined();
    expect(resolvedFaction!.id).toBe(survivorId);

    // ── Step 12: Assert no duplicates remain ─────────────────────────────────
    const dups = db
      .prepare(
        `SELECT wahapedia_faction_id, COUNT(*) as c
         FROM factions
         WHERE wahapedia_faction_id IS NOT NULL
         GROUP BY wahapedia_faction_id
         HAVING COUNT(*) > 1`,
      )
      .all();
    expect(dups.length).toBe(0);

    db.close();
  });

  it("leaves unmapped factions (wahapedia_faction_id IS NULL) intact", () => {
    const db = createDbUpToMigration(47);

    // Insert a faction with no canonical mapping
    const result = db
      .prepare(
        `INSERT INTO factions (name, game_system)
         VALUES ('My Custom Warband', 'Warhammer 40K')`,
      )
      .run();
    const customId = Number(result.lastInsertRowid);

    const migration048 = readFileSync(
      resolve(migrationsDir, "048_consolidate_factions.sql"),
      "utf-8",
    );
    db.exec(migration048);

    // Custom faction must survive (no wahapedia_faction_id, nothing to merge)
    const faction = db
      .prepare(`SELECT id FROM factions WHERE id = ?`)
      .get(customId) as { id: number } | undefined;
    expect(faction).toBeDefined();

    db.close();
  });
});
