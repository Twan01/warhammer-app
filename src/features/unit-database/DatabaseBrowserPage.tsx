import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Search, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { unitDatabaseRoute } from "@/app/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useUdbFactions,
  useUdbUnits,
  useUdbOwnership,
  useUdbUnitOwnership,
  useUdbKeywords,
  useUdbSubFactions,
} from "@/hooks/useUnitDatabase";
import { useFactions, useUpdateFaction } from "@/hooks/useFactions";
import { useDatabaseBrowserFilters } from "./databaseBrowserFilters";
import { applyUdbFilters } from "./applyUdbFilters";
import { FactionPicker } from "./FactionPicker";
import { FactionLinkDialog } from "./FactionLinkDialog";
import { DatabaseBrowserFilters } from "./UdbFilterBar";
import { UdbUnitList } from "./UdbUnitList";
import { UdbSearchResults } from "./UdbSearchResults";
import { UdbDatasheetSheet } from "./UdbDatasheetSheet";
import { UnitSheet } from "@/features/units/UnitSheet";
import type { UdbUnitDetail } from "@/db/queries/unitDatabase";
import type { UnitFormValues } from "@/features/units/unitSchema";
import { PageHeader } from "@/components/common/PageHeader";

export function DatabaseBrowserPage() {
  const { data: factions = [], isLoading: factionsLoading } = useUdbFactions();
  const { data: collectionFactions = [] } = useFactions();
  const updateFaction = useUpdateFaction();

  const {
    selectedFactionId,
    searchText,
    subFactionFilter,
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
  const { data: keywordsMap } = useUdbKeywords(selectedFactionId);
  const { data: subFactions = [] } = useUdbSubFactions(selectedFactionId);

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
      applyUdbFilters(
        units,
        { subFactionFilter, roleFilter, keywordFilter, pointMin, pointMax },
        keywordsMap,
      ),
    [units, subFactionFilter, roleFilter, keywordFilter, pointMin, pointMax, keywordsMap],
  );

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const unit of units) {
      if (unit.role) roles.add(unit.role);
    }
    return Array.from(roles).sort();
  }, [units]);

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
  const { data: unitOwnership } = useUdbUnitOwnership(selectedUnitId);
  const isSearching = searchText.trim().length > 0;

  // Deep-link (WR-01): when navigated here with ?udbUnitId=…, auto-open that
  // datasheet. UdbDatasheetSheet fetches by id independently of the selected
  // faction, so no faction needs to be picked first. Consume the param once
  // and strip it from the URL so it does not re-trigger on later renders.
  const { udbUnitId } = unitDatabaseRoute.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    if (!udbUnitId) return;
    setSelectedUnitId(udbUnitId);
    navigate({
      to: "/unit-database",
      search: {},
      replace: true,
    });
  }, [udbUnitId, navigate]);

  // UnitSheet state for the "Add to Collection" flow
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);
  const [unitSheetPrefill, setUnitSheetPrefill] =
    useState<Partial<UnitFormValues> | null>(null);
  const [unitSheetUdbId, setUnitSheetUdbId] = useState<string | null>(null);

  // Faction link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [pendingUnit, setPendingUnit] = useState<UdbUnitDetail | null>(null);

  /** Open the UnitSheet pre-filled from a UDB unit + resolved collection faction */
  const openUnitSheet = useCallback(
    (unit: UdbUnitDetail, collectionFactionId: number) => {
      // Tiered multi-model units price per model count (udb_unit_points). Everything
      // else (characters, transports, single-price units) keeps a flat udb_units.base_points
      // and has no tier rows — fall back to it so they don't import at 0 points.
      const basePoints =
        unit.points.length > 0
          ? Math.min(...unit.points.map((p) => p.points))
          : unit.base_points;
      const minModels = unit.composition[0]?.min_models ?? 1;

      const prefill: Partial<UnitFormValues> = {
        name: unit.name,
        faction_id: collectionFactionId,
        category: unit.role ?? "",
        points: basePoints,
        model_count: minModels,
      };

      setUnitSheetPrefill(prefill);
      setUnitSheetUdbId(unit.id);
      setSelectedUnitId(null);
      setUnitSheetOpen(true);
    },
    [],
  );

  function handleAddToCollection(unit: UdbUnitDetail) {
    // Try automatic match: collection faction's wahapedia_faction_id === UDB unit's faction_id
    const matchedFaction = collectionFactions.find(
      (f) => f.wahapedia_faction_id === unit.faction_id,
    );

    if (matchedFaction) {
      openUnitSheet(unit, matchedFaction.id);
      return;
    }

    // No automatic match — show faction link dialog so the user can pick
    if (collectionFactions.length === 0) {
      toast.error("No collection factions found. Create a faction first.");
      return;
    }

    setPendingUnit(unit);
    setLinkDialogOpen(true);
  }

  async function handleFactionLinkConfirm(collectionFactionId: number) {
    if (!pendingUnit) return;

    // Persist the link so future adds match automatically
    try {
      await updateFaction.mutateAsync({
        id: collectionFactionId,
        wahapedia_faction_id: pendingUnit.faction_id,
      });
    } catch {
      toast.error("Failed to link faction. Please try again.");
      return;
    }

    setLinkDialogOpen(false);
    openUnitSheet(pendingUnit, collectionFactionId);
    setPendingUnit(null);

    toast.success("Faction linked. Future adds will match automatically.");
  }

  function handleUnitSheetClose() {
    setUnitSheetOpen(false);
    setUnitSheetPrefill(null);
    setUnitSheetUdbId(null);
  }

  // Resolve UDB faction name for the link dialog
  const pendingUdbFactionName = useMemo(() => {
    if (!pendingUnit) return "";
    const udbFaction = factions.find((f) => f.id === pendingUnit.faction_id);
    return udbFaction?.name ?? pendingUnit.faction_id;
  }, [pendingUnit, factions]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Unit Database"
        subtitle="Browse canonical Warhammer 40,000 unit datasheets"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/rules-hub">
              <ArrowRight className="mr-1 h-4 w-4" aria-hidden="true" />
              View Rules
            </Link>
          </Button>
        }
      />

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
                <DatabaseBrowserFilters roles={availableRoles} subFactions={subFactions} />
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
        ownershipData={unitOwnership ?? null}
      />

      <UnitSheet
        open={unitSheetOpen}
        unit={null}
        prefill={unitSheetPrefill ?? undefined}
        prefillUdbUnitId={unitSheetUdbId}
        onClose={handleUnitSheetClose}
      />

      <FactionLinkDialog
        open={linkDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLinkDialogOpen(false);
            setPendingUnit(null);
          }
        }}
        factions={collectionFactions}
        udbFactionName={pendingUdbFactionName}
        onConfirm={handleFactionLinkConfirm}
      />
    </div>
  );
}
