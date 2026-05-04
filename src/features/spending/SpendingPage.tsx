/**
 * SPEND-03/04 — Top-level Spending page.
 *
 * Handles three query branches: isLoading (Skeletons), isError (inline error message),
 * and data (hero card + breakdown table). Currency display always via formatCurrency
 * (never raw integer pence in the UI).
 *
 * UI-SPEC: hero card has ring-2 ring-faction-accent — the ONLY faction-themed element
 * on the page. Breakdown table is read-only (no hover, no row click).
 */
import { Receipt } from "lucide-react";
import {
  Card,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpendingStats } from "@/hooks/useSpendingStats";
import { useHobbyAnalytics } from "@/hooks/useHobbyAnalytics";
import { SpendTrendChart } from "./SpendTrendChart";
import { formatCurrency } from "@/lib/formatCurrency";

export function SpendingPage() {
  const { data, isLoading, isError } = useSpendingStats();
  const { data: analytics, isLoading: analyticsLoading } = useHobbyAnalytics();

  if (isLoading) {
    return (
      <div
        className="max-w-3xl mx-auto p-8 flex flex-col gap-12"
        aria-label="Loading spending data"
      >
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <p className="text-sm text-muted-foreground">
          Could not load spending data. Restart the app or try again.
        </p>
      </div>
    );
  }

  const isEmpty = data.totalPence === 0 && data.factionBreakdown.length === 0 && data.paintsPence === 0;

  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col gap-12">
      <div className="flex items-center justify-between pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Spending</h1>
          <p className="text-sm text-muted-foreground mt-1">Total hobby spend tracked to the penny</p>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-xl bg-muted/40 p-4">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">No spend logged yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add purchase prices to units and paints from their detail sheets to track your spend here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Card className="ring-2 ring-faction-accent rounded-lg px-6 py-6 flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Total Hobby Spend</span>
            <span className="text-3xl font-semibold tabular-nums">
              {formatCurrency(data.totalPence)}
            </span>
          </Card>

          {/* Monthly Trend section (Phase 19 ANLY-06, ANLY-07) */}
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Monthly Trend</h2>
            {analyticsLoading ? (
              <Skeleton className="h-60 w-full rounded-lg" />
            ) : (
              <SpendTrendChart data={analytics?.monthlyData ?? []} />
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-base font-semibold">Breakdown</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faction</TableHead>
                  <TableHead>Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.factionBreakdown.map((row) => (
                  <TableRow key={row.faction.id}>
                    <TableCell>{row.faction.name}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(row.pence)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell>Paints</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(data.paintsPence)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </div>
  );
}
