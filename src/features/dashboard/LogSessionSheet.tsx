/**
 * DASH-02 — Lightweight Sheet for logging a painting session from the Dashboard
 * Quick Action button. Mirrors UnitSheet's React Hook Form + Zod pattern
 * (buildDefaultValues for defaults, NOT zod .default() — Pitfall 8).
 *
 * Unit picker shows active projects first (is_active_project === 1, sorted by
 * updated_at DESC), then all remaining units alphabetically. This biases the
 * picker to the most likely targets without forcing the user to scroll.
 *
 * DATA-01/02: Optional "Update Painting Status" dropdown between Unit and Date
 * fields. Submitting with a status selected calls createSession then updateUnit
 * sequentially. Partial failure (session ok, status fails) shows warning toast
 * and closes the sheet without rolling back the logged session.
 *
 * INTEG-01: Recipe and Step selectors added in Phase 41. Step selector is
 * conditionally rendered only when a recipe is selected. Changing the recipe
 * clears the step selection to prevent stale FK references.
 *
 * Pattern source: src/features/units/UnitSheet.tsx (form + sheet),
 *                 src/features/units/JournalTab.tsx (mutation field semantics).
 */
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnits, useUpdateUnit } from "@/hooks/useUnits";
import { useCreatePaintingSession } from "@/hooks/useJournalSessions";
import { useAssignmentsByUnit, useCreateAssignment, useToggleStepProgress, ASSIGNMENTS_KEY } from "@/hooks/useRecipeAssignments";
import { useQueryClient } from "@tanstack/react-query";
import { useRecipes } from "@/hooks/useRecipes";
import { useRecipePaints } from "@/hooks/useRecipePaints";
import { useRecipeSections } from "@/hooks/useRecipeSections";
import { useFactions } from "@/hooks/useFactions";
import { todayISO } from "@/lib/dates";
import type { Unit } from "@/types/unit";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import type { PaintingRecipe } from "@/types/recipe";
import type { Faction } from "@/types/faction";
import { logSessionSchema, type LogSessionFormValues } from "./logSessionSchema";

interface LogSessionSheetProps {
  open: boolean;
  onClose: () => void;
  defaultUnitId?: number;
}

function buildDefaultValues(defaultUnitId?: number): LogSessionFormValues {
  return {
    unit_id: defaultUnitId ?? 0,
    session_date: todayISO(),
    duration_minutes: 30,
    notes: null,
    new_status: null,
    recipe_id: null,
    recipe_step_id: null,
    section_name: null,
  };
}

function sortUnitsForPicker(units: Unit[]): Unit[] {
  const active = units
    .filter((u) => u.is_active_project === 1)
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const inactive = units
    .filter((u) => u.is_active_project !== 1)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...active, ...inactive];
}

function sortRecipesForPicker(recipes: PaintingRecipe[], factions: Faction[]): PaintingRecipe[] {
  const factionOrder = new Map(factions.map((f, i) => [f.id, i]));
  return [...recipes].sort((a, b) => {
    const fa = factionOrder.get(a.faction_id ?? -1) ?? 999;
    const fb = factionOrder.get(b.faction_id ?? -1) ?? 999;
    if (fa !== fb) return fa - fb;
    return a.name.localeCompare(b.name);
  });
}

export function LogSessionSheet({ open, onClose, defaultUnitId }: LogSessionSheetProps) {
  const { data: units, isLoading: unitsLoading } = useUnits();
  const createSession = useCreatePaintingSession();
  const updateUnit = useUpdateUnit();
  const { data: recipes = [], isLoading: recipesLoading } = useRecipes();
  const { data: factions = [] } = useFactions();

  const form = useForm<LogSessionFormValues>({
    resolver: zodResolver(logSessionSchema),
    defaultValues: buildDefaultValues(defaultUnitId),
  });

  // Reset form on each open so leftover values from a previous open do not persist.
  // Include defaultUnitId in deps so re-opening for a different unit pre-populates correctly (Pitfall 4).
  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(defaultUnitId));
      setWatchedSectionId(null);
    }
  }, [open, form, defaultUnitId]);

  const orderedUnits = useMemo(
    () => sortUnitsForPicker(units ?? []),
    [units]
  );

  const watchedRecipeId = form.watch("recipe_id");
  const watchedUnitId = form.watch("unit_id");
  const { data: unitAssignments = [] } = useAssignmentsByUnit(watchedUnitId > 0 ? watchedUnitId : undefined);
  const createAssignment = useCreateAssignment();
  const toggleStepProgress = useToggleStepProgress();
  const qc = useQueryClient();

  const { data: recipeSteps = [] } = useRecipePaints(
    watchedRecipeId != null ? watchedRecipeId : undefined
  );

  const [watchedSectionId, setWatchedSectionId] = useState<number | null>(null);

  const { data: sections = [] } = useRecipeSections(
    watchedRecipeId != null ? watchedRecipeId : undefined
  );

  const filteredSteps = useMemo(() => {
    if (watchedSectionId == null) return recipeSteps;
    return recipeSteps.filter((s) => s.section_id === watchedSectionId);
  }, [recipeSteps, watchedSectionId]);

  // Reset chain 1: recipe changes → clear section AND step
  useEffect(() => {
    form.setValue("recipe_step_id", null);
    form.setValue("section_name", null);
    setWatchedSectionId(null);
  }, [watchedRecipeId, form]);

  // Reset chain 2: section changes → clear step only
  useEffect(() => {
    form.setValue("recipe_step_id", null);
  }, [watchedSectionId, form]);

  const orderedRecipes = useMemo(
    () => sortRecipesForPicker(recipes, factions),
    [recipes, factions]
  );

  async function onSubmit(values: LogSessionFormValues) {
    try {
      await createSession.mutateAsync({
        unit_id: values.unit_id,
        session_date: values.session_date,
        duration_minutes: values.duration_minutes,
        notes: values.notes && values.notes.trim() !== "" ? values.notes.trim() : null,
        recipe_id: values.recipe_id ?? null,
        recipe_step_id: values.recipe_step_id ?? null,
        section_name: values.section_name ?? null,
        recipe_section_id: watchedSectionId ?? null,
      });
    } catch {
      toast.error("Failed to log session — try again.");
      // Sheet stays open so user can retry
      return;
    }

    // AR-05: Bridge — auto-mark the selected recipe step as completed in the
    // applied recipe assignment when logging a session with a recipe step.
    if (values.recipe_id != null && values.recipe_step_id != null) {
      try {
        const step = recipeSteps.find((s) => s.id === values.recipe_step_id);
        if (step) {
          let existingAssignment = unitAssignments.find((a) => a.recipe_id === values.recipe_id);
          let assignmentId: number;
          if (existingAssignment) {
            assignmentId = existingAssignment.id;
          } else {
            assignmentId = await createAssignment.mutateAsync({
              unit_id: values.unit_id,
              recipe_id: values.recipe_id!,
            });
          }
          await toggleStepProgress.mutateAsync({
            assignmentId,
            recipeStepId: step.id,
            completed: true,
          });
          qc.invalidateQueries({ queryKey: [...ASSIGNMENTS_KEY] });
          qc.invalidateQueries({ queryKey: ["kanban-enrichment"] });
        }
      } catch {
        toast.warning("Session logged but step progress update failed.");
        onClose();
        return;
      }
    }

    if (values.new_status) {
      try {
        await updateUnit.mutateAsync({
          id: values.unit_id,
          status_painting: values.new_status,
        });
      } catch {
        toast.warning("Session logged but status update failed.");
        onClose();
        return;
      }
    }

    toast.success(values.new_status ? "Session logged and status updated." : "Session logged.");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Session</SheetTitle>
          <SheetDescription>
            Record a painting session for a unit in your collection.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            <FormField
              name="unit_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select
                    disabled={unitsLoading}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={unitsLoading ? "Loading units…" : "Select a unit"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {orderedUnits.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name}
                          {u.is_active_project === 1 ? " · active" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="new_status"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Update Painting Status</FormLabel>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No change" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No change</SelectItem>
                      {PAINTING_STATUS_ORDER.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="recipe_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe</FormLabel>
                  <Select
                    disabled={recipesLoading}
                    value={field.value != null ? String(field.value) : "__none__"}
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? null : Number(v))
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={recipesLoading ? "Loading recipes..." : "No recipe"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No recipe</SelectItem>
                      {orderedRecipes.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedRecipeId != null && sections.length >= 2 && (
              <FormField
                name="section_name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select
                      value={watchedSectionId != null ? String(watchedSectionId) : "__none__"}
                      onValueChange={(v) => {
                        const numId = v === "__none__" ? null : Number(v);
                        setWatchedSectionId(numId);
                        field.onChange(
                          v === "__none__"
                            ? null
                            : sections.find((s) => s.id === numId)?.name ?? null
                        );
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No section</SelectItem>
                        {sections
                          .slice()
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedRecipeId != null && (
              <FormField
                name="recipe_step_id"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe Step</FormLabel>
                    <Select
                      value={field.value != null ? String(field.value) : "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : Number(v))
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No step" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">No step</SelectItem>
                        {filteredSteps
                          .slice()
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.painting_phase ? `${s.painting_phase}: ` : ""}{s.step_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              name="session_date"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="duration_minutes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : e.target.valueAsNumber
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="notes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Optional notes about this session…"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || null)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting ||
                  unitsLoading ||
                  createSession.isPending ||
                  updateUnit.isPending
                }
              >
                Log Session
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
