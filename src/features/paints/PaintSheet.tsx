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
import { useCreatePaint, useUpdatePaint } from "@/hooks/usePaints";
import type { Paint } from "@/types/paint";
import { PAINT_TYPES } from "@/types/paint";
import { paintSchema, type PaintFormValues } from "./paintSchema";

interface PaintSheetProps {
  open: boolean;
  paint: Paint | null;
  onClose: () => void;
}

const DEFAULT_VALUES: PaintFormValues = {
  brand: "",
  name: "",
  paint_type: "Base",
  color_family: "",
  hex_color: "",
  owned: false,
  quantity: null,
  running_low: false,
  wishlist: false,
  notes: "",
  purchase_price_pence: null,
  purchase_date: null,
};

function buildDefaultValues(paint: Paint | null): PaintFormValues {
  if (paint) {
    return {
      brand: paint.brand,
      name: paint.name,
      paint_type: paint.paint_type,
      color_family: paint.color_family ?? "",
      hex_color: paint.hex_color ?? "",
      // Pitfall 1: coerce 0|1 → boolean for form display
      owned: !!paint.owned,
      quantity: paint.quantity ?? null,
      running_low: !!paint.running_low,
      wishlist: !!paint.wishlist,
      notes: paint.notes ?? "",
      purchase_price_pence: paint.purchase_price_pence ?? null,
      purchase_date: paint.purchase_date ?? null,
    };
  }
  return DEFAULT_VALUES;
}

export function PaintSheet({ open, paint, onClose }: PaintSheetProps) {
  const createPaint = useCreatePaint();
  const updatePaint = useUpdatePaint();
  const isEdit = paint !== null;

  const form = useForm<PaintFormValues>({
    resolver: zodResolver(paintSchema),
    defaultValues: buildDefaultValues(paint),
  });

  // Pitfall 3: reset form when paint prop changes (prevents stale data)
  useEffect(() => {
    form.reset(buildDefaultValues(paint));
  }, [paint, form]);

  async function onSubmit(values: PaintFormValues) {
    try {
      // Pitfall 1: coerce boolean → 0|1 for DB write
      const payload = {
        brand: values.brand,
        name: values.name,
        paint_type: values.paint_type,
        color_family: values.color_family || null,
        hex_color: values.hex_color || null,
        owned: (values.owned ? 1 : 0) as 0 | 1,
        quantity: values.quantity ?? null,
        running_low: (values.running_low ? 1 : 0) as 0 | 1,
        wishlist: (values.wishlist ? 1 : 0) as 0 | 1,
        notes: values.notes || null,
        purchase_price_pence: values.purchase_price_pence ?? null,
        purchase_date: values.purchase_date || null,
      };

      if (isEdit && paint) {
        await updatePaint.mutateAsync({ id: paint.id, ...payload });
        toast.success("Paint updated.");
      } else {
        await createPaint.mutateAsync(payload);
        toast.success("Paint created.");
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
          <SheetTitle>{isEdit ? "Edit Paint" : "New Paint"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the details for this paint."
              : "Add a new paint to your collection."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4">

            <FormField
              name="brand"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Citadel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="name"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Abaddon Black" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="paint_type"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAINT_TYPES.map((type) => (
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
              name="color_family"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Family</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g. Red, Metal, Skin'
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
              name="hex_color"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hex Color</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="#000000"
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
              name="owned"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="owned"
                      className="accent-primary h-4 w-4 rounded border-border"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <FormLabel htmlFor="owned" className="cursor-pointer">
                      Owned
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="quantity"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Optional"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : Number.isNaN(e.target.valueAsNumber)
                              ? field.value
                              : e.target.valueAsNumber,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="running_low"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="running_low"
                      className="accent-primary h-4 w-4 rounded border-border"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <FormLabel htmlFor="running_low" className="cursor-pointer">
                      Running low
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="wishlist"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="wishlist"
                      className="accent-primary h-4 w-4 rounded border-border"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <FormLabel htmlFor="wishlist" className="cursor-pointer">
                      Wishlist
                    </FormLabel>
                  </div>
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
                      placeholder="e.g. 350 for £3.50"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : Number.isNaN(e.target.valueAsNumber)
                              ? field.value
                              : e.target.valueAsNumber,
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
                Save Paint
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
