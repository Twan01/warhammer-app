import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUdbFactions, useUdbUnits } from "@/hooks/useUnitDatabase";
import { useDatabaseBrowserFilters } from "./databaseBrowserFilters";
import { applyUdbFilters } from "./applyUdbFilters";
import { FactionPicker } from "./FactionPicker";
import { DatabaseBrowserFilters } from "./UdbFilterBar";
import { UdbUnitList } from "./UdbUnitList";
import { UdbSearchResults } from "./UdbSearchResults";

export function DatabaseBrowserPage() {
  const { data: factions = [], isLoading: factionsLoading } = useUdbFactions();

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

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const isSearching = searchText.trim().length > 0;

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

      {selectedUnitId && (
        <div>Sheet placeholder for {selectedUnitId}</div>
      )}
    </div>
  );
}
