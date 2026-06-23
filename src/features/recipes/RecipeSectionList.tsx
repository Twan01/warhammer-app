import { useState } from "react";
import { BookOpen } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { type DraftSection } from "./recipeSection";
import { RecipeSectionCard } from "./RecipeSectionCard";
import { TechniquePickerDialog } from "./TechniquePickerDialog";
import { SlotFillDialog } from "./SlotFillDialog";
import type { TechniqueWithCounts } from "@/types/technique";

export interface RecipeSectionListProps {
  sections: DraftSection[];
  onChange: (next: DraftSection[]) => void;
  onCreateNewPaint: (stepLocalId: string) => void;
  /** Recipe id used for the apply-technique dialogs and instance resolution. */
  recipeId?: number;
}

// ---------------------------------------------------------------------------
// TechniqueControls — hook-bearing sub-component (only mounted when recipeId
// is defined, which avoids breaking tests that render RecipeSectionList without
// a QueryClient provider).
// ---------------------------------------------------------------------------

interface TechniqueControlsProps {
  sections: DraftSection[];
  recipeId: number;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  pendingTechnique: TechniqueWithCounts | null;
  setPendingTechnique: (t: TechniqueWithCounts | null) => void;
}

/**
 * Inner component that owns the React Query hooks and dialog state for the
 * "Add technique" flow. Mounted only when recipeId is defined.
 *
 * Architecture:
 *   - TechniquePickerDialog and SlotFillDialog render via Radix Dialog portals
 *     (document.body level) — the P6 pitfall (nesting inside SheetContent) is
 *     avoided because Dialog.Content uses DialogPortal regardless of mount point.
 */
function TechniqueControls({
  sections,
  recipeId,
  pickerOpen,
  setPickerOpen,
  pendingTechnique,
  setPendingTechnique,
}: TechniqueControlsProps) {
  return (
    <>
      {/*
       * Both dialogs mount here via Radix Portals — they render at document.body
       * level regardless of position in the React tree (P6 pitfall avoided).
       */}
      <TechniquePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={(technique) => {
          setPendingTechnique(technique);
          setPickerOpen(false);
        }}
      />

      <SlotFillDialog
        open={pendingTechnique !== null}
        technique={pendingTechnique}
        recipeId={recipeId}
        insertAfterSectionIndex={sections.length}
        onBack={() => {
          setPickerOpen(true);
          setPendingTechnique(null);
        }}
        onClose={() => setPendingTechnique(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// TechniqueNameResolver — loads instances + techniques for name resolution.
// Separated so hooks are only called when recipeId is defined.
// ---------------------------------------------------------------------------

import { useInstancesForRecipe } from "@/hooks/useTechniqueInstances";
import { useTechniquesWithCounts } from "@/hooks/useTechniques";
import { useDetachTechniqueInstance } from "@/hooks/useTechniqueDetach";
import { toast } from "sonner";

interface DetachHandler {
  mutateAsync: (input: { instanceId: number; recipeId: number }) => Promise<void>;
  isPending: boolean;
}

interface TechniqueNameResolverProps {
  recipeId: number;
  children: (nameMap: Map<number, string>, detach: DetachHandler, pendingInstanceId: number | null) => React.ReactNode;
}

function TechniqueNameResolver({ recipeId, children }: TechniqueNameResolverProps) {
  const { data: instances = [] } = useInstancesForRecipe(recipeId);
  const { data: techniquesWithCounts = [] } = useTechniquesWithCounts();
  const detach = useDetachTechniqueInstance();
  // WR-01: track which instance is pending to avoid disabling all sections
  const [pendingInstanceId, setPendingInstanceId] = useState<number | null>(null);

  const instanceTechniqueNameMap = new Map<number, string>();
  for (const inst of instances) {
    const technique = techniquesWithCounts.find((t) => t.id === inst.technique_id);
    if (technique) {
      instanceTechniqueNameMap.set(inst.id, technique.name);
    }
  }

  // Wrap the detach handler so isPending is scoped per instance
  const detachWithPendingTracking: DetachHandler = {
    mutateAsync: async (input) => {
      setPendingInstanceId(input.instanceId);
      try {
        return await detach.mutateAsync(input);
      } finally {
        setPendingInstanceId(null);
      }
    },
    // isPending is intentionally left as the global flag here so callers that
    // need the global state (e.g., disabling the dialog confirm button) still
    // work; per-section gating uses pendingInstanceId via a separate prop below.
    isPending: detach.isPending,
  };

  return <>{children(instanceTechniqueNameMap, detachWithPendingTracking, pendingInstanceId)}</>;
}

// ---------------------------------------------------------------------------
// RecipeSectionList — public component (hook-free outer shell)
// ---------------------------------------------------------------------------

/**
 * RecipeSectionList — DnD-sortable list of recipe sections with an "Add technique" toolbar.
 *
 * Architecture:
 *   - The outer component is hook-free so it can be rendered in tests without QueryClient.
 *   - When recipeId is provided, TechniqueNameResolver + TechniqueControls sub-components
 *     are mounted; they carry the React Query hooks and dialog portal state.
 *   - insertAfterSectionIndex defaults to end-of-recipe (sections.length).
 */
export function RecipeSectionList({
  sections,
  onChange,
  onCreateNewPaint,
  recipeId,
}: RecipeSectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Technique picker / slot-fill dialog state (lifted here so "Back to picker" works)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTechnique, setPendingTechnique] = useState<TechniqueWithCounts | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.localId === active.id);
    const newIndex = sections.findIndex((s) => s.localId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(sections, oldIndex, newIndex));
  }

  function updateSection(localId: string, updated: DraftSection) {
    onChange(sections.map((s) => (s.localId === localId ? updated : s)));
  }

  function removeSection(localId: string) {
    onChange(sections.filter((s) => s.localId !== localId));
  }

  const renderCards = (
    nameMap: Map<number, string>,
    detach?: DetachHandler,
    pendingInstanceId?: number | null,
  ) => (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.localId)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {sections.map((section) => {
            const isTechniqueOwned =
              recipeId !== undefined && section.technique_instance_id != null;
            const onDetach =
              isTechniqueOwned && detach
                ? (onSuccess: () => void) => {
                    const instanceId = section.technique_instance_id as number;
                    detach
                      .mutateAsync({ instanceId, recipeId: recipeId as number })
                      .then(() => {
                        toast.success("Technique detached — now plain recipe content");
                        onSuccess();
                      })
                      .catch(() => {
                        toast.error("Failed to detach technique. Please try again.");
                        // dialog stays open for retry — no onSuccess call
                      });
                  }
                : undefined;

            // WR-01: scope isPending to this instance so only the in-flight
            // section's Unlink button is disabled, not every section's button.
            const isThisInstancePending =
              pendingInstanceId != null &&
              section.technique_instance_id === pendingInstanceId;

            return (
              <RecipeSectionCard
                key={section.localId}
                section={section}
                onChange={(updated) => updateSection(section.localId, updated)}
                onRemove={() => removeSection(section.localId)}
                onCreateNewPaint={onCreateNewPaint}
                sectionsCount={sections.length}
                techniqueName={
                  section.technique_instance_id != null
                    ? (nameMap.get(section.technique_instance_id) ?? "technique")
                    : undefined
                }
                onDetach={onDetach}
                isPendingDetach={isThisInstancePending}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  return (
    <>
      {/* Toolbar: "Add technique" button — only when recipeId is available */}
      {recipeId !== undefined && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => setPickerOpen(true)}
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Add technique
          </Button>
        </div>
      )}

      {/* Section cards — with or without technique name resolution */}
      {recipeId !== undefined ? (
        <TechniqueNameResolver recipeId={recipeId}>
          {(nameMap, detach, pendingInstanceId) => (
            <>
              {renderCards(nameMap, detach, pendingInstanceId)}
              <TechniqueControls
                sections={sections}
                recipeId={recipeId}
                pickerOpen={pickerOpen}
                setPickerOpen={setPickerOpen}
                pendingTechnique={pendingTechnique}
                setPendingTechnique={setPendingTechnique}
              />
            </>
          )}
        </TechniqueNameResolver>
      ) : (
        renderCards(new Map())
      )}
    </>
  );
}
