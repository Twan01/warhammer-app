/**
 * Phase 94 — Shared export formatting utility (EXP-01..04, D-15/D-16).
 *
 * Pure functions: no side effects, no DB, no async. Transforms raw army list
 * data into structured ExportData consumed by all 4 export formats (clipboard
 * text, print preview, JSON file, PDF file).
 *
 * Leader pair grouping follows Phase 92 D-07: target unit first, attached
 * leader immediately after.
 */

import type {
  ArmyList,
  ArmyListUnitRow,
  ArmyListEnhancement,
} from "@/types/armyList";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportUnit {
  displayName: string;
  points: number;
  isWarlord: boolean;
  isGhost: boolean;
  leaderLabel: string | null;
  enhancementName: string | null;
}

export interface ExportData {
  list: ArmyList;
  factionName: string | null;
  sortedUnits: ExportUnit[];
  enhancements: ArmyListEnhancement[];
  totalPoints: number;
  enhancementTotal: number;
}

// ---------------------------------------------------------------------------
// formatArmyListForExport
// ---------------------------------------------------------------------------

/**
 * Transform raw DB rows into structured export data with leader pair grouping,
 * ghost/warlord tagging, and enhancement assignment.
 */
export function formatArmyListForExport(
  list: ArmyList,
  units: ArmyListUnitRow[],
  enhancements: ArmyListEnhancement[],
  factionName: string | null,
): ExportData {
  // Build enhancement lookup: army_list_unit_id -> enhancement_name
  const enhMap = new Map<number, string>();
  for (const e of enhancements) {
    enhMap.set(e.army_list_unit_id, e.enhancement_name);
  }

  // Build leader lookup: leader_attached_to_id -> leader unit row
  const leadersByTarget = new Map<number, ArmyListUnitRow[]>();
  for (const u of units) {
    if (u.leader_attached_to_id != null) {
      const existing = leadersByTarget.get(u.leader_attached_to_id) ?? [];
      existing.push(u);
      leadersByTarget.set(u.leader_attached_to_id, existing);
    }
  }

  // Group leader pairs: target first, attached leaders immediately after
  const orderedUnits: ArmyListUnitRow[] = [];
  for (const unit of units) {
    if (unit.leader_attached_to_id != null) continue; // skip leaders in first pass
    orderedUnits.push(unit);
    const attached = leadersByTarget.get(unit.id);
    if (attached) {
      orderedUnits.push(...attached);
    }
  }

  // Convert to ExportUnit with leader labels on target units
  const sortedUnits: ExportUnit[] = orderedUnits.map((u) => {
    const leaders = leadersByTarget.get(u.id);
    let leaderLabel: string | null = null;
    if (leaders && leaders.length > 0) {
      const leader = leaders[0];
      leaderLabel = `Led by: ${leader.unit_name} -- ${leader.effective_points}pts`;
    }

    return {
      displayName: u.unit_name,
      points: u.effective_points,
      isWarlord: u.is_warlord === 1,
      isGhost: u.unit_id === null,
      leaderLabel,
      enhancementName: enhMap.get(u.id) ?? null,
    };
  });

  const totalPoints = units.reduce((sum, u) => sum + u.effective_points, 0);
  const enhancementTotal = enhancements.reduce(
    (sum, e) => sum + e.enhancement_points,
    0,
  );

  return {
    list,
    factionName,
    sortedUnits,
    enhancements,
    totalPoints,
    enhancementTotal,
  };
}

// ---------------------------------------------------------------------------
// buildClipboardText
// ---------------------------------------------------------------------------

/**
 * Tournament-style compact text format per D-03.
 * No trailing whitespace. Empty enhancements section omitted.
 */
export function buildClipboardText(data: ExportData): string {
  const lines: string[] = [];
  const grandTotal = data.totalPoints + data.enhancementTotal;
  const limitStr = data.list.points_limit ?? "?";

  lines.push(`${data.list.name} -- ${grandTotal}/${limitStr}pts`);
  lines.push(`Faction: ${data.factionName ?? "None"}`);
  lines.push(`Detachment: ${data.list.detachment_name ?? "None"}`);
  lines.push("");

  if (data.sortedUnits.length === 0) {
    lines.push("No units added yet.");
  } else {
    lines.push("== Units ==");
    for (const unit of data.sortedUnits) {
      const ghostTag = unit.isGhost ? " [Planned]" : "";
      const warlordTag = unit.isWarlord ? " (Warlord)" : "";
      lines.push(`${unit.displayName}${ghostTag}${warlordTag} -- ${unit.points}pts`);
      if (unit.leaderLabel) {
        lines.push(`  > ${unit.leaderLabel}`);
      }
    }
  }

  if (data.enhancements.length > 0) {
    lines.push("");
    lines.push("== Enhancements ==");
    for (const e of data.enhancements) {
      lines.push(`${e.enhancement_name} -- ${e.enhancement_points}pts`);
    }
  }

  lines.push("");
  lines.push(
    `Total: ${grandTotal}pts${data.list.points_limit ? ` / ${data.list.points_limit}pts` : ""}`,
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// buildJsonFormat
// ---------------------------------------------------------------------------

/**
 * Versioned structured JSON per D-10.
 * 2-space indentation. exported_at is ISO-8601 timestamp.
 */
export function buildJsonFormat(data: ExportData): string {
  const output = {
    format: "hobbyforge-army-list",
    version: "1.0",
    exported_at: new Date().toISOString(),
    list: {
      name: data.list.name,
      faction: data.factionName ?? null,
      detachment: data.list.detachment_name ?? null,
      points_limit: data.list.points_limit,
      total_points: data.totalPoints,
      enhancement_points: data.enhancementTotal,
    },
    units: data.sortedUnits.map((u) => ({
      name: u.displayName,
      points: u.points,
      is_warlord: u.isWarlord,
      is_ghost: u.isGhost,
      selected_model_count: null as number | null,
      leader_attached_to: u.leaderLabel
        ? u.leaderLabel.replace("Led by: ", "").replace(/ -- \d+pts$/, "")
        : null,
      enhancement: u.enhancementName ?? null,
    })),
    enhancements: data.enhancements.map((e) => ({
      name: e.enhancement_name,
      points: e.enhancement_points,
      assigned_to: null as string | null,
    })),
  };

  return JSON.stringify(output, null, 2);
}

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

/**
 * Sanitize a string for use as a filename component.
 * Strips all non-alphanumeric chars (including path traversal like ../ and /).
 * Lowercases, trims leading/trailing hyphens.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// dateStamp
// ---------------------------------------------------------------------------

/**
 * Returns current date in YYYY-MM-DD format.
 */
export function dateStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
