import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SyncStatusCard } from "./SyncStatusCard";
import { useFactions } from "@/hooks/useFactions";
import { useRulesSyncMeta, useWahapediaFactionId } from "@/hooks/useDatasheet";
import { useRulesHubFilters } from "./rulesHubFilters";
import {
  useStratagemsByFaction,
  useDetachmentsByFaction,
  useSharedAbilitiesByFaction,
} from "@/hooks/useRulesExtended";
import type { SyncDiff } from "@/lib/computeSyncDiff";

export function RulesHubPage() {
  const [lastSyncDiff, setLastSyncDiff] = useState<SyncDiff | null>(null);

  const { data: factions = [] } = useFactions();
  const { data: syncMeta } = useRulesSyncMeta();

  const {
    selectedFactionId,
    searchText,
    setSelectedFactionId,
    setSearchText,
  } = useRulesHubFilters();

  const selectedFaction = factions.find((f) => f.id === selectedFactionId);
  const { data: wahapediaFactionId } = useWahapediaFactionId(selectedFaction?.name);

  // Prefetch rules data for selected faction (tabs will use these)
  useStratagemsByFaction(wahapediaFactionId ?? undefined);
  useDetachmentsByFaction(wahapediaFactionId ?? undefined);
  useSharedAbilitiesByFaction(wahapediaFactionId ?? undefined);

  const noData = !syncMeta;
  const noFaction = !selectedFactionId;

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Rules Hub</h1>

      <SyncStatusCard
        lastSyncDiff={lastSyncDiff}
        onSyncComplete={setLastSyncDiff}
      />

      {noData ? (
        <p className="text-sm text-muted-foreground">
          Sync rules data to get started.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedFactionId !== null ? String(selectedFactionId) : ""}
              onValueChange={(val) =>
                setSelectedFactionId(val ? Number(val) : null)
              }
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select faction…" />
              </SelectTrigger>
              <SelectContent>
                {factions.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
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
              Select a faction to browse rules.
            </p>
          ) : (
            <Tabs defaultValue="stratagems">
              <TabsList>
                <TabsTrigger value="stratagems">Stratagems</TabsTrigger>
                <TabsTrigger value="detachments">Detachments</TabsTrigger>
                <TabsTrigger value="shared-abilities">Shared Abilities</TabsTrigger>
              </TabsList>

              <TabsContent value="stratagems">
                <p className="mt-4 text-sm text-muted-foreground">
                  Stratagems content
                </p>
              </TabsContent>

              <TabsContent value="detachments">
                <p className="mt-4 text-sm text-muted-foreground">
                  Detachments content
                </p>
              </TabsContent>

              <TabsContent value="shared-abilities">
                <p className="mt-4 text-sm text-muted-foreground">
                  Shared abilities content
                </p>
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
