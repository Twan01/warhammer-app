/**
 * DAT-01a: JSON-level referential integrity validation helper.
 *
 * Pure function that takes the in-memory build data (factions, units, and all
 * child-table row arrays) and returns a string[] of human-readable violation
 * messages. An empty array means referential integrity is clean.
 *
 * Per D-01 (two-layer validation): this runs over the in-memory row arrays
 * BEFORE unit_database.json is written, so the build pipeline can fail fast.
 *
 * Checks performed:
 *  1. Every unit.faction_id is in the set of faction ids.
 *  2. Every child row's unit_id (weapons, abilities, keywords, models, points,
 *     composition) is in the set of unit ids — each violation is labelled with
 *     its table name.
 *  3. Both leader_unit_id and target_unit_id of every leaderTargets pair are
 *     in the unit-id set.
 *  4. Orphan sub_faction: any non-null units.sub_faction value that is not in
 *     the global legal set derived from KEYWORD_SUB_FACTION_MAP / SUB_FACTION_MAP
 *     is flagged. (sub_faction is a free TEXT column, not an FK — this must be a
 *     JS-level check.)
 *  5. Detachment FK graph (migrations 042/043):
 *     - Every detachment.faction_id resolves to a known faction (NOT NULL).
 *     - Every detachment_ability.detachment_id resolves to a known detachment (NOT NULL).
 *     - Every detachment_ability.faction_id resolves to a known faction (NOT NULL).
 *     - Every non-null stratagem.faction_id resolves to a known faction (nullable).
 *     - Every non-null stratagem.detachment_id resolves to a known detachment (nullable).
 *     - Every enhancement.faction_id resolves to a known faction (NOT NULL).
 *     - Every non-null enhancement.detachment_id resolves to a known detachment (nullable).
 *
 * Style: named export, pure function, no console output, no process.exit.
 * Follows the scripts/lib/ helper pattern (weaponMapping.ts, parseCsv.ts).
 */

import type {
  UdbFactionRow,
  UdbUnitRow,
  UdbUnitWeaponRow,
  UdbUnitAbilityRow,
  UdbUnitKeywordRow,
  UdbUnitModelRow,
  UdbUnitPointsRow,
  UdbUnitCompositionRow,
  UdbLeaderTargetRow,
  UdbDetachmentRow,
  UdbDetachmentAbilityRow,
  UdbStratagemRow,
  UdbEnhancementRow,
} from "./types.ts";
import { KEYWORD_SUB_FACTION_MAP, SUB_FACTION_MAP } from "./factionMap.ts";

export interface ValidateRefsInput {
  factions: UdbFactionRow[];
  units: UdbUnitRow[];
  weapons: UdbUnitWeaponRow[];
  abilities: UdbUnitAbilityRow[];
  keywords: UdbUnitKeywordRow[];
  models: UdbUnitModelRow[];
  points: UdbUnitPointsRow[];
  composition: UdbUnitCompositionRow[];
  leaderTargets: UdbLeaderTargetRow[];
  detachments: UdbDetachmentRow[];
  detachmentAbilities: UdbDetachmentAbilityRow[];
  stratagems: UdbStratagemRow[];
  enhancements: UdbEnhancementRow[];
}

/**
 * Validates referential integrity of the in-memory build data.
 *
 * Returns an array of human-readable violation messages.
 * An empty array means all referential checks passed (clean).
 *
 * Does NOT call console.* or process.exit — callers handle reporting.
 */
export function validateReferentialIntegrity(
  data: ValidateRefsInput,
): string[] {
  const {
    factions,
    units,
    weapons,
    abilities,
    keywords,
    models,
    points,
    composition,
    leaderTargets,
    detachments,
    detachmentAbilities,
    stratagems,
    enhancements,
  } = data;

  const violations: string[] = [];

  // Build parent ID sets once — O(n) construction, O(1) lookups below
  const factionIds = new Set(factions.map((f) => f.id));
  const unitIds = new Set(units.map((u) => u.id));

  // ── Check 1: every unit.faction_id must resolve to a known faction ─────────
  for (const u of units) {
    if (!factionIds.has(u.faction_id)) {
      violations.push(
        `unit ${u.id} has unknown faction_id "${u.faction_id}"`,
      );
    }
  }

  // ── Check 2: every child row's unit_id must resolve to a known unit ────────
  const childArrays: Array<[string, { unit_id: string }[]]> = [
    ["udb_unit_weapons", weapons],
    ["udb_unit_abilities", abilities],
    ["udb_unit_keywords", keywords],
    ["udb_unit_models", models],
    ["udb_unit_points", points],
    ["udb_unit_composition", composition],
  ];
  for (const [tableName, arr] of childArrays) {
    for (const row of arr) {
      if (!unitIds.has(row.unit_id)) {
        violations.push(
          `${tableName}: unit_id "${row.unit_id}" not in units`,
        );
      }
    }
  }

  // ── Check 3: both ends of every leader_targets pair must resolve to a unit ─
  for (const pair of leaderTargets) {
    if (!unitIds.has(pair.leader_unit_id)) {
      violations.push(
        `leader_targets: leader_unit_id "${pair.leader_unit_id}" not in units`,
      );
    }
    if (!unitIds.has(pair.target_unit_id)) {
      violations.push(
        `leader_targets: target_unit_id "${pair.target_unit_id}" not in units`,
      );
    }
  }

  // ── Check 4: orphan sub_faction ─────────────────────────────────────────────
  // sub_faction is a free TEXT column — no FK constraint exists.
  // Validate each non-null sub_faction value against the authoritative global
  // allow-list produced by KEYWORD_SUB_FACTION_MAP and SUB_FACTION_MAP.
  // Any value not in this set was never assigned by the pipeline and indicates
  // a data corruption or cross-faction pollution bug.
  const legalSubFactions = new Set<string>([
    ...Object.values(KEYWORD_SUB_FACTION_MAP),
    ...Object.values(SUB_FACTION_MAP),
  ]);

  for (const u of units) {
    if (u.sub_faction !== null && !legalSubFactions.has(u.sub_faction)) {
      violations.push(
        `unit ${u.id} (faction ${u.faction_id}) has unrecognized sub_faction "${u.sub_faction}"`,
      );
    }
  }

  // ── Check 5: detachment FK graph (migrations 042/043) ───────────────────────
  const detachmentIds = new Set(detachments.map((d) => d.id));

  // udb_detachments.faction_id → udb_factions (NOT NULL)
  for (const d of detachments) {
    if (!factionIds.has(d.faction_id)) {
      violations.push(
        `udb_detachments ${d.id}: faction_id "${d.faction_id}" not in factions`,
      );
    }
  }

  // udb_detachment_abilities.detachment_id → udb_detachments (NOT NULL)
  // udb_detachment_abilities.faction_id → udb_factions (NOT NULL)
  for (const da of detachmentAbilities) {
    if (!detachmentIds.has(da.detachment_id)) {
      violations.push(
        `udb_detachment_abilities ${da.id}: detachment_id "${da.detachment_id}" not in detachments`,
      );
    }
    if (!factionIds.has(da.faction_id)) {
      violations.push(
        `udb_detachment_abilities ${da.id}: faction_id "${da.faction_id}" not in factions`,
      );
    }
  }

  // udb_stratagems.faction_id → udb_factions (nullable — null is allowed)
  // udb_stratagems.detachment_id → udb_detachments (nullable — null is allowed)
  for (const s of stratagems) {
    if (s.faction_id !== null && !factionIds.has(s.faction_id)) {
      violations.push(
        `udb_stratagems ${s.id}: faction_id "${s.faction_id}" not in factions`,
      );
    }
    if (s.detachment_id !== null && !detachmentIds.has(s.detachment_id)) {
      violations.push(
        `udb_stratagems ${s.id}: detachment_id "${s.detachment_id}" not in detachments`,
      );
    }
  }

  // udb_enhancements.faction_id → udb_factions (NOT NULL)
  // udb_enhancements.detachment_id → udb_detachments (nullable — null is allowed)
  for (const e of enhancements) {
    if (!factionIds.has(e.faction_id)) {
      violations.push(
        `udb_enhancements ${e.id}: faction_id "${e.faction_id}" not in factions`,
      );
    }
    if (e.detachment_id !== null && !detachmentIds.has(e.detachment_id)) {
      violations.push(
        `udb_enhancements ${e.id}: detachment_id "${e.detachment_id}" not in detachments`,
      );
    }
  }

  return violations;
}
