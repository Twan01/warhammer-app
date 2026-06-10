import { useState, useMemo } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import type { AppSettingsMap } from "@/db/queries/appSettings";
import { DEFAULT_CHECKLIST } from "@/features/game-day/gameDayStore";

interface ChecklistEditorItem {
  id: string;
  text: string;
}

function SortableChecklistItem({
  item,
  onDelete,
  canDelete,
}: {
  item: ChecklistEditorItem;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border/60 bg-card px-2 h-9"
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-muted-foreground"
        aria-label={`Reorder "${item.text}"`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm truncate">{item.text}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Remove "${item.text}" from checklist`}
        disabled={!canDelete}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ChecklistDefaultsEditor({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();

  const initialItems = useMemo(() => {
    const raw = settings["default_checklist"];
    if (!raw) {
      return DEFAULT_CHECKLIST.map((i) => ({
        id: crypto.randomUUID(),
        text: i.text,
      }));
    }
    try {
      const entries = JSON.parse(raw) as Array<{ text: string }>;
      return entries.map((e) => ({
        id: crypto.randomUUID(),
        text: e.text,
      }));
    } catch {
      return DEFAULT_CHECKLIST.map((i) => ({
        id: crypto.randomUUID(),
        text: i.text,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings["default_checklist"]]);

  const [items, setItems] = useState<ChecklistEditorItem[]>(initialItems);
  const [newItemText, setNewItemText] = useState("");

  // Sync local state when settings change externally
  useMemo(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function saveItems(next: ChecklistEditorItem[]) {
    setItems(next);
    const toStore = next.map(({ text }) => ({ text }));
    updateSetting.mutate(
      { key: "default_checklist", value: JSON.stringify(toStore) },
      { onError: () => toast.error("Could not save setting. Try again.") },
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    saveItems(arrayMove(items, oldIndex, newIndex));
  }

  function handleAddItem() {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    const next = [...items, { id: crypto.randomUUID(), text: trimmed }];
    saveItems(next);
    setNewItemText("");
  }

  function handleDelete(id: string) {
    saveItems(items.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Default Pre-Game Checklist</p>
        <p className="text-xs text-muted-foreground">
          Items copied into every new Game Day session. Drag to reorder.
        </p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <SortableChecklistItem
                key={item.id}
                item={item}
                onDelete={() => handleDelete(item.id)}
                canDelete={items.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <Input
          placeholder="Add checklist item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddItem();
          }}
          className="h-9 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          disabled={!newItemText.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>
    </div>
  );
}
