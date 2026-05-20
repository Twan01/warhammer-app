import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDatasheetsByFactionWithPoints } from "@/hooks/useDatasheet";
import { getPointTiersByFaction } from "@/db/queries/syncedUnitPoints";
import { getFullDatasheet } from "@/db/queries/datasheets";
import {
  getLoadoutOptionsByFaction,
  getModelCountsByFaction,
  getLeaderTargetsByFaction,
  type SyncedLoadoutOptionRow,
  type SyncedLeaderTargetRow,
} from "@/db/queries/bsdataExtended";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronRight, Link, Swords } from "lucide-react";
import type { FullDatasheet, RwDatasheetWargear } from "@/types/datasheet";
import { EnhancementsList } from "./EnhancementsList";

function usePointTiers(factionId: string | undefined) {
  return useQuery({
    queryKey:
      factionId !== undefined
        ? (["point-tiers", factionId] as const)
        : (["point-tiers"] as const),
    queryFn: () =>
      factionId !== undefined
        ? getPointTiersByFaction(factionId)
        : Promise.resolve([]),
    enabled: factionId !== undefined,
    staleTime: Infinity,
  });
}

const ROLE_ORDER: Record<string, number> = {
  Character: 0,
  Battleline: 1,
  Infantry: 2,
  Mounted: 3,
  Beast: 4,
  Vehicle: 5,
  Fortification: 6,
  "Dedicated Transport": 7,
  Other: 8,
};

function DatasheetDetail({
  datasheetId,
  unitName,
  loadoutOptions,
  leaderTargets,
}: {
  datasheetId: string;
  unitName: string;
  loadoutOptions: SyncedLoadoutOptionRow[];
  leaderTargets: SyncedLeaderTargetRow[];
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["datasheet-detail", datasheetId] as const,
    queryFn: () => getFullDatasheet(datasheetId),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="px-4 pb-3 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!data) return null;

  const unitLoadouts = loadoutOptions.filter((l) => l.unit_name === unitName);
  const unitLeaderTargets = leaderTargets.filter(
    (l) => l.leader_name === unitName,
  );

  return (
    <DatasheetContent
      ds={data}
      loadoutOptions={unitLoadouts}
      leaderTargets={unitLeaderTargets}
    />
  );
}

function DatasheetContent({
  ds,
  loadoutOptions,
  leaderTargets,
}: {
  ds: FullDatasheet;
  loadoutOptions: SyncedLoadoutOptionRow[];
  leaderTargets: SyncedLeaderTargetRow[];
}) {
  const rangedWeapons = ds.wargear.filter((w) => w.type === "Ranged");
  const meleeWeapons = ds.wargear.filter(
    (w) => w.type === "Melee" || (w.type !== "Ranged" && w.range === "Melee"),
  );
  const abilities = ds.abilities.filter(
    (a) => a.type !== "Wargear" && a.type !== "Wargear profile",
  );
  const coreAbilities = abilities.filter((a) => a.type === "Core");
  const factionAbilities = abilities.filter((a) => a.type === "Faction");
  const datasheetAbilities = abilities.filter(
    (a) => a.type !== "Core" && a.type !== "Faction",
  );
  const factionKeywords = ds.keywords.filter((k) => k.is_faction_keyword === 1);
  const unitKeywords = ds.keywords.filter((k) => k.is_faction_keyword === 0);

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Model stat lines */}
      {ds.models.length > 0 && (
        <div className="rounded border overflow-hidden">
          <div className="grid grid-cols-[1fr_32px_28px_28px_28px_28px_28px_28px] gap-x-1 px-2 py-1 bg-muted/50 border-b">
            {["", "M", "T", "Sv", "W", "Ld", "OC", "Inv"].map((h) => (
              <span
                key={h || "name"}
                className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left"
              >
                {h}
              </span>
            ))}
          </div>
          {ds.models.map((m, i) => (
            <div
              key={`${m.datasheet_id}-${m.line}-${i}`}
              className="grid grid-cols-[1fr_32px_28px_28px_28px_28px_28px_28px] gap-x-1 px-2 py-1.5 border-b last:border-0"
            >
              <span className="text-sm font-medium truncate">
                {m.name ?? ds.ds.name}
              </span>
              <span className="text-xs text-center tabular-nums">
                {m.M ?? "—"}
              </span>
              <span className="text-xs text-center tabular-nums">
                {m.T ?? "—"}
              </span>
              <span className="text-xs text-center tabular-nums">
                {m.Sv ?? "—"}
              </span>
              <span className="text-xs text-center tabular-nums">
                {m.W ?? "—"}
              </span>
              <span className="text-xs text-center tabular-nums">
                {m.Ld ?? "—"}
              </span>
              <span className="text-xs text-center tabular-nums">
                {m.OC ?? "—"}
              </span>
              <span className="text-xs text-center tabular-nums">
                {m.inv_sv ? `${m.inv_sv}+` : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ranged weapons */}
      {rangedWeapons.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Ranged Weapons
          </h4>
          <div className="rounded border overflow-hidden">
            <WeaponTable weapons={rangedWeapons} statLabel="BS" />
          </div>
        </div>
      )}

      {/* Melee weapons */}
      {meleeWeapons.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Melee Weapons
          </h4>
          <div className="rounded border overflow-hidden">
            <WeaponTable weapons={meleeWeapons} statLabel="WS" />
          </div>
        </div>
      )}

      {/* Loadout options */}
      {loadoutOptions.length > 0 && (
        <LoadoutOptionsSection options={loadoutOptions} />
      )}

      {/* Leader targets */}
      {leaderTargets.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
            <Link className="h-3 w-3" />
            Leader — Can attach to
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {leaderTargets.map((t) => (
              <Badge
                key={t.target_name}
                variant="outline"
                className="text-xs"
              >
                {t.target_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Abilities */}
      {abilities.length > 0 && (
        <div className="space-y-2">
          {coreAbilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {coreAbilities.map((a) => (
                <Badge key={a.name} variant="outline" className="text-xs">
                  {a.name}
                </Badge>
              ))}
            </div>
          )}
          {factionAbilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {factionAbilities.map((a) => (
                <Badge
                  key={a.name}
                  variant="secondary"
                  className="text-xs"
                >
                  {a.name}
                </Badge>
              ))}
            </div>
          )}
          {datasheetAbilities.length > 0 && (
            <div className="space-y-1.5">
              {datasheetAbilities.map((a) => (
                <div key={`${a.name}-${a.line}`} className="pl-2 border-l-2 border-primary/30">
                  <span className="text-sm font-medium">{a.name}</span>
                  {a.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {a.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Keywords */}
      {ds.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {factionKeywords.map((k) => (
            <Badge key={k.keyword} variant="default" className="text-[10px]">
              {k.keyword}
            </Badge>
          ))}
          {unitKeywords.map((k) => (
            <Badge
              key={k.keyword}
              variant="outline"
              className="text-[10px] text-muted-foreground"
            >
              {k.keyword}
            </Badge>
          ))}
        </div>
      )}

      {/* Damaged profile */}
      {ds.ds.damaged_description && (
        <p className="text-xs text-destructive/80 italic">
          Damaged ({ds.ds.damaged_w}+ wounds remaining): {ds.ds.damaged_description}
        </p>
      )}
    </div>
  );
}

function WeaponTable({
  weapons,
  statLabel,
}: {
  weapons: RwDatasheetWargear[];
  statLabel: "BS" | "WS";
}) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1 bg-muted/50 border-b">
        {["Name", "Rng", "A", statLabel, "S", "AP", "D"].map((h) => (
          <span
            key={h}
            className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide text-center first:text-left"
          >
            {h}
          </span>
        ))}
      </div>
      {weapons.map((w, i) => {
        const range =
          w.range && /^\d+$/.test(w.range) ? `${w.range}"` : (w.range ?? "—");
        const attacks = w.dice
          ? `${w.dice}+${w.A ?? 0}`
          : (w.A ?? "—");
        const bsws = w.BS_WS ? `${w.BS_WS}+` : "—";
        return (
          <div
            key={`${w.datasheet_id}-${w.line}-${w.line_in_wargear}-${i}`}
            className="border-b last:border-0"
          >
            <div className="grid grid-cols-[1fr_36px_32px_36px_28px_32px_28px] gap-x-1 px-2 py-1.5 items-center">
              <span className="text-sm font-medium truncate">{w.name}</span>
              <span className="text-xs text-center tabular-nums">{range}</span>
              <span className="text-xs text-center tabular-nums">
                {attacks}
              </span>
              <span className="text-xs text-center tabular-nums">{bsws}</span>
              <span className="text-xs text-center tabular-nums">
                {w.S ?? "—"}
              </span>
              <span className="text-xs text-center tabular-nums">
                {w.AP ?? "0"}
              </span>
              <span className="text-xs text-center tabular-nums">
                {w.D ?? "—"}
              </span>
            </div>
            {w.description && (
              <p className="px-2 pb-1.5 text-xs text-muted-foreground leading-relaxed">
                {w.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LoadoutOptionsSection({
  options,
}: {
  options: SyncedLoadoutOptionRow[];
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, SyncedLoadoutOptionRow[]>();
    for (const o of options) {
      if (!m.has(o.group_name)) m.set(o.group_name, []);
      m.get(o.group_name)!.push(o);
    }
    return [...m.entries()];
  }, [options]);

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
        <Swords className="h-3 w-3" />
        Loadout Options
      </h4>
      <div className="space-y-2">
        {grouped.map(([groupName, items]) => (
          <div key={groupName} className="pl-2 border-l-2 border-muted">
            <span className="text-xs font-medium text-muted-foreground">
              {groupName}
              {items[0]?.is_exclusive ? " (pick one)" : ""}
            </span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {items.map((item) => (
                <Badge
                  key={item.option_name}
                  variant={item.is_default ? "default" : "outline"}
                  className="text-xs"
                >
                  {item.option_name}
                  {item.is_default ? " ★" : ""}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DatasheetPointsTab({ factionId }: { factionId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: datasheets = [], isLoading } =
    useDatasheetsByFactionWithPoints(factionId);
  const { data: tierRows = [] } = usePointTiers(factionId);
  const { data: modelCountRows = [] } = useQuery({
    queryKey: ["model-counts-by-faction", factionId] as const,
    queryFn: () => getModelCountsByFaction(factionId),
    staleTime: Infinity,
  });
  const { data: loadoutOptions = [] } = useQuery({
    queryKey: ["loadout-options-by-faction", factionId] as const,
    queryFn: () => getLoadoutOptionsByFaction(factionId),
    staleTime: Infinity,
  });
  const { data: leaderTargets = [] } = useQuery({
    queryKey: ["leader-targets-by-faction", factionId] as const,
    queryFn: () => getLeaderTargetsByFaction(factionId),
    staleTime: Infinity,
  });

  const modelCountsMap = useMemo(() => {
    const m = new Map<string, { min: number; max: number }>();
    for (const r of modelCountRows) {
      m.set(r.unit_name, { min: r.min_models, max: r.max_models });
    }
    return m;
  }, [modelCountRows]);

  const tiersMap = useMemo(() => {
    const m = new Map<string, Array<{ modelCount: number; points: number }>>();
    for (const t of tierRows) {
      const key = t.unit_name;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push({ modelCount: t.model_count, points: t.points });
    }
    return m;
  }, [tierRows]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof datasheets>();
    for (const ds of datasheets) {
      const role = ds.role || "Other";
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(ds);
    }
    return [...groups.entries()].sort(
      ([a], [b]) => (ROLE_ORDER[a] ?? 99) - (ROLE_ORDER[b] ?? 99),
    );
  }, [datasheets]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (datasheets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No datasheets found for this faction.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        {datasheets.length} datasheet{datasheets.length !== 1 ? "s" : ""}
        {" · "}
        {datasheets.filter((d) => d.points != null).length} with points
        {" · click a row to expand"}
      </p>

      <EnhancementsList factionId={factionId} />

      {grouped.map(([role, units]) => (
        <div key={role}>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {role}
          </h3>
          <div className="rounded-lg border divide-y">
            {units.map((ds) => {
              const tiers = tiersMap.get(ds.name);
              const mc = modelCountsMap.get(ds.name);
              const isExpanded = expandedId === ds.id;
              return (
                <div key={ds.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-2.5 gap-4 text-left hover:bg-muted/50 transition-colors",
                      isExpanded && "bg-muted/30",
                    )}
                    onClick={() =>
                      setExpandedId(isExpanded ? null : ds.id)
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                      <span className="font-medium text-sm truncate">
                        {ds.name}
                      </span>
                      {mc && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {mc.min === mc.max
                            ? `${mc.min} model${mc.min !== 1 ? "s" : ""}`
                            : `${mc.min}–${mc.max} models`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tiers && tiers.length > 0 ? (
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {tiers.map((t) => (
                            <Badge
                              key={t.modelCount}
                              variant="secondary"
                              className="text-xs tabular-nums whitespace-nowrap"
                            >
                              {t.modelCount}× {t.points}pts
                            </Badge>
                          ))}
                        </div>
                      ) : ds.points != null ? (
                        <Badge
                          variant="secondary"
                          className="text-xs tabular-nums"
                        >
                          {ds.points}pts
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">
                          —
                        </span>
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <DatasheetDetail
                      datasheetId={ds.id}
                      unitName={ds.name}
                      loadoutOptions={loadoutOptions}
                      leaderTargets={leaderTargets}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
