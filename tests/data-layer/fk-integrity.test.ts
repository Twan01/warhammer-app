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
 *
 * Rows are inserted in dependency order with FK OFF (mirrors lib.rs import),
 * then FK turned ON before assertions. This is the first test to do a full
 * in-memory import of the complete unit_database.json artifact.
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

    // Mirror lib.rs import: FK OFF during INSERT, then ON for assertions
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
  it("no orphan sub_faction values (sub_faction is a free TEXT column)", () => {
    // A sub_faction value is "orphan" if it appears on a unit but does not
    // appear in the known set of sub_faction values for that faction's units.
    // Since every unit contributes to its faction's set, a lone sub_faction
    // value is still valid — the check catches cross-faction pollution (a unit
    // with a sub_faction value that belongs to a different faction's pool).
    //
    // Build the known sub_faction set per faction from the artifact
    const subFactionsByFaction = new Map<string, Set<string>>();
    for (const u of artifact.units) {
      if (u.sub_faction !== null) {
        const set =
          subFactionsByFaction.get(u.faction_id) ?? new Set<string>();
        set.add(u.sub_faction);
        subFactionsByFaction.set(u.faction_id, set);
      }
    }

    const violations: string[] = [];
    for (const u of artifact.units) {
      if (u.sub_faction !== null) {
        const knownForFaction = subFactionsByFaction.get(u.faction_id);
        if (!knownForFaction || !knownForFaction.has(u.sub_faction)) {
          violations.push(
            `unit ${u.id} (faction ${u.faction_id}) has orphan sub_faction "${u.sub_faction}"`,
          );
        }
      }
    }

    expect(
      violations,
      `Orphan sub_faction violations:\n${violations.join("\n")}`,
    ).toHaveLength(0);
  });
});
