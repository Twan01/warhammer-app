import { Input } from "@/components/ui/input";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";

export function MissionFormatEditor({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();
  const currentValue = settings["default_mission_format"] ?? "";

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const trimmed = e.target.value.trim();
    updateSetting.mutate(
      { key: "default_mission_format", value: trimmed },
      { onError: () => toast.error("Could not save setting. Try again.") },
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Default Mission Format</p>
        <p className="text-xs text-muted-foreground">
          Pre-fills the Mission field when creating a new battle log.
        </p>
      </div>
      <Input
        key={currentValue}
        defaultValue={currentValue}
        placeholder="e.g., Take and Hold, Leviathan..."
        className="max-w-xs"
        onBlur={handleBlur}
      />
    </div>
  );
}
