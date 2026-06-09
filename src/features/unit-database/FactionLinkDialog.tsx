import { useState } from "react";
import { Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Faction } from "@/types/faction";

export function FactionLinkDialog({
  open,
  onOpenChange,
  factions,
  udbFactionName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factions: Faction[];
  udbFactionName: string;
  onConfirm: (factionId: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("");

  function handleConfirm() {
    const id = Number(selectedId);
    if (!id) return;
    onConfirm(id);
    setSelectedId("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedId("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Collection Faction</DialogTitle>
          <DialogDescription>
            No collection faction is linked to{" "}
            <span className="font-medium text-foreground">{udbFactionName}</span>.
            Choose which of your collection factions corresponds to this army.
            Future adds will match automatically.
          </DialogDescription>
        </DialogHeader>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a faction..." />
          </SelectTrigger>
          <SelectContent>
            {factions.map((f) => (
              <SelectItem key={f.id} value={String(f.id)}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedId} onClick={handleConfirm}>
            <Link2 className="mr-2 h-4 w-4" />
            Link &amp; Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
