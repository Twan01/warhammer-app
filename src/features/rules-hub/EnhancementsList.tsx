import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEnhancementsByFaction } from "@/db/queries/bsdataExtended";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function EnhancementsList({ factionId }: { factionId: string }) {
  const { data: enhancements = [], isLoading } = useQuery({
    queryKey: ["enhancements-by-faction", factionId] as const,
    queryFn: () => getEnhancementsByFaction(factionId),
    staleTime: Infinity,
  });

  const grouped = useMemo(() => {
    const m = new Map<string, Array<{ name: string; points: number }>>();
    for (const e of enhancements) {
      const key = e.detachment_name;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push({ name: e.name, points: e.points });
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [enhancements]);

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  if (enhancements.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Enhancements
      </h3>
      {grouped.map(([detachment, items]) => (
        <div key={detachment} className="rounded-lg border p-3 space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground">
            {detachment}
          </h4>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5"
              >
                <span className="text-sm">{item.name}</span>
                <Badge
                  variant="secondary"
                  className="text-xs tabular-nums"
                >
                  {item.points}pts
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
