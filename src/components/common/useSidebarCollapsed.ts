import { useEffect, useState } from "react";

const STORAGE_KEY = "sidebar:collapsed";

/**
 * Reads/writes the sidebar collapse state synchronously from localStorage
 * to prevent a layout flash on app cold start (UI-SPEC §4).
 * Default: expanded (false) when key is absent.
 */
export function useSidebarCollapsed(): readonly [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
    } catch {
      /* storage may be blocked — degrade silently */
    }
  }, [collapsed]);

  return [collapsed, setCollapsedState] as const;
}
