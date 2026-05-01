import { PackageSearch } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <PackageSearch className="h-12 w-12 text-muted-foreground" />
        <p className="text-base font-semibold">No units found</p>
        <p className="text-sm text-muted-foreground">
          No units match your current filters. Try clearing a filter to see more.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <PackageSearch className="h-12 w-12 text-muted-foreground" />
      <p className="text-base font-semibold">Add your first unit</p>
      <p className="text-sm text-muted-foreground">
        Your collection is empty. Add a unit to start tracking your hobby progress.
      </p>
      {onAdd && <Button onClick={onAdd}>Add Unit</Button>}
    </div>
  );
}
