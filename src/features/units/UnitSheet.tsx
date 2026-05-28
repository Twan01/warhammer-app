import { useEffect } from "react";
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
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useCreateUnit, useUpdateUnit } from "@/hooks/useUnits";
import { useUnitPointTiers } from "@/hooks/useUnitPointTiers";
import { useFactions } from "@/hooks/useFactions";
import type { Unit, EnrichedUnit } from "@/types/unit";
import { unitSchema, type UnitFormValues } from "./unitSchema";
import { UnitFormRequired } from "./UnitFormRequired";
import { UnitFormOptional } from "./UnitFormOptional";

interface UnitSheetProps {
  open: boolean;
  unit: Unit | EnrichedUnit | null;
  defaultFactionId?: number;
  onClose: () => void;
}

function penceToRoundedPounds(pence: number | null): number | null {
  if (pence === null || pence === undefined) return null;
  return Math.round(pence) / 100;
}

function buildDefaultValues(unit: Unit | null, defaultFactionId?: number): UnitFormValues {
  if (unit) {
    return {
      faction_id: unit.faction_id,
      name: unit.name,
      category: unit.category ?? "",
      model_count: unit.model_count ?? null,
      owned_count: unit.owned_count ?? null,
      points: unit.points ?? null,
      status_assembly: !!unit.status_assembly,
      status_painting: unit.status_painting,
      painting_percentage: unit.painting_percentage,
      status_basing: !!unit.status_basing,
      status_varnished: !!unit.status_varnished,
      is_active_project: !!unit.is_active_project,
      priority: unit.priority !== null ? String(unit.priority) : null,
      target_completion_date: unit.target_completion_date ?? null,
      purchase_date: unit.purchase_date ?? null,
      purchase_price_pounds: penceToRoundedPounds(unit.purchase_price_pence),
      storage_location: unit.storage_location ?? null,
      main_image_path: unit.main_image_path ?? null,
      notes: unit.notes ?? null,
      undercoat: unit.undercoat ?? null,
    };
  }
  return {
    faction_id: defaultFactionId ?? 0,
    name: "",
    category: "",
    model_count: null,
    owned_count: null,
    points: null,
    status_assembly: false,
    status_painting: "Not Started",
    painting_percentage: 0,
    status_basing: false,
    status_varnished: false,
    is_active_project: false,
    priority: null,
    target_completion_date: null,
    purchase_date: null,
    purchase_price_pounds: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
    undercoat: null,
  };
}

export function UnitSheet({ open, unit, defaultFactionId, onClose }: UnitSheetProps) {
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const { data: factions, isLoading: factionsLoading } = useFactions();
  const { data: tiers } = useUnitPointTiers(unit?.id);
  const hasTiers = (tiers?.length ?? 0) > 0;
  const isEdit = unit !== null;

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: buildDefaultValues(unit, defaultFactionId),
  });

  useEffect(() => {
    form.reset(buildDefaultValues(unit, defaultFactionId));
  }, [unit, defaultFactionId]);

  async function onSubmit(values: UnitFormValues) {
    try {
      const pricePence = values.purchase_price_pounds !== null && values.purchase_price_pounds !== undefined
        ? Math.round(values.purchase_price_pounds * 100)
        : null;

      const payload = {
        faction_id: values.faction_id,
        name: values.name,
        category: values.category || null,
        unit_type: null as string | null,
        model_count: values.model_count ?? null,
        owned_count: values.owned_count ?? null,
        points: values.points ?? null,
        status_assembly: values.status_assembly ? 1 : 0 as 0 | 1,
        status_painting: values.status_painting,
        painting_percentage: 0,
        status_basing: values.status_basing ? 1 : 0 as 0 | 1,
        status_varnished: values.status_varnished ? 1 : 0 as 0 | 1,
        is_active_project: values.is_active_project ? 1 : 0 as 0 | 1,
        priority: values.priority ? priorityToNumber(values.priority) : null,
        target_completion_date: values.target_completion_date || null,
        purchase_date: values.purchase_date || null,
        purchase_price_pence: pricePence,
        storage_location: values.storage_location || null,
        main_image_path: values.main_image_path || null,
        notes: values.notes || null,
        lore_notes: null as string | null,
        undercoat: values.undercoat || null,
        // migration 037 — override flags default to 0 on creation (user has not manually set status)
        status_assembly_override: 0 as 0 | 1,
        status_basing_override: 0 as 0 | 1,
        status_varnished_override: 0 as 0 | 1,
      };

      if (isEdit && unit) {
        const {
          painting_percentage: _pp, status_painting: _sp, status_basing: _sb, status_varnished: _sv, status_assembly: _sa,
          status_assembly_override: _sao, status_basing_override: _sbo, status_varnished_override: _svo,
          ...rest
        } = payload;
        await updateUnit.mutateAsync({ id: unit.id, ...rest });
        toast.success("Unit updated.");
      } else {
        await createUnit.mutateAsync(payload);
        toast.success("Unit created.");
      }
      onClose();
    } catch {
      toast.error("Failed to save unit. Try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Unit" : "New Unit"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the details for this unit."
              : "Add a new unit to your collection."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">
            <UnitFormRequired
              factions={factions ?? []}
              factionsLoading={factionsLoading}
              unitId={unit?.id}
            />

            <UnitFormOptional
              hasTiers={hasTiers}
              tiersCount={tiers?.length ?? 0}
              unit={unit}
            />

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Discard changes
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Save Unit
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function priorityToNumber(priority: string): number | null {
  switch (priority) {
    case "Low": return 1;
    case "Medium": return 2;
    case "High": return 3;
    case "Critical": return 4;
    default: return null;
  }
}
