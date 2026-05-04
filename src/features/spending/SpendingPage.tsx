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
import { formatCurrency } from "@/lib/formatCurrency";

export function SpendingPage() {
  const { data, isLoading, isError } = useSpendingStats();

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

  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col gap-12">
      <Card className="ring-2 ring-faction-accent rounded-lg px-6 py-6 flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">Total Hobby Spend</span>
        <span className="text-3xl font-semibold">
          {formatCurrency(data.totalPence)}
        </span>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Breakdown</h2>
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
                <TableCell>{formatCurrency(row.pence)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell>Paints</TableCell>
              <TableCell>{formatCurrency(data.paintsPence)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
