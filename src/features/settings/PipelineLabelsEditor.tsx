import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useUpdateSetting } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import type { AppSettingsMap } from "@/db/queries/appSettings";
import { parsePipelineLabels, BUCKET_ORDER, type PipelineBucket } from "@/lib/stageLabel";

export function PipelineLabelsEditor({
  settings,
}: {
  settings: AppSettingsMap;
}) {
  const updateSetting = useUpdateSetting();

  const parsed = useMemo(() => parsePipelineLabels(settings), [settings]);

  function handleBlur(bucket: PipelineBucket, value: string) {
    const trimmed = value.trim();
    const label = trimmed || bucket;
    const existing = { ...parsed };
    if (label === bucket) {
      delete existing[bucket];
    } else {
      existing[bucket] = label;
    }
    updateSetting.mutate(
      { key: "pipeline_labels", value: JSON.stringify(existing) },
      { onError: () => toast.error("Could not save setting. Try again.") },
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Pipeline Stage Labels</p>
        <p className="text-xs text-muted-foreground">
          Rename the 5 stages shown on the Dashboard and collection filters.
          Internal values are unchanged.
        </p>
      </div>
      <div className="space-y-3">
        {BUCKET_ORDER.map((bucket) => {
          const currentLabel = parsed[bucket] ?? bucket;
          return (
            <div key={bucket} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-sm font-semibold text-muted-foreground">
                {bucket}
              </span>
              <Input
                key={`${bucket}-${currentLabel}`}
                defaultValue={currentLabel}
                placeholder={bucket}
                className="max-w-xs"
                onBlur={(e) => handleBlur(bucket, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
