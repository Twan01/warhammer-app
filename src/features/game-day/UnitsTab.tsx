import type { ArmyListUnitRow } from "@/types/armyList";
import { UnitAbilityCard } from "./UnitAbilityCard";

interface UnitsTabProps {
  units: ArmyListUnitRow[];
  listId: number;
}

export function UnitsTab({ units, listId }: UnitsTabProps) {
  if (units.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No units in this army list. Add units from the Army Lists page.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {units.map((unit) => (
        <UnitAbilityCard key={unit.id} unit={unit} listId={listId} />
      ))}
    </div>
  );
}
