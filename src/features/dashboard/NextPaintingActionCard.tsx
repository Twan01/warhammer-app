import { Palette, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useNextPaintingAction, type PaintAvailability } from "@/hooks/useNextPaintingAction";

const DOT_COLOR: Record<PaintAvailability["status"], string> = {
  owned: "bg-emerald-500",
  "running-low": "bg-amber-500",
  missing: "bg-zinc-400",
};

export function NextPaintingActionCard() {
  const { data, isLoading } = useNextPaintingAction();

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Palette size={20} className="opacity-40" />
          <span className="text-sm font-semibold">No painting action found</span>
          <span className="text-xs">Assign a recipe to a unit to see your next step here.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Palette size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            {data.section_name && (
              <span className="text-xs text-muted-foreground">{data.section_name} &middot; </span>
            )}
            <span className="text-sm line-clamp-2">{data.description}</span>
          </div>
        </div>

        {data.time_estimate_minutes !== null && (
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-xs tabular-nums text-muted-foreground">
              Est. {data.time_estimate_minutes} min
            </span>
          </div>
        )}

        {data.paints.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {data.paints.map((p) => (
              <div key={p.paint_id} className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded-full ${DOT_COLOR[p.status]}`} />
                <span className="text-xs text-muted-foreground">{p.name}</span>
              </div>
            ))}
          </div>
        )}

        <Link
          to="/painting-projects"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Go to recipe
        </Link>
      </div>
    </div>
  );
}
