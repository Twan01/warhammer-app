import { useState } from "react";
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
import type { UdbFaction } from "@/db/queries/unitDatabase";

export function CollectionFactionLinkDialog({
  open,
  onOpenChange,
  collectionFactionName,
  udbFactions,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionFactionName: string;
  udbFactions: UdbFaction[];
  onConfirm: (wahapediaFactionId: string) => void;
  isPending?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string>("");

  function handleConfirm() {
    if (!selectedId) return;
    onConfirm(selectedId);
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
          <DialogTitle>Match Faction to Database</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{collectionFactionName}</span>
            {" "}has no canonical match yet. Select the matching army from the Unit Database
            so datasheets can be linked.
          </DialogDescription>
        </DialogHeader>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select canonical army..." />
          </SelectTrigger>
          <SelectContent>
            {udbFactions.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel — browse all instead
          </Button>
          <Button disabled={!selectedId || isPending} onClick={handleConfirm}>
            Link &amp; open datasheets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
