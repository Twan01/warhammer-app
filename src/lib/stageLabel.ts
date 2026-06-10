/**
 * Pipeline stage label resolver — Phase 123 (HOB-01).
 *
 * Provides the canonical BUCKET_ORDER array and a getBucketLabel() utility
 * that resolves custom display labels from app_settings, falling back to
 * the default bucket name on missing or malformed JSON.
 */
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

/** Resolves a custom display label for a pipeline bucket, with safe fallback. */
export function getBucketLabel(
  bucket: PipelineBucket,
  settings: AppSettingsMap,
): string {
  const raw = settings["pipeline_labels"];
  if (!raw) return bucket;
  try {
    const map = JSON.parse(raw) as Record<string, string>;
    return map[bucket] || bucket;
  } catch {
    return bucket;
  }
}
