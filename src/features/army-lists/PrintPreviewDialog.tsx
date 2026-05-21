/**
 * Phase 94 — Print Preview Dialog (EXP-02, D-07..09).
 *
 * Sibling portal at ArmyListsPage level. Renders the army list in a
 * print-friendly layout. "Print" button calls window.print(); CSS @media
 * print in globals.css hides everything except #print-content.
 *
 * Architecture: DatasheetBrowserDialog pattern — data passed via props,
 * no hooks inside the dialog.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { formatArmyListForExport } from "@/lib/exportArmyList";
import type { ArmyList, ArmyListUnitRow, ArmyListEnhancement } from "@/types/armyList";
import { useMemo } from "react";

interface PrintPreviewDialogProps {
  open: boolean;
  list: ArmyList | null;
  units: ArmyListUnitRow[];
  enhancements: ArmyListEnhancement[];
  factionName: string | null;
  onClose: () => void;
}

export function PrintPreviewDialog({
  open,
  list,
  units,
  enhancements,
  factionName,
  onClose,
}: PrintPreviewDialogProps) {
  const exportData = useMemo(() => {
    if (!list) return null;
    return formatArmyListForExport(list, units, enhancements, factionName);
  }, [list, units, enhancements, factionName]);

  if (!list || !exportData) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-3xl print:hidden">
          <DialogHeader>
            <DialogTitle>Print Preview</DialogTitle>
            <DialogDescription>No list selected.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const grandTotal = exportData.totalPoints + exportData.enhancementTotal;
  const today = new Date().toLocaleDateString();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto print:hidden">
        <DialogHeader>
          <DialogTitle>Print Preview</DialogTitle>
          <DialogDescription>{list.name}</DialogDescription>
        </DialogHeader>

        {/* Print content — only this div is visible during @media print */}
        <div className="print-content" id="print-content">
          {/* Header */}
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-semibold">{list.name}</h1>
            <span className="text-sm font-medium">
              {grandTotal}{list.points_limit ? `/${list.points_limit}` : ""}pts
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Faction: {factionName ?? "None"}
            {" | "}
            Detachment: {list.detachment_name ?? "None"}
            {" | "}
            Exported: {today}
          </p>

          <Separator className="my-3" />

          {/* Units Section */}
          <h2 className="text-base font-semibold mb-2">UNITS</h2>

          {exportData.sortedUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No units added to this list yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportData.sortedUnits.map((unit, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <span className={unit.isGhost ? "italic" : ""}>
                        {unit.displayName}
                      </span>
                      {unit.isGhost && (
                        <span className="text-muted-foreground ml-1">(Planned)</span>
                      )}
                      {unit.isWarlord && (
                        <span className="font-bold ml-1">(Warlord)</span>
                      )}
                      {unit.leaderLabel && (
                        <div className="text-sm text-muted-foreground pl-4 mt-0.5">
                          {"└ "}{unit.leaderLabel}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{unit.points}pts</TableCell>
                    <TableCell>
                      {unit.enhancementName && (
                        <span className="text-sm">{unit.enhancementName}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Enhancements Section */}
          {exportData.enhancements.length > 0 && (
            <>
              <Separator className="my-3" />
              <h2 className="text-base font-semibold mb-2">ENHANCEMENTS</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enhancement</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportData.enhancements.map((enh) => (
                    <TableRow key={enh.id}>
                      <TableCell>{enh.enhancement_name}</TableCell>
                      <TableCell className="text-right">{enh.enhancement_points}pts</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {/* Totals */}
          <Separator className="my-3" />
          <div className="flex justify-between text-sm font-bold">
            <span>
              TOTAL: {grandTotal}pts{list.points_limit ? ` / ${list.points_limit}pts` : ""}
            </span>
            {exportData.enhancementTotal > 0 && (
              <span>Enhancement pts: {exportData.enhancementTotal}pts</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
