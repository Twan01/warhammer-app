import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";

const PRESETS = [500, 1000, 1500, 2000] as const;

export function ReadinessTargetSetting({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();
  const persisted = Number(settings["army_readiness_target"]) || 2000;
  const [customValue, setCustomValue] = useState("");

  function saveTarget(value: number) {
    setCustomValue("");
    updateSetting.mutate(
      { key: "army_readiness_target", value: String(value) },
      { onError: () => toast.error("Could not save setting. Try again.") },
    );
  }

  function handleBlur() {
    const parsed = parseInt(customValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 99999) {
      // Revert to last valid value
      setCustomValue("");
      return;
    }
    saveTarget(parsed);
  }

  const isPreset = (PRESETS as readonly number[]).includes(persisted);
  const showCustomActive = !isPreset && customValue === "";

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold">Readiness Target</p>
        <p className="text-sm text-muted-foreground">
          Default points threshold shown on the Army Readiness dashboard card
        </p>
      </div>
      <div className="min-w-[160px] flex flex-col items-end gap-2">
        <div className="flex gap-1">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={persisted === preset && customValue === "" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs tabular-nums"
              onClick={() => saveTarget(preset)}
            >
              {preset}
            </Button>
          ))}
        </div>
        <Input
          type="number"
          placeholder="Custom…"
          min={1}
          max={99999}
          value={customValue || (showCustomActive ? String(persisted) : "")}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={handleBlur}
          className="w-[120px] h-7 text-xs text-right [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
