/**
 * DASH-02 — Lightweight Sheet for logging a painting session from the Dashboard
 * Quick Action button. Mirrors UnitSheet's React Hook Form + Zod pattern
 * (buildDefaultValues for defaults, NOT zod .default() — Pitfall 8).
 *
 * Unit picker shows active projects first (is_active_project === 1, sorted by
 * updated_at DESC), then all remaining units alphabetically. This biases the
 * picker to the most likely targets without forcing the user to scroll.
 *
 * Pattern source: src/features/units/UnitSheet.tsx (form + sheet),
 *                 src/features/units/JournalTab.tsx (mutation field semantics).
 */
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { useUnits } from "@/hooks/useUnits";
import { useCreatePaintingSession } from "@/hooks/useJournalSessions";
import { todayISO } from "@/lib/dates";
import type { Unit } from "@/types/unit";
import { logSessionSchema, type LogSessionFormValues } from "./logSessionSchema";

interface LogSessionSheetProps {
  open: boolean;
  onClose: () => void;
}

function buildDefaultValues(): LogSessionFormValues {
  return {
    unit_id: 0,
    session_date: todayISO(),
    duration_minutes: 30,
    notes: null,
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

export function LogSessionSheet({ open, onClose }: LogSessionSheetProps) {
  const { data: units, isLoading: unitsLoading } = useUnits();
  const createSession = useCreatePaintingSession();

  const form = useForm<LogSessionFormValues>({
    resolver: zodResolver(logSessionSchema),
    defaultValues: buildDefaultValues(),
  });

  // Reset form on each open so leftover values from a previous open do not persist.
  useEffect(() => {
    if (open) form.reset(buildDefaultValues());
  }, [open, form]);

  const orderedUnits = useMemo(
    () => sortUnitsForPicker(units ?? []),
    [units]
  );

  async function onSubmit(values: LogSessionFormValues) {
    try {
      await createSession.mutateAsync({
        unit_id: values.unit_id,
        session_date: values.session_date,
        duration_minutes: values.duration_minutes,
        notes: values.notes && values.notes.trim() !== "" ? values.notes.trim() : null,
      });
      toast.success("Session logged.");
      onClose();
    } catch {
      toast.error("Failed to log session — try again.");
      // Sheet stays open so user can retry
    }
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
                  <Controller
                    name="unit_id"
                    control={form.control}
                    render={({ field: ctrl }) => (
                      <Select
                        disabled={unitsLoading}
                        value={ctrl.value ? String(ctrl.value) : ""}
                        onValueChange={(v) => ctrl.onChange(Number(v))}
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
                    )}
                  />
                  <FormMessage>{form.formState.errors.unit_id?.message}</FormMessage>
                  {/* unused render arg silenced */}
                  <input type="hidden" value={field.value ?? ""} readOnly />
                </FormItem>
              )}
            />

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
              <Button type="submit" disabled={form.formState.isSubmitting || unitsLoading}>
                Log Session
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
