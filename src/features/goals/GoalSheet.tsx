import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import { useCreateGoal, useUpdateGoal } from "@/hooks/useGoals";
import { currentPeriod } from "@/lib/computeGoalPeriod";
import { goalSchema, GOAL_TIMEFRAMES, type GoalFormValues } from "@/features/goals/goalSchema";
import type { HobbyGoal } from "@/types/goal";

function buildDefaultValues(editingGoal: HobbyGoal | null): GoalFormValues {
  return {
    name: editingGoal?.name ?? "",
    target_count: editingGoal?.target_count ?? 1,
    timeframe: editingGoal?.timeframe ?? "month",
  };
}

interface GoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGoal: HobbyGoal | null;
}

export function GoalSheet({ open, onOpenChange, editingGoal }: GoalSheetProps) {
  const isEdit = editingGoal !== null;
  const createGoalMutation = useCreateGoal();
  const updateGoalMutation = useUpdateGoal();

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: buildDefaultValues(editingGoal),
  });

  // Reset form when editingGoal changes or sheet reopens — Pitfall 3
  useEffect(() => {
    form.reset(buildDefaultValues(editingGoal));
  }, [editingGoal, open]);

  async function onSubmit(data: GoalFormValues) {
    try {
      const period = isEdit && editingGoal && data.timeframe === editingGoal.timeframe
        ? editingGoal.period
        : currentPeriod(data.timeframe);
      if (isEdit && editingGoal) {
        await updateGoalMutation.mutateAsync({
          id: editingGoal.id,
          name: data.name,
          target_count: data.target_count,
          timeframe: data.timeframe,
          period,
        });
        toast.success("Goal updated.");
      } else {
        await createGoalMutation.mutateAsync({
          name: data.name,
          target_count: data.target_count,
          timeframe: data.timeframe,
          period,
        });
        toast.success("Goal created.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Goal" : "New Goal"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update your painting target." : "Set a painting target for this period."}
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
                    <Input placeholder="e.g. Paint 10 infantry this month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="target_count"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Unit Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          field.onChange(raw);
                          return;
                        }
                        const v = e.target.valueAsNumber;
                        field.onChange(Number.isNaN(v) ? field.value : v);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Timeframe</FormLabel>
              <Controller
                name="timeframe"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GOAL_TIMEFRAMES.map((tf) => (
                        <SelectItem key={tf} value={tf}>
                          {tf === "month" ? "This Month" : "This Quarter"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormMessage />
            </FormItem>

            <div className="mt-4 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEdit ? "Save Changes" : "Create Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
