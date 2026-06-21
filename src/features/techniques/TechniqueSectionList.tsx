import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { DraftTechniqueSection, DraftTechniqueSlot } from "@/types/technique";
import { TechniqueSectionCard } from "./TechniqueSectionCard";

export interface TechniqueSectionListProps {
  sections: DraftTechniqueSection[];
  slots: DraftTechniqueSlot[];
  onChange: (next: DraftTechniqueSection[]) => void;
}

export function TechniqueSectionList({ sections, slots, onChange }: TechniqueSectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.localId === active.id);
    const newIndex = sections.findIndex((s) => s.localId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(sections, oldIndex, newIndex));
  }

  function updateSection(localId: string, updated: DraftTechniqueSection) {
    onChange(sections.map((s) => (s.localId === localId ? updated : s)));
  }

  function removeSection(localId: string) {
    onChange(sections.filter((s) => s.localId !== localId));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.localId)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {sections.map((section) => (
            <TechniqueSectionCard
              key={section.localId}
              section={section}
              slots={slots}
              onChange={(updated) => updateSection(section.localId, updated)}
              onRemove={() => removeSection(section.localId)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
