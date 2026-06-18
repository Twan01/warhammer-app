// @vitest-environment node

/**
 * DAT-01b: Referential integrity gate — PRAGMA foreign_key_check + orphan queries.
 *
 * Asserts that unit_database.json, when imported into an in-memory DB built
 * from the real migration DDL with PRAGMA foreign_keys = ON, passes:
 *  1. PRAGMA foreign_key_check returns zero rows (all FK constraints satisfied)
 *  2. Orphan leader pairs — explicit NOT EXISTS queries for both ends of every
 *     udb_leader_targets pair (belt-and-suspenders over PRAGMA FK check)
 *  3. Orphan sub_faction — JS-level check (sub_faction is not FK-constrained)
 *  4. Orphan detachment/stratagem/enhancement FKs (migrations 042/043)
 *
 * NOTE: Each INSERT binds only the columns required for FK checking (PK + FK
 * columns), not the full column set. This validates referential integrity only;
 * it does not verify column shape, NOT NULL constraints, or type fidelity
 * (those are covered by the lib.rs import path and other tests).
 *
 * Rows are inserted in dependency order with FK OFF (all udb_* tables deleted
 * and re-inserted under FK-OFF during the real import; order does not matter
 * functionally but is preserved here for readability), then FK turned ON before
 * assertions.
 *
 * Rides the Phase-131 CI test gate — a future orphan-introducing regression
 * will turn this test (and CI) red.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { createHobbyforgeDb } from "./db-helpers";
import type { UnitDatabaseJson } from "../../scripts/lib/types.ts";

// Resolve artifact path the same way as unit-database-artifact.test.ts
const JSON_PATH = join(__dirname, "../../src-tauri/data/unit_database.json");

describe("DAT-01b: fk-integrity — unit_database.json passes PRAGMA foreign_key_check", () => {
  let db: Database.Database;
  let artifact: UnitDatabaseJson;

  beforeAll(() => {
    // Load the built artifact
    artifact = JSON.parse(readFileSync(JSON_PATH, "utf-8")) as UnitDatabaseJson;

    // Build an in-memory DB from all real migrations (FK = ON after chain)
    db = createHobbyforgeDb();

    // FK OFF during INSERT (mirrors lib.rs bulk_sync_rules which disables FK
    // enforcement for the delete+insert cycle; order is irrelevant under FK-OFF
    // but kept in dependency order for readability)
    db.pragma("foreign_keys = OFF");

    // ── INSERT factions (parent level 1) ──────────────────────────────────────
    const insertFaction = db.prepare(
      `INSERT OR IGNORE INTO udb_factions (id, name, updated_at)
       VALUES (?, ?, datetime('now'))`,
    );
    for (const f of artifact.factions) {
      insertFaction.run(f.id, f.name);
    }

    // ── INSERT units (parent level 2) ─────────────────────────────────────────
    const insertUnit = db.prepare(
      `INSERT OR IGNORE INTO udb_units
         (id, faction_id, name, sub_faction, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
    );
    for (const u of artifact.units) {
      insertUnit.run(u.id, u.faction_id, u.name, u.sub_faction ?? null);
    }

    // ── INSERT child tables ────────────────────────────────────────────────────

    // udb_unit_models
    const insertModel = db.prepare(
      `INSERT OR IGNORE INTO udb_unit_models (unit_id, line_order)
       VALUES (?, ?)`,
    );
    for (const m of artifact.models) {
      insertModel.run(m.unit_id, m.line_order);
    }

    // udb_unit_weapons
    const insertWeapon = db.prepare(
      `INSERT OR IGNORE INTO udb_unit_weapons
         (unit_id, weapon_group, line_order, name)
       VALUES (?, ?, ?, ?)`,
    );
    for (const w of artifact.weapons) {
      insertWeapon.run(w.unit_id, w.weapon_group, w.line_order, w.name);
    }

    // udb_unit_abilities
    const insertAbility = db.prepare(
      `INSERT OR IGNORE INTO udb_unit_abilities
         (unit_id, line_order, name)
       VALUES (?, ?, ?)`,
    );
    for (const a of artifact.abilities) {
      insertAbility.run(a.unit_id, a.line_order, a.name);
    }

    // udb_unit_keywords  (composite PK: unit_id + keyword)
    const insertKeyword = db.prepare(
      `INSERT OR IGNORE INTO udb_unit_keywords
         (unit_id, keyword, is_faction)
       VALUES (?, ?, ?)`,
    );
    for (const k of artifact.keywords) {
      insertKeyword.run(k.unit_id, k.keyword, k.is_faction);
    }

    // udb_unit_points
    const insertPoints = db.prepare(
      `INSERT OR IGNORE INTO udb_unit_points
         (unit_id, model_count, points)
       VALUES (?, ?, ?)`,
    );
    for (const p of artifact.points) {
      insertPoints.run(p.unit_id, p.model_count, p.points);
    }

    // udb_unit_composition
    const insertComp = db.prepare(
      `INSERT OR IGNORE INTO udb_unit_composition
         (unit_id, min_models, max_models)
       VALUES (?, ?, ?)`,
    );
    for (const c of artifact.composition) {
      insertComp.run(c.unit_id, c.min_models, c.max_models);
    }

    // ── INSERT leader_targets (depends on units on both sides) ────────────────
    // artifact uses snake_case key "leader_targets"
    const insertLeaderTarget = db.prepare(
      `INSERT OR IGNORE INTO udb_leader_targets
         (leader_unit_id, target_unit_id)
       VALUES (?, ?)`,
    );
    for (const lt of artifact.leader_targets) {
      insertLeaderTarget.run(lt.leader_unit_id, lt.target_unit_id);
    }

    // ── INSERT detachments (parent of detachment_abilities, stratagems, enhancements) ──
    // Dependency: udb_factions must already exist (inserted above)
    const insertDetachment = db.prepare(
      `INSERT OR IGNORE INTO udb_detachments (id, faction_id, name, updated_at)
       VALUES (?, ?, ?, datetime('now'))`,
    );
    for (const d of artifact.detachments) {
      insertDetachment.run(d.id, d.faction_id, d.name);
    }

    // ── INSERT detachment_abilities (depends on detachments + factions) ───────
    const insertDetAbility = db.prepare(
      `INSERT OR IGNORE INTO udb_detachment_abilities (id, detachment_id, faction_id, name)
       VALUES (?, ?, ?, ?)`,
    );
    for (const da of artifact.detachment_abilities) {
      insertDetAbility.run(da.id, da.detachment_id, da.faction_id, da.name);
    }

    // ── INSERT stratagems (faction_id + detachment_id are nullable) ───────────
    const insertStratagem = db.prepare(
      `INSERT OR IGNORE INTO udb_stratagems (id, faction_id, detachment_id, name, description, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    );
    for (const s of artifact.stratagems) {
      insertStratagem.run(s.id, s.faction_id, s.detachment_id, s.name, s.description);
    }

    // ── INSERT enhancements (faction_id NOT NULL, detachment_id nullable) ─────
    const insertEnhancement = db.prepare(
      `INSERT OR IGNORE INTO udb_enhancements (id, faction_id, detachment_id, name, description, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    );
    for (const e of artifact.enhancements) {
      insertEnhancement.run(e.id, e.faction_id, e.detachment_id, e.name, e.description);
    }

    // Re-enable FK enforcement before assertions
    db.pragma("foreign_keys = ON");
  });

  afterAll(() => {
    db.close();
  });

  // ── Assertion 1: PRAGMA foreign_key_check ─────────────────────────────────
  it("PRAGMA foreign_key_check returns zero rows (no FK violations)", () => {
    const fkViolations = db.pragma("foreign_key_check") as unknown[];
    expect(
      fkViolations,
      `FK violations found:\n${JSON.stringify(fkViolations, null, 2)}`,
    ).toHaveLength(0);
  });

  // ── Assertion 2: Orphan leader pairs (belt-and-suspenders) ────────────────
  it("no orphan leader_unit_id in udb_leader_targets", () => {
    const orphanLeaders = db
      .prepare(
        `SELECT lt.leader_unit_id FROM udb_leader_targets lt
         WHERE NOT EXISTS (SELECT 1 FROM udb_units WHERE id = lt.leader_unit_id)`,
      )
      .all() as { leader_unit_id: string }[];
    expect(
      orphanLeaders,
      `Orphan leader_unit_id pairs: ${JSON.stringify(orphanLeaders)}`,
    ).toHaveLength(0);
  });

  it("no orphan target_unit_id in udb_leader_targets", () => {
    const orphanTargets = db
      .prepare(
        `SELECT lt.target_unit_id FROM udb_leader_targets lt
         WHERE NOT EXISTS (SELECT 1 FROM udb_units WHERE id = lt.target_unit_id)`,
      )
      .all() as { target_unit_id: string }[];
    expect(
      orphanTargets,
      `Orphan target_unit_id pairs: ${JSON.stringify(orphanTargets)}`,
    ).toHaveLength(0);
  });

  // ── Assertion 3: Orphan sub_faction (JS-level — not FK-constrained) ───────
  it("no unrecognized sub_faction values (validated against pipeline allow-list)", () => {
    // Validate each non-null sub_faction against the canonical values produced
    // by the pipeline's KEYWORD_SUB_FACTION_MAP and SUB_FACTION_MAP.
    // Any value outside this set was never assigned by the pipeline and
    // indicates data corruption or cross-faction pollution.
    const legalSubFactions = new Set([
      // Space Marines chapters (from KEYWORD_SUB_FACTION_MAP + SUB_FACTION_MAP)
      "Black Templars", "Blood Angels", "Blood Ravens", "Dark Angels",
      "Deathwatch", "Imperial Fists", "Iron Hands", "Raven Guard",
      "Salamanders", "Space Wolves", "Ultramarines", "White Scars",
      // Chaos warbands
      "Death Guard", "Thousand Sons", "World Eaters", "Emperor's Children",
      // Aeldari
      "Drukhari", "Ynnari",
    ]);

    const violations: string[] = [];
    for (const u of artifact.units) {
      if (u.sub_faction !== null && !legalSubFactions.has(u.sub_faction)) {
        violations.push(
          `unit ${u.id} (faction ${u.faction_id}) has unrecognized sub_faction "${u.sub_faction}"`,
        );
      }
    }

    expect(
      violations,
      `Unrecognized sub_faction violations:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });

  // ── Assertion 4: Orphan detachment FKs (belt-and-suspenders over PRAGMA) ──
  it("no orphan faction_id in udb_detachments", () => {
    const orphans = db
      .prepare(
        `SELECT d.id, d.faction_id FROM udb_detachments d
         WHERE NOT EXISTS (SELECT 1 FROM udb_factions WHERE id = d.faction_id)`,
      )
      .all() as { id: string; faction_id: string }[];
    expect(
      orphans,
      `Orphan udb_detachments.faction_id: ${JSON.stringify(orphans)}`,
    ).toHaveLength(0);
  });

  it("no orphan detachment_id in udb_detachment_abilities", () => {
    const orphans = db
      .prepare(
        `SELECT da.id, da.detachment_id FROM udb_detachment_abilities da
         WHERE NOT EXISTS (SELECT 1 FROM udb_detachments WHERE id = da.detachment_id)`,
      )
      .all() as { id: string; detachment_id: string }[];
    expect(
      orphans,
      `Orphan udb_detachment_abilities.detachment_id: ${JSON.stringify(orphans)}`,
    ).toHaveLength(0);
  });

  it("no orphan faction_id in udb_detachment_abilities", () => {
    const orphans = db
      .prepare(
        `SELECT da.id, da.faction_id FROM udb_detachment_abilities da
         WHERE NOT EXISTS (SELECT 1 FROM udb_factions WHERE id = da.faction_id)`,
      )
      .all() as { id: string; faction_id: string }[];
    expect(
      orphans,
      `Orphan udb_detachment_abilities.faction_id: ${JSON.stringify(orphans)}`,
    ).toHaveLength(0);
  });

  it("no non-null orphan faction_id in udb_stratagems", () => {
    const orphans = db
      .prepare(
        `SELECT s.id, s.faction_id FROM udb_stratagems s
         WHERE s.faction_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM udb_factions WHERE id = s.faction_id)`,
      )
      .all() as { id: string; faction_id: string }[];
    expect(
      orphans,
      `Orphan udb_stratagems.faction_id: ${JSON.stringify(orphans)}`,
    ).toHaveLength(0);
  });

  it("no non-null orphan detachment_id in udb_stratagems", () => {
    const orphans = db
      .prepare(
        `SELECT s.id, s.detachment_id FROM udb_stratagems s
         WHERE s.detachment_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM udb_detachments WHERE id = s.detachment_id)`,
      )
      .all() as { id: string; detachment_id: string }[];
    expect(
      orphans,
      `Orphan udb_stratagems.detachment_id: ${JSON.stringify(orphans)}`,
    ).toHaveLength(0);
  });

  it("no orphan faction_id in udb_enhancements", () => {
    const orphans = db
      .prepare(
        `SELECT e.id, e.faction_id FROM udb_enhancements e
         WHERE NOT EXISTS (SELECT 1 FROM udb_factions WHERE id = e.faction_id)`,
      )
      .all() as { id: string; faction_id: string }[];
    expect(
      orphans,
      `Orphan udb_enhancements.faction_id: ${JSON.stringify(orphans)}`,
    ).toHaveLength(0);
  });

  it("no non-null orphan detachment_id in udb_enhancements", () => {
    const orphans = db
      .prepare(
        `SELECT e.id, e.detachment_id FROM udb_enhancements e
         WHERE e.detachment_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM udb_detachments WHERE id = e.detachment_id)`,
      )
      .all() as { id: string; detachment_id: string }[];
    expect(
      orphans,
      `Orphan udb_enhancements.detachment_id: ${JSON.stringify(orphans)}`,
    ).toHaveLength(0);
  });
});
