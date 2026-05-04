import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUnit, useUpdateUnit } from "@/hooks/useUnits";
import { useFactions } from "@/hooks/useFactions";
import type { Unit } from "@/types/unit";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import { unitSchema, type UnitFormValues } from "./unitSchema";
import { CategoryCombobox } from "./CategoryCombobox";

interface UnitSheetProps {
  open: boolean;
  unit: Unit | null;
  defaultFactionId?: number;
  onClose: () => void;
}

function buildDefaultValues(unit: Unit | null, defaultFactionId?: number): UnitFormValues {
  if (unit) {
    return {
      faction_id: unit.faction_id,
      name: unit.name,
      category: unit.category ?? "",
      unit_type: unit.unit_type ?? null,
      model_count: unit.model_count ?? null,
      owned_count: unit.owned_count ?? null,
      points: unit.points ?? null,
      // Pitfall 1: coerce 0|1 → boolean for form display
      status_assembly: !!unit.status_assembly,
      status_painting: unit.status_painting,
      painting_percentage: unit.painting_percentage,
      status_basing: !!unit.status_basing,
      status_varnished: !!unit.status_varnished,
      is_active_project: !!unit.is_active_project,
      priority: unit.priority ?? null,
      target_completion_date: unit.target_completion_date ?? null,
      purchase_date: unit.purchase_date ?? null,
      purchase_price_pence: unit.purchase_price_pence ?? null,
      storage_location: unit.storage_location ?? null,
      main_image_path: unit.main_image_path ?? null,
      notes: unit.notes ?? null,
    };
  }
  return {
    faction_id: defaultFactionId ?? 0,
    name: "",
    category: "",
    unit_type: null,
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
    purchase_price_pence: null,
    storage_location: null,
    main_image_path: null,
    notes: null,
  };
}

export function UnitSheet({ open, unit, defaultFactionId, onClose }: UnitSheetProps) {
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const { data: factions, isLoading: factionsLoading } = useFactions();
  const isEdit = unit !== null;
  const [expanded, setExpanded] = useState(false);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: buildDefaultValues(unit, defaultFactionId),
  });

  // Pitfall 3: reset form when unit or defaultFactionId changes (prevents stale data)
  useEffect(() => {
    form.reset(buildDefaultValues(unit, defaultFactionId));
    setExpanded(false);
  }, [unit, defaultFactionId, form]);

  async function onSubmit(values: UnitFormValues) {
    try {
      // Pitfall 1: coerce boolean → 0|1 for DB write
      const payload = {
        faction_id: values.faction_id,
        name: values.name,
        category: values.category || null,
        unit_type: values.unit_type || null,
        model_count: values.model_count ?? null,
        owned_count: values.owned_count ?? null,
        points: values.points ?? null,
        status_assembly: values.status_assembly ? 1 : 0 as 0 | 1,
        status_painting: values.status_painting,
        painting_percentage: values.painting_percentage,
        status_basing: values.status_basing ? 1 : 0 as 0 | 1,
        status_varnished: values.status_varnished ? 1 : 0 as 0 | 1,
        is_active_project: values.is_active_project ? 1 : 0 as 0 | 1,
        priority: values.priority ?? null,
        target_completion_date: values.target_completion_date || null,
        purchase_date: values.purchase_date || null,
        purchase_price_pence: values.purchase_price_pence ?? null,
        storage_location: values.storage_location || null,
        main_image_path: values.main_image_path || null,
        notes: values.notes || null,
      };

      if (isEdit && unit) {
        await updateUnit.mutateAsync({ id: unit.id, ...payload });
        toast.success("Unit updated.");
      } else {
        await createUnit.mutateAsync(payload);
        toast.success("Unit created.");
      }
      onClose();
    } catch {
      toast.error("Failed to save unit. Try again.");
      // Sheet stays open so user can retry
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
            {/* === Required fields (always visible) === */}

            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Tau Fire Warriors" {...field} />
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
                  <FormLabel>Faction</FormLabel>
                  <Select
                    disabled={factionsLoading}
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={factionsLoading ? "Loading factions..." : "Select faction"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(factions ?? []).map((faction) => (
                        <SelectItem key={faction.id} value={String(faction.id)}>
                          {faction.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Category</FormLabel>
              <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <CategoryCombobox value={field.value} onChange={field.onChange} />
                )}
              />
              <FormMessage>{form.formState.errors.category?.message}</FormMessage>
            </FormItem>

            <Separator />

            {/* === More details toggle === */}
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {expanded ? "Hide details" : "More details"}
            </button>

            {/* === Optional collapsible section === */}
            {expanded && (
              <div className="flex flex-col gap-4">

                <FormField
                  name="status_painting"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Painting Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
                  name="painting_percentage"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Painting Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="status_assembly"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="status_assembly"
                          className="accent-primary h-4 w-4 rounded border-border"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <FormLabel htmlFor="status_assembly" className="cursor-pointer">
                          Assembly complete
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="status_basing"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="status_basing"
                          className="accent-primary h-4 w-4 rounded border-border"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <FormLabel htmlFor="status_basing" className="cursor-pointer">
                          Basing complete
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="status_varnished"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="status_varnished"
                          className="accent-primary h-4 w-4 rounded border-border"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <FormLabel htmlFor="status_varnished" className="cursor-pointer">
                          Varnished
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="is_active_project"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_active_project"
                          className="accent-primary h-4 w-4 rounded border-border"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <FormLabel htmlFor="is_active_project" className="cursor-pointer">
                          Active project
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="priority"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="target_completion_date"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Completion Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
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

                <FormField
                  name="model_count"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="owned_count"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owned Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="points"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="purchase_date"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
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

                <FormField
                  name="purchase_price_pence"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          placeholder="e.g. 1250 for £12.50"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? null : e.target.valueAsNumber
                            )
                          }
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Enter amount in pence (100 = £1.00)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="storage_location"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Optional"
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

                <FormField
                  name="main_image_path"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image Path</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Optional — text path only, no upload UI in v1"
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

                <FormField
                  name="notes"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Optional notes..."
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
              </div>
            )}

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
