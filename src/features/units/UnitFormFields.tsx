import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { UnitFormValues } from "./unitSchema";

export function CheckboxField({ name, label }: { name: keyof UnitFormValues; label: string }) {
  const { control } = useFormContext<UnitFormValues>();
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={name}
              className="accent-primary h-4 w-4 rounded border-border"
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
            />
            <FormLabel htmlFor={name} className="cursor-pointer">
              {label}
            </FormLabel>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function NullableNumberField({ name, label, min }: { name: keyof UnitFormValues; label: string; min?: number }) {
  const { control } = useFormContext<UnitFormValues>();
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={min}
              placeholder="Optional"
              {...field}
              value={(field.value as number | null) ?? ""}
              onChange={(e) =>
                field.onChange(e.target.value === "" ? null : e.target.valueAsNumber)
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function NullableDateField({ name, label }: { name: keyof UnitFormValues; label: string }) {
  const { control } = useFormContext<UnitFormValues>();
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="date"
              {...field}
              value={(field.value as string | null) ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function NullableTextField({ name, label, placeholder }: { name: keyof UnitFormValues; label: string; placeholder?: string }) {
  const { control } = useFormContext<UnitFormValues>();
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              {...field}
              value={(field.value as string | null) ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function NullableTextareaField({ name, label, placeholder, rows }: { name: keyof UnitFormValues; label: string; placeholder?: string; rows?: number }) {
  const { control } = useFormContext<UnitFormValues>();
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <textarea
              className={TEXTAREA_CLASS}
              placeholder={placeholder}
              rows={rows}
              {...field}
              value={(field.value as string | null) ?? ""}
              onChange={(e) => field.onChange(e.target.value || null)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

