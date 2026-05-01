/**
 * Shared stat card used 7x by DashboardPage:
 * - Top stat row: 4 cards (DASH-01)
 * - Progress section: 3 cards (DASH-03, DASH-04)
 *
 * Layout per 05-UI-SPEC.md:
 * - Card with px-6 py-6 (Card default already has py-6; we override CardContent px to 0 so
 *   the outer Card px-6 is the single source)
 * - text-3xl font-semibold for the number (28px stat display)
 * - text-sm text-muted-foreground for the label
 * - No CardHeader / CardTitle / CardDescription (minimal variant)
 */
import { Card, CardContent } from "@/components/ui/card";

export interface StatCardProps {
  value: number | string;
  label: string;
}

export function StatCard({ value, label }: StatCardProps) {
  return (
    <Card className="px-6">
      <CardContent className="flex flex-col gap-1 px-0">
        <span className="text-3xl font-semibold">{value}</span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}
