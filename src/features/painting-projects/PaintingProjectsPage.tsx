import { useState } from "react";
import type { Unit } from "@/types/unit";
import { KanbanBoard } from "./KanbanBoard";
import { AddProjectPicker } from "./AddProjectPicker";
import { UnitSheet } from "@/features/units/UnitSheet";
import { PageHeader } from "@/components/common/PageHeader";

export function PaintingProjectsPage() {
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitSheetOpen, setUnitSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
      <PageHeader
        title="Painting Projects"
        subtitle="Active units being worked on right now"
        actions={<AddProjectPicker open={pickerOpen} onOpenChange={setPickerOpen} />}
      />
      <KanbanBoard
        onEditUnit={openEdit}
        onAddProject={() => setPickerOpen(true)}
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
