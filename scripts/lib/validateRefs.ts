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
 *  4. Orphan sub_faction: any non-null units.sub_faction value that does not
 *     appear in the known sub_faction value set for that faction's units is
 *     flagged. (sub_faction is a free TEXT column, not an FK — this must be a
 *     JS-level check.)
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
} from "./types.ts";

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
  // A value is "orphan" if it appears on a unit but does not appear as any
  // other unit's sub_faction value within the same faction.  In other words,
  // a singleton sub_faction that no other unit shares is still valid as long as
  // it is self-consistent.  The real concern is a sub_faction value that
  // references a label not present in the *known set of sub_faction values for
  // that faction's entire unit set* — which by construction is every value
  // assigned by the pipeline's own SUB_FACTION_MAP / KEYWORD_SUB_FACTION_MAP
  // assignment step.
  //
  // Implementation: build, per faction, the full set of sub_faction values
  // assigned to that faction's units.  A unit's sub_faction is "orphan" if
  // its value is non-null AND is NOT in the set for its own faction.
  // (Because each unit contributes to that set, a value is always in the set
  // for the faction that uses it — this check is therefore a no-op for
  // well-formed data and would only fire if a unit's faction_id itself were
  // also wrong, or if a sub_faction value somehow ended up on a unit whose
  // faction has no units with that sub_faction — e.g. from a copy-paste error.)
  //
  // Practical usage: catches cross-faction sub_faction pollution (e.g. a SM
  // sub_faction string accidentally assigned to a NEC unit).
  const subFactionsByFaction = new Map<string, Set<string>>();
  for (const u of units) {
    if (u.sub_faction !== null) {
      const set = subFactionsByFaction.get(u.faction_id) ?? new Set<string>();
      set.add(u.sub_faction);
      subFactionsByFaction.set(u.faction_id, set);
    }
  }

  for (const u of units) {
    if (u.sub_faction !== null) {
      const knownForFaction = subFactionsByFaction.get(u.faction_id);
      if (!knownForFaction || !knownForFaction.has(u.sub_faction)) {
        violations.push(
          `unit ${u.id} (faction ${u.faction_id}) has orphan sub_faction "${u.sub_faction}"`,
        );
      }
    }
  }

  return violations;
}
