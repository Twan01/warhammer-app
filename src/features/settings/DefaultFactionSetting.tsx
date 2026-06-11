import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { useFactions } from "@/hooks/useFactions";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";

export function DefaultFactionSetting({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();
  const { data: factions, isLoading } = useFactions();
  const raw = settings["default_faction_id"] ?? "";
  const current = raw === "" ? "__none__" : raw;

  function handleChange(value: string) {
    const dbValue = value === "__none__" ? "" : value;
    updateSetting.mutate(
      { key: "default_faction_id", value: dbValue },
      { onError: () => toast.error("Could not save setting. Try again.") },
    );
  }

  const sortedFactions = factions
    ? [...factions].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">Default Faction</p>
        <p className="text-sm text-muted-foreground">
          Faction loaded as active when the app starts
        </p>
      </div>
      <div className="min-w-[160px] flex justify-end">
        {isLoading ? (
          <Skeleton className="h-9 w-[200px]" />
        ) : (
          <Select value={current} onValueChange={handleChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {sortedFactions.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
