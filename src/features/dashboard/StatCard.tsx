/**
 * Shared stat card used 7x by DashboardPage:
 * - Top stat row: 4 cards (DASH-01) — Phase 11 passes animate={true} for UI-07
 * - Progress section: 3 cards (DASH-03, DASH-04) — animate stays absent (default false)
 *
 * Layout per 05-UI-SPEC.md:
 * - Card with px-6 py-6 (Card default already has py-6; we override CardContent px to 0 so
 *   the outer Card px-6 is the single source)
 * - text-3xl font-semibold for the number (28px stat display)
 * - text-sm text-muted-foreground for the label
 * - No CardHeader / CardTitle / CardDescription (minimal variant)
 *
 * Phase 11 (UI-07): When `animate={true}` and `value` is a number, the number animates from 0
 * to `value` over 600ms via the useCountUp hook. AnimatedNumber is a separate sub-component
 * to satisfy React Rules of Hooks — useCountUp is always called when AnimatedNumber renders;
 * the parent gates whether AnimatedNumber renders at all (Pitfall 1, 11-RESEARCH.md).
 *
 * String values (e.g. "72%") never animate — the typeof guard prevents passing a string to
 * useCountUp (Pitfall 2, 11-RESEARCH.md).
 */
import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/hooks/useCountUp";

function AnimatedNumber({ value }: { value: number }) {
  const display = useCountUp(value);
  return <>{display}</>;
}

export interface StatCardProps {
  value: number | string;
  label: string;
  animate?: boolean;
}

export function StatCard({ value, label, animate = false }: StatCardProps) {
  const displayValue =
    animate && typeof value === "number" ? (
      <AnimatedNumber value={value} />
    ) : (
      value
    );

  return (
    <Card className="px-6 bg-card border border-border/60 shadow-sm">
      <CardContent className="flex flex-col gap-1 px-0">
        <span className="text-3xl font-semibold tabular-nums">{displayValue}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
