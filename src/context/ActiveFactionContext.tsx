/**
 * Phase 10 — Active faction context (THEME-01 + THEME-02).
 *
 * Holds the user-selected faction id and exposes its color_theme hex as
 * `activeFactionHex`. On every change, mutates the `--faction-accent` CSS
 * custom property on document.documentElement so all `bg-faction-accent` /
 * `text-faction-accent` / `ring-faction-accent` / `border-faction-accent`
 * utilities update in the same paint cycle (zero React re-render cost).
 *
 * Persistence: `localStorage` key `"active-faction-id"`, mirroring the
 * verbatim pattern from `useSidebarCollapsed.ts`. The synchronous useState
 * initializer prevents a zinc → faction flash on cold start (Pitfall 2 in
 * 10-RESEARCH.md is acceptable — the zinc default just shows for one frame
 * if the useFactions query is still in flight).
 *
 * Default hex: #71717a (zinc-500) — when no faction is selected OR the
 * factions data is still loading OR the stored id is no longer present.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useFactions } from "@/hooks/useFactions";
import type { Faction } from "@/types/faction";

const STORAGE_KEY = "active-faction-id";
const DEFAULT_HEX = "#71717a"; // zinc-500

export interface ActiveFactionState {
  activeFactionId: number | null;
  activeFactionHex: string;
  setActiveFaction: (faction: Faction | null) => void;
}

const ActiveFactionContext = createContext<ActiveFactionState | null>(null);

export function ActiveFactionProvider({ children }: { children: ReactNode }) {
  const { data: factions = [] } = useFactions();

  const [activeFactionId, setActiveFactionId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null || stored === "") return null;
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  });

  // Resolve hex from factions list — DEFAULT when no faction OR factions still loading
  const activeFaction = factions.find((f) => f.id === activeFactionId) ?? null;
  const activeFactionHex = activeFaction?.color_theme ?? DEFAULT_HEX;

  // Apply CSS custom property on every change — zero React re-render cost
  useEffect(() => {
    document.documentElement.style.setProperty("--faction-accent", activeFactionHex);
  }, [activeFactionHex]);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      if (activeFactionId !== null) {
        window.localStorage.setItem(STORAGE_KEY, String(activeFactionId));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* storage may be blocked — degrade silently */
    }
  }, [activeFactionId]);

  const setActiveFaction = (faction: Faction | null) => {
    setActiveFactionId(faction?.id ?? null);
  };

  return (
    <ActiveFactionContext.Provider
      value={{ activeFactionId, activeFactionHex, setActiveFaction }}
    >
      {children}
    </ActiveFactionContext.Provider>
  );
}

export function useActiveFaction(): ActiveFactionState {
  const ctx = useContext(ActiveFactionContext);
  if (!ctx) {
    throw new Error("useActiveFaction must be used within ActiveFactionProvider");
  }
  return ctx;
}
