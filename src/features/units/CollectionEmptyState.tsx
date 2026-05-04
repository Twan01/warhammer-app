import { ShieldOff, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollectionEmptyStateProps {
  mode: "no-data" | "filtered";
  onAdd?: () => void;
  onClearFilters?: () => void;
}

export function CollectionEmptyState({
  mode,
  onAdd,
  onClearFilters,
}: CollectionEmptyStateProps) {
  if (mode === "filtered") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="rounded-xl bg-muted/40 p-4">
          <FilterX className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">No units match</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your current filters returned nothing. Clear a filter to see more units.
          </p>
        </div>
        <Button className="mt-2" onClick={onClearFilters}>Clear filters</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-xl bg-muted/40 p-4">
        <ShieldOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold">No units yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Add your first unit to start tracking what you own and how far along it is.
        </p>
      </div>
      <Button className="mt-2" onClick={onAdd}>Add unit</Button>
    </div>
  );
}
