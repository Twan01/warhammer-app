import { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGameDayStore, useGameDayListState } from "./gameDayStore";

interface ChecklistTabProps {
  listId: number;
}

export function ChecklistTab({ listId }: ChecklistTabProps) {
  const listState = useGameDayListState(listId);
  const { toggleChecklistItem, addChecklistItem, resetChecklist } =
    useGameDayStore();
  const [newItemText, setNewItemText] = useState("");

  function handleAddItem() {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    addChecklistItem(listId, trimmed);
    setNewItemText("");
  }

  const checked = listState.checklistItems.filter((i) => i.checked).length;
  const total = listState.checklistItems.length;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <span className="text-sm font-semibold">Pre-Game Checklist</span>
        <span className="text-xs text-muted-foreground">
          {checked}/{total} complete
        </span>
      </div>

      <div className="flex flex-col gap-1 p-4">
        {listState.checklistItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-md border px-3 py-2"
          >
            <Checkbox
              id={item.id}
              checked={item.checked}
              onCheckedChange={() => toggleChecklistItem(listId, item.id)}
            />
            <label
              htmlFor={item.id}
              className={cn(
                "flex-1 cursor-pointer text-sm",
                item.checked && "text-muted-foreground line-through",
              )}
            >
              {item.text}
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 pb-2">
        <Input
          placeholder="Add a checklist item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddItem();
          }}
          className="h-9 flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          disabled={!newItemText.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex justify-end px-4 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => resetChecklist(listId)}
          disabled={checked === 0}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset All
        </Button>
      </div>
    </div>
  );
}
