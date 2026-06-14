import { useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useFactions } from "@/hooks/useFactions";
import { useDatasheetsByFactionWithPoints } from "@/hooks/useDatasheet";
import { useAddGhostUnitToList } from "@/hooks/useArmyLists";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";

interface DatasheetBrowserDialogProps {
  open: boolean;
  /** The army list to add ghost units to. Null when no list is selected. */
  listId: number | null;
  /** HobbyForge faction_id (not Wahapedia ID). Null when the list has no faction. */
  factionId: number | null;
  onClose: () => void;
}

/**
 * Phase 93 — Sibling-portal Dialog for browsing all faction datasheets and
 * adding ghost/planned units to an army list.
 *
 * Architecture:
 *   - Rendered as a SIBLING to ArmyListDetailPage portals at ArmyListsPage root.
 *     NEVER nest inside another Radix portal (Pitfall 1).
 *   - Stays OPEN after each add for multi-add UX (D-04).
 *   - Resolves Wahapedia faction via the faction's stored wahapedia_faction_id (D-03).
 *   - Passes ds.name (NOT ds.id) as ghost_unit_name for COALESCE chain (D-10).
 */
export function DatasheetBrowserDialog({
  open,
  listId,
  factionId,
  onClose,
}: DatasheetBrowserDialogProps) {
  const { data: factions } = useFactions();
  const faction =
    factionId !== null
      ? (factions ?? []).find((f) => f.id === factionId) ?? null
      : null;
  // Use the stored udb id rather than re-deriving it from the faction name —
  // name matching breaks for sub-factions and punctuation variants (see
  // ArmyListDetailPage / migration 046). Canonical pattern across the app.
  const wahapediaFactionId = faction?.wahapedia_faction_id ?? null;
  const { data: datasheets = [] } = useDatasheetsByFactionWithPoints(
    wahapediaFactionId ?? undefined,
  );
  const addGhostUnit = useAddGhostUnitToList();

  // Group datasheets by role (D-02). Null role maps to "Other".
  const grouped = useMemo(() => {
    const groups: Record<string, UdbUnitSummary[]> = {};
    for (const ds of datasheets) {
      const key = ds.role ?? "Other";
      (groups[key] ??= []).push(ds);
    }
    return groups;
  }, [datasheets]);

  function handleSelect(ds: UdbUnitSummary) {
    if (listId === null) return;
    // CRITICAL (D-10): pass ds.name, NOT ds.id — the COALESCE chain joins on name.
    addGhostUnit.mutate(
      { list_id: listId, ghost_unit_name: ds.name },
      {
        onSuccess: () => {
          toast.success(`${ds.name} added as planned.`);
          // Dialog stays open for multi-add (D-04) — no onClose() call
        },
        onError: () => {
          toast.error("Failed to add unit. Please try again.");
        },
      },
    );
  }

  const hasWahapediaMapping = wahapediaFactionId != null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="p-0 sm:max-w-[480px]">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Browse Datasheets</DialogTitle>
          <DialogDescription>
            Browse all faction datasheets. Click to add as a planned unit.
          </DialogDescription>
        </DialogHeader>

        {!hasWahapediaMapping ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            Set a faction on this list to browse datasheets.
          </p>
        ) : (
          <Command>
            <CommandInput placeholder="Search datasheets..." />
            <CommandList>
              <CommandEmpty>No datasheets found.</CommandEmpty>
              {Object.entries(grouped).map(([role, items]) => (
                <CommandGroup key={role} heading={role}>
                  {items.map((ds) => (
                    <CommandItem
                      key={ds.id}
                      value={`${ds.name}-${ds.id}`}
                      onSelect={() => handleSelect(ds)}
                    >
                      <span className="flex-1">{ds.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {ds.role ?? "Other"}
                      </Badge>
                      {ds.base_points !== null && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {ds.base_points}pts
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        )}
      </DialogContent>
    </Dialog>
  );
}
