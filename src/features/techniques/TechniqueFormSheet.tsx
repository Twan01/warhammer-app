import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { ImageIcon, Plus } from "lucide-react";
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
} from "@dnd-kit/sortable";
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
import type { Technique, DraftTechniqueSlot, DraftTechniqueSection } from "@/types/technique";
import {
  techniqueSchema,
  RECIPE_EFFECTS,
  RECIPE_DIFFICULTIES,
} from "./techniqueSchema";
import type { TechniqueFormValues } from "@/types/technique";
import {
  makeDraftTechniqueSection,
  buildDraftTechniqueSlots,
  buildDraftTechniqueSections,
} from "./techniqueSection";
import { TechniqueSectionList } from "./TechniqueSectionList";
import { TechniqueSlotRow } from "./TechniqueSlotRow";
import { useCreateTechnique, useUpdateTechnique } from "@/hooks/useTechniques";
import { useTechniqueSections, useTechniqueSteps } from "@/hooks/useTechniqueSections";
import { useTechniqueColourSlots } from "@/hooks/useTechniqueColourSlots";

export interface TechniqueFormSheetProps {
  open: boolean;
  technique: Technique | null;
  onClose: () => void;
}

const DEFAULT_VALUES: TechniqueFormValues = {
  name: "",
  description: null,
  effect: null,
  difficulty: null,
  estimated_minutes: null,
  result_photo_path: null,
  notes: null,
};

function buildDefaults(technique: Technique | null): TechniqueFormValues {
  if (!technique) return DEFAULT_VALUES;
  return {
    name: technique.name,
    description: null, // Technique DB row doesn't store description; form-only field
    effect: technique.effect,
    difficulty: technique.difficulty,
    estimated_minutes: null,
    result_photo_path: null,
    notes: technique.notes,
  };
}

function formatMinutes(total: number): string {
  if (total === 0) return "";
  if (total < 60) return `~${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}min`;
}

export function TechniqueFormSheet({ open, technique, onClose }: TechniqueFormSheetProps) {
  const isEdit = technique !== null;

  const form = useForm<TechniqueFormValues>({
    resolver: zodResolver(techniqueSchema),
    defaultValues: buildDefaults(technique),
  });

  const [sections, setSections] = useState<DraftTechniqueSection[]>([
    makeDraftTechniqueSection("Steps"),
  ]);
  const [slots, setSlots] = useState<DraftTechniqueSlot[]>([]);

  // Load existing data for edit mode
  const { data: existingSections = [] } = useTechniqueSections(technique?.id);
  const { data: existingSteps = [] } = useTechniqueSteps(technique?.id);
  const { data: existingSlots = [] } = useTechniqueColourSlots(technique?.id);

  const createTechnique = useCreateTechnique();
  const updateTechnique = useUpdateTechnique();

  const totalMinutes = useMemo(
    () =>
      sections
        .flatMap((s) => s.steps)
        .reduce((acc, s) => acc + (s.time_estimate_minutes ?? 0), 0),
    [sections],
  );

  // Re-initialize when technique prop changes
  const existingSectionsLen = existingSections.length;
  const existingStepsLen = existingSteps.length;
  const existingSlotsLen = existingSlots.length;
  useEffect(() => {
    form.reset(buildDefaults(technique));
    if (technique && (existingSlotsLen > 0 || existingSectionsLen > 0)) {
      const draftSlots = buildDraftTechniqueSlots(existingSlots);
      setSlots(draftSlots);
      setSections(buildDraftTechniqueSections(existingSections, existingSteps, draftSlots));
    } else if (!technique) {
      setSlots([]);
      setSections([makeDraftTechniqueSection("Steps")]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technique?.id, existingSectionsLen, existingStepsLen, existingSlotsLen]);

  // Slot drag sensors (separate DndContext from section list)
  const slotSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleSlotDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slots.findIndex((s) => s.localId === active.id);
    const newIndex = slots.findIndex((s) => s.localId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setSlots(arrayMove(slots, oldIndex, newIndex));
  }

  function addSlot() {
    const newSlot: DraftTechniqueSlot = {
      localId: crypto.randomUUID(),
      dbId: null,
      name: "",
      role_hint: null,
      order_index: slots.length,
    };
    setSlots((prev) => [...prev, newSlot]);
  }

  function updateSlot(localId: string, updated: DraftTechniqueSlot) {
    setSlots((prev) => prev.map((s) => (s.localId === localId ? updated : s)));
  }

  /**
   * CRITICAL slot-removal handler (Pitfall 2 guard):
   * 1. Drops the slot from the slots list.
   * 2. Nulls colour_slot_id on every step in every section that referenced the removed slot's localId.
   * This prevents save-time mis-resolution when the localId no longer exists in the slotIdMap.
   */
  function removeSlot(localId: string) {
    setSlots((prev) => prev.filter((s) => s.localId !== localId));
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        steps: section.steps.map((step) =>
          step.colour_slot_id === localId ? { ...step, colour_slot_id: null } : step,
        ),
      })),
    );
  }

  function addSection() {
    setSections((prev) => [...prev, makeDraftTechniqueSection()]);
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

  async function onSubmit(values: TechniqueFormValues) {
    // Validation: name non-empty (Zod handles this)
    const allSteps = sections.flatMap((s) => s.steps);

    // Validation: at least one step
    if (allSteps.length === 0) {
      toast.warning("A technique must have at least one step.");
      return;
    }

    // Validation: all steps must have a name
    const unnamedSteps = allSteps.filter((s) => !s.step_name.trim());
    if (unnamedSteps.length > 0) {
      toast.warning("All steps must have a name.");
      return;
    }

    // Recompute order_index from array positions
    const orderedSlots = slots.map((slot, i) => ({ ...slot, order_index: i }));
    const orderedSections = sections.map((section, si) => ({
      ...section,
      order_index: si,
      steps: section.steps.map((step, ti) => ({ ...step, order_index: ti })),
    }));

    try {
      if (isEdit && technique) {
        await updateTechnique.mutateAsync({
          techniqueId: technique.id,
          formValues: values,
          slots: orderedSlots,
          sections: orderedSections,
          existingSlots,
          existingSections,
          existingSteps,
        });
        toast.success("Technique saved.");
      } else {
        await createTechnique.mutateAsync({
          formValues: values,
          slots: orderedSlots,
          sections: orderedSections,
          existingSlots: [],
          existingSections: [],
          existingSteps: [],
        });
        toast.success("Technique created.");
      }
      onClose();
    } catch (err) {
      console.error("[TechniqueFormSheet] save failed:", err);
      toast.error("Failed to save technique. Changes were not saved.");
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        key={technique?.id ?? "new"}
        className="overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Technique" : "New Technique"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update your technique." : "Document a reusable painting technique."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">

            {/* Technique name */}
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Technique name</FormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      placeholder="e.g. OSL Object Source Lighting"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Optional description…"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Effect */}
            <FormField
              name="effect"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effect (optional)</FormLabel>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select effect" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {RECIPE_EFFECTS.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Difficulty */}
            <FormField
              name="difficulty"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty (optional)</FormLabel>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {RECIPE_DIFFICULTIES.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimated time */}
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
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Result photo */}
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

            {/* Notes */}
            <FormField
              name="notes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Optional notes…"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ----------------------------------------------------------------
                Colour Slots section — separate DndContext from the section list
                ---------------------------------------------------------------- */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Colour Slots
              </span>

              <DndContext
                sensors={slotSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSlotDragEnd}
              >
                <SortableContext
                  items={slots.map((s) => s.localId)}
                  strategy={verticalListSortingStrategy}
                >
                  {slots.map((slot) => (
                    <TechniqueSlotRow
                      key={slot.localId}
                      slot={slot}
                      onChange={(updated) => updateSlot(slot.localId, updated)}
                      onRemove={() => removeSlot(slot.localId)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={addSlot}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Slot
              </Button>
            </div>

            {/* ----------------------------------------------------------------
                Sections/steps editor — separate DndContext (inside TechniqueSectionList)
                ---------------------------------------------------------------- */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Technique Steps
                </span>
                {totalMinutes > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatMinutes(totalMinutes)}
                  </span>
                )}
              </div>

              <TechniqueSectionList
                sections={sections}
                slots={slots}
                onChange={setSections}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={addSection}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Section
              </Button>
            </div>

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isEdit ? "Save Technique" : "Add Technique"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
