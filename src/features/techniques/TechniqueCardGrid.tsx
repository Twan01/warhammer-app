import { Skeleton } from "@/components/ui/skeleton";
import type { TechniqueWithCounts } from "@/types/technique";
import { TechniqueCard } from "./TechniqueCard";
import { TechniqueEmptyState } from "./TechniqueEmptyState";

export interface TechniqueCardGridProps {
  data: TechniqueWithCounts[];
  isLoading: boolean;
  isFiltered: boolean;
  onCardClick: (technique: TechniqueWithCounts) => void;
  onAdd: () => void;
  onEdit: (technique: TechniqueWithCounts) => void;
  onDelete: (technique: TechniqueWithCounts) => void;
  onDuplicate: (technique: TechniqueWithCounts) => void;
}

export function TechniqueCardGrid({
  data,
  isLoading,
  isFiltered,
  onCardClick,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
}: TechniqueCardGridProps) {
  if (isLoading) {
    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`skeleton-card-${i}`}
            data-testid="technique-card-skeleton"
            className="rounded-xl border bg-card p-6 flex flex-col gap-3"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    if (isFiltered) {
      return (
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
        >
          <p className="text-sm text-muted-foreground col-span-full">
            No techniques match your filters.
          </p>
        </div>
      );
    }
    return <TechniqueEmptyState onAdd={onAdd} />;
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
    >
      {data.map((technique) => (
        <TechniqueCard
          key={technique.id}
          technique={technique}
          onClick={onCardClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
}
