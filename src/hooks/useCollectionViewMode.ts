import { useEffect, useState } from "react";

const STORAGE_KEY = "collection-view-mode";

export type CollectionViewMode = "table" | "gallery";

/**
 * Reads/writes the Collection page view mode synchronously from localStorage
 * to prevent a layout flash on app cold start (UI-04 — Phase 12).
 * Default: 'table' when key is absent, parse fails, or storage is blocked.
 *
 * Mirrors `useSidebarCollapsed.ts` (boolean variant) — same SSR guard, same
 * try/catch discipline, same `as const` tuple return.
 */
export function useCollectionViewMode(): readonly [
  CollectionViewMode,
  (next: CollectionViewMode) => void,
] {
  const [mode, setMode] = useState<CollectionViewMode>(() => {
    if (typeof window === "undefined") return "table";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw === "gallery" ? "gallery" : "table";
    } catch {
      return "table";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage may be blocked — degrade silently */
    }
  }, [mode]);

  return [mode, setMode] as const;
}
