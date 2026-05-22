import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PAINTING_STATUS_ORDER } from "@/types/unit";
import type { UnitFormValues } from "./unitSchema";
import {
  CheckboxField,
  NullableNumberField,
  NullableDateField,
  NullableTextField,
  NullableTextareaField,
  PenceField,
} from "./UnitFormFields";

interface UnitFormOptionalProps {
  hasTiers: boolean;
  tiersCount: number;
}

export function UnitFormOptional({ hasTiers, tiersCount }: UnitFormOptionalProps) {
  const { control } = useFormContext<UnitFormValues>();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Separator />

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

      {expanded && (
        <div className="flex flex-col gap-4">
          <FormField
            name="status_painting"
            control={control}
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
            control={control}
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

          <CheckboxField name="status_assembly" label="Assembly complete" />
          <CheckboxField name="status_basing" label="Basing complete" />
          <CheckboxField name="status_varnished" label="Varnished" />
          <CheckboxField name="is_active_project" label="Active project" />

          <NullableNumberField name="priority" label="Priority" />
          <NullableDateField name="target_completion_date" label="Target Completion Date" />
          <NullableNumberField name="model_count" label="Model Count" min={0} />
          <NullableNumberField name="owned_count" label="Owned Count" min={0} />

          <FormField
            name="points"
            control={control}
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
                    disabled={hasTiers}
                    className={hasTiers ? "cursor-not-allowed opacity-60" : undefined}
                  />
                </FormControl>
                {hasTiers && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Managed by point tiers ({tiersCount} tier{tiersCount !== 1 ? "s" : ""} defined)
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <NullableDateField name="purchase_date" label="Purchase Date" />
          <PenceField name="purchase_price_pence" label="Purchase Price" />
          <NullableTextField name="storage_location" label="Storage Location" placeholder="Optional" />
          <NullableTextField name="main_image_path" label="Image Path" placeholder="Optional -- text path only, no upload UI in v1" />
          <NullableTextareaField name="notes" label="Notes" placeholder="Optional notes..." />
          <NullableTextField name="undercoat" label="Undercoat" placeholder="e.g. Chaos Black, Wraithbone" />
          <NullableTextareaField name="lore_notes" label="Lore Notes" placeholder="Character history, battle honours, personal backstory..." rows={4} />
        </div>
      )}
    </>
  );
}
