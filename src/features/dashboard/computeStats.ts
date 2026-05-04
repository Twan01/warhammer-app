/**
 * Pure aggregation function for the Dashboard (DASH-01..06, DASH-08).
 * Takes raw units + factions arrays from the SQLite query and returns
 * a fully derived stats object the DashboardPage consumes verbatim.
 *
 * Pitfall 1 (05-RESEARCH.md): SQLite booleans are 0|1 — use === 1 checks.
 * Pitfall 4 (05-RESEARCH.md): guard divide-by-zero (units.length > 0 ? pct : 0).
 */
import type { Unit } from "@/types/unit";
import type { Faction } from "@/types/faction";

export interface FactionStat {
  faction: Faction;
  modelCount: number;
  paintedPct: number;
  pointsOwned: number;
  pointsPainted: number;
}

export interface ComputedDashboardStats {
  totalModels: number;
  fullyPainted: number;
  battleReadyPoints: number;
  activeProjectsCount: number;
  paintingPct: number;
  assemblyPct: number;
  basingPct: number;
  factionStats: FactionStat[];
  activeProjects: Unit[];
  recentlyUpdated: Unit[];
  hasUnits: boolean;
  factions: Faction[];
  units: Unit[];
}

export function computeStats(units: Unit[], factions: Faction[]): ComputedDashboardStats {
  if (units.length === 0) {
    return {
      totalModels: 0,
      fullyPainted: 0,
      battleReadyPoints: 0,
      activeProjectsCount: 0,
      paintingPct: 0,
      assemblyPct: 0,
      basingPct: 0,
      factionStats: factions.map((f) => ({
        faction: f,
        modelCount: 0,
        paintedPct: 0,
        pointsOwned: 0,
        pointsPainted: 0,
      })),
      activeProjects: [],
      recentlyUpdated: [],
      hasUnits: false,
      factions,
      units: [],
    };
  }

  const totalModels = units.length;
  const fullyPainted = units.filter((u) => u.status_painting === "Completed").length;
  const battleReadyPoints = units
    .filter((u) => u.status_painting === "Completed")
    .reduce((sum, u) => sum + (u.points ?? 0), 0);
  const activeProjectsCount = units.filter((u) => u.is_active_project === 1).length;

  const paintingPct = Math.round(
    units.reduce((sum, u) => sum + u.painting_percentage, 0) / units.length
  );
  const assemblyPct = Math.round(
    (units.filter((u) => u.status_assembly === 1).length / units.length) * 100
  );
  const basingPct = Math.round(
    (units.filter((u) => u.status_basing === 1).length / units.length) * 100
  );

  const activeProjects = units
    .filter((u) => u.is_active_project === 1)
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  const recentlyUpdated = units
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  const factionStats: FactionStat[] = factions.map((f) => {
    const fUnits = units.filter((u) => u.faction_id === f.id);
    const painted = fUnits.filter((u) => u.status_painting === "Completed");
    return {
      faction: f,
      modelCount: fUnits.length,
      paintedPct:
        fUnits.length > 0
          ? Math.round((painted.length / fUnits.length) * 100)
          : 0,
      pointsOwned: fUnits.reduce((s, u) => s + (u.points ?? 0), 0),
      pointsPainted: painted.reduce((s, u) => s + (u.points ?? 0), 0),
    };
  });

  return {
    totalModels,
    fullyPainted,
    battleReadyPoints,
    activeProjectsCount,
    paintingPct,
    assemblyPct,
    basingPct,
    factionStats,
    activeProjects,
    recentlyUpdated,
    hasUnits: true,
    factions,
    units,
  };
}
