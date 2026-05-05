import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { useCreateWishlistItem, useUpdateWishlistItem } from "@/hooks/useWishlistItems";
import { useFactions } from "@/hooks/useFactions";
import { wishlistItemSchema, type WishlistItemFormValues } from "./wishlistItemSchema";
import type { WishlistItem } from "@/types/wishlistItem";

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Builds form defaults from an existing item or creates blank defaults for new items.
 * No zod .default() — breaks react-hook-form zodResolver with zod v4.
 */
function buildDefaultValues(item: WishlistItem | null): WishlistItemFormValues {
  if (item) {
    return {
      name: item.name,
      faction_id: item.faction_id,
      estimated_cost_pence: item.estimated_cost_pence,
      notes: item.notes,
    };
  }
  return {
    name: "",
    faction_id: 0,
    estimated_cost_pence: null,
    notes: null,
  };
}

/**
 * WISH-01 create/edit Sheet — form reset on item change (belt-and-braces pattern,
 * Pitfall 3). Currency input displays as pounds, stores as pence.
 */
export function WishlistItemSheet({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: WishlistItem | null;
  onClose: () => void;
}) {
  const isEdit = item !== null;
  const createItem = useCreateWishlistItem();
  const updateItem = useUpdateWishlistItem();
  const { data: factions, isLoading: factionsLoading } = useFactions();

  const form = useForm<WishlistItemFormValues>({
    resolver: zodResolver(wishlistItemSchema),
    defaultValues: buildDefaultValues(item),
  });

  // Pitfall 3 belt-and-braces: reset form when item prop changes
  useEffect(() => {
    form.reset(buildDefaultValues(item));
  }, [item, form]);

  async function onSubmit(values: WishlistItemFormValues) {
    try {
      const payload = {
        name: values.name,
        faction_id: values.faction_id,
        estimated_cost_pence: values.estimated_cost_pence,
        notes: values.notes ?? null,
      };

      if (isEdit && item) {
        await updateItem.mutateAsync({ id: item.id, ...payload });
        toast.success("Wishlist item updated.");
      } else {
        await createItem.mutateAsync(payload);
        toast.success("Item added to wishlist.");
      }
      onClose();
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Wishlist Item" : "Add Wishlist Item"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this wishlist entry."
              : "Add a model you want to buy — name, faction, and estimated cost."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">

            {/* Name */}
            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Helbrute, Rhino, Chaos Space Marines" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Faction — Pitfall 5: value must be string for Select, validated as positive int */}
            <FormField
              name="faction_id"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faction</FormLabel>
                  <Select
                    disabled={factionsLoading}
                    value={field.value > 0 ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a faction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(factions ?? []).map((f) => (
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

            {/* Estimated Cost — Pitfall 4: display as pounds (/100), store as pence (*100) */}
            <FormField
              name="estimated_cost_pence"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Cost (£)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 35.00"
                      value={field.value !== null ? (field.value / 100).toFixed(2) : ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : Math.round(e.target.valueAsNumber * 100),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              name="notes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <textarea
                      className={TEXTAREA_CLASS}
                      rows={3}
                      placeholder="Wait for sale, need for army list…"
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
                {isEdit ? "Update Item" : "Add Item"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
