import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  useUdbFactions,
  useUdbUnits,
  useUdbOwnership,
} from "@/hooks/useUnitDatabase";
import { useFactions } from "@/hooks/useFactions";
import { useDatabaseBrowserFilters } from "./databaseBrowserFilters";
import { applyUdbFilters } from "./applyUdbFilters";
import { FactionPicker } from "./FactionPicker";
import { DatabaseBrowserFilters } from "./UdbFilterBar";
import { UdbUnitList } from "./UdbUnitList";
import { UdbSearchResults } from "./UdbSearchResults";
import { UdbDatasheetSheet } from "./UdbDatasheetSheet";
import { UnitSheet } from "@/features/units/UnitSheet";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";
import type { UnitFormValues } from "@/features/units/unitSchema";

export function DatabaseBrowserPage() {
  const { data: factions = [], isLoading: factionsLoading } = useUdbFactions();
  const { data: collectionFactions = [] } = useFactions();

  const {
    selectedFactionId,
    searchText,
    roleFilter,
    keywordFilter,
    pointMin,
    pointMax,
    setSelectedFactionId,
    setSearchText,
  } = useDatabaseBrowserFilters();

  const { data: units = [], isLoading: unitsLoading } = useUdbUnits(
    selectedFactionId,
  );

  const { data: ownershipEntries = [] } = useUdbOwnership(selectedFactionId);

  // Debounced search text — local state + useEffect pattern
  const [localSearch, setLocalSearch] = useState(searchText);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchText]);

  // Sync local search from store (e.g. external reset)
  useEffect(() => {
    setLocalSearch(searchText);
  }, [searchText]);

  const filteredUnits = useMemo(
    () =>
      applyUdbFilters(units, {
        roleFilter,
        keywordFilter,
        pointMin,
        pointMax,
      }),
    [units, roleFilter, keywordFilter, pointMin, pointMax],
  );

  // Build ownership map: udb_unit_id → { owned_count, all_statuses }
  const ownershipMap = useMemo(() => {
    const map = new Map<string, { owned_count: number; all_statuses: string }>();
    for (const entry of ownershipEntries) {
      map.set(entry.udb_unit_id, {
        owned_count: entry.owned_count,
        all_statuses: entry.all_statuses,
      });
    }
    return map;
  }, [ownershipEntries]);

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const isSearching = searchText.trim().length > 0;

  // UnitSheet state for the "Add to Collection" flow
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);
  const [unitSheetPrefill, setUnitSheetPrefill] =
    useState<Partial<UnitFormValues> | null>(null);
  const [unitSheetUdbId, setUnitSheetUdbId] = useState<string | null>(null);

  function handleAddToCollection(unit: UdbUnitDetail) {
    // Map udb faction_id (text) → collection faction_id (integer)
    const matchedFaction = collectionFactions.find(
      (f) => f.wahapedia_faction_id === unit.faction_id,
    );
    if (!matchedFaction) {
      toast.error("No matching collection faction found. Create the faction first.");
      return;
    }
    const factionId = matchedFaction.id;

    // Lowest points tier
    const basePoints = unit.points[0]?.points ?? null;

    // Min models from first composition entry
    const minModels = unit.composition[0]?.min_models ?? 1;

    const prefill: Partial<UnitFormValues> = {
      name: unit.name,
      faction_id: factionId,
      category: unit.role ?? "",
      points: basePoints,
      model_count: minModels,
    };

    setUnitSheetPrefill(prefill);
    setUnitSheetUdbId(unit.id);
    // Close datasheet sheet
    setSelectedUnitId(null);
    // Open UnitSheet in create mode
    setUnitSheetOpen(true);
  }

  function handleUnitSheetClose() {
    setUnitSheetOpen(false);
    setUnitSheetPrefill(null);
    setUnitSheetUdbId(null);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Unit Database</h1>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 w-full"
          placeholder="Search units across all factions..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
      </div>

      {isSearching ? (
        <UdbSearchResults
          query={searchText}
          onSelectResult={(unitId) => setSelectedUnitId(unitId)}
        />
      ) : (
        <div className="flex gap-0 min-h-0 flex-1">
          {/* Left panel: Faction picker */}
          <FactionPicker
            factions={factions}
            selectedFactionId={selectedFactionId}
            onSelectFaction={setSelectedFactionId}
            isLoading={factionsLoading}
          />

          {/* Right panel: Filters + Unit list */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedFactionId ? (
              <>
                <DatabaseBrowserFilters />
                <UdbUnitList
                  units={filteredUnits}
                  isLoading={unitsLoading}
                  onOpenUnit={(id) => setSelectedUnitId(id)}
                  ownershipMap={ownershipMap}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground px-4 py-6">
                Select a faction to browse units.
              </p>
            )}
          </div>
        </div>
      )}

      <UdbDatasheetSheet
        unitId={selectedUnitId}
        open={!!selectedUnitId}
        onOpenChange={(open) => {
          if (!open) setSelectedUnitId(null);
        }}
        onAddToCollection={handleAddToCollection}
        ownershipData={
          selectedUnitId ? (ownershipMap.get(selectedUnitId) ?? null) : null
        }
      />

      <UnitSheet
        open={unitSheetOpen}
        unit={null}
        prefill={unitSheetPrefill ?? undefined}
        prefillUdbUnitId={unitSheetUdbId}
        onClose={handleUnitSheetClose}
      />
    </div>
  );
}
