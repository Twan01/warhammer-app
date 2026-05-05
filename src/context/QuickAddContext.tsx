/**
 * Phase 27 — Quick Add context (NAV-03).
 *
 * Global state for controlling which create Sheet is visible via Quick Add.
 * Modelled on ActiveFactionContext: createContext + Provider + useHook pattern.
 *
 * Placement: wraps RouterProvider in main.tsx (same level as QueryProvider).
 * Both AppSidebar (calls openQuickAdd) and AppLayout (reads activeSheet to
 * control Sheet open props) are descendants and can call useQuickAdd().
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type QuickAddAction =
  | "add-unit"
  | "add-faction"
  | "add-paint"
  | "add-recipe"
  | "create-project"
  | "log-session"
  | "add-purchase"
  | "log-battle";

interface QuickAddState {
  activeSheet: QuickAddAction | null;
  openQuickAdd: (action: QuickAddAction) => void;
  closeQuickAdd: () => void;
}

const QuickAddContext = createContext<QuickAddState | null>(null);

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [activeSheet, setActiveSheet] = useState<QuickAddAction | null>(null);

  const openQuickAdd = useCallback((action: QuickAddAction) => {
    setActiveSheet(action);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setActiveSheet(null);
  }, []);

  return (
    <QuickAddContext.Provider value={{ activeSheet, openQuickAdd, closeQuickAdd }}>
      {children}
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd(): QuickAddState {
  const ctx = useContext(QuickAddContext);
  if (!ctx) {
    throw new Error("useQuickAdd must be used within QuickAddProvider");
  }
  return ctx;
}
