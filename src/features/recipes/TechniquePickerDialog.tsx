/**
 * TechniquePickerDialog — Browse, search, and pick a technique to insert into a recipe.
 *
 * Architecture:
 *   - Rendered as a SIBLING to the recipe editor Sheet (NOT inside SheetContent -- P6 pitfall).
 *   - Uses Radix Dialog portal so it renders at document.body level regardless.
 *   - Does NOT call applyTechnique — it only hands the chosen technique to the parent.
 */
import { useEffect, useState } from "react";
import { BookOpen, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useTechniquesWithCounts } from "@/hooks/useTechniques";
import { useTechniqueColourSlots } from "@/hooks/useTechniqueColourSlots";
import { useTechniqueSections, useTechniqueSteps } from "@/hooks/useTechniqueSections";
import { TechniquePickerCard } from "./TechniquePickerCard";
import type { TechniqueWithCounts } from "@/types/technique";

export interface TechniquePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPicked: (technique: TechniqueWithCounts) => void;
}

export function TechniquePickerDialog({
  open,
  onClose,
  onPicked,
}: TechniquePickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);

  const { data: techniques = [], isLoading } = useTechniquesWithCounts();

  // Preview data for the selected technique
  const { data: previewSlots = [], isLoading: slotsLoading } = useTechniqueColourSlots(selectedId);
  const { data: previewSections = [], isLoading: sectionsLoading } = useTechniqueSections(selectedId);
  const { data: previewSteps = [], isLoading: stepsLoading } = useTechniqueSteps(selectedId);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedId(undefined);
      setSearch("");
    }
  }, [open]);

  const filtered = techniques.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = selectedId !== undefined
    ? techniques.find((t) => t.id === selectedId)
    : undefined;

  const previewLoading = slotsLoading || sectionsLoading || stepsLoading;

  function handlePick() {
    if (selected) {
      onPicked(selected);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add technique</DialogTitle>
          <DialogDescription>
            Pick a technique from your library to insert into this recipe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Left column: search + list */}
          <div className="flex flex-1 flex-col gap-2">
            <Input
              placeholder="Search techniques..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search techniques"
            />
            <ScrollArea className="h-64">
              <div className="flex flex-col gap-1 pr-2">
                {isLoading ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : techniques.length === 0 ? (
                  /* Empty library state */
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm font-medium">No techniques yet</span>
                    <span className="text-xs text-muted-foreground">
                      Create a technique in the Technique Library tab first.
                    </span>
                  </div>
                ) : filtered.length === 0 ? (
                  /* Empty search state */
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No techniques match your search.
                  </p>
                ) : (
                  filtered.map((t) => (
                    <TechniquePickerCard
                      key={t.id}
                      technique={t}
                      isSelected={selectedId === t.id}
                      onSelect={(technique) => setSelectedId(technique.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right column: preview (hidden when nothing selected) */}
          {selectedId !== undefined && (
            <div className="w-52 shrink-0 flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </span>

              {previewLoading ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : (
                <ScrollArea className="h-56">
                  <div className="flex flex-col gap-2 pr-1">
                    {/* Colour slots */}
                    {previewSlots.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                          <Layers className="h-3 w-3" aria-hidden="true" />
                          Colour Slots
                        </span>
                        {previewSlots.map((slot) => (
                          <div key={slot.id} className="rounded border border-border px-2 py-1">
                            <span className="block text-xs font-medium">{slot.name}</span>
                            {slot.role_hint && (
                              <span className="block text-[10px] text-muted-foreground">
                                {slot.role_hint}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Section/step tree */}
                    {previewSections.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Sections
                        </span>
                        {previewSections.map((section) => {
                          const sectionSteps = previewSteps.filter(
                            (st) => st.technique_section_id === section.id,
                          );
                          return (
                            <div key={section.id} className="rounded border border-border px-2 py-1">
                              <span className="block text-xs font-medium">{section.name}</span>
                              {sectionSteps.map((step) => (
                                <span
                                  key={step.id}
                                  className="block pl-2 text-[10px] text-muted-foreground"
                                >
                                  • {step.step_name}
                                </span>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close picker
          </Button>
          <Button onClick={handlePick} disabled={selected === undefined}>
            Next: Fill slots
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
