import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FACTION_ALIGNMENT,
  ALIGNMENT_ORDER,
  type Alignment,
} from "./factionAlignmentMap";
import type { UdbFaction } from "@/db/queries/unitDatabase";

interface FactionPickerProps {
  factions: UdbFaction[];
  selectedFactionId: string | null;
  onSelectFaction: (id: string) => void;
  isLoading: boolean;
}

export function FactionPicker({
  factions,
  selectedFactionId,
  onSelectFaction,
  isLoading,
}: FactionPickerProps) {
  const grouped = useMemo(() => {
    const groups = new Map<Alignment | "Other", UdbFaction[]>();

    for (const alignment of ALIGNMENT_ORDER) {
      groups.set(alignment, []);
    }

    for (const faction of factions) {
      const alignment = FACTION_ALIGNMENT[faction.id] ?? "Other";
      if (!groups.has(alignment)) {
        groups.set(alignment, []);
      }
      groups.get(alignment)!.push(faction);
    }

    // Remove empty groups
    for (const [key, value] of groups) {
      if (value.length === 0) groups.delete(key);
    }

    return groups;
  }, [factions]);

  if (isLoading) {
    return (
      <div className="w-60 border-r border-border overflow-y-auto flex flex-col gap-2 p-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-60 border-r border-border overflow-y-auto flex flex-col">
      {Array.from(grouped.entries()).map(([alignment, alignmentFactions]) => (
        <div key={alignment}>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3 py-2">
            {alignment}
          </div>
          {alignmentFactions.map((faction) => {
            const isActive = faction.id === selectedFactionId;
            return (
              <button
                key={faction.id}
                type="button"
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-sm flex justify-between items-center w-full text-left ${
                  isActive ? "border-l-2 border-primary bg-secondary" : ""
                }`}
                onClick={() => onSelectFaction(faction.id)}
              >
                <span className="truncate">{faction.name}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
