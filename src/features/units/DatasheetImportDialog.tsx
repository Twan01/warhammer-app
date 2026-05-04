import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DatasheetConflict, DatasheetImportResolution } from "@/types/datasheet";

interface DatasheetImportDialogProps {
  open: boolean;
  /** One entry per field where current AND incoming values are non-empty AND differ. */
  conflicts: DatasheetConflict[];
  /** User-confirmed selection map. Default is { [key]: "use" } per UI-SPEC §Conflict Resolution Flow. */
  onConfirm: (resolution: DatasheetImportResolution) => void;
  /** User dismissed dialog (Discard / Escape / outside-click). */
  onClose: () => void;
}

/**
 * DS-08 — single review dialog for all conflicting fields. Each row shows
 * current and incoming values plus a Keep / Use datasheet toggle. Default
 * choice is "use" (datasheet wins) per the UI-SPEC happy-path expectation.
 */
export function DatasheetImportDialog({
  open,
  conflicts,
  onConfirm,
  onClose,
}: DatasheetImportDialogProps) {
  // Local choice state, keyed by conflict.key. Reset to "use" defaults whenever
  // the conflicts prop changes (e.g. user closes dialog and re-opens with a
  // different unit's conflicts).
  const [choices, setChoices] = useState<Partial<DatasheetImportResolution>>({});

  useEffect(() => {
    const next: Partial<DatasheetImportResolution> = {};
    for (const c of conflicts) next[c.key] = c.choice;
    setChoices(next);
  }, [conflicts]);

  function setChoice(key: DatasheetConflict["key"], value: "keep" | "use") {
    setChoices((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm() {
    // Fill in any unset keys with "use" default before reporting.
    const resolution: DatasheetImportResolution = { M: "use", T: "use", Sv: "use", W: "use", Ld: "use", OC: "use", abilities: "use", keywords: "use" };
    for (const c of conflicts) resolution[c.key] = choices[c.key] ?? "use";
    onConfirm(resolution);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Import</DialogTitle>
          <DialogDescription>
            Some fields already have values. Choose which to keep for each field.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col divide-y divide-border">
          {conflicts.map((field) => {
            const choice = choices[field.key] ?? "use";
            return (
              <div
                key={field.key}
                className="flex items-center justify-between py-3 gap-4"
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {field.label}
                  </span>
                  <div className="flex gap-2 text-sm">
                    <span className="text-muted-foreground truncate">
                      Yours: {field.currentValue || "—"}
                    </span>
                    <span className="text-foreground truncate">
                      Datasheet: {field.incomingValue}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant={choice === "keep" ? "default" : "outline"}
                    onClick={() => setChoice(field.key, "keep")}
                  >
                    Keep
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={choice === "use" ? "default" : "outline"}
                    onClick={() => setChoice(field.key, "use")}
                  >
                    Use datasheet
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Discard changes
          </Button>
          <Button type="button" variant="default" onClick={handleConfirm}>
            Apply import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
