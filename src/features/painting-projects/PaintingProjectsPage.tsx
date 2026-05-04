import { useState } from "react";
import type { Unit } from "@/types/unit";
import { KanbanBoard } from "./KanbanBoard";
import { AddProjectPicker } from "./AddProjectPicker";
import { UnitSheet } from "@/features/units/UnitSheet";

export function PaintingProjectsPage() {
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);

  const openEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitSheetOpen(true);
  };
  const closeSheet = () => {
    setUnitSheetOpen(false);
    setEditingUnit(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Painting Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Active units being worked on right now</p>
        </div>
        <div className="flex items-center gap-2">
          <AddProjectPicker />
        </div>
      </div>
      <KanbanBoard
        onEditUnit={openEdit}
        onAddProject={() => {
          // Empty-state CTA: click the AddProjectPicker button in the header
          const btn = document.querySelector<HTMLButtonElement>(
            'button[type="button"][aria-haspopup="dialog"]',
          );
          btn?.click();
        }}
      />

      <UnitSheet
        key={editingUnit?.id ?? "none"}
        open={unitSheetOpen}
        unit={editingUnit}
        onClose={closeSheet}
      />
    </div>
  );
}
