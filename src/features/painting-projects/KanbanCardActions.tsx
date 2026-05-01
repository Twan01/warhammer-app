import { useState } from "react";
import { MoreHorizontal, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

export interface KanbanCardActionsProps {
  onRemoveFromBoard: () => void;
  onEditUnit: () => void;
}

export function KanbanCardActions({ onRemoveFromBoard, onEditUnit }: KanbanCardActionsProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => e.stopPropagation()}
          aria-label="Card actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-44 p-0"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onRemoveFromBoard();
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Remove from board
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  onEditUnit();
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit unit
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
