import type { AppSettingsMap } from "@/db/queries/appSettings";

export type PipelineBucket =
  | "Not Started"
  | "Assembly"
  | "Painting"
  | "Finishing"
  | "Done";

export const BUCKET_ORDER: PipelineBucket[] = [
  "Not Started",
  "Assembly",
  "Painting",
  "Finishing",
  "Done",
];

export function parsePipelineLabels(
  settings: AppSettingsMap,
): Record<string, string> {
  const raw = settings["pipeline_labels"];
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getBucketLabel(
  bucket: PipelineBucket,
  settings: AppSettingsMap,
): string {
  const map = parsePipelineLabels(settings);
  return map[bucket] || bucket;
}
