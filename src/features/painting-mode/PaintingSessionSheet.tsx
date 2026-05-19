import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  paintingSessionSchema,
  type PaintingSessionFormValues,
} from "./paintingSessionSchema";

interface PaintingSessionSheetProps {
  open: boolean;
  onClose: () => void;
  unitName: string;
  recipeName: string;
  stepName: string;
  sectionName: string | null;
  onSubmit: (duration: number, notes: string | null) => void;
  isPending: boolean;
}

function buildDefaultValues(): PaintingSessionFormValues {
  return {
    duration_minutes: 30,
    notes: null,
  };
}

export function PaintingSessionSheet({
  open,
  onClose,
  unitName,
  recipeName,
  stepName,
  sectionName,
  onSubmit,
  isPending,
}: PaintingSessionSheetProps) {
  const form = useForm<PaintingSessionFormValues>({
    resolver: zodResolver(paintingSessionSchema),
    defaultValues: buildDefaultValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues());
    }
  }, [open, form]);

  function handleSubmit(values: PaintingSessionFormValues) {
    onSubmit(values.duration_minutes, values.notes ?? null);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Session</SheetTitle>
          <SheetDescription>Record time spent on this step.</SheetDescription>
        </SheetHeader>

        <div className="bg-muted rounded-md p-3 mx-4 mt-4">
          <p className="text-sm font-semibold">{unitName}</p>
          <p className="text-sm text-muted-foreground">{recipeName}</p>
          {sectionName && (
            <p className="text-xs text-muted-foreground">{sectionName}</p>
          )}
          <p className="text-xs text-muted-foreground">{stepName}</p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4 p-4"
          >
            <FormField
              name="duration_minutes"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (min)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={1440}
                      placeholder="30"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : e.target.valueAsNumber,
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
                      placeholder="Optional notes"
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
              <Button type="button" variant="ghost" onClick={onClose}>
                Keep Working
              </Button>
              <Button
                type="submit"
                disabled={isPending || form.formState.isSubmitting}
              >
                Save & Mark Done
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
