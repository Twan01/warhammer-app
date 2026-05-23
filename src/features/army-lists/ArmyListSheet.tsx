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
import { useCreateArmyList, useUpdateArmyList } from "@/hooks/useArmyLists";
import { useFactions } from "@/hooks/useFactions";
import type { ArmyList } from "@/types/armyList";
import { armyListSchema, ARMY_LIST_TYPES, type ArmyListFormValues } from "./armyListSchema";

interface ArmyListSheetProps {
  open: boolean;
  list: ArmyList | null;
  onClose: () => void;
}

const NO_FACTION = "__none__"; // Select sentinel: SelectItem cannot have value=""

const DEFAULT_VALUES: ArmyListFormValues = {
  name: "",
  faction_id: null,
  list_type: null,
  points_limit: null,
  notes: null,
};

function buildDefaultValues(list: ArmyList | null): ArmyListFormValues {
  if (list) {
    return {
      name: list.name,
      faction_id: list.faction_id,
      // DB column is TEXT — coerce to enum value if it matches, else null
      list_type: ARMY_LIST_TYPES.includes(list.list_type as never)
        ? (list.list_type as ArmyListFormValues["list_type"])
        : null,
      points_limit: list.points_limit,
      notes: list.notes,
    };
  }
  return DEFAULT_VALUES;
}

export function ArmyListSheet({ open, list, onClose }: ArmyListSheetProps) {
  const createArmyList = useCreateArmyList();
  const updateArmyList = useUpdateArmyList();
  const { data: factions, isLoading: factionsLoading } = useFactions();
  const isEdit = list !== null;

  const form = useForm<ArmyListFormValues>({
    resolver: zodResolver(armyListSchema),
    defaultValues: buildDefaultValues(list),
  });

  // Pitfall 6: reset form when list prop changes (prevents stale data when re-using
  // the component for a different list — sibling portal pattern with key prop also
  // forces remount, but this useEffect is belt-and-braces).
  useEffect(() => {
    form.reset(buildDefaultValues(list));
  }, [list]);

  async function onSubmit(values: ArmyListFormValues) {
    try {
      // Coerce empty notes to null (08-RESEARCH.md Pitfall 5 — list-level notes:
      // pass "" not null when clearing, so the COALESCE in updateArmyList can
      // overwrite. For CREATE, null is fine.)
      const payload = {
        name: values.name,
        faction_id: values.faction_id ?? null,
        points_limit: values.points_limit ?? null,
        list_type: values.list_type ?? null,
        notes: values.notes ?? null,
        detachment_id: null as string | null,
        detachment_name: null as string | null,
      };

      if (isEdit && list) {
        // For UPDATE: pass empty string instead of null for notes so COALESCE in
        // updateArmyList can clear it (Pitfall 5). All other fields are managed
        // the same in create + edit.
        await updateArmyList.mutateAsync({
          id: list.id,
          ...payload,
          notes: payload.notes ?? "",
        });
        toast.success("Army list updated.");
      } else {
        await createArmyList.mutateAsync(payload);
        toast.success("Army list created.");
      }
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
      // Sheet stays open so user can retry
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Army List" : "New Army List"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the details for this army list."
              : "Create a new army list to track which units you're taking to the table."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">

            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. My 1000pt List" {...field} />
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
                    value={field.value !== null ? String(field.value) : NO_FACTION}
                    onValueChange={(v) => field.onChange(v === NO_FACTION ? null : Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={factionsLoading ? "Loading factions..." : "Select faction"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_FACTION}>No faction</SelectItem>
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

            <FormField
              name="list_type"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>List Type</FormLabel>
                  <Select
                    value={field.value ?? "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select list type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No type</SelectItem>
                      {ARMY_LIST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="points_limit"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points Limit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Optional (e.g. 1000)"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : e.target.valueAsNumber,
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

            <SheetFooter className="mt-6 gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Discard changes
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEdit ? "Update List" : "Save List"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
