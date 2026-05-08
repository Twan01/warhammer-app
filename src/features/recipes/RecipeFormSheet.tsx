import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { ImageIcon, Plus } from "lucide-react";
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
import {
  useCreateRecipe,
  useUpdateRecipe,
} from "@/hooks/useRecipes";
import {
  useAddRecipePaint,
  useRemoveRecipePaint,
  useRecipePaints,
  RECIPE_PAINTS_KEY,
  STEP_COUNTS_KEY,
  RECIPE_AVAILABILITY_KEY,
  RECIPE_SWATCH_KEY,
} from "@/hooks/useRecipePaints";
import { useRecipeSections, RECIPE_SECTIONS_KEY } from "@/hooks/useRecipeSections";
import { useFactions } from "@/hooks/useFactions";
import { useUnits } from "@/hooks/useUnits";
import { usePaints } from "@/hooks/usePaints";
import type { PaintingRecipe } from "@/types/recipe";
import {
  recipeSchema,
  type RecipeFormValues,
  RECIPE_STYLES,
  RECIPE_SURFACES,
  RECIPE_EFFECTS,
  RECIPE_DIFFICULTIES,
} from "./recipeSchema";
import {
  computeOrderIndex,
} from "./recipeSteps";
import { type DraftSection, makeDraftSection, buildDraftSections } from "./recipeSection";
import { RecipeStepList } from "./RecipeStepList";
import { RecipeSectionList } from "./RecipeSectionList";
import { createRecipeSection, deleteRecipeSection } from "@/db/queries/recipeSections";
import { PaintSheet } from "@/features/paints/PaintSheet";

export interface RecipeFormSheetProps {
  open: boolean;
  recipe: PaintingRecipe | null;
  onClose: () => void;
}

const DEFAULT_VALUES: RecipeFormValues = {
  name: "",
  faction_id: null,
  unit_id: null,
  area: null,
  notes: null,
  tutorial_link: null,
  style: null,
  surface: null,
  effect: null,
  difficulty: null,
  estimated_minutes: null,
  result_photo_path: null,
};

function buildDefaults(recipe: PaintingRecipe | null): RecipeFormValues {
  if (!recipe) return DEFAULT_VALUES;
  return {
    name: recipe.name,
    faction_id: recipe.faction_id,
    unit_id: recipe.unit_id,
    area: recipe.area,
    notes: recipe.notes,
    tutorial_link: recipe.tutorial_link,
    style: recipe.style,
    surface: recipe.surface,
    effect: recipe.effect,
    difficulty: recipe.difficulty,
    estimated_minutes: recipe.estimated_minutes,
    result_photo_path: recipe.result_photo_path,
  };
}

function formatMinutes(total: number): string {
  if (total === 0) return "";
  if (total < 60) return `~${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}min`;
}

export function RecipeFormSheet({ open, recipe, onClose }: RecipeFormSheetProps) {
  const isEdit = recipe !== null;
  const qc = useQueryClient();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const addRecipePaint = useAddRecipePaint();
  const removeRecipePaint = useRemoveRecipePaint();

  const { data: factions = [] } = useFactions();
  const { data: units = [] } = useUnits();
  const { data: paints = [] } = usePaints();
  // Existing steps for edit mode (enabled flag prevents fetch when creating new)
  const { data: existingSteps = [] } = useRecipePaints(recipe?.id);
  // Existing sections for edit mode
  const { data: existingSections = [] } = useRecipeSections(recipe?.id);

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: buildDefaults(recipe),
  });

  const [sections, setSections] = useState<DraftSection[]>([makeDraftSection("Steps")]);
  const [paintSheetOpen, setPaintSheetOpen] = useState(false);
  // Track existing paint ids before opening PaintSheet so we can detect the new one
  const [paintsBeforeCreate, setPaintsBeforeCreate] = useState<number[]>([]);
  // Which step row triggered the create — auto-select after save
  const [pendingStepLocalId, setPendingStepLocalId] = useState<string | null>(null);

  const totalMinutes = useMemo(
    () => sections.flatMap((s) => s.steps).reduce((acc, s) => acc + (s.time_estimate_minutes ?? 0), 0),
    [sections],
  );

  // Re-initialize draft sections and form values when the recipe prop changes
  useEffect(() => {
    form.reset(buildDefaults(recipe));
    if (recipe && existingSections.length > 0) {
      // Edit mode: build draft from DB sections + steps
      setSections(buildDraftSections(existingSections, existingSteps));
    } else if (!recipe) {
      // New recipe: one default section
      setSections([makeDraftSection("Steps")]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id, existingSections.length, existingSteps.length]);

  // PAINT-03: detect new paint after PaintSheet closes
  useEffect(() => {
    if (paintSheetOpen) return;
    if (!pendingStepLocalId) return;
    // Find the new paint id (not present before)
    const newPaint = paints.find((p) => !paintsBeforeCreate.includes(p.id));
    if (newPaint) {
      setSections((prev) =>
        prev.map((sec) => ({
          ...sec,
          steps: sec.steps.map((s) =>
            s.localId === pendingStepLocalId ? { ...s, paint_id: newPaint.id } : s,
          ),
        })),
      );
    }
    setPendingStepLocalId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paintSheetOpen, paints.length]);

  function openInlinePaintCreate(stepLocalId: string) {
    setPaintsBeforeCreate(paints.map((p) => p.id));
    setPendingStepLocalId(stepLocalId);
    setPaintSheetOpen(true);
  }

  function addSection() {
    setSections((prev) => [...prev, makeDraftSection()]);
  }

  async function handleResultPhotoUpload() {
    try {
      const result = (await openDialog({
        multiple: false,
        directory: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
      })) as string | null;
      if (result === null) return;

      const ext = result.split(".").pop()?.toLowerCase() ?? "jpg";
      const data = await readFile(result);
      const filename = `${crypto.randomUUID()}.${ext}`;
      await writeFile(filename, data, { baseDir: BaseDirectory.AppData });

      form.setValue("result_photo_path", filename);
      toast.success("Result photo added.");
    } catch {
      toast.error("Failed to upload photo.");
    }
  }

  async function onSubmit(values: RecipeFormValues) {
    try {
      let recipeId: number;
      if (isEdit && recipe) {
        await updateRecipe.mutateAsync({
          id: recipe.id,
          name: values.name,
          faction_id: values.faction_id,
          unit_id: values.unit_id,
          area: values.area,
          notes: values.notes,
          tutorial_link: values.tutorial_link || null,
          style: values.style,
          surface: values.surface,
          effect: values.effect,
          difficulty: values.difficulty,
          estimated_minutes: values.estimated_minutes,
          result_photo_path: values.result_photo_path,
        });
        recipeId = recipe.id;
        // Delete all existing sections — CASCADE handles step cleanup
        for (const existing of existingSections) {
          await deleteRecipeSection(existing.id);
        }
        // Remove any orphaned steps without section_id (legacy data)
        for (const existing of existingSteps) {
          await removeRecipePaint.mutateAsync({ id: existing.id, recipeId });
        }
      } else {
        recipeId = await createRecipe.mutateAsync({
          name: values.name,
          faction_id: values.faction_id,
          unit_id: values.unit_id,
          area: values.area,
          // Fixed text columns left empty — CONTEXT.md decision
          primer: null,
          basecoat: null,
          shade: null,
          layer: null,
          highlight: null,
          glaze_filter: null,
          weathering: null,
          technical: null,
          basing: null,
          notes: values.notes,
          tutorial_link: values.tutorial_link || null,
          style: values.style,
          surface: values.surface,
          effect: values.effect,
          difficulty: values.difficulty,
          estimated_minutes: values.estimated_minutes,
          result_photo_path: values.result_photo_path,
        });
      }

      // Create sections in array order, build localId -> dbId map
      const sectionIdMap = new Map<string, number>();
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const newSectionId = await createRecipeSection({
          recipe_id: recipeId,
          name: sec.name,
          surface: sec.surface,
          optional: sec.optional,
          order_index: i,
          notes: sec.notes,
        });
        sectionIdMap.set(sec.localId, newSectionId);
      }

      // Create steps with mapped section_id
      for (const sec of sections) {
        const dbSectionId = sectionIdMap.get(sec.localId) ?? null;
        const indexedSteps = computeOrderIndex(sec.steps);
        for (const s of indexedSteps) {
          if (s.paint_id !== null) {
            await addRecipePaint.mutateAsync({
              recipe_id: recipeId,
              paint_id: s.paint_id,
              step_name: s.step_name,
              order_index: s.order_index,
              notes: s.notes,
              painting_phase: s.painting_phase,
              tool: s.tool,
              technique: s.technique,
              dilution: s.dilution,
              time_estimate_minutes: s.time_estimate_minutes,
              step_photo_path: s.step_photo_path ?? null,
              alt_paint_id: s.alt_paint_id ?? null,
              section_id: dbSectionId,
            });
          }
        }
      }

      // Invalidate all 6 cache keys
      qc.invalidateQueries({ queryKey: RECIPE_SECTIONS_KEY(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_PAINTS_KEY(recipeId) });
      qc.invalidateQueries({ queryKey: STEP_COUNTS_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_AVAILABILITY_KEY });
      qc.invalidateQueries({ queryKey: RECIPE_SWATCH_KEY });
      qc.invalidateQueries({ queryKey: ["recipe-step-counts"] });

      toast.success(isEdit ? "Recipe saved." : "Recipe created.");
      onClose();
    } catch {
      toast.error("Failed to save recipe. Changes were not saved.");
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent
          // key forces re-mount when switching recipes (clears local section state)
          key={recipe?.id ?? "new"}
          className="overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>{isEdit ? "Edit Recipe" : "New Recipe"}</SheetTitle>
            <SheetDescription>
              {isEdit ? "Update your paint scheme." : "Document a new paint scheme."}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">

              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Tau White Armor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="faction_id"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faction (optional)</FormLabel>
                    <Select
                      value={field.value !== null ? String(field.value) : "none"}
                      onValueChange={(v) =>
                        field.onChange(v === "none" ? null : Number(v))
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select faction" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No faction</SelectItem>
                        {factions.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="unit_id"
                control={form.control}
                render={({ field }) => {
                  const factionId = form.watch("faction_id");
                  const filtered = factionId !== null
                    ? units.filter((u) => u.faction_id === factionId)
                    : units;
                  return (
                    <FormItem>
                      <FormLabel>Linked Unit (optional)</FormLabel>
                      <Select
                        value={field.value !== null ? String(field.value) : "none"}
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? null : Number(v))
                        }
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No unit</SelectItem>
                          {filtered.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                name="area"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Armor, Skin, Base..."
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="style"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Style (optional)</FormLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {RECIPE_STYLES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="surface"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface (optional)</FormLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select surface" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {RECIPE_SURFACES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="effect"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effect (optional)</FormLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select effect" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {RECIPE_EFFECTS.map((e) => (
                          <SelectItem key={e} value={e}>
                            {e}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="difficulty"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty (optional)</FormLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {RECIPE_DIFFICULTIES.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="estimated_minutes"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated time (minutes, optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 45"
                        min={1}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Result photo (optional)</FormLabel>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleResultPhotoUpload}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    {form.watch("result_photo_path") ? "Change photo" : "Upload photo"}
                  </Button>
                  {form.watch("result_photo_path") && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {form.watch("result_photo_path")}
                    </span>
                  )}
                </div>
              </FormItem>

              <FormField
                name="tutorial_link"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tutorial link</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://..."
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
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
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Optional notes..."
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recipe Steps
                  </span>
                  {totalMinutes > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatMinutes(totalMinutes)}
                    </span>
                  )}
                </div>
                {sections.length <= 1 ? (
                  <RecipeStepList
                    steps={sections[0]?.steps ?? []}
                    onChange={(next) =>
                      setSections((prev) => [{ ...(prev[0] ?? makeDraftSection("Steps")), steps: next }])
                    }
                    onCreateNewPaint={(stepLocalId) => openInlinePaintCreate(stepLocalId)}
                  />
                ) : (
                  <RecipeSectionList
                    sections={sections}
                    onChange={setSections}
                    onCreateNewPaint={(stepLocalId) => openInlinePaintCreate(stepLocalId)}
                  />
                )}
                <Button type="button" variant="outline" size="sm" onClick={addSection} className="self-start">
                  <Plus className="mr-2 h-4 w-4" /> Add Section
                </Button>
              </div>

              <SheetFooter className="mt-6 gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {isEdit ? "Save Recipe" : "Add Recipe"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Stacked PaintSheet for inline create — PAINT-03 */}
      <PaintSheet
        open={paintSheetOpen}
        paint={null}
        onClose={() => setPaintSheetOpen(false)}
      />
    </>
  );
}
