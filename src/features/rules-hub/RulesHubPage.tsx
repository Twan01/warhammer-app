import { useMemo, useState } from "react";
import type { RulesFavorite } from "@/types/rulesFavorite";
import type { RulesNote } from "@/types/rulesNote";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncStatusCard } from "./SyncStatusCard";
import { useRulesSyncMeta, useWahapediaFactions } from "@/hooks/useDatasheet";
import { useRulesHubFilters } from "./rulesHubFilters";
import {
  useStratagemsByFaction,
  useDetachmentsByFaction,
  useSharedAbilitiesByFaction,
} from "@/hooks/useRulesExtended";
import { applyStratagemFilters, STRATAGEM_PHASES } from "./applyRulesHubFilters";
import { useRulesFavorites } from "@/hooks/useRulesFavorites";
import { useRulesNotes } from "@/hooks/useRulesNotes";
import { StratagemCard } from "./StratagemCard";
import { DetachmentCard } from "./DetachmentCard";
import { SharedAbilityCard } from "./SharedAbilityCard";
import { cn } from "@/lib/utils";
import type { SyncDiff } from "@/lib/computeSyncDiff";
import type { PointsDelta } from "@/types/pointsDelta";
import { getArmyListUnitNames } from "@/db/queries/armyLists";
import { DatasheetPointsTab } from "./DatasheetPointsTab";

export function RulesHubPage() {
  const [lastSyncDiff, setLastSyncDiff] = useState<SyncDiff | null>(null);
  const [lastPointsDelta, setLastPointsDelta] = useState<PointsDelta | null>(null);
  const [affectedLists, setAffectedLists] = useState<Array<{ id: number; name: string }>>([]);

  const { data: wahapediaFactions = [] } = useWahapediaFactions();
  const { data: syncMeta } = useRulesSyncMeta();

  const {
    selectedFactionId,
    searchText,
    phaseFilter,
    cpFilter,
    setSelectedFactionId,
    setSearchText,
    setPhaseFilter,
    setCpFilter,
  } = useRulesHubFilters();

  // Rules data for selected faction
  const { data: stratagems = [], isLoading: stratagemLoading } = useStratagemsByFaction(selectedFactionId ?? undefined);
  const { data: detachments = [], isLoading: detachmentLoading } = useDetachmentsByFaction(selectedFactionId ?? undefined);
  const { data: sharedAbilities = [], isLoading: sharedAbilitiesLoading } = useSharedAbilitiesByFaction(selectedFactionId ?? undefined);

  const { data: favorites = [] } = useRulesFavorites();
  const { data: rulesNotes = [] } = useRulesNotes();

  const favoritesMap = useMemo(() => {
    const m = new Map<string, RulesFavorite>();
    for (const f of favorites) m.set(`${f.rule_id}:${f.rule_type}`, f);
    return m;
  }, [favorites]);

  const notesMap = useMemo(() => {
    const m = new Map<string, RulesNote>();
    for (const n of rulesNotes) m.set(`${n.rule_id}:${n.rule_type}`, n);
    return m;
  }, [rulesNotes]);

  const filteredStratagems = useMemo(
    () => applyStratagemFilters(stratagems, { searchText, phaseFilter, cpFilter }),
    [stratagems, searchText, phaseFilter, cpFilter]
  );

  const filteredDetachments = useMemo(() => {
    if (!searchText) return detachments;
    const lower = searchText.toLowerCase();
    return detachments.filter((d) => d.name.toLowerCase().includes(lower));
  }, [detachments, searchText]);

  const filteredAbilities = useMemo(() => {
    if (!searchText) return sharedAbilities;
    const lower = searchText.toLowerCase();
    return sharedAbilities.filter(
      (a) =>
        a.name.toLowerCase().includes(lower) ||
        (a.legend ?? "").toLowerCase().includes(lower)
    );
  }, [sharedAbilities, searchText]);

  async function handleSyncComplete(diff: SyncDiff, pointsDelta: PointsDelta) {
    setLastSyncDiff(diff);
    setLastPointsDelta(pointsDelta);

    // Compute affected army lists: find lists containing units that had point changes
    if (pointsDelta.details.length > 0) {
      try {
        const changedUnitNames = new Set(
          pointsDelta.details.map((d) => d.unitName),
        );
        const allListUnits = await getArmyListUnitNames();
        const affected = new Map<number, string>();
        for (const row of allListUnits) {
          if (changedUnitNames.has(row.unit_name)) {
            affected.set(row.list_id, row.list_name);
          }
        }
        setAffectedLists(
          Array.from(affected, ([id, name]) => ({ id, name })),
        );
      } catch {
        // Best-effort: affected lists display is non-critical
        setAffectedLists([]);
      }
    } else {
      setAffectedLists([]);
    }
  }

  const noData = !syncMeta;
  const noFaction = !selectedFactionId;

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Rules Hub</h1>

      <SyncStatusCard
        lastSyncDiff={lastSyncDiff}
        onSyncComplete={handleSyncComplete}
        pointsDelta={lastPointsDelta}
        affectedLists={affectedLists}
      />

      {noData ? (
        <p className="text-sm text-muted-foreground">
          Sync rules data to get started.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedFactionId ?? ""}
              onValueChange={(val) =>
                setSelectedFactionId(val || null)
              }
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select army…" />
              </SelectTrigger>
              <SelectContent>
                {wahapediaFactions.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="w-56"
              placeholder="Search…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {noFaction ? (
            <p className="text-sm text-muted-foreground">
              Select an army to browse rules.
            </p>
          ) : (
            <Tabs defaultValue="datasheets">
              <TabsList>
                <TabsTrigger value="datasheets">Datasheets</TabsTrigger>
                <TabsTrigger value="stratagems">Stratagems</TabsTrigger>
                <TabsTrigger value="detachments">Detachments</TabsTrigger>
                <TabsTrigger value="shared-abilities">Shared Abilities</TabsTrigger>
              </TabsList>

              <TabsContent value="datasheets" className="mt-4 space-y-4">
                <DatasheetPointsTab factionId={selectedFactionId!} />
              </TabsContent>

              <TabsContent value="stratagems" className="mt-4 space-y-4">
                {/* Phase filter chips */}
                <div className="flex flex-wrap gap-2">
                  {STRATAGEM_PHASES.map((phase) => (
                    <Button
                      key={phase}
                      size="sm"
                      variant={phaseFilter === phase ? "default" : "outline"}
                      onClick={() =>
                        setPhaseFilter(phaseFilter === phase ? null : phase)
                      }
                    >
                      {phase}
                    </Button>
                  ))}
                </div>

                {/* CP cost filter chips */}
                <div className="flex flex-wrap gap-2">
                  {(["1", "2", "3"] as const).map((cp) => (
                    <Button
                      key={cp}
                      size="sm"
                      variant={cpFilter === cp ? "default" : "outline"}
                      onClick={() =>
                        setCpFilter(cpFilter === cp ? null : cp)
                      }
                    >
                      {cp} CP
                    </Button>
                  ))}
                </div>

                {stratagemLoading ? (
                  <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Count + card list */}
                    <p className="text-xs text-muted-foreground">
                      {filteredStratagems.length} stratagem{filteredStratagems.length !== 1 ? "s" : ""}
                    </p>

                    {filteredStratagems.length === 0 ? (
                      <p className={cn("text-sm text-muted-foreground italic")}>
                        No stratagems match your filters.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredStratagems.map((s) => (
                          <StratagemCard key={s.id} stratagem={s} favorite={favoritesMap.get(s.id + ':stratagem') ?? null} note={notesMap.get(s.id + ':stratagem') ?? null} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="detachments" className="mt-4 space-y-4">
                {detachmentLoading ? (
                  <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {filteredDetachments.length} detachment{filteredDetachments.length !== 1 ? "s" : ""}
                    </p>

                    {filteredDetachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No detachments match your search.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredDetachments.map((d) => (
                          <DetachmentCard key={d.id} detachment={d} favoritesMap={favoritesMap} notesMap={notesMap} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="shared-abilities" className="mt-4 space-y-4">
                {sharedAbilitiesLoading ? (
                  <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {filteredAbilities.length} {filteredAbilities.length === 1 ? "ability" : "abilities"}
                    </p>

                    {filteredAbilities.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No shared abilities match your search.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {filteredAbilities.map((a) => (
                          <SharedAbilityCard key={a.id} ability={a} favorite={favoritesMap.get(a.id + ':shared_ability') ?? null} note={notesMap.get(a.id + ':shared_ability') ?? null} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      <p className="mt-8 text-xs text-muted-foreground text-center">
        All rules data is community-sourced from Wahapedia. This is not official
        Games Workshop material.
      </p>
    </div>
  );
}
