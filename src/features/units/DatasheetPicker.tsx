import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDatasheetsByFaction } from "@/hooks/useDatasheet";
import { useUdbSearch } from "@/hooks/useUnitDatabase";

interface DatasheetPickerProps {
  open: boolean;
  factionId: string | undefined;
  factionName: string;
  /** Called when the user picks a datasheet — provides the Wahapedia datasheet ID. */
  onSelect: (datasheetId: string) => void;
  /** Called when the user dismisses without choosing (Skip / Escape / outside-click). */
  onClose: () => void;
}

/**
 * DS-04 — searchable, faction-pre-filtered datasheet picker.
 *
 * Props are stateless w.r.t. the picker — open/close is owned by the parent
 * (CollectionPage in Plan 15-05). The component reads the list via
 * useDatasheetsByFaction and applies a client-side substring filter on the
 * name field. ~200 datasheets per faction → no virtualization needed.
 */
export function DatasheetPicker({
  open,
  factionId,
  factionName,
  onSelect,
  onClose,
}: DatasheetPickerProps) {
  const [search, setSearch] = useState("");
  const isBrowseAll = factionId === undefined;
  const { data: factionDatasheets = [] } = useDatasheetsByFaction(factionId);
  const { data: searchResults = [] } = useUdbSearch(isBrowseAll ? search : "");

  const datasheets = isBrowseAll
    ? searchResults.map((r) => ({ id: r.unit_id, name: r.name, role: r.faction_name }))
    : factionDatasheets;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle === "") return datasheets;
    return datasheets.filter((d) => d.name.toLowerCase().includes(needle));
  }, [search, datasheets]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Datasheet</DialogTitle>
          <DialogDescription>
            {isBrowseAll ? "Search all datasheets" : `Searching ${factionName} datasheets`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Search by unit name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            aria-label="Search datasheets"
          />
          <div className="max-h-64 overflow-y-auto flex flex-col divide-y divide-border">
            {filtered.map((ds) => (
              <button
                key={ds.id}
                type="button"
                className="px-3 py-2 text-sm text-left hover:bg-muted flex items-center justify-between"
                onClick={() => onSelect(ds.id)}
              >
                <span>{ds.name}</span>
                {ds.role && (
                  <span className="text-xs text-muted-foreground">{ds.role}</span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                {isBrowseAll && search.trim().length < 2
                  ? "Type at least 2 characters to search all datasheets."
                  : "No datasheets found. Try a different search term."}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Skip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
