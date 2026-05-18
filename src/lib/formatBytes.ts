/**
 * Phase 81 -- Human-readable byte formatting utility.
 *
 * Converts a raw byte count to a compact string using binary units (1 KB = 1024 B).
 * Values under 10 show one decimal place (e.g. "2.4 MB"); values 10+ show integers
 * (e.g. "14 MB"). Used by the restore preview dialog to display database size.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );
  const value = bytes / Math.pow(k, i);

  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${sizes[i]}`;
}
