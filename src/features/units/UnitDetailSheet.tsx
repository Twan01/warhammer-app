import { useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useFactions } from "@/hooks/useFactions";
import { useRecipes } from "@/hooks/useRecipes";
import { useUpdateUnit, UNITS_KEY } from "@/hooks/useUnits";
import type { Unit } from "@/types/unit";
import { PlaybookTab } from "./PlaybookTab";
import { JournalTab } from "./JournalTab";
import { AppliedRecipesTab } from "./AppliedRecipesTab";
import { ApplyRecipeDialog } from "@/features/recipes/ApplyRecipeDialog";
import { PaintingPipeline } from "./PaintingPipeline";
import type { UnitPhotoWithUrl } from "@/hooks/useUnitPhotos";

interface UnitDetailSheetProps {
  open: boolean;
  unit: Unit | null;
  onClose: () => void;
  onEdit: (unit: Unit) => void;
  onDelete: (unit: Unit) => void;
  onPhotoClick: (photo: UnitPhotoWithUrl) => void;
  onDatasheetConflict?: (payload: import("@/types/datasheet").DatasheetImportPayload) => void;
  pendingImportResolution?: { resolution: import("@/types/datasheet").DatasheetImportResolution; payload: import("@/types/datasheet").DatasheetImportPayload } | null;
  onClearImportResolution?: () => void;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Critical",
};

export function UnitDetailSheet({ open, unit, onClose, onEdit, onDelete, onPhotoClick, onDatasheetConflict, pendingImportResolution, onClearImportResolution }: UnitDetailSheetProps) {
  const { data: factions } = useFactions();
  const faction = useMemo(
    () => (unit ? (factions ?? []).find((f) => f.id === unit.faction_id) ?? null : null),
    [factions, unit]
  );

  const navigate = useNavigate();
  const qc = useQueryClient();
  const updateUnit = useUpdateUnit();
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const { data: recipes = [] } = useRecipes();
  const linkedRecipes = useMemo(
    () => (unit ? recipes.filter((r) => r.unit_id === unit.id) : []),
    [recipes, unit],
  );

  function toggleActiveProject() {
    if (!unit) return;
    const next = (unit.is_active_project === 1 ? 0 : 1) as 0 | 1;
    const previous = qc.getQueryData<Unit[]>(UNITS_KEY);
    qc.setQueryData<Unit[]>(UNITS_KEY, (old) =>
      old?.map((u) => (u.id === unit.id ? { ...u, is_active_project: next } : u)) ?? [],
    );
    updateUnit.mutate(
      { id: unit.id, is_active_project: next },
      {
        onError: () => {
          qc.setQueryData(UNITS_KEY, previous);
          toast.error("Failed to update project status. Changes were not saved.");
        },
      },
    );
  }

  return (
    <>
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        key={unit?.id ?? "none"}
        className="overflow-y-auto sm:max-w-md"
      >
        {unit && (
          <>
            <SheetHeader>
              <SheetTitle>{unit.name}</SheetTitle>
              <SheetDescription>
                {faction ? (
                  <Badge
                    style={{ backgroundColor: faction.color_theme }}
                    className="border-transparent text-white"
                  >
                    {faction.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">Unknown faction</span>
                )}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="details" className="px-4">
              <TabsList className="mt-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="playbook">Playbook</TabsTrigger>
                <TabsTrigger value="journal">Journal</TabsTrigger>
                <TabsTrigger value="recipes">Recipes</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <div className="flex flex-col gap-4 p-4">
                  <Field label="Category">
                    <span className="text-sm">{unit.category ?? "—"}</span>
                  </Field>

                  {/* Painting pipeline stepper */}
                  <PaintingPipeline unit={unit} />

                  <Separator />

                  <Field label="Active Project">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleActiveProject}
                      aria-label={
                        unit.is_active_project
                          ? `Remove ${unit.name} from active projects`
                          : `Mark ${unit.name} as active project`
                      }
                    >
                      {unit.is_active_project ? (
                        <>
                          <Flame className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
                          Active — click to remove
                        </>
                      ) : (
                        <>
                          <Flame className="mr-2 h-4 w-4" aria-hidden="true" />
                          Mark as active project
                        </>
                      )}
                    </Button>
                  </Field>

                  <Separator />

                  <Field label="Points"><span className="text-sm">{unit.points ?? "—"}</span></Field>
                  <Field label="Model Count"><span className="text-sm">{unit.model_count ?? "—"}</span></Field>
                  <Field label="Owned Count"><span className="text-sm">{unit.owned_count ?? "—"}</span></Field>
                  {unit.priority !== null && (
                    <Field label="Priority">
                      <span className="text-sm">{PRIORITY_LABELS[unit.priority] ?? unit.priority}</span>
                    </Field>
                  )}
                  {unit.target_completion_date && (
                    <Field label="Target Date">
                      <span className="text-sm">{unit.target_completion_date}</span>
                    </Field>
                  )}

                  <Separator />

                  {(unit.purchase_date || unit.purchase_price_pence || unit.storage_location) && (
                    <>
                      {unit.purchase_date && (
                        <Field label="Purchase Date">
                          <span className="text-sm">{unit.purchase_date}</span>
                        </Field>
                      )}
                      {unit.purchase_price_pence !== null && (
                        <Field label="Purchase Price">
                          <span className="text-sm tabular-nums">{formatCurrency(unit.purchase_price_pence)}</span>
                        </Field>
                      )}
                      {unit.storage_location && (
                        <Field label="Storage Location">
                          <span className="text-sm">{unit.storage_location}</span>
                        </Field>
                      )}
                      <Separator />
                    </>
                  )}

                  {unit.undercoat && (
                    <Field label="Undercoat">
                      <span className="text-sm">{unit.undercoat}</span>
                    </Field>
                  )}

                  <Field label="Linked Recipes">
                    {linkedRecipes.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        No recipes linked to this unit.
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1 items-start">
                        {linkedRecipes.map((r) => (
                          <Button
                            key={r.id}
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => {
                              onClose();
                              navigate({ to: "/recipes" });
                            }}
                          >
                            {r.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Field>

                  {unit.notes && (
                    <>
                      <Separator />
                      <Field label="Notes">
                        <p className="text-sm whitespace-pre-wrap">{unit.notes}</p>
                      </Field>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="playbook">
                <PlaybookTab
                  unitId={unit.id}
                  onDatasheetConflict={onDatasheetConflict}
                  pendingImportResolution={pendingImportResolution}
                  onClearImportResolution={onClearImportResolution}
                />
              </TabsContent>

              <TabsContent value="journal">
                <JournalTab unitId={unit.id} onPhotoClick={onPhotoClick} />
              </TabsContent>

              <TabsContent value="recipes">
                <AppliedRecipesTab
                  unitId={unit.id}
                  onApplyRecipe={() => setApplyDialogOpen(true)}
                />
              </TabsContent>
            </Tabs>

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(unit)}
              >
                Delete Unit
              </Button>
              <Button onClick={() => onEdit(unit)}>
                Edit Unit
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
    {unit && (
      <ApplyRecipeDialog
        open={applyDialogOpen}
        unitId={unit.id}
        onClose={() => setApplyDialogOpen(false)}
      />
    )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
