import { useMemo } from "react";
import { Flame, Check, Minus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFactions } from "@/hooks/useFactions";
import type { Unit } from "@/types/unit";
import { StatusPopover } from "./StatusPopover";

interface UnitDetailSheetProps {
  open: boolean;
  unit: Unit | null;
  onClose: () => void;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
}

export function UnitDetailSheet({ open, unit, onClose, onEdit, onDelete }: UnitDetailSheetProps) {
  const { data: factions } = useFactions();
  const faction = useMemo(
    () => (unit ? (factions ?? []).find((f) => f.id === unit.faction_id) ?? null : null),
    [factions, unit]
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        // POLISH-04: keying on unit.id forces fresh mount when switching units (Pitfall 6)
        key={unit?.id ?? "none"}
        className="overflow-y-auto sm:max-w-md"
      >
        {unit && (
          <>
            <SheetHeader>
              <SheetTitle>{unit.name}</SheetTitle>
              <SheetDescription>
                {faction ? (
                  <Badge
                    style={{ backgroundColor: faction.color_theme }}
                    className="border-transparent text-white"
                  >
                    {faction.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Unknown faction</span>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
              <Field label="Category">
                <span className="text-sm">{unit.category ?? "—"}</span>
              </Field>

              <Field label="Painting Status">
                <StatusPopover unit={unit} />
              </Field>

              <Field label="Painting Progress">
                <div className="flex items-center gap-2">
                  <Progress value={unit.painting_percentage} className="h-2 w-32" />
                  <span className="text-sm text-muted-foreground">{unit.painting_percentage}%</span>
                </div>
              </Field>

              <Separator />

              <Field label="Assembly"><BoolIndicator on={!!unit.status_assembly} /></Field>
              <Field label="Basing"><BoolIndicator on={!!unit.status_basing} /></Field>
              <Field label="Varnished"><BoolIndicator on={!!unit.status_varnished} /></Field>
              <Field label="Active Project">
                {unit.is_active_project ? (
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Flame className="h-4 w-4 text-primary" aria-hidden="true" /> Yes
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">No</span>
                )}
              </Field>

              <Separator />

              <Field label="Points"><span className="text-sm">{unit.points ?? "—"}</span></Field>
              <Field label="Model Count"><span className="text-sm">{unit.model_count ?? "—"}</span></Field>
              <Field label="Owned Count"><span className="text-sm">{unit.owned_count ?? "—"}</span></Field>
              <Field label="Priority"><span className="text-sm">{unit.priority ?? "—"}</span></Field>
              <Field label="Target Date">
                <span className="text-sm">{unit.target_completion_date ?? "—"}</span>
              </Field>

              <Separator />

              <Field label="Purchase Date">
                <span className="text-sm">{unit.purchase_date ?? "—"}</span>
              </Field>
              <Field label="Purchase Price">
                <span className="text-sm">{unit.purchase_price ?? "—"}</span>
              </Field>
              <Field label="Storage Location">
                <span className="text-sm">{unit.storage_location ?? "—"}</span>
              </Field>

              {unit.notes && (
                <>
                  <Separator />
                  <Field label="Notes">
                    <p className="text-sm whitespace-pre-wrap">{unit.notes}</p>
                  </Field>
                </>
              )}
            </div>

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(unit)}
              >
                Delete Unit
              </Button>
              <Button onClick={() => onEdit(unit)}>
                Edit Unit
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function BoolIndicator({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center gap-1 text-sm">
      <Check className="h-4 w-4 text-primary" aria-hidden="true" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Minus className="h-4 w-4" aria-hidden="true" /> No
    </span>
  );
}
