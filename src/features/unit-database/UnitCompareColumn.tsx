/**
 * Phase 138-02 — PLAY-01: Per-unit column for the side-by-side compare view.
 *
 * Receives all comparison data via props — no hooks called here.
 * Binary diff highlight: bg-faction-accent/15 on cells that differ across columns.
 * Reuses the shared WeaponTable (HON-08) for ranged and melee weapons.
 */
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";
import { WeaponTable } from "@/features/units/WeaponTable";

const SECTION_HEADER =
  "text-xs font-semibold uppercase tracking-widest text-muted-foreground border-t border-border/40 pt-3 mt-1";

interface UnitCompareColumnProps {
  unit: UdbUnitDetail;
  statDiffMap: Map<string, boolean>;
  allUnits: UdbUnitDetail[];
}

// Stat fields rendered in the 3x2 grid
const STAT_FIELDS = ["M", "T", "Sv", "W", "Ld", "OC"] as const;
type StatField = (typeof STAT_FIELDS)[number];

function getStatValue(model: UdbUnitDetail["models"][0], field: StatField): string {
  const raw = model[field as keyof typeof model];
  return raw !== null && raw !== undefined ? String(raw) : "—";
}

export function UnitCompareColumn({
  unit,
  statDiffMap,
  allUnits,
}: UnitCompareColumnProps) {
  const model = unit.models[0];

  const rangedWeapons = unit.weapons.filter(
    (w) => w.category?.toLowerCase() === "ranged",
  );
  const meleeWeapons = unit.weapons.filter(
    (w) => w.category?.toLowerCase() === "melee",
  );

  // Compute weapon name sets across all other columns for presence diff
  const allWeaponNameSets: Set<string>[] = allUnits.map(
    (u) => new Set(u.weapons.map((w) => w.name)),
  );

  // An item is "absent elsewhere" if at least one other column's set does not contain it
  function isWeaponAbsentElsewhere(weaponName: string): boolean {
    return allWeaponNameSets.some((nameSet) => !nameSet.has(weaponName));
  }

  // Ability name sets across all columns for presence diff
  const allAbilityNameSets: Set<string>[] = allUnits.map(
    (u) => new Set(u.abilities.map((a) => a.name)),
  );

  function isAbilityAbsentElsewhere(abilityName: string): boolean {
    return allAbilityNameSets.some((nameSet) => !nameSet.has(abilityName));
  }

  // Keyword sets across all columns for presence diff
  const allKeywordSets: Set<string>[] = allUnits.map(
    (u) => new Set(u.keywords.map((k) => k.keyword)),
  );

  function isKeywordAbsentElsewhere(keyword: string): boolean {
    return allKeywordSets.some((nameSet) => !nameSet.has(keyword));
  }

  // Points diff: compare serialized tier strings across all columns
  const allPointsStrings: string[][] = allUnits.map((u) =>
    u.points.map((p) => `${p.model_count}:${p.points}`),
  );

  function isPointsTierAbsentElsewhere(tier: { model_count: number; points: number }): boolean {
    const key = `${tier.model_count}:${tier.points}`;
    return allPointsStrings.some((tierList) => !tierList.includes(key));
  }

  // Faction name for the column header (use faction_id as fallback)
  const factionLabel = unit.faction_id;

  return (
    <div className="bg-card border border-border/60 shadow-sm rounded-lg p-4 flex flex-col gap-4">
      {/* Column header */}
      <div className="flex flex-col gap-0.5">
        <p className="text-base font-semibold leading-tight">{unit.name}</p>
        <p className="text-xs text-muted-foreground">{factionLabel}</p>
      </div>

      {/* Stats section */}
      <div className="flex flex-col gap-2">
        <p className={SECTION_HEADER}>Stats</p>
        {model ? (
          <div className="grid grid-cols-3 gap-2">
            {STAT_FIELDS.map((field) => {
              const isDifferent = statDiffMap.get(field) === true;
              return (
                <div key={field} className="flex flex-col items-center gap-0.5">
                  <span
                    className={`text-xl font-semibold text-center${isDifferent ? " bg-faction-accent/15 rounded px-1" : ""}`}
                  >
                    {getStatValue(model, field)}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">{field}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No model data</p>
        )}
      </div>

      {/* Weapons section */}
      {(rangedWeapons.length > 0 || meleeWeapons.length > 0) && (
        <div className="flex flex-col gap-2">
          <p className={SECTION_HEADER}>Weapons</p>
          {rangedWeapons.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground font-medium">Ranged</p>
              <div>
                {rangedWeapons.map((w) => {
                  const absent = isWeaponAbsentElsewhere(w.name);
                  return (
                    <div
                      key={`${w.weapon_group}-${w.line_order}`}
                      className={absent ? "bg-faction-accent/15 rounded px-1" : ""}
                    >
                      <WeaponTable weapons={[w]} statLabel="BS" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {meleeWeapons.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground font-medium">Melee</p>
              <div>
                {meleeWeapons.map((w) => {
                  const absent = isWeaponAbsentElsewhere(w.name);
                  return (
                    <div
                      key={`${w.weapon_group}-${w.line_order}`}
                      className={absent ? "bg-faction-accent/15 rounded px-1" : ""}
                    >
                      <WeaponTable weapons={[w]} statLabel="WS" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Abilities section */}
      {unit.abilities.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className={SECTION_HEADER}>Abilities</p>
          <div className="flex flex-col gap-1">
            {unit.abilities.map((a) => {
              const absent = isAbilityAbsentElsewhere(a.name);
              return (
                <p
                  key={a.id}
                  className={`text-sm${absent ? " bg-faction-accent/15 rounded px-1" : ""}`}
                >
                  {a.name}
                </p>
              );
            })}
          </div>
        </div>
      )}

      {/* Keywords section */}
      {unit.keywords.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className={SECTION_HEADER}>Keywords</p>
          <div className="flex flex-wrap gap-1">
            {unit.keywords.map((k) => {
              const absent = isKeywordAbsentElsewhere(k.keyword);
              return (
                <span
                  key={k.keyword}
                  className={`text-xs${absent ? " bg-faction-accent/15 rounded px-1" : ""}`}
                >
                  {k.keyword}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Points section */}
      {unit.points.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className={SECTION_HEADER}>Points</p>
          <div className="flex flex-col gap-1">
            {unit.points.map((p) => {
              const absent = isPointsTierAbsentElsewhere(p);
              return (
                <p
                  key={p.id}
                  className={`text-sm tabular-nums${absent ? " bg-faction-accent/15 rounded" : ""}`}
                >
                  {p.points} pts ({p.model_count} model{p.model_count !== 1 ? "s" : ""})
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
