import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Skeleton } from "@/components/ui/skeleton";
import type { UdbUnitSummary } from "@/db/queries/unitDatabase";
import { UdbUnitRow } from "./UdbUnitRow";

interface UdbUnitListProps {
  units: UdbUnitSummary[];
  isLoading: boolean;
  onOpenUnit: (id: string) => void;
}

type FlatItem =
  | { kind: "header"; role: string; count: number }
  | { kind: "unit"; unit: UdbUnitSummary };

export function UdbUnitList({ units, isLoading, onOpenUnit }: UdbUnitListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const flatItems = useMemo<FlatItem[]>(() => {
    const groups = new Map<string, UdbUnitSummary[]>();
    for (const unit of units) {
      const role = unit.role ?? "Uncategorized";
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(unit);
    }

    const items: FlatItem[] = [];
    for (const [role, groupUnits] of groups) {
      items.push({ kind: "header", role, count: groupUnits.length });
      for (const unit of groupUnits) {
        items.push({ kind: "unit", unit });
      }
    }
    return items;
  }, [units]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (flatItems[i].kind === "header" ? 36 : 40),
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    );
  }

  if (flatItems.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic px-4 py-6">
        No units match your filters.
      </p>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto h-[calc(100vh-220px)]"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = flatItems[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {item.kind === "header" ? (
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4 py-2 bg-background">
                  {item.role} ({item.count})
                </div>
              ) : (
                <UdbUnitRow unit={item.unit} onOpen={onOpenUnit} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
