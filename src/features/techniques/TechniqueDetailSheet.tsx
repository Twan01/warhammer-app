import { Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTechniqueSections, useTechniqueSteps } from "@/hooks/useTechniqueSections";
import { useTechniqueColourSlots } from "@/hooks/useTechniqueColourSlots";
import { useTechniqueUsedByRecipes, useDuplicateTechnique } from "@/hooks/useTechniques";
import type { Technique } from "@/types/technique";

const difficultyColors: Record<string, string> = {
  Beginner: "text-green-500",
  Intermediate: "text-yellow-500",
  Advanced: "text-orange-500",
  Expert: "text-red-500",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

export interface TechniqueDetailSheetProps {
  open: boolean;
  technique: Technique | null;
  onClose: () => void;
  onEdit: (technique: Technique) => void;
  onDelete: (technique: Technique) => void;
}

export function TechniqueDetailSheet({
  open,
  technique,
  onClose,
  onEdit,
  onDelete,
}: TechniqueDetailSheetProps) {
  const { data: slots = [] } = useTechniqueColourSlots(technique?.id);
  const { data: sections = [] } = useTechniqueSections(technique?.id);
  const { data: steps = [] } = useTechniqueSteps(technique?.id);
  const { data: usedByRecipes = [] } = useTechniqueUsedByRecipes(technique?.id);
  const duplicateTechnique = useDuplicateTechnique();

  async function handleDuplicate() {
    if (!technique) return;
    try {
      await duplicateTechnique.mutateAsync({
        originalId: technique.id,
        newName: `Copy of ${technique.name}`,
      });
      toast.success("Technique duplicated.");
    } catch {
      toast.error("Failed to duplicate technique.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        key={technique?.id ?? "none"}
        className="overflow-y-auto sm:max-w-md"
      >
        {technique && (
          <>
            <SheetHeader>
              <SheetTitle>{technique.name}</SheetTitle>
              {(technique.effect || technique.difficulty) && (
                <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2">
                  {technique.effect && (
                    <Badge variant="outline" className="text-xs">
                      {technique.effect}
                    </Badge>
                  )}
                  {technique.difficulty && (
                    <Badge
                      variant="secondary"
                      className={`text-xs ${difficultyColors[technique.difficulty] ?? ""}`}
                    >
                      {technique.difficulty}
                    </Badge>
                  )}
                </div>
              )}
            </SheetHeader>

            <div className="flex flex-col gap-4 p-4">
              {/* Colour Slots */}
              <Field label="Colour Slots">
                {slots.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No slots defined.</span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {slots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full border border-border bg-muted shrink-0" />
                        <span className="text-sm">{slot.name}</span>
                        {slot.role_hint && (
                          <span className="text-xs text-muted-foreground italic">
                            {slot.role_hint}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Field>

              <Separator />

              {/* Technique Steps */}
              <Field label="Technique Steps">
                {steps.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No steps defined.</span>
                ) : sections.length > 0 ? (
                  // Sectioned view
                  <div className="flex flex-col gap-3">
                    {sections.map((sec) => {
                      const sectionSteps = steps.filter(
                        (st) => st.technique_section_id === sec.id,
                      );
                      return (
                        <div key={sec.id} className="flex flex-col gap-1">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {sec.name}
                          </span>
                          <ol className="flex flex-col gap-1 pl-3">
                            {sectionSteps.map((st, idx) => (
                              <li key={st.id} className="text-sm">
                                <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                                {st.step_name}
                                {(st.painting_phase || st.tool || st.dilution) && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    {[st.painting_phase, st.tool, st.dilution]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Flat view (no sections)
                  <ol className="flex flex-col gap-1 pl-3">
                    {steps.map((st, idx) => (
                      <li key={st.id} className="text-sm">
                        <span className="text-muted-foreground mr-1">{idx + 1}.</span>
                        {st.step_name}
                        {(st.painting_phase || st.tool || st.dilution) && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {[st.painting_phase, st.tool, st.dilution]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Field>

              <Separator />

              {/* Used by */}
              <Field label="Used by">
                {usedByRecipes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Not used by any recipes yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {usedByRecipes.map((r) => (
                      <span key={r.recipe_id} className="text-sm">
                        {r.name}
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </div>

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(technique)}
              >
                Delete Technique
              </Button>
              <Button
                variant="outline"
                onClick={handleDuplicate}
                disabled={duplicateTechnique.isPending}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Technique
              </Button>
              <Button onClick={() => onEdit(technique)}>Edit Technique</Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
