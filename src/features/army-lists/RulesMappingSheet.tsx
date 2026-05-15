/**
 * Phase 76 -- Rules mapping Sheet (PV-04, D-09).
 *
 * Side sheet for confirming or overriding the unit-to-rules datasheet
 * mapping. Three sections: current match, alternative search, empty state.
 *
 * Follows FactionSheet pattern: Sheet with SheetContent, controlled open
 * state, toast notifications on mutations, close on success.
 *
 * T-76-04: Search term passed via parameterized $1 to findRulesDatasheets.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useUnitRulesMapping,
  useUpsertUnitRulesMapping,
  useDeleteUnitRulesMapping,
} from "@/hooks/useUnitRulesMapping";
import { findRulesDatasheets } from "@/db/queries/unitRulesMapping";

interface RulesMappingSheetProps {
  open: boolean;
  unitId: number;
  unitName: string;
  factionId: number;
  onClose: () => void;
}

export function RulesMappingSheet({
  open,
  unitId,
  unitName,
  factionId: _factionId,
  onClose,
}: RulesMappingSheetProps) {
  const { data: mapping, isLoading } = useUnitRulesMapping(unitId);
  const upsertMapping = useUpsertUnitRulesMapping();
  const deleteMapping = useDeleteUnitRulesMapping();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; faction_id: string | null }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search (300ms)
  const doSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await findRulesDatasheets(term.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchTerm), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, doSearch]);

  // Reset search when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSearchResults([]);
    }
  }, [open]);

  async function handleConfirm() {
    try {
      await upsertMapping.mutateAsync({
        unit_id: unitId,
        rules_datasheet_id: mapping?.rules_datasheet_id ?? null,
        match_status: "confirmed",
        source: mapping?.source ?? null,
      });
      toast.success("Rules mapping confirmed");
      onClose();
    } catch {
      toast.error("Failed to update rules mapping. Please try again.");
    }
  }

  async function handleSelect(datasheetId: string) {
    try {
      await upsertMapping.mutateAsync({
        unit_id: unitId,
        rules_datasheet_id: datasheetId,
        match_status: "manual",
        source: "user",
      });
      toast.success("Rules mapping updated");
      onClose();
    } catch {
      toast.error("Failed to update rules mapping. Please try again.");
    }
  }

  async function handleRemove() {
    try {
      await deleteMapping.mutateAsync(unitId);
      toast.success("Rules mapping removed");
      onClose();
    } catch {
      toast.error("Failed to update rules mapping. Please try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{unitName}</SheetTitle>
          <SheetDescription>
            Confirm or change the rules datasheet mapping for this unit
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 p-4">
          {/* Section 1: Current Match */}
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : mapping ? (
            <div className="rounded-lg bg-muted/30 p-4 flex flex-col gap-3">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Current Match
                </span>
                <p className="text-sm font-medium mt-1">
                  {mapping.rules_datasheet_id ?? "No datasheet linked"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Status: {mapping.match_status}
                  {mapping.source ? ` (${mapping.source})` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {mapping.match_status !== "confirmed" && (
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    disabled={upsertMapping.isPending}
                  >
                    Confirm Match
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRemove}
                  disabled={deleteMapping.isPending}
                  aria-label={`Remove rules mapping for ${unitName}`}
                >
                  Remove Mapping
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/30 p-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Current Match
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                No rules mapping exists for this unit.
              </p>
            </div>
          )}

          {/* Section 2: Alternative Matches */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold">Available Datasheets</span>
            <Input
              placeholder="Search datasheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search datasheets"
            />
            {isSearching && (
              <p className="text-xs text-muted-foreground">Searching...</p>
            )}
            {searchResults.length > 0 ? (
              <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5">
                {searchResults.map((ds) => (
                  <div
                    key={ds.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                      mapping?.rules_datasheet_id === ds.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium">{ds.name}</p>
                      {ds.faction_id && (
                        <p className="text-xs text-muted-foreground">
                          Faction: {ds.faction_id}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelect(ds.id)}
                      disabled={upsertMapping.isPending}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchTerm.trim().length >= 2 && !isSearching ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No rules data available. Sync rules data from the Workshop to
                enable auto-matching.
              </p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
